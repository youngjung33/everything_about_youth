import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/finance/data/mapping_finance_repository.dart';
import 'package:everything_about_youth/features/finance/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/finance/domain/failures.dart';
import 'package:everything_about_youth/features/finance/domain/finance_filters.dart';
import 'package:everything_about_youth/features/finance/domain/finance_scheme.dart';
import 'package:everything_about_youth/features/finance/domain/repositories/saved_scheme_local_store.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/get_scheme_detail.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/load_finance_meta.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/load_profile.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/load_saved_scheme_summaries.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/load_schedule_schemes.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/load_similar_schemes.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/resolve_saved_scheme_ids.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/save_profile.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/search_schemes.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/toggle_saved_scheme.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/finance_fixtures.dart';
import '../../support/finance_memory_stores.dart';

void main() {
  group('SearchSchemesUseCase', () {
    test('repository 오류는 그대로 전파한다', () {
      final repo = FakeFinanceRepository(searchError: const ApiException('fail'));
      final uc = SearchSchemesUseCase(repo);
      expect(uc(filters: FinanceFilters.initial, profile: ApplicantProfile.empty), throwsA(isA<ApiException>()));
    });

    test('repository search 를 위임한다', () async {
      final repo = FakeFinanceRepository(pages: [SchemePage.fromJson(schemePageJson(items: [schemeSummaryJson()]))]);
      final uc = SearchSchemesUseCase(repo);
      final page = await uc(filters: FinanceFilters.initial, profile: ApplicantProfile.empty);
      expect(page.items, hasLength(1));
      expect(repo.searchCalls.single.page, 1);
    });
  });

  group('LoadFinanceMetaUseCase', () {
    test('fetchMeta 실패 전파', () {
      final repo = FakeFinanceRepository(fetchMetaError: const ApiException('meta'));
      expect(LoadFinanceMetaUseCase(repo)(), throwsA(isA<ApiException>()));
    });

    test('fetchMeta 위임', () async {
      final repo = FakeFinanceRepository();
      final meta = await LoadFinanceMetaUseCase(repo)();
      expect(meta.sidos, isNotEmpty);
    });
  });

  group('GetSchemeDetailUseCase', () {
    test('getScheme 실패 전파', () {
      final repo = FakeFinanceRepository(getSchemeError: const ApiException('detail fail'));
      expect(
        GetSchemeDetailUseCase(repo)('x', profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('getScheme 위임', () async {
      final repo = FakeFinanceRepository(pages: [SchemePage.fromJson(schemePageJson(items: [schemeSummaryJson(id: 'x')]))]);
      final detail = await GetSchemeDetailUseCase(repo)('x', profile: ApplicantProfile.empty);
      expect(detail.summary.id, 'x');
    });
  });

  group('LoadProfileUseCase / SaveProfileUseCase', () {
    test('load 와 save', () async {
      final store = MemoryFinanceProfileStore();
      const profile = ApplicantProfile(age: 25);
      await SaveProfileUseCase(store)(profile);
      expect(await LoadProfileUseCase(store)(), profile);
    });
  });

  group('ResolveSavedSchemeIdsUseCase', () {
    test('회원·merge 실패면 FinanceUserMessage 전파', () async {
      final local = MemorySavedSchemeLocalStore(['local1']);
      final repo = FakeFinanceRepository(mergeError: const FinanceUserMessage('merge 실패'));
      expect(
        ResolveSavedSchemeIdsUseCase(repo, local)(isMember: true),
        throwsA(isA<FinanceUserMessage>()),
      );
    });

    test('비회원: 로컬 id 만', () async {
      final local = MemorySavedSchemeLocalStore(['a', 'b']);
      final repo = FakeFinanceRepository();
      final ids = await ResolveSavedSchemeIdsUseCase(repo, local)(isMember: false);
      expect(ids, ['a', 'b']);
      expect(repo.mergeCalls, isEmpty);
    });

    test('회원·로컬 비어 있음: 서버 id', () async {
      final repo = FakeFinanceRepository(savedIds: ['s1']);
      final ids = await ResolveSavedSchemeIdsUseCase(repo, MemorySavedSchemeLocalStore())(isMember: true);
      expect(ids, ['s1']);
    });

    test('회원·로컬 있음: merge 후 로컬 비우고 서버 목록', () async {
      final local = MemorySavedSchemeLocalStore(['local1']);
      final repo = FakeFinanceRepository(savedIds: ['server']);
      final ids = await ResolveSavedSchemeIdsUseCase(repo, local)(isMember: true);
      expect(repo.mergeCalls, [
        ['local1'],
      ]);
      expect(await local.load(), isEmpty);
      expect(ids, contains('local1'));
    });
  });

  group('ToggleSavedSchemeUseCase', () {
    test('상한 초과면 error', () async {
      final ids = [for (var i = 0; i < SavedSchemeLocalStore.maxCount; i++) 'n$i'];
      final uc = ToggleSavedSchemeUseCase(FakeFinanceRepository(), MemorySavedSchemeLocalStore());
      final r = await uc(id: 'new', isMember: false, currentIds: ids);
      expect(r.error, contains('${SavedSchemeLocalStore.maxCount}'));
      expect(r.ids, isNull);
    });

    test('회원: save API 실패면 ids 갱신 없음', () async {
      final repo = FakeFinanceRepository(saveError: const FinanceUserMessage('저장 실패'));
      final uc = ToggleSavedSchemeUseCase(repo, MemorySavedSchemeLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: []);
      expect(r.error, '저장 실패');
      expect(r.ids, isNull);
    });

    test('회원: unsave API 실패', () async {
      final repo = FakeFinanceRepository(unsaveError: const FinanceUserMessage('해제 실패'));
      final uc = ToggleSavedSchemeUseCase(repo, MemorySavedSchemeLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: ['n1']);
      expect(r.error, '해제 실패');
    });

    test('비회원: 추가하면 로컬에만 저장', () async {
      final local = MemorySavedSchemeLocalStore();
      final repo = FakeFinanceRepository();
      final uc = ToggleSavedSchemeUseCase(repo, local);
      final r = await uc(id: 'n1', isMember: false, currentIds: []);
      expect(r.error, isNull);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['n1']);
      expect(repo.saveCalls, isEmpty);
    });

    test('비회원: 제거', () async {
      final local = MemorySavedSchemeLocalStore(['n1', 'n2']);
      final uc = ToggleSavedSchemeUseCase(FakeFinanceRepository(), local);
      final r = await uc(id: 'n1', isMember: false, currentIds: ['n1', 'n2']);
      expect(r.ids, ['n2']);
    });

    test('회원: save 성공 시 로컬 replace 하지 않음', () async {
      final local = MemorySavedSchemeLocalStore(['old']);
      final repo = FakeFinanceRepository();
      final r = await ToggleSavedSchemeUseCase(repo, local)(id: 'n1', isMember: true, currentIds: []);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['old']);
      expect(repo.saveCalls, ['n1']);
    });

    test('이미 있는 id 를 다시 누르면 제거', () async {
      final uc = ToggleSavedSchemeUseCase(FakeFinanceRepository(), MemorySavedSchemeLocalStore(['a', 'b']));
      final r = await uc(id: 'a', isMember: false, currentIds: ['a', 'b']);
      expect(r.ids, ['b']);
    });
  });

  group('LoadSavedSchemeSummariesUseCase', () {
    test('id 가 비어 있으면 빈 목록', () async {
      final repo = FakeFinanceRepository();
      final uc = LoadSavedSchemeSummariesUseCase(repo, GetSchemeDetailUseCase(repo));
      final list = await uc(ids: [], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
      expect(list.total, 0);
    });

    test('비회원: getScheme 가 FinanceUserMessage 이면 전파한다', () async {
      final inner = FakeFinanceRepository(getSchemeError: const FinanceUserMessage('상세 실패'));
      final repo = MappingFinanceRepository(inner);
      final uc = LoadSavedSchemeSummariesUseCase(repo, GetSchemeDetailUseCase(repo));
      expect(
        uc(ids: ['bad'], profile: ApplicantProfile.empty, isMember: false),
        throwsA(isA<FinanceUserMessage>()),
      );
    });

    test('회원: fetchSaved 실패 전파', () {
      final repo = FakeFinanceRepository(fetchSavedError: const FinanceUserMessage('목록 실패'));
      final uc = LoadSavedSchemeSummariesUseCase(repo, GetSchemeDetailUseCase(repo));
      expect(
        uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true),
        throwsA(isA<FinanceUserMessage>()),
      );
    });

    test('비회원: 없는 공고는 건너뛴다', () async {
      final inner = FakeFinanceRepository();
      final repo = MappingFinanceRepository(inner);
      final uc = LoadSavedSchemeSummariesUseCase(repo, GetSchemeDetailUseCase(repo));
      final list = await uc(ids: ['missing'], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
    });

    test('회원: fetchSaved', () async {
      final repo = FakeFinanceRepository(
        pages: [SchemePage.fromJson(schemePageJson(items: [schemeSummaryJson(id: 's1')]))],
        savedIds: ['s1'],
      );
      final uc = LoadSavedSchemeSummariesUseCase(repo, GetSchemeDetailUseCase(repo));
      final list = await uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true);
      expect(list.items.single.id, 's1');
    });
  });

  group('LoadSimilarSchemesUseCase', () {
    test('search 실패 전파', () {
      final repo = FakeFinanceRepository(searchError: const ApiException('similar fail'));
      expect(
        LoadSimilarSchemesUseCase(repo)(
          excludeId: 'n0',
          productTypeId: 'housing',
          profile: ApplicantProfile.empty,
        ),
        throwsA(isA<ApiException>()),
      );
    });

    test('같은 supplyType 검색에서 자신과 최대 5개', () async {
      final items = [for (var i = 0; i < 10; i++) schemeSummaryJson(id: 'n$i', title: 't$i')];
      final repo = FakeFinanceRepository(
        pages: [SchemePage.fromJson(schemePageJson(items: items))],
      );
      final similar = await LoadSimilarSchemesUseCase(repo)(
        excludeId: 'n0',
        productTypeId: 'housing',
        profile: ApplicantProfile.empty,
      );
      expect(similar, hasLength(5));
      expect(similar.any((n) => n.id == 'n0'), isFalse);
    });
  });

  group('LoadScheduleSchemesUseCase', () {
    test('2페이지 조회 실패면 예외 전파', () async {
      late FakeFinanceRepository repo;
      repo = FakeFinanceRepository(
        pages: [
          SchemePage.fromJson(schemePageJson(items: [schemeSummaryJson(id: 'a')], page: 1, totalPages: 3)),
          SchemePage.fromJson(schemePageJson(items: [schemeSummaryJson(id: 'b')], page: 2, totalPages: 3)),
        ],
        searchHook: (_, page) {
          if (page == 2) throw const ApiException('page2 fail');
          return Future.value(repo.pages[page - 1]);
        },
      );
      expect(
        LoadScheduleSchemesUseCase(repo)(profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('여러 페이지를 dedup 하며 합친다', () async {
      final repo = FakeFinanceRepository(
        pages: [
          SchemePage.fromJson(
            schemePageJson(
              items: [schemeSummaryJson(id: 'a'), schemeSummaryJson(id: 'b')],
              page: 1,
              totalPages: 2,
            ),
          ),
          SchemePage.fromJson(
            schemePageJson(
              items: [schemeSummaryJson(id: 'b'), schemeSummaryJson(id: 'c')],
              page: 2,
              totalPages: 2,
            ),
          ),
        ],
      );
      final out = await LoadScheduleSchemesUseCase(repo)(profile: ApplicantProfile.empty);
      expect(out.items.map((e) => e.id), ['a', 'b', 'c']);
      expect(repo.searchCalls.length, 2);
    });
  });
}
