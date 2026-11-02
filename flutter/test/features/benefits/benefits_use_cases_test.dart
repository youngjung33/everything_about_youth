import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/benefits/data/mapping_benefits_repository.dart';
import 'package:everything_about_youth/features/benefits/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/benefits/domain/failures.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_filters.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_program.dart';
import 'package:everything_about_youth/features/benefits/domain/repositories/saved_program_local_store.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/get_program_detail.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/load_benefits_meta.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/load_profile.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/load_saved_program_summaries.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/load_schedule_programs.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/load_similar_programs.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/resolve_saved_program_ids.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/save_profile.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/search_programs.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/toggle_saved_program.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/benefits_fixtures.dart';
import '../../support/benefits_memory_stores.dart';

void main() {
  group('SearchProgramsUseCase', () {
    test('repository 오류는 그대로 전파한다', () {
      final repo = FakeBenefitsRepository(searchError: const ApiException('fail'));
      final uc = SearchProgramsUseCase(repo);
      expect(uc(filters: BenefitFilters.initial, profile: ApplicantProfile.empty), throwsA(isA<ApiException>()));
    });

    test('repository search 를 위임한다', () async {
      final repo = FakeBenefitsRepository(pages: [ProgramPage.fromJson(programPageJson(items: [programSummaryJson()]))]);
      final uc = SearchProgramsUseCase(repo);
      final page = await uc(filters: BenefitFilters.initial, profile: ApplicantProfile.empty);
      expect(page.items, hasLength(1));
      expect(repo.searchCalls.single.page, 1);
    });
  });

  group('LoadBenefitMetaUseCase', () {
    test('fetchMeta 실패 전파', () {
      final repo = FakeBenefitsRepository(fetchMetaError: const ApiException('meta'));
      expect(LoadBenefitMetaUseCase(repo)(), throwsA(isA<ApiException>()));
    });

    test('fetchMeta 위임', () async {
      final repo = FakeBenefitsRepository();
      final meta = await LoadBenefitMetaUseCase(repo)();
      expect(meta.sidos, isNotEmpty);
    });
  });

  group('GetProgramDetailUseCase', () {
    test('getProgram 실패 전파', () {
      final repo = FakeBenefitsRepository(getProgramError: const ApiException('detail fail'));
      expect(
        GetProgramDetailUseCase(repo)('x', profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('getProgram 위임', () async {
      final repo = FakeBenefitsRepository(pages: [ProgramPage.fromJson(programPageJson(items: [programSummaryJson(id: 'x')]))]);
      final detail = await GetProgramDetailUseCase(repo)('x', profile: ApplicantProfile.empty);
      expect(detail.summary.id, 'x');
    });
  });

  group('LoadProfileUseCase / SaveProfileUseCase', () {
    test('load 와 save', () async {
      final store = MemoryBenefitsProfileStore();
      const profile = ApplicantProfile(age: 25);
      await SaveProfileUseCase(store)(profile);
      expect(await LoadProfileUseCase(store)(), profile);
    });
  });

  group('ResolveSavedProgramIdsUseCase', () {
    test('회원·merge 실패면 BenefitsUserMessage 전파', () async {
      final local = MemorySavedProgramLocalStore(['local1']);
      final repo = FakeBenefitsRepository(mergeError: const BenefitsUserMessage('merge 실패'));
      expect(
        ResolveSavedProgramIdsUseCase(repo, local)(isMember: true),
        throwsA(isA<BenefitsUserMessage>()),
      );
    });

    test('비회원: 로컬 id 만', () async {
      final local = MemorySavedProgramLocalStore(['a', 'b']);
      final repo = FakeBenefitsRepository();
      final ids = await ResolveSavedProgramIdsUseCase(repo, local)(isMember: false);
      expect(ids, ['a', 'b']);
      expect(repo.mergeCalls, isEmpty);
    });

    test('회원·로컬 비어 있음: 서버 id', () async {
      final repo = FakeBenefitsRepository(savedIds: ['s1']);
      final ids = await ResolveSavedProgramIdsUseCase(repo, MemorySavedProgramLocalStore())(isMember: true);
      expect(ids, ['s1']);
    });

    test('회원·로컬 있음: merge 후 로컬 비우고 서버 목록', () async {
      final local = MemorySavedProgramLocalStore(['local1']);
      final repo = FakeBenefitsRepository(savedIds: ['server']);
      final ids = await ResolveSavedProgramIdsUseCase(repo, local)(isMember: true);
      expect(repo.mergeCalls, [
        ['local1'],
      ]);
      expect(await local.load(), isEmpty);
      expect(ids, contains('local1'));
    });
  });

  group('ToggleSavedProgramUseCase', () {
    test('상한 초과면 error', () async {
      final ids = [for (var i = 0; i < SavedProgramLocalStore.maxCount; i++) 'n$i'];
      final uc = ToggleSavedProgramUseCase(FakeBenefitsRepository(), MemorySavedProgramLocalStore());
      final r = await uc(id: 'new', isMember: false, currentIds: ids);
      expect(r.error, contains('${SavedProgramLocalStore.maxCount}'));
      expect(r.ids, isNull);
    });

    test('회원: save API 실패면 ids 갱신 없음', () async {
      final repo = FakeBenefitsRepository(saveError: const BenefitsUserMessage('저장 실패'));
      final uc = ToggleSavedProgramUseCase(repo, MemorySavedProgramLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: []);
      expect(r.error, '저장 실패');
      expect(r.ids, isNull);
    });

    test('회원: unsave API 실패', () async {
      final repo = FakeBenefitsRepository(unsaveError: const BenefitsUserMessage('해제 실패'));
      final uc = ToggleSavedProgramUseCase(repo, MemorySavedProgramLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: ['n1']);
      expect(r.error, '해제 실패');
    });

    test('비회원: 추가하면 로컬에만 저장', () async {
      final local = MemorySavedProgramLocalStore();
      final repo = FakeBenefitsRepository();
      final uc = ToggleSavedProgramUseCase(repo, local);
      final r = await uc(id: 'n1', isMember: false, currentIds: []);
      expect(r.error, isNull);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['n1']);
      expect(repo.saveCalls, isEmpty);
    });

    test('비회원: 제거', () async {
      final local = MemorySavedProgramLocalStore(['n1', 'n2']);
      final uc = ToggleSavedProgramUseCase(FakeBenefitsRepository(), local);
      final r = await uc(id: 'n1', isMember: false, currentIds: ['n1', 'n2']);
      expect(r.ids, ['n2']);
    });

    test('회원: save 성공 시 로컬 replace 하지 않음', () async {
      final local = MemorySavedProgramLocalStore(['old']);
      final repo = FakeBenefitsRepository();
      final r = await ToggleSavedProgramUseCase(repo, local)(id: 'n1', isMember: true, currentIds: []);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['old']);
      expect(repo.saveCalls, ['n1']);
    });

    test('이미 있는 id 를 다시 누르면 제거', () async {
      final uc = ToggleSavedProgramUseCase(FakeBenefitsRepository(), MemorySavedProgramLocalStore(['a', 'b']));
      final r = await uc(id: 'a', isMember: false, currentIds: ['a', 'b']);
      expect(r.ids, ['b']);
    });
  });

  group('LoadSavedProgramSummariesUseCase', () {
    test('id 가 비어 있으면 빈 목록', () async {
      final repo = FakeBenefitsRepository();
      final uc = LoadSavedProgramSummariesUseCase(repo, GetProgramDetailUseCase(repo));
      final list = await uc(ids: [], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
      expect(list.total, 0);
    });

    test('비회원: getProgram 가 BenefitsUserMessage 이면 전파한다', () async {
      final inner = FakeBenefitsRepository(getProgramError: const BenefitsUserMessage('상세 실패'));
      final repo = MappingBenefitsRepository(inner);
      final uc = LoadSavedProgramSummariesUseCase(repo, GetProgramDetailUseCase(repo));
      expect(
        uc(ids: ['bad'], profile: ApplicantProfile.empty, isMember: false),
        throwsA(isA<BenefitsUserMessage>()),
      );
    });

    test('회원: fetchSaved 실패 전파', () {
      final repo = FakeBenefitsRepository(fetchSavedError: const BenefitsUserMessage('목록 실패'));
      final uc = LoadSavedProgramSummariesUseCase(repo, GetProgramDetailUseCase(repo));
      expect(
        uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true),
        throwsA(isA<BenefitsUserMessage>()),
      );
    });

    test('비회원: 없는 공고는 건너뛴다', () async {
      final inner = FakeBenefitsRepository();
      final repo = MappingBenefitsRepository(inner);
      final uc = LoadSavedProgramSummariesUseCase(repo, GetProgramDetailUseCase(repo));
      final list = await uc(ids: ['missing'], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
    });

    test('회원: fetchSaved', () async {
      final repo = FakeBenefitsRepository(
        pages: [ProgramPage.fromJson(programPageJson(items: [programSummaryJson(id: 's1')]))],
        savedIds: ['s1'],
      );
      final uc = LoadSavedProgramSummariesUseCase(repo, GetProgramDetailUseCase(repo));
      final list = await uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true);
      expect(list.items.single.id, 's1');
    });
  });

  group('LoadSimilarProgramsUseCase', () {
    test('search 실패 전파', () {
      final repo = FakeBenefitsRepository(searchError: const ApiException('similar fail'));
      expect(
        LoadSimilarProgramsUseCase(repo)(
          excludeId: 'n0',
          categoryId: 'housing',
          profile: ApplicantProfile.empty,
        ),
        throwsA(isA<ApiException>()),
      );
    });

    test('같은 category 검색에서 자신과 최대 5개', () async {
      final items = [for (var i = 0; i < 10; i++) programSummaryJson(id: 'n$i', title: 't$i')];
      final repo = FakeBenefitsRepository(
        pages: [ProgramPage.fromJson(programPageJson(items: items))],
      );
      final similar = await LoadSimilarProgramsUseCase(repo)(
        excludeId: 'n0',
        categoryId: 'housing',
        profile: ApplicantProfile.empty,
      );
      expect(similar, hasLength(5));
      expect(similar.any((n) => n.id == 'n0'), isFalse);
    });
  });

  group('LoadScheduleProgramsUseCase', () {
    test('2페이지 조회 실패면 예외 전파', () async {
      late FakeBenefitsRepository repo;
      repo = FakeBenefitsRepository(
        pages: [
          ProgramPage.fromJson(programPageJson(items: [programSummaryJson(id: 'a')], page: 1, totalPages: 3)),
          ProgramPage.fromJson(programPageJson(items: [programSummaryJson(id: 'b')], page: 2, totalPages: 3)),
        ],
        searchHook: (_, page) {
          if (page == 2) throw const ApiException('page2 fail');
          return Future.value(repo.pages[page - 1]);
        },
      );
      expect(
        LoadScheduleProgramsUseCase(repo)(profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('여러 페이지를 dedup 하며 합친다', () async {
      final repo = FakeBenefitsRepository(
        pages: [
          ProgramPage.fromJson(
            programPageJson(
              items: [programSummaryJson(id: 'a'), programSummaryJson(id: 'b')],
              page: 1,
              totalPages: 2,
            ),
          ),
          ProgramPage.fromJson(
            programPageJson(
              items: [programSummaryJson(id: 'b'), programSummaryJson(id: 'c')],
              page: 2,
              totalPages: 2,
            ),
          ),
        ],
      );
      final out = await LoadScheduleProgramsUseCase(repo)(profile: ApplicantProfile.empty);
      expect(out.items.map((e) => e.id), ['a', 'b', 'c']);
      expect(repo.searchCalls.length, 2);
    });
  });
}
