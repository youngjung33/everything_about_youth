import 'dart:async';

import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:everything_about_youth/features/living/data/saved_guide_reminder_prefs.dart';
import 'package:everything_about_youth/features/living/data/mapping_living_repository.dart';
import 'package:everything_about_youth/features/living/data/profile_store.dart';
import 'package:everything_about_youth/features/living/data/saved_guide_store.dart';
import 'package:everything_about_youth/features/living/living_container.dart';
import 'package:everything_about_youth/features/living/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/living/domain/failures.dart';
import 'package:everything_about_youth/features/living/domain/living_filters.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
import 'package:everything_about_youth/features/living/presentation/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/living_fixtures.dart';

GuidePage page(List<String> ids, {int total = 4, int pageNo = 1, int totalPages = 2}) => GuidePage.fromJson(
  guidePageJson(
    items: [for (final id in ids) guideSummaryJson(id: id, title: '안내 $id')],
    total: total,
    page: pageNo,
    totalPages: totalPages,
  ),
);

Future<ProviderContainer> makeContainer(FakeLivingRepository repo) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      livingContainerProvider.overrideWithValue(
        LivingContainer.fromStores(
          repository: MappingLivingRepository(repo),
          profileLocalStore: ProfileStore(prefs, cipher),
          savedGuideLocalStore: SavedGuideStore(prefs, cipher),
          reminderPrefs: SavedGuideReminderPrefs(prefs),
        ),
      ),
      sharedPreferencesProvider.overrideWithValue(prefs),
      fieldCipherProvider.overrideWithValue(cipher),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  test('목록: 1페이지를 불러오고 더 불러오면 이어 붙인다', () async {
    final repo = FakeLivingRepository(
      pages: [
        page(['a', 'b']),
        page(['c', 'd'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});

    final first = await container.read(guideListProvider.future);
    expect(first.items.map((e) => e.id), ['a', 'b']);
    expect(first.hasMore, isTrue);

    await container.read(guideListProvider.notifier).loadMore();
    final all = container.read(guideListProvider).requireValue;
    expect(all.items.map((e) => e.id), ['a', 'b', 'c', 'd']);
    expect(all.hasMore, isFalse);
    expect(repo.searchCalls.map((c) => c.page), [1, 2]);

    // 마지막 페이지에서는 더 요청하지 않는다.
    await container.read(guideListProvider.notifier).loadMore();
    expect(repo.searchCalls, hasLength(2));
  });

  test('목록: 페이지 경계가 밀려 중복된 안내는 id 로 제거', () async {
    final repo = FakeLivingRepository(
      pages: [
        page(['a', 'b']),
        page(['b', 'c'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});
    await container.read(guideListProvider.future);

    await container.read(guideListProvider.notifier).loadMore();
    expect(container.read(guideListProvider).requireValue.items.map((e) => e.id), ['a', 'b', 'c']);
  });

  test('목록: 추가 로딩 실패해도 기존 목록은 유지하고 오류 문구를 보관', () async {
    final repo = FakeLivingRepository(
      pages: [
        page(['a', 'b']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});
    await container.read(guideListProvider.future);

    repo.searchError = const LivingUserMessage(ApiUserMessages.networkUnavailable);
    await container.read(guideListProvider.notifier).loadMore();

    final state = container.read(guideListProvider).requireValue;
    expect(state.items, hasLength(2));
    expect(state.loadingMore, isFalse);
    expect(state.loadMoreError, ApiUserMessages.networkUnavailable);

    // 다시 시도하면 오류가 지워진다.
    repo.searchError = null;
    repo.pages.add(page(['c'], pageNo: 2));
    await container.read(guideListProvider.notifier).loadMore();
    final retried = container.read(guideListProvider).requireValue;
    expect(retried.loadMoreError, isNull);
    expect(retried.items, hasLength(3));
  });

  test('목록: 1페이지 실패는 오류 상태가 된다', () async {
    final repo = FakeLivingRepository(searchError: const ApiException('요청에 실패했습니다. (HTTP 500)'));
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});

    await expectLater(container.read(guideListProvider.future), throwsA(isA<LivingUserMessage>()));
    expect(errorMessage(container.read(guideListProvider).error!), ApiUserMessages.requestFailed);
  });

  test('필터를 바꾸면 1페이지부터 다시 조회한다', () async {
    final repo = FakeLivingRepository(
      pages: [
        page(['a', 'b'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});
    await container.read(guideListProvider.future);

    container.read(filtersProvider.notifier).apply(const LivingFilters().copyWith(sidos: {'서울'}));
    await container.read(guideListProvider.future);

    expect(repo.searchCalls, hasLength(2));
    expect(repo.searchCalls.last.filters.sidos, {'서울'});
    expect(repo.searchCalls.last.page, 1);
  });

  test('내 조건을 저장하면 목록을 다시 조회하고 서버 쿼리에 실린다', () async {
    final repo = FakeLivingRepository(
      pages: [
        page(['a'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});
    await container.read(guideListProvider.future);

    await container.read(profileProvider.notifier).save(const ApplicantProfile(residenceSido: '서울'));
    await container.read(guideListProvider.future);

    expect(repo.searchCalls.last.profile.residenceSido, '서울');
    // 기기에는 암호문으로 저장되고, 같은 키로만 풀린다.
    final stored = container.read(sharedPreferencesProvider).getString(ProfileStore.storageKey)!;
    expect(stored, isNot(contains('서울')));
    final clear = await container.read(fieldCipherProvider).decrypt(stored, context: ProfileStore.cipherContext);
    expect(clear, contains('서울'));
  });

  test('내 조건: 시작 작업이 읽어 둔 값이 provider 의 처음 값이 된다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 33, residenceSido: '서울'));

    final container = ProviderContainer(
      overrides: [
        livingContainerProvider.overrideWithValue(
          LivingContainer.fromStores(
            repository: MappingLivingRepository(FakeLivingRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedGuideLocalStore: SavedGuideStore(prefs, cipher),
            reminderPrefs: SavedGuideReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    await container.read(livingContainerProvider).profileLocalStore.load();
    expect(container.read(profileProvider), const ApplicantProfile(age: 33, residenceSido: '서울'));
  });

  test('내 조건: 읽기가 끝나기 전에 먼저 불러도, 끝나면 값이 반영된다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 41));

    final container = ProviderContainer(
      overrides: [
        livingContainerProvider.overrideWithValue(
          LivingContainer.fromStores(
            repository: MappingLivingRepository(FakeLivingRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedGuideLocalStore: SavedGuideStore(prefs, cipher),
            reminderPrefs: SavedGuideReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    expect(container.read(profileProvider).isEmpty, isTrue);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(container.read(profileProvider).age, 41);
  });

  test('내 조건: 사용자가 먼저 저장했다면 늦게 끝난 읽기가 덮어쓰지 않는다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 41));

    final container = ProviderContainer(
      overrides: [
        livingContainerProvider.overrideWithValue(
          LivingContainer.fromStores(
            repository: MappingLivingRepository(FakeLivingRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedGuideLocalStore: SavedGuideStore(prefs, cipher),
            reminderPrefs: SavedGuideReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    container.read(profileProvider);
    await container.read(profileProvider.notifier).save(const ApplicantProfile(age: 22));
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(container.read(profileProvider).age, 22);
  });





  test('늦게 도착한 이전 조건의 추가 페이지 응답은 버린다', () async {
    final gate = Completer<GuidePage>();
    final repo = FakeLivingRepository();
    repo.searchHook = (filters, pageNo) {
      if (pageNo == 2) return gate.future; // 이전 조건의 2페이지 응답은 일부러 지연
      final ids = filters.sidos.contains('경기') ? ['x', 'y'] : ['a', 'b'];
      return Future.value(page(ids, pageNo: 1, totalPages: 2));
    };
    final container = await makeContainer(repo);
    container.listen(guideListProvider, (_, _) {});
    await container.read(guideListProvider.future);

    final pending = container.read(guideListProvider.notifier).loadMore();

    // 응답이 오기 전에 조건을 바꾼다.
    container.read(filtersProvider.notifier).apply(const LivingFilters().copyWith(sidos: {'경기'}));
    final fresh = await container.read(guideListProvider.future);
    expect(fresh.items.map((e) => e.id), ['x', 'y']);

    gate.complete(page(['c', 'd'], pageNo: 2));
    await pending;

    expect(container.read(guideListProvider).requireValue.items.map((e) => e.id), ['x', 'y']);
  });

  test('상세: id 가 있으면 조회에 성공한다', () async {
    final repo = FakeLivingRepository(detail: GuideDetail.fromJson(guideDetailJson()));
    final container = await makeContainer(repo);
    container.listen(guideDetailProvider('b1'), (_, _) {});

    final detail = await container.read(guideDetailProvider('b1').future);
    expect(detail.summary.id, 'b1');
  });

  test('상세: 없는 안내는 404 오류', () async {
    final container = await makeContainer(FakeLivingRepository());
    container.listen(guideDetailProvider('none'), (_, _) {});

    await expectLater(
      container.read(guideDetailProvider('none').future),
      throwsA(isA<LivingGuideNotFound>()),
    );
  });

  test('errorMessage: 알 수 없는 오류는 일반 문구', () {
    expect(errorMessage(StateError('x')), '알 수 없는 오류가 발생했습니다.');
  });

  test('관심 안내: 비회원은 기기에 저장하고, 회원이 되면 서버에 합친다', () async {
    final repo = FakeLivingRepository(
      pages: [
        page(['b1', 'n2']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(savedGuidesProvider, (_, _) {});

    expect(await container.read(savedGuidesProvider.future), isEmpty);
    expect(await container.read(savedGuidesProvider.notifier).toggle('b1'), isNull);
    expect(container.read(savedGuidesProvider).requireValue, ['b1']);
    expect(repo.saveCalls, isEmpty);

    await container.read(authModeProvider.notifier).set(AuthMode.member);
    expect(await container.read(savedGuidesProvider.future), ['b1']);
    expect(repo.mergeCalls, [
      ['b1'],
    ]);

    expect(await container.read(savedGuidesProvider.notifier).toggle('n2'), isNull);
    expect(repo.saveCalls, ['n2']);
    expect(container.read(savedGuidesProvider).requireValue, ['n2', 'b1']);
  });

  test('관심 안내: 회원 save API 실패면 문구를 돌려주고 목록은 그대로', () async {
    final repo = FakeLivingRepository(
      pages: [page(['b1'])],
      saveError: const LivingUserMessage('저장 실패'),
    );
    final container = await makeContainer(repo);
    container.listen(savedGuidesProvider, (_, _) {});
    await container.read(authModeProvider.notifier).set(AuthMode.member);
    await container.read(savedGuidesProvider.future);

    expect(await container.read(savedGuidesProvider.notifier).toggle('b1'), '저장 실패');
    expect(container.read(savedGuidesProvider).requireValue, isEmpty);
  });

  test('관심 안내: 상한을 넘기면 안내하고 넣지 않는다', () async {
    final container = await makeContainer(FakeLivingRepository());
    container.listen(savedGuidesProvider, (_, _) {});
    await container.read(savedGuidesProvider.future);
    for (var i = 0; i < 100; i++) {
      expect(await container.read(savedGuidesProvider.notifier).toggle('n$i'), isNull);
    }
    expect(await container.read(savedGuidesProvider.notifier).toggle('overflow'), '관심 안내는 100개까지 저장할 수 있습니다.');
    expect(container.read(savedGuidesProvider).requireValue, hasLength(100));
  });
}
