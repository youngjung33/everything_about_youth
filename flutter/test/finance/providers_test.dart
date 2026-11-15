import 'dart:async';

import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:everything_about_youth/features/finance/data/saved_scheme_reminder_prefs.dart';
import 'package:everything_about_youth/features/finance/data/mapping_finance_repository.dart';
import 'package:everything_about_youth/features/finance/data/profile_store.dart';
import 'package:everything_about_youth/features/finance/data/saved_scheme_store.dart';
import 'package:everything_about_youth/features/finance/finance_container.dart';
import 'package:everything_about_youth/features/finance/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/finance/domain/failures.dart';
import 'package:everything_about_youth/features/finance/domain/finance_filters.dart';
import 'package:everything_about_youth/features/finance/domain/finance_scheme.dart';
import 'package:everything_about_youth/features/finance/presentation/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/finance_fixtures.dart';

SchemePage page(List<String> ids, {int total = 4, int pageNo = 1, int totalPages = 2}) => SchemePage.fromJson(
  schemePageJson(
    items: [for (final id in ids) schemeSummaryJson(id: id, title: '제도 $id')],
    total: total,
    page: pageNo,
    totalPages: totalPages,
  ),
);

Future<ProviderContainer> makeContainer(FakeFinanceRepository repo) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      financeContainerProvider.overrideWithValue(
        FinanceContainer.fromStores(
          repository: MappingFinanceRepository(repo),
          profileLocalStore: ProfileStore(prefs, cipher),
          savedSchemeLocalStore: SavedSchemeStore(prefs, cipher),
          reminderPrefs: SavedSchemeReminderPrefs(prefs),
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
    final repo = FakeFinanceRepository(
      pages: [
        page(['a', 'b']),
        page(['c', 'd'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});

    final first = await container.read(schemeListProvider.future);
    expect(first.items.map((e) => e.id), ['a', 'b']);
    expect(first.hasMore, isTrue);

    await container.read(schemeListProvider.notifier).loadMore();
    final all = container.read(schemeListProvider).requireValue;
    expect(all.items.map((e) => e.id), ['a', 'b', 'c', 'd']);
    expect(all.hasMore, isFalse);
    expect(repo.searchCalls.map((c) => c.page), [1, 2]);

    // 마지막 페이지에서는 더 요청하지 않는다.
    await container.read(schemeListProvider.notifier).loadMore();
    expect(repo.searchCalls, hasLength(2));
  });

  test('목록: 페이지 경계가 밀려 중복된 제도는 id 로 제거', () async {
    final repo = FakeFinanceRepository(
      pages: [
        page(['a', 'b']),
        page(['b', 'c'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});
    await container.read(schemeListProvider.future);

    await container.read(schemeListProvider.notifier).loadMore();
    expect(container.read(schemeListProvider).requireValue.items.map((e) => e.id), ['a', 'b', 'c']);
  });

  test('목록: 추가 로딩 실패해도 기존 목록은 유지하고 오류 문구를 보관', () async {
    final repo = FakeFinanceRepository(
      pages: [
        page(['a', 'b']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});
    await container.read(schemeListProvider.future);

    repo.searchError = const FinanceUserMessage(ApiUserMessages.networkUnavailable);
    await container.read(schemeListProvider.notifier).loadMore();

    final state = container.read(schemeListProvider).requireValue;
    expect(state.items, hasLength(2));
    expect(state.loadingMore, isFalse);
    expect(state.loadMoreError, ApiUserMessages.networkUnavailable);

    // 다시 시도하면 오류가 지워진다.
    repo.searchError = null;
    repo.pages.add(page(['c'], pageNo: 2));
    await container.read(schemeListProvider.notifier).loadMore();
    final retried = container.read(schemeListProvider).requireValue;
    expect(retried.loadMoreError, isNull);
    expect(retried.items, hasLength(3));
  });

  test('목록: 1페이지 실패는 오류 상태가 된다', () async {
    final repo = FakeFinanceRepository(searchError: const ApiException('요청에 실패했습니다. (HTTP 500)'));
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});

    await expectLater(container.read(schemeListProvider.future), throwsA(isA<FinanceUserMessage>()));
    expect(errorMessage(container.read(schemeListProvider).error!), ApiUserMessages.requestFailed);
  });

  test('필터를 바꾸면 1페이지부터 다시 조회한다', () async {
    final repo = FakeFinanceRepository(
      pages: [
        page(['a', 'b'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});
    await container.read(schemeListProvider.future);

    container.read(filtersProvider.notifier).apply(const FinanceFilters().copyWith(sidos: {'서울'}));
    await container.read(schemeListProvider.future);

    expect(repo.searchCalls, hasLength(2));
    expect(repo.searchCalls.last.filters.sidos, {'서울'});
    expect(repo.searchCalls.last.page, 1);
  });

  test('내 조건을 저장하면 목록을 다시 조회하고 서버 쿼리에 실린다', () async {
    final repo = FakeFinanceRepository(
      pages: [
        page(['a'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});
    await container.read(schemeListProvider.future);

    await container.read(profileProvider.notifier).save(const ApplicantProfile(age: 29));
    await container.read(schemeListProvider.future);

    expect(repo.searchCalls.last.profile.age, 29);
    // 기기에는 암호문으로 저장되고, 같은 키로만 풀린다.
    final stored = container.read(sharedPreferencesProvider).getString(ProfileStore.storageKey)!;
    expect(stored, isNot(contains('29')));
    final clear = await container.read(fieldCipherProvider).decrypt(stored, context: ProfileStore.cipherContext);
    expect(clear, contains('29'));
  });

  test('내 조건: 시작 작업이 읽어 둔 값이 provider 의 처음 값이 된다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 33, isHomeless: true));

    final container = ProviderContainer(
      overrides: [
        financeContainerProvider.overrideWithValue(
          FinanceContainer.fromStores(
            repository: MappingFinanceRepository(FakeFinanceRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedSchemeLocalStore: SavedSchemeStore(prefs, cipher),
            reminderPrefs: SavedSchemeReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    await container.read(financeContainerProvider).profileLocalStore.load();
    expect(container.read(profileProvider), const ApplicantProfile(age: 33, isHomeless: true));
  });

  test('내 조건: 읽기가 끝나기 전에 먼저 불러도, 끝나면 값이 반영된다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 41));

    final container = ProviderContainer(
      overrides: [
        financeContainerProvider.overrideWithValue(
          FinanceContainer.fromStores(
            repository: MappingFinanceRepository(FakeFinanceRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedSchemeLocalStore: SavedSchemeStore(prefs, cipher),
            reminderPrefs: SavedSchemeReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    expect(container.read(profileProvider).isEmpty, isTrue); // 아직 복호화 전
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
        financeContainerProvider.overrideWithValue(
          FinanceContainer.fromStores(
            repository: MappingFinanceRepository(FakeFinanceRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedSchemeLocalStore: SavedSchemeStore(prefs, cipher),
            reminderPrefs: SavedSchemeReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    container.read(profileProvider); // 읽기 시작
    await container.read(profileProvider.notifier).save(const ApplicantProfile(age: 22));
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(container.read(profileProvider).age, 22);
  });

  test('늦게 도착한 이전 조건의 추가 페이지 응답은 버린다', () async {
    final gate = Completer<SchemePage>();
    final repo = FakeFinanceRepository();
    repo.searchHook = (filters, pageNo) {
      if (pageNo == 2) return gate.future; // 이전 조건의 2페이지 응답은 일부러 지연
      final ids = filters.sidos.contains('경기') ? ['x', 'y'] : ['a', 'b'];
      return Future.value(page(ids, pageNo: 1, totalPages: 2));
    };
    final container = await makeContainer(repo);
    container.listen(schemeListProvider, (_, _) {});
    await container.read(schemeListProvider.future);

    final pending = container.read(schemeListProvider.notifier).loadMore();

    // 응답이 오기 전에 조건을 바꾼다.
    container.read(filtersProvider.notifier).apply(const FinanceFilters().copyWith(sidos: {'경기'}));
    final fresh = await container.read(schemeListProvider.future);
    expect(fresh.items.map((e) => e.id), ['x', 'y']);

    gate.complete(page(['c', 'd'], pageNo: 2));
    await pending;

    expect(container.read(schemeListProvider).requireValue.items.map((e) => e.id), ['x', 'y']);
  });

  test('상세: id 가 있으면 조회에 성공한다', () async {
    final repo = FakeFinanceRepository(detail: SchemeDetail.fromJson(schemeDetailJson()));
    final container = await makeContainer(repo);
    container.listen(schemeDetailProvider('b1'), (_, _) {});

    final detail = await container.read(schemeDetailProvider('b1').future);
    expect(detail.summary.id, 'b1');
  });

  test('상세: 없는 제도는 404 오류', () async {
    final container = await makeContainer(FakeFinanceRepository());
    container.listen(schemeDetailProvider('none'), (_, _) {});

    await expectLater(
      container.read(schemeDetailProvider('none').future),
      throwsA(isA<FinanceSchemeNotFound>()),
    );
  });

  test('errorMessage: 알 수 없는 오류는 일반 문구', () {
    expect(errorMessage(StateError('x')), '알 수 없는 오류가 발생했습니다.');
  });

  test('관심 제도: 비회원은 기기에 저장하고, 회원이 되면 서버에 합친다', () async {
    final repo = FakeFinanceRepository(
      pages: [
        page(['b1', 'n2']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(savedSchemesProvider, (_, _) {});

    expect(await container.read(savedSchemesProvider.future), isEmpty);
    expect(await container.read(savedSchemesProvider.notifier).toggle('b1'), isNull);
    expect(container.read(savedSchemesProvider).requireValue, ['b1']);
    expect(repo.saveCalls, isEmpty);

    await container.read(authModeProvider.notifier).set(AuthMode.member);
    expect(await container.read(savedSchemesProvider.future), ['b1']);
    expect(repo.mergeCalls, [
      ['b1'],
    ]);

    expect(await container.read(savedSchemesProvider.notifier).toggle('n2'), isNull);
    expect(repo.saveCalls, ['n2']);
    expect(container.read(savedSchemesProvider).requireValue, ['n2', 'b1']);
  });

  test('관심 제도: 회원 save API 실패면 문구를 돌려주고 목록은 그대로', () async {
    final repo = FakeFinanceRepository(
      pages: [page(['b1'])],
      saveError: const FinanceUserMessage('저장 실패'),
    );
    final container = await makeContainer(repo);
    container.listen(savedSchemesProvider, (_, _) {});
    await container.read(authModeProvider.notifier).set(AuthMode.member);
    await container.read(savedSchemesProvider.future);

    expect(await container.read(savedSchemesProvider.notifier).toggle('b1'), '저장 실패');
    expect(container.read(savedSchemesProvider).requireValue, isEmpty);
  });

  test('관심 제도: 상한을 넘기면 안내하고 넣지 않는다', () async {
    final container = await makeContainer(FakeFinanceRepository());
    container.listen(savedSchemesProvider, (_, _) {});
    await container.read(savedSchemesProvider.future);
    for (var i = 0; i < 100; i++) {
      expect(await container.read(savedSchemesProvider.notifier).toggle('n$i'), isNull);
    }
    expect(await container.read(savedSchemesProvider.notifier).toggle('overflow'), '관심 제도는 100개까지 저장할 수 있습니다.');
    expect(container.read(savedSchemesProvider).requireValue, hasLength(100));
  });
}
