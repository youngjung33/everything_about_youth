import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/living/data/mapping_living_repository.dart';
import 'package:everything_about_youth/features/living/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/living/domain/failures.dart';
import 'package:everything_about_youth/features/living/domain/living_filters.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
import 'package:everything_about_youth/features/living/domain/repositories/saved_guide_local_store.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/get_guide_detail.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/load_living_meta.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/load_profile.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/load_saved_guide_summaries.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/load_schedule_schemes.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/load_similar_schemes.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/resolve_saved_guide_ids.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/save_profile.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/search_guides.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/toggle_saved_guide.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/living_fixtures.dart';
import '../../support/living_memory_stores.dart';

void main() {
  group('SearchGuidesUseCase', () {
    test('repository ĂÂĂÂĂÂ¤ÄĹ¤ĂËĂÂÄĹ¤ĂÂĂÂ ĂÂĂÂĂÂ¸ÄĹ¤ĂÂĂÂÄĹ¤ĂÂĂÂ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂÄÂ­ĂÂĂÂÄĹ¤ĂÂĂÂ¤', () {
      final repo = FakeLivingRepository(searchError: const ApiException('fail'));
      final uc = SearchGuidesUseCase(repo);
      expect(uc(filters: LivingFilters.initial, profile: ApplicantProfile.empty), throwsA(isA<ApiException>()));
    });

    test('repository search ÄĹ¤ĂËÄšĹ ĂÂĂÂĂÂĂÂĂÂĂÂÄÂ­ĂÂĂÂÄĹ¤ĂÂĂÂ¤', () async {
      final repo = FakeLivingRepository(pages: [GuidePage.fromJson(guidePageJson(items: [guideSummaryJson()]))]);
      final uc = SearchGuidesUseCase(repo);
      final page = await uc(filters: LivingFilters.initial, profile: ApplicantProfile.empty);
      expect(page.items, hasLength(1));
      expect(repo.searchCalls.single.page, 1);
    });
  });

  group('LoadLivingMetaUseCase', () {
    test('fetchMeta ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂ', () {
      final repo = FakeLivingRepository(fetchMetaError: const ApiException('meta'));
      expect(LoadLivingMetaUseCase(repo)(), throwsA(isA<ApiException>()));
    });

    test('fetchMeta ĂÂĂÂĂÂĂÂĂÂĂÂ', () async {
      final repo = FakeLivingRepository();
      final meta = await LoadLivingMetaUseCase(repo)();
      expect(meta.sidos, isNotEmpty);
    });
  });

  group('GetGuideDetailUseCase', () {
    test('getGuide ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂ', () {
      final repo = FakeLivingRepository(getGuideError: const ApiException('detail fail'));
      expect(
        GetGuideDetailUseCase(repo)('x', profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('getGuide ĂÂĂÂĂÂĂÂĂÂĂÂ', () async {
      final repo = FakeLivingRepository(pages: [GuidePage.fromJson(guidePageJson(items: [guideSummaryJson(id: 'x')]))]);
      final detail = await GetGuideDetailUseCase(repo)('x', profile: ApplicantProfile.empty);
      expect(detail.summary.id, 'x');
    });
  });

  group('LoadProfileUseCase / SaveProfileUseCase', () {
    test('load ĂÂĂÂĂÂ save', () async {
      final store = MemoryFinanceProfileStore();
      const profile = ApplicantProfile(age: 25);
      await SaveProfileUseCase(store)(profile);
      expect(await LoadProfileUseCase(store)(), profile);
    });
  });

  group('ResolveSavedGuideIdsUseCase', () {
    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂÄÂĂÂmerge ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ÄĹ¤ÄšÂ ĂÂ´ LivingUserMessage ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂ', () async {
      final local = MemorySavedGuideLocalStore(['local1']);
      final repo = FakeLivingRepository(mergeError: const LivingUserMessage('merge ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨'));
      expect(
        ResolveSavedGuideIdsUseCase(repo, local)(isMember: true),
        throwsA(isA<LivingUserMessage>()),
      );
    });

    test('ÄĹ¤ÄšÄĂÂÄÂ­ĂÂĂÂĂÂĂÂĂÂ: ÄĹ¤ĂÂĂÂĂÂÄšÄ˝ÄšĹĄ id ÄĹ¤ĂÂ§ĂÂ', () async {
      final local = MemorySavedGuideLocalStore(['a', 'b']);
      final repo = FakeLivingRepository();
      final ids = await ResolveSavedGuideIdsUseCase(repo, local)(isMember: false);
      expect(ids, ['a', 'b']);
      expect(repo.mergeCalls, isEmpty);
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂÄÂĂÂÄĹ¤ĂÂĂÂĂÂÄšÄ˝ÄšĹĄ ÄĹ¤ÄšÄĂÂĂÂĂÂĂÂ´ ĂÂĂÂĂÂĂÂĂÂĂÂ: ĂÂĂÂĂÂÄĹ¤ĂÂĂÂ id', () async {
      final repo = FakeLivingRepository(savedIds: ['s1']);
      final ids = await ResolveSavedGuideIdsUseCase(repo, MemorySavedGuideLocalStore())(isMember: true);
      expect(ids, ['s1']);
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂÄÂĂÂÄĹ¤ĂÂĂÂĂÂÄšÄ˝ÄšĹĄ ĂÂĂÂĂÂĂÂĂÂĂÂ: merge ÄÂ­ĂÂĂÂ ÄĹ¤ĂÂĂÂĂÂÄšÄ˝ÄšĹĄ ÄĹ¤ÄšÄĂÂĂÂĂÂĂÂ°ĂÂÄšÂĂÂ  ĂÂĂÂĂÂÄĹ¤ĂÂĂÂ ÄĹ¤ÄšÂÄšÂ ÄĹ¤ĂÂĂÂ', () async {
      final local = MemorySavedGuideLocalStore(['local1']);
      final repo = FakeLivingRepository(savedIds: ['server']);
      final ids = await ResolveSavedGuideIdsUseCase(repo, local)(isMember: true);
      expect(repo.mergeCalls, [
        ['local1'],
      ]);
      expect(await local.load(), isEmpty);
      expect(ids, contains('local1'));
    });
  });

  group('ToggleSavedGuideUseCase', () {
    test('ĂÂĂÂĂÂÄÂ­ĂÂĂÂ ĂÂĂÂ´ĂÂĂÂÄšÂÄšĹÄĹ¤ÄšÂ ĂÂ´ error', () async {
      final ids = [for (var i = 0; i < SavedGuideLocalStore.maxCount; i++) 'n$i'];
      final uc = ToggleSavedGuideUseCase(FakeLivingRepository(), MemorySavedGuideLocalStore());
      final r = await uc(id: 'new', isMember: false, currentIds: ids);
      expect(r.error, contains('${SavedGuideLocalStore.maxCount}'));
      expect(r.ids, isNull);
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂ: save API ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ÄĹ¤ÄšÂ ĂÂ´ ids ĂÂĂÂ°ĂÂĂÂĂÂĂÂ  ĂÂĂÂĂÂĂÂĂÂĂÂ', () async {
      final repo = FakeLivingRepository(saveError: const LivingUserMessage('ĂÂĂÂ ĂÂĂÂĂÂĂË ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨'));
      final uc = ToggleSavedGuideUseCase(repo, MemorySavedGuideLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: []);
      expect(r.error, 'ĂÂĂÂ ĂÂĂÂĂÂĂË ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨');
      expect(r.ids, isNull);
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂ: unsave API ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨', () async {
      final repo = FakeLivingRepository(unsaveError: const LivingUserMessage('ÄÂ­ĂÂĂÂ´ĂÂĂÂ ĂÂ ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨'));
      final uc = ToggleSavedGuideUseCase(repo, MemorySavedGuideLocalStore());
      final r = await uc(id: 'n1', isMember: true, currentIds: ['n1']);
      expect(r.error, 'ÄÂ­ĂÂĂÂ´ĂÂĂÂ ĂÂ ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨');
    });

    test('ÄĹ¤ÄšÄĂÂÄÂ­ĂÂĂÂĂÂĂÂĂÂ: ĂÂÄšÂĂÂĂÂĂÂ°ĂÂÄÂ­ĂÂĂÂÄĹ¤ÄšÂ ĂÂ´ ÄĹ¤ĂÂĂÂĂÂÄšÄ˝ÄšĹĄĂÂĂÂĂÂÄĹ¤ĂÂ§ĂÂ ĂÂĂÂ ĂÂĂÂĂÂĂË', () async {
      final local = MemorySavedGuideLocalStore();
      final repo = FakeLivingRepository();
      final uc = ToggleSavedGuideUseCase(repo, local);
      final r = await uc(id: 'n1', isMember: false, currentIds: []);
      expect(r.error, isNull);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['n1']);
      expect(repo.saveCalls, isEmpty);
    });

    test('ÄĹ¤ÄšÄĂÂÄÂ­ĂÂĂÂĂÂĂÂĂÂ: ĂÂĂÂ ĂÂĂÂĂÂĂÂ°', () async {
      final local = MemorySavedGuideLocalStore(['n1', 'n2']);
      final uc = ToggleSavedGuideUseCase(FakeLivingRepository(), local);
      final r = await uc(id: 'n1', isMember: false, currentIds: ['n1', 'n2']);
      expect(r.ids, ['n2']);
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂ: save ĂÂĂÂĂÂĂÂÄšÂĂĹž ĂÂĂÂĂÂ ÄĹ¤ĂÂĂÂĂÂÄšÄ˝ÄšĹĄ replace ÄÂ­ĂÂĂÂĂÂĂÂ§ĂÂ ĂÂĂÂĂÂĂÂĂÂĂÂ', () async {
      final local = MemorySavedGuideLocalStore(['old']);
      final repo = FakeLivingRepository();
      final r = await ToggleSavedGuideUseCase(repo, local)(id: 'n1', isMember: true, currentIds: []);
      expect(r.ids, ['n1']);
      expect(await local.load(), ['old']);
      expect(repo.saveCalls, ['n1']);
    });

    test('ĂÂĂÂĂÂ´ÄĹ¤ÄšĹĽĂÂ¸ ĂÂĂÂĂÂÄĹ¤ĂÂĂÂ id ÄĹ¤ĂËÄšĹ ÄĹ¤ĂÂĂÂ¤ĂÂĂÂĂÂ ÄĹ¤ĂÂĂÂÄĹ¤ĂËĂÂ´ÄĹ¤ÄšÂ ĂÂ´ ĂÂĂÂ ĂÂĂÂĂÂĂÂ°', () async {
      final uc = ToggleSavedGuideUseCase(FakeLivingRepository(), MemorySavedGuideLocalStore(['a', 'b']));
      final r = await uc(id: 'a', isMember: false, currentIds: ['a', 'b']);
      expect(r.ids, ['b']);
    });
  });

  group('LoadSavedGuideSummariesUseCase', () {
    test('id ĂÂĂÂ°ĂÂ ÄĹ¤ÄšÄĂÂĂÂĂÂĂÂ´ ĂÂĂÂĂÂĂÂĂÂÄšĹÄĹ¤ÄšÂ ĂÂ´ ÄĹ¤ÄšÄĂÂ ÄĹ¤ÄšÂÄšÂ ÄĹ¤ĂÂĂÂ', () async {
      final repo = FakeLivingRepository();
      final uc = LoadSavedGuideSummariesUseCase(repo, GetGuideDetailUseCase(repo));
      final list = await uc(ids: [], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
      expect(list.total, 0);
    });

    test('ÄĹ¤ÄšÄĂÂÄÂ­ĂÂĂÂĂÂĂÂĂÂ: getGuide ĂÂĂÂ°ĂÂ LivingUserMessage ĂÂĂÂĂÂ´ÄĹ¤ÄšÂ ĂÂ´ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂÄÂ­ĂÂĂÂÄĹ¤ĂÂĂÂ¤', () async {
      final inner = FakeLivingRepository(getGuideError: const LivingUserMessage('ĂÂĂÂĂÂĂÂĂÂĂÂ¸ ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨'));
      final repo = MappingLivingRepository(inner);
      final uc = LoadSavedGuideSummariesUseCase(repo, GetGuideDetailUseCase(repo));
      expect(
        uc(ids: ['bad'], profile: ApplicantProfile.empty, isMember: false),
        throwsA(isA<LivingUserMessage>()),
      );
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂ: fetchSaved ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂ', () {
      final repo = FakeLivingRepository(fetchSavedError: const LivingUserMessage('ÄĹ¤ÄšÂÄšÂ ÄĹ¤ĂÂĂÂ ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨'));
      final uc = LoadSavedGuideSummariesUseCase(repo, GetGuideDetailUseCase(repo));
      expect(
        uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true),
        throwsA(isA<LivingUserMessage>()),
      );
    });

    test('ÄĹ¤ÄšÄĂÂÄÂ­ĂÂĂÂĂÂĂÂĂÂ: ĂÂĂÂĂÂÄĹ¤ĂÂĂÂ ĂÂÄšÂĂĹžĂÂÄšÂĂÂ ÄĹ¤ĂÂĂÂ ĂÂĂÂĂÂ´ÄĹ¤ĂÂĂÂÄĹ¤ĂÂĂÂ´ÄĹ¤ĂÂĂÂ¤', () async {
      final inner = FakeLivingRepository();
      final repo = MappingLivingRepository(inner);
      final uc = LoadSavedGuideSummariesUseCase(repo, GetGuideDetailUseCase(repo));
      final list = await uc(ids: ['missing'], profile: ApplicantProfile.empty, isMember: false);
      expect(list.items, isEmpty);
    });

    test('ÄÂ­ĂÂĂÂĂÂĂÂĂÂ: fetchSaved', () async {
      final repo = FakeLivingRepository(
        pages: [GuidePage.fromJson(guidePageJson(items: [guideSummaryJson(id: 's1')]))],
        savedIds: ['s1'],
      );
      final uc = LoadSavedGuideSummariesUseCase(repo, GetGuideDetailUseCase(repo));
      final list = await uc(ids: ['s1'], profile: ApplicantProfile.empty, isMember: true);
      expect(list.items.single.id, 's1');
    });
  });

  group('LoadSimilarGuidesUseCase', () {
    test('search ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂ', () {
      final repo = FakeLivingRepository(searchError: const ApiException('similar fail'));
      expect(
        LoadSimilarGuidesUseCase(repo)(
          excludeId: 'n0',
          procedureTypeId: 'housing',
          profile: ApplicantProfile.empty,
        ),
        throwsA(isA<ApiException>()),
      );
    });

    test('ĂÂĂÂ°ĂÂĂÂĂÂĂÂ supplyType ĂÂĂÂĂÂĂÂĂÂĂÂĂÂĂÂĂÂĂÂĂÂĂÂ ĂÂĂÂĂÂĂÂĂÂĂÂ ĂÂÄšÂÄšĹ ĂÂĂĹžĂÂÄĹ¤ĂÂĂÂ 5ĂÂĂÂ°ĂÂ', () async {
      final items = [for (var i = 0; i < 10; i++) guideSummaryJson(id: 'n$i', title: 't$i')];
      final repo = FakeLivingRepository(
        pages: [GuidePage.fromJson(guidePageJson(items: items))],
      );
      final similar = await LoadSimilarGuidesUseCase(repo)(
        excludeId: 'n0',
        procedureTypeId: 'housing',
        profile: ApplicantProfile.empty,
      );
      expect(similar, hasLength(5));
      expect(similar.any((n) => n.id == 'n0'), isFalse);
    });
  });

  group('LoadScheduleGuidesUseCase', () {
    test('2ÄÂ­ĂÂĂÂĂÂĂÂĂÂ´ĂÂĂÂ§ĂÂ ĂÂĂÂĂÂ°ÄÂ­ĂÂĂÂ ĂÂĂÂĂÂ¤ÄÂ­ĂÂĂÂ¨ÄĹ¤ÄšÂ ĂÂ´ ĂÂĂÂĂÂĂÂĂÂĂÂ¸ ĂÂĂÂ ĂÂÄÂ­ĂÂĂÂ', () async {
      late FakeLivingRepository repo;
      repo = FakeLivingRepository(
        pages: [
          GuidePage.fromJson(guidePageJson(items: [guideSummaryJson(id: 'a')], page: 1, totalPages: 3)),
          GuidePage.fromJson(guidePageJson(items: [guideSummaryJson(id: 'b')], page: 2, totalPages: 3)),
        ],
        searchHook: (_, page) {
          if (page == 2) throw const ApiException('page2 fail');
          return Future.value(repo.pages[page - 1]);
        },
      );
      expect(
        LoadScheduleGuidesUseCase(repo)(profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('ĂÂĂÂÄšĹĄÄĹ¤ĂÂÄšĹĄ ÄÂ­ĂÂĂÂĂÂĂÂĂÂ´ĂÂĂÂ§ĂÂÄĹ¤ĂËÄšĹ dedup ÄÂ­ĂÂĂÂÄĹ¤ÄšÂ ĂÂ° ÄÂ­ĂÂÄšÂ ĂÂÄšÄĂÂÄĹ¤ĂÂĂÂ¤', () async {
      final repo = FakeLivingRepository(
        pages: [
          GuidePage.fromJson(
            guidePageJson(
              items: [guideSummaryJson(id: 'a'), guideSummaryJson(id: 'b')],
              page: 1,
              totalPages: 2,
            ),
          ),
          GuidePage.fromJson(
            guidePageJson(
              items: [guideSummaryJson(id: 'b'), guideSummaryJson(id: 'c')],
              page: 2,
              totalPages: 2,
            ),
          ),
        ],
      );
      final out = await LoadScheduleGuidesUseCase(repo)(profile: ApplicantProfile.empty);
      expect(out.items.map((e) => e.id), ['a', 'b', 'c']);
      expect(repo.searchCalls.length, 2);
    });
  });
}
