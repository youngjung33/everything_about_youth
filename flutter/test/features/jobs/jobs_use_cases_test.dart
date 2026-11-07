import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/jobs/data/mapping_jobs_repository.dart';
import 'package:everything_about_youth/features/jobs/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/failures.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_filters.dart';
import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';
import 'package:everything_about_youth/features/jobs/domain/repositories/saved_posting_local_store.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/get_job_posting_detail.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/load_jobs_meta.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/load_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/load_saved_posting_summaries.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/load_schedule_postings.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/load_similar_postings.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/resolve_saved_posting_ids.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/save_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/search_job_postings.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/toggle_saved_posting.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/jobs_fixtures.dart';
import '../../support/jobs_memory_stores.dart';

void main() {
  group('SearchJobPostingsUseCase', () {
    test('repository 오류는 그대로 전파한다', () {
      final repo = FakeJobsRepository(searchError: const ApiException('fail'));
      final uc = SearchJobPostingsUseCase(repo);
      expect(uc(filters: JobsFilters.initial, profile: ApplicantProfile.empty), throwsA(isA<ApiException>()));
    });

    test('repository search 를 위임한다', () async {
      final repo = FakeJobsRepository(pages: [PostingPage.fromJson(postingPageJson(items: [postingSummaryJson()]))]);
      final uc = SearchJobPostingsUseCase(repo);
      final page = await uc(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      expect(page.items, hasLength(1));
      expect(repo.searchCalls.single.page, 1);
    });
  });

  group('LoadJobsMetaUseCase', () {
    test('fetchMeta 실패 전파', () {
      final repo = FakeJobsRepository(fetchMetaError: const ApiException('meta'));
      expect(LoadJobsMetaUseCase(repo)(), throwsA(isA<ApiException>()));
    });

    test('fetchMeta 위임', () async {
      final repo = FakeJobsRepository();
      final meta = await LoadJobsMetaUseCase(repo)();
      expect(meta.sidos, isNotEmpty);
    });
  });

  group('GetPostingDetailUseCase', () {
    test('getPosting 실패 전파', () {
      final repo = FakeJobsRepository(getPostingError: const ApiException('detail fail'));
      expect(
        GetPostingDetailUseCase(repo)('x', profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('getPosting 위임', () async {
      final repo = FakeJobsRepository(pages: [PostingPage.fromJson(postingPageJson(items: [postingSummaryJson(id: 'x')]))]);
      final detail = await GetPostingDetailUseCase(repo)('x', profile: ApplicantProfile.empty);
      expect(detail.summary.id, 'x');
    });
  });

  group('LoadProfileUseCase / SaveProfileUseCase', () {
    test('load 와 save', () async {
      final store = MemoryJobsProfileStore();
      const profile = ApplicantProfile(age: 25);
      await SaveProfileUseCase(store)(profile);
      expect(await LoadProfileUseCase(store)(), profile);
    });
  });

  group('ResolveSavedPostingIdsUseCase', () {
    test('회원·merge 실패면 JobsUserMessage 전파', () async {
      final local = MemorySavedPostingLocalStore(['local1']);
      final repo = FakeJobsRepository(mergeError: const JobsUserMessage('merge 실패'));
      expect(
        ResolveSavedPostingIdsUseCase(repo, local)(isMember: true),
        throwsA(isA<JobsUserMessage>()),
      );
    });

    test('비회원: 로컬 id 만', () async {
      final local = MemorySavedPostingLocalStore(['a', 'b']);
      final repo = FakeJobsRepository();
      final ids = await ResolveSavedPostingIdsUseCase(repo, local)(isMember: false);
      expect(ids, ['a', 'b']);
      expect(repo.mergeCalls, isEmpty);
    });

    test('회원·로컬 비어 있음: 서버 id', () async {
      final repo = FakeJobsRepository(savedIds: ['s1']);
      final ids = await ResolveSavedPostingIdsUseCase(repo, MemorySavedPostingLocalStore())(isMember: true);
      expect(ids, ['s1']);
    });

    test('회원·로컬 있음: merge 후 로컬 비우고 서버 목록', () async {
      final local = MemorySavedPostingLocalStore(['local1']);
      final repo = FakeJobsRepository(savedIds: ['server']);
      final ids = await ResolveSavedPostingIdsUseCase(repo, local)(isMember: true);
      expect(repo.mergeCalls, [
        ['local1'],
      ]);
      expect(await local.load(), isEmpty);
      expect(ids, contains('local1'));
    });
  });

  group('ToggleSavedPostingUseCase', () {
    test('상한 초과면 error', () async {
      final ids = [for (var i = 0; i < SavedPostingLocalStore.maxCount; i++) 'n$i'];
      final uc = ToggleSavedPostingUseCase(FakeJobsRepository(), MemorySavedPostingLocalStore());
      final r = await uc(id: 'new', isMember: false, currentIds: ids);
      expect(r.error, contains('${SavedPostingLocalStore.maxCount}'));
      expect(r.ids, isNull);
    });

    test('회원: save API 실패면 ids 갱신 없음', () async {
      final repo = FakeJobsRepository(saveError: const JobsUserMessage('저장 실패'));
      final uc = ToggleSavedPostingUseCase(repo, MemorySavedPostingLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: []);
      expect(r.error, '저장 실패');
      expect(r.ids, isNull);
    });

    test('회원: unsave API 실패', () async {
      final repo = FakeJobsRepository(unsaveError: const JobsUserMessage('해제 실패'));
      final uc = ToggleSavedPostingUseCase(repo, MemorySavedPostingLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: ['n1']);
      expect(r.error, '해제 실패');
    });

    test('비회원: 추가하면 로컬에만 저장', () async {
      final local = MemorySavedPostingLocalStore();
      final repo = FakeJobsRepository();
      final uc = ToggleSavedPostingUseCase(repo, local);
      final r = await uc(id: 'n1', isMember: false, currentIds: []);
      expect(r.error, isNull);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['n1']);
      expect(repo.saveCalls, isEmpty);
    });

    test('비회원: 제거', () async {
      final local = MemorySavedPostingLocalStore(['n1', 'n2']);
      final uc = ToggleSavedPostingUseCase(FakeJobsRepository(), local);
      final r = await uc(id: 'n1', isMember: false, currentIds: ['n1', 'n2']);
      expect(r.ids, ['n2']);
    });

    test('회원: save 성공 시 로컬 replace 하지 않음', () async {
      final local = MemorySavedPostingLocalStore(['old']);
      final repo = FakeJobsRepository();
      final r = await ToggleSavedPostingUseCase(repo, local)(id: 'n1', isMember: true, currentIds: []);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['old']);
      expect(repo.saveCalls, ['n1']);
    });

    test('이미 있는 id 를 다시 누르면 제거', () async {
      final uc = ToggleSavedPostingUseCase(FakeJobsRepository(), MemorySavedPostingLocalStore(['a', 'b']));
      final r = await uc(id: 'a', isMember: false, currentIds: ['a', 'b']);
      expect(r.ids, ['b']);
    });
  });

  group('LoadSavedPostingSummariesUseCase', () {
    test('id 가 비어 있으면 빈 목록', () async {
      final repo = FakeJobsRepository();
      final uc = LoadSavedPostingSummariesUseCase(repo, GetPostingDetailUseCase(repo));
      final list = await uc(ids: [], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
      expect(list.total, 0);
    });

    test('비회원: getPosting 가 JobsUserMessage 이면 전파한다', () async {
      final inner = FakeJobsRepository(getPostingError: const JobsUserMessage('상세 실패'));
      final repo = MappingJobsRepository(inner);
      final uc = LoadSavedPostingSummariesUseCase(repo, GetPostingDetailUseCase(repo));
      expect(
        uc(ids: ['bad'], profile: ApplicantProfile.empty, isMember: false),
        throwsA(isA<JobsUserMessage>()),
      );
    });

    test('회원: fetchSaved 실패 전파', () {
      final repo = FakeJobsRepository(fetchSavedError: const JobsUserMessage('목록 실패'));
      final uc = LoadSavedPostingSummariesUseCase(repo, GetPostingDetailUseCase(repo));
      expect(
        uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true),
        throwsA(isA<JobsUserMessage>()),
      );
    });

    test('비회원: 없는 공고는 건너뛴다', () async {
      final inner = FakeJobsRepository();
      final repo = MappingJobsRepository(inner);
      final uc = LoadSavedPostingSummariesUseCase(repo, GetPostingDetailUseCase(repo));
      final list = await uc(ids: ['missing'], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
    });

    test('회원: fetchSaved', () async {
      final repo = FakeJobsRepository(
        pages: [PostingPage.fromJson(postingPageJson(items: [postingSummaryJson(id: 's1')]))],
        savedIds: ['s1'],
      );
      final uc = LoadSavedPostingSummariesUseCase(repo, GetPostingDetailUseCase(repo));
      final list = await uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true);
      expect(list.items.single.id, 's1');
    });
  });

  group('LoadSimilarPostingsUseCase', () {
    test('search 실패 전파', () {
      final repo = FakeJobsRepository(searchError: const ApiException('similar fail'));
      expect(
        LoadSimilarPostingsUseCase(repo)(
          excludeId: 'n0',
          hireTypeId: 'youth',
          profile: ApplicantProfile.empty,
        ),
        throwsA(isA<ApiException>()),
      );
    });

    test('같은 supplyType 검색에서 자신과 최대 5개', () async {
      final items = [for (var i = 0; i < 10; i++) postingSummaryJson(id: 'n$i', title: 't$i')];
      final repo = FakeJobsRepository(
        pages: [PostingPage.fromJson(postingPageJson(items: items))],
      );
      final similar = await LoadSimilarPostingsUseCase(repo)(
        excludeId: 'n0',
        hireTypeId: 'housing',
        profile: ApplicantProfile.empty,
      );
      expect(similar, hasLength(5));
      expect(similar.any((n) => n.id == 'n0'), isFalse);
    });
  });

  group('LoadSchedulePostingsUseCase', () {
    test('2페이지 조회 실패면 예외 전파', () async {
      late FakeJobsRepository repo;
      repo = FakeJobsRepository(
        pages: [
          PostingPage.fromJson(postingPageJson(items: [postingSummaryJson(id: 'a')], page: 1, totalPages: 3)),
          PostingPage.fromJson(postingPageJson(items: [postingSummaryJson(id: 'b')], page: 2, totalPages: 3)),
        ],
        searchHook: (_, page) {
          if (page == 2) throw const ApiException('page2 fail');
          return Future.value(repo.pages[page - 1]);
        },
      );
      expect(
        LoadSchedulePostingsUseCase(repo)(profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('여러 페이지를 dedup 하며 합친다', () async {
      final repo = FakeJobsRepository(
        pages: [
          PostingPage.fromJson(
            postingPageJson(
              items: [postingSummaryJson(id: 'a'), postingSummaryJson(id: 'b')],
              page: 1,
              totalPages: 2,
            ),
          ),
          PostingPage.fromJson(
            postingPageJson(
              items: [postingSummaryJson(id: 'b'), postingSummaryJson(id: 'c')],
              page: 2,
              totalPages: 2,
            ),
          ),
        ],
      );
      final out = await LoadSchedulePostingsUseCase(repo)(profile: ApplicantProfile.empty);
      expect(out.items.map((e) => e.id), ['a', 'b', 'c']);
      expect(repo.searchCalls.length, 2);
    });
  });
}
