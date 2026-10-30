import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/housing/data/mapping_housing_repository.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/failures.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:everything_about_youth/features/housing/domain/repositories/saved_notice_local_store.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/get_notice_detail.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/load_housing_meta.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/load_profile.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/load_saved_notice_summaries.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/load_schedule_notices.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/load_similar_notices.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/resolve_saved_notice_ids.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/save_profile.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/search_notices.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/toggle_saved_notice.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';
import '../../support/housing_memory_stores.dart';

void main() {
  group('SearchNoticesUseCase', () {
    test('repository search 를 위임한다', () async {
      final repo = FakeHousingRepository(pages: [NoticePage.fromJson(pageJson(items: [summaryJson()]))]);
      final uc = SearchNoticesUseCase(repo);
      final page = await uc(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
      expect(page.items, hasLength(1));
      expect(repo.searchCalls.single.page, 1);
    });

    test('repository 오류는 그대로 전파한다', () {
      final repo = FakeHousingRepository(searchError: const ApiException('fail'));
      final uc = SearchNoticesUseCase(repo);
      expect(uc(filters: HousingFilters.initial, profile: ApplicantProfile.empty), throwsA(isA<ApiException>()));
    });
  });

  group('LoadHousingMetaUseCase', () {
    test('fetchMeta 위임', () async {
      final repo = FakeHousingRepository();
      final meta = await LoadHousingMetaUseCase(repo)();
      expect(meta.sidos, isNotEmpty);
    });

    test('fetchMeta 실패 전파', () {
      final repo = FakeHousingRepository(fetchMetaError: const ApiException('meta'));
      expect(LoadHousingMetaUseCase(repo)(), throwsA(isA<ApiException>()));
    });
  });

  group('GetNoticeDetailUseCase', () {
    test('getNotice 위임', () async {
      final repo = FakeHousingRepository(pages: [NoticePage.fromJson(pageJson(items: [summaryJson(id: 'x')]))]);
      final detail = await GetNoticeDetailUseCase(repo)('x', profile: ApplicantProfile.empty);
      expect(detail.summary.id, 'x');
    });

    test('getNotice 실패 전파', () {
      final repo = FakeHousingRepository(getNoticeError: const ApiException('detail fail'));
      expect(
        GetNoticeDetailUseCase(repo)('x', profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });
  });

  group('LoadProfileUseCase / SaveProfileUseCase', () {
    test('load 와 save', () async {
      final store = MemoryProfileStore();
      const profile = ApplicantProfile(age: 25);
      await SaveProfileUseCase(store)(profile);
      expect(await LoadProfileUseCase(store)(), profile);
    });
  });

  group('ResolveSavedNoticeIdsUseCase', () {
    test('비회원: 로컬 id 만', () async {
      final local = MemorySavedNoticeLocalStore(['a', 'b']);
      final repo = FakeHousingRepository();
      final ids = await ResolveSavedNoticeIdsUseCase(repo, local)(isMember: false);
      expect(ids, ['a', 'b']);
      expect(repo.mergeCalls, isEmpty);
    });

    test('회원·로컬 비어 있음: 서버 id', () async {
      final repo = FakeHousingRepository(savedIds: ['s1']);
      final ids = await ResolveSavedNoticeIdsUseCase(repo, MemorySavedNoticeLocalStore())(isMember: true);
      expect(ids, ['s1']);
    });

    test('회원·로컬 있음: merge 후 로컬 비우고 서버 목록', () async {
      final local = MemorySavedNoticeLocalStore(['local1']);
      final repo = FakeHousingRepository(savedIds: ['server']);
      final ids = await ResolveSavedNoticeIdsUseCase(repo, local)(isMember: true);
      expect(repo.mergeCalls, [
        ['local1'],
      ]);
      expect(await local.load(), isEmpty);
      expect(ids, contains('local1'));
    });

    test('회원·merge 실패면 HousingUserMessage 전파', () async {
      final local = MemorySavedNoticeLocalStore(['local1']);
      final repo = FakeHousingRepository(mergeError: const HousingUserMessage('merge 실패'));
      expect(
        ResolveSavedNoticeIdsUseCase(repo, local)(isMember: true),
        throwsA(isA<HousingUserMessage>()),
      );
    });
  });

  group('ToggleSavedNoticeUseCase', () {
    test('비회원: 추가하면 로컬에만 저장', () async {
      final local = MemorySavedNoticeLocalStore();
      final repo = FakeHousingRepository();
      final uc = ToggleSavedNoticeUseCase(repo, local);
      final r = await uc(id: 'n1', isMember: false, currentIds: []);
      expect(r.error, isNull);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['n1']);
      expect(repo.saveCalls, isEmpty);
    });

    test('비회원: 제거', () async {
      final local = MemorySavedNoticeLocalStore(['n1', 'n2']);
      final uc = ToggleSavedNoticeUseCase(FakeHousingRepository(), local);
      final r = await uc(id: 'n1', isMember: false, currentIds: ['n1', 'n2']);
      expect(r.ids, ['n2']);
    });

    test('상한 초과면 error', () async {
      final ids = [for (var i = 0; i < SavedNoticeLocalStore.maxCount; i++) 'n$i'];
      final uc = ToggleSavedNoticeUseCase(FakeHousingRepository(), MemorySavedNoticeLocalStore());
      final r = await uc(id: 'new', isMember: false, currentIds: ids);
      expect(r.error, contains('${SavedNoticeLocalStore.maxCount}'));
      expect(r.ids, isNull);
    });

    test('회원: save API 실패면 ids 갱신 없음', () async {
      final repo = FakeHousingRepository(saveError: const HousingUserMessage('저장 실패'));
      final uc = ToggleSavedNoticeUseCase(repo, MemorySavedNoticeLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: []);
      expect(r.error, '저장 실패');
      expect(r.ids, isNull);
    });

    test('회원: unsave API 실패', () async {
      final repo = FakeHousingRepository(unsaveError: const HousingUserMessage('해제 실패'));
      final uc = ToggleSavedNoticeUseCase(repo, MemorySavedNoticeLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: ['n1']);
      expect(r.error, '해제 실패');
    });

    test('회원: save 성공 시 로컬 replace 하지 않음', () async {
      final local = MemorySavedNoticeLocalStore(['old']);
      final repo = FakeHousingRepository();
      final r = await ToggleSavedNoticeUseCase(repo, local)(id: 'n1', isMember: true, currentIds: []);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['old']);
      expect(repo.saveCalls, ['n1']);
    });

    test('이미 있는 id 를 다시 누르면 제거', () async {
      final uc = ToggleSavedNoticeUseCase(FakeHousingRepository(), MemorySavedNoticeLocalStore(['a', 'b']));
      final r = await uc(id: 'a', isMember: false, currentIds: ['a', 'b']);
      expect(r.ids, ['b']);
    });
  });

  group('LoadSavedNoticeSummariesUseCase', () {
    test('id 가 비어 있으면 빈 목록', () async {
      final repo = FakeHousingRepository();
      final uc = LoadSavedNoticeSummariesUseCase(repo, GetNoticeDetailUseCase(repo));
      final list = await uc(ids: [], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
      expect(list.total, 0);
    });

    test('회원: fetchSaved', () async {
      final repo = FakeHousingRepository(
        pages: [NoticePage.fromJson(pageJson(items: [summaryJson(id: 's1')]))],
        savedIds: ['s1'],
      );
      final uc = LoadSavedNoticeSummariesUseCase(repo, GetNoticeDetailUseCase(repo));
      final list = await uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true);
      expect(list.items.single.id, 's1');
    });

    test('비회원: 없는 공고는 건너뛴다', () async {
      final inner = FakeHousingRepository();
      final repo = MappingHousingRepository(inner);
      final uc = LoadSavedNoticeSummariesUseCase(repo, GetNoticeDetailUseCase(repo));
      final list = await uc(ids: ['missing'], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
    });

    test('비회원: getNotice 가 HousingUserMessage 이면 전파한다', () async {
      final inner = FakeHousingRepository(getNoticeError: const HousingUserMessage('상세 실패'));
      final repo = MappingHousingRepository(inner);
      final uc = LoadSavedNoticeSummariesUseCase(repo, GetNoticeDetailUseCase(repo));
      expect(
        uc(ids: ['bad'], profile: ApplicantProfile.empty, isMember: false),
        throwsA(isA<HousingUserMessage>()),
      );
    });
  });

  group('LoadSimilarNoticesUseCase', () {
    test('같은 supplyType 검색에서 자신과 최대 5개', () async {
      final items = [for (var i = 0; i < 10; i++) summaryJson(id: 'n$i', title: 't$i')];
      final repo = FakeHousingRepository(
        pages: [NoticePage.fromJson(pageJson(items: items))],
      );
      final similar = await LoadSimilarNoticesUseCase(repo)(
        excludeId: 'n0',
        supplyType: 'happy',
        profile: ApplicantProfile.empty,
      );
      expect(similar, hasLength(5));
      expect(similar.any((n) => n.id == 'n0'), isFalse);
    });

    test('search 실패 전파', () {
      final repo = FakeHousingRepository(searchError: const ApiException('similar fail'));
      expect(
        LoadSimilarNoticesUseCase(repo)(
          excludeId: 'n0',
          supplyType: 'happy',
          profile: ApplicantProfile.empty,
        ),
        throwsA(isA<ApiException>()),
      );
    });
  });

  group('LoadScheduleNoticesUseCase', () {
    test('여러 페이지를 dedup 하며 합친다', () async {
      final repo = FakeHousingRepository(
        pages: [
          NoticePage.fromJson(
            pageJson(
              items: [summaryJson(id: 'a'), summaryJson(id: 'b')],
              page: 1,
              totalPages: 2,
            ),
          ),
          NoticePage.fromJson(
            pageJson(
              items: [summaryJson(id: 'b'), summaryJson(id: 'c')],
              page: 2,
              totalPages: 2,
            ),
          ),
        ],
      );
      final out = await LoadScheduleNoticesUseCase(repo)(profile: ApplicantProfile.empty);
      expect(out.items.map((e) => e.id), ['a', 'b', 'c']);
      expect(repo.searchCalls.length, 2);
    });

    test('2페이지 조회 실패면 예외 전파', () async {
      late FakeHousingRepository repo;
      repo = FakeHousingRepository(
        pages: [
          NoticePage.fromJson(pageJson(items: [summaryJson(id: 'a')], page: 1, totalPages: 3)),
          NoticePage.fromJson(pageJson(items: [summaryJson(id: 'b')], page: 2, totalPages: 3)),
        ],
        searchHook: (_, page) {
          if (page == 2) throw const ApiException('page2 fail');
          return Future.value(repo.pages[page - 1]);
        },
      );
      expect(
        LoadScheduleNoticesUseCase(repo)(profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });
  });
}
