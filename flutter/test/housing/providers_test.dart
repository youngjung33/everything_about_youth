import 'dart:async';

import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:everything_about_youth/features/housing/data/mapping_housing_repository.dart';
import 'package:everything_about_youth/features/housing/domain/failures.dart';
import 'package:everything_about_youth/features/housing/presentation/providers.dart';
import 'package:everything_about_youth/features/housing/data/profile_store.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fixtures.dart';

NoticePage page(List<String> ids, {int total = 4, int pageNo = 1, int totalPages = 2}) => NoticePage.fromJson(
  pageJson(
    items: [for (final id in ids) summaryJson(id: id, title: '공고 $id')],
    total: total,
    page: pageNo,
    totalPages: totalPages,
  ),
);

Future<ProviderContainer> makeContainer(FakeHousingRepository repo) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      housingRepositoryProvider.overrideWithValue(MappingHousingRepository(repo)),
      sharedPreferencesProvider.overrideWithValue(prefs),
      fieldCipherProvider.overrideWithValue(AesGcmFieldCipher(MemoryCipherKeyStore())),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  test('목록: 1페이지를 불러오고 더 불러오면 이어 붙인다', () async {
    final repo = FakeHousingRepository(
      pages: [
        page(['a', 'b']),
        page(['c', 'd'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});

    final first = await container.read(noticeListProvider.future);
    expect(first.items.map((e) => e.id), ['a', 'b']);
    expect(first.hasMore, isTrue);

    await container.read(noticeListProvider.notifier).loadMore();
    final all = container.read(noticeListProvider).requireValue;
    expect(all.items.map((e) => e.id), ['a', 'b', 'c', 'd']);
    expect(all.hasMore, isFalse);
    expect(repo.searchCalls.map((c) => c.page), [1, 2]);

    // 마지막 페이지에서는 더 요청하지 않는다.
    await container.read(noticeListProvider.notifier).loadMore();
    expect(repo.searchCalls, hasLength(2));
  });

  test('목록: 페이지 경계가 밀려 중복된 공고는 id 로 제거', () async {
    final repo = FakeHousingRepository(
      pages: [
        page(['a', 'b']),
        page(['b', 'c'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});
    await container.read(noticeListProvider.future);

    await container.read(noticeListProvider.notifier).loadMore();
    expect(container.read(noticeListProvider).requireValue.items.map((e) => e.id), ['a', 'b', 'c']);
  });

  test('목록: 추가 로딩 실패해도 기존 목록은 유지하고 오류 문구를 보관', () async {
    final repo = FakeHousingRepository(
      pages: [
        page(['a', 'b']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});
    await container.read(noticeListProvider.future);

    repo.searchError = const ApiException('서버에 연결할 수 없습니다.');
    await container.read(noticeListProvider.notifier).loadMore();

    final state = container.read(noticeListProvider).requireValue;
    expect(state.items, hasLength(2));
    expect(state.loadingMore, isFalse);
    expect(state.loadMoreError, '서버에 연결할 수 없습니다.');

    // 다시 시도하면 오류가 지워진다.
    repo.searchError = null;
    repo.pages.add(page(['c'], pageNo: 2));
    await container.read(noticeListProvider.notifier).loadMore();
    final retried = container.read(noticeListProvider).requireValue;
    expect(retried.loadMoreError, isNull);
    expect(retried.items, hasLength(3));
  });

  test('목록: 1페이지 실패는 오류 상태가 된다', () async {
    final repo = FakeHousingRepository(searchError: const ApiException('요청에 실패했습니다. (HTTP 500)'));
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});

    await expectLater(container.read(noticeListProvider.future), throwsA(isA<HousingUserMessage>()));
    expect(errorMessage(container.read(noticeListProvider).error!), '요청에 실패했습니다. (HTTP 500)');
  });

  test('필터를 바꾸면 1페이지부터 다시 조회한다', () async {
    final repo = FakeHousingRepository(
      pages: [
        page(['a', 'b'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});
    await container.read(noticeListProvider.future);

    container.read(filtersProvider.notifier).apply(const HousingFilters().copyWith(sidos: {'서울특별시'}));
    await container.read(noticeListProvider.future);

    expect(repo.searchCalls, hasLength(2));
    expect(repo.searchCalls.last.filters.sidos, {'서울특별시'});
    expect(repo.searchCalls.last.page, 1);
  });

  test('내 조건을 저장하면 목록을 다시 조회하고 서버 쿼리에 실린다', () async {
    final repo = FakeHousingRepository(
      pages: [
        page(['a'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});
    await container.read(noticeListProvider.future);

    await container.read(profileProvider.notifier).save(const ApplicantProfile(age: 29));
    await container.read(noticeListProvider.future);

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
        housingRepositoryProvider.overrideWithValue(FakeHousingRepository()),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    await container.read(profileStoreProvider).load();
    expect(container.read(profileProvider), const ApplicantProfile(age: 33, isHomeless: true));
  });

  test('내 조건: 읽기가 끝나기 전에 먼저 불러도, 끝나면 값이 반영된다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 41));

    final container = ProviderContainer(
      overrides: [
        housingRepositoryProvider.overrideWithValue(FakeHousingRepository()),
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
        housingRepositoryProvider.overrideWithValue(FakeHousingRepository()),
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
    final gate = Completer<NoticePage>();
    final repo = FakeHousingRepository();
    repo.searchHook = (filters, pageNo) {
      if (pageNo == 2) return gate.future; // 이전 조건의 2페이지 응답은 일부러 지연
      final ids = filters.sidos.contains('경기도') ? ['x', 'y'] : ['a', 'b'];
      return Future.value(page(ids, pageNo: 1, totalPages: 2));
    };
    final container = await makeContainer(repo);
    container.listen(noticeListProvider, (_, _) {});
    await container.read(noticeListProvider.future);

    final pending = container.read(noticeListProvider.notifier).loadMore();

    // 응답이 오기 전에 조건을 바꾼다.
    container.read(filtersProvider.notifier).apply(const HousingFilters().copyWith(sidos: {'경기도'}));
    final fresh = await container.read(noticeListProvider.future);
    expect(fresh.items.map((e) => e.id), ['x', 'y']);

    gate.complete(page(['c', 'd'], pageNo: 2));
    await pending;

    expect(container.read(noticeListProvider).requireValue.items.map((e) => e.id), ['x', 'y']);
  });

  test('상세: 내 조건이 바뀌면 다시 조회한다', () async {
    final repo = FakeHousingRepository(detail: NoticeDetail.fromJson(detailJson()));
    final container = await makeContainer(repo);
    container.listen(noticeDetailProvider('n1'), (_, _) {});

    final detail = await container.read(noticeDetailProvider('n1').future);
    expect(detail.summary.id, 'n1');
  });

  test('상세: 없는 공고는 404 오류', () async {
    final container = await makeContainer(FakeHousingRepository());
    container.listen(noticeDetailProvider('none'), (_, _) {});

    await expectLater(
      container.read(noticeDetailProvider('none').future),
      throwsA(isA<HousingNoticeNotFound>()),
    );
  });

  test('errorMessage: 알 수 없는 오류는 일반 문구', () {
    expect(errorMessage(StateError('x')), '알 수 없는 오류가 발생했습니다.');
  });

  test('관심 공고: 비회원은 기기에 저장하고, 회원이 되면 서버에 합친다', () async {
    final repo = FakeHousingRepository(
      pages: [
        page(['n1', 'n2']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(savedNoticesProvider, (_, _) {});

    expect(await container.read(savedNoticesProvider.future), isEmpty);
    expect(await container.read(savedNoticesProvider.notifier).toggle('n1'), isNull);
    expect(container.read(savedNoticesProvider).requireValue, ['n1']);
    expect(repo.saveCalls, isEmpty);

    await container.read(authModeProvider.notifier).set(AuthMode.member);
    expect(await container.read(savedNoticesProvider.future), ['n1']);
    expect(repo.mergeCalls, [
      ['n1'],
    ]);

    expect(await container.read(savedNoticesProvider.notifier).toggle('n2'), isNull);
    expect(repo.saveCalls, ['n2']);
    expect(container.read(savedNoticesProvider).requireValue, ['n2', 'n1']);
  });

  test('관심 공고: 상한을 넘기면 안내하고 넣지 않는다', () async {
    final container = await makeContainer(FakeHousingRepository());
    container.listen(savedNoticesProvider, (_, _) {});
    await container.read(savedNoticesProvider.future);
    for (var i = 0; i < 100; i++) {
      expect(await container.read(savedNoticesProvider.notifier).toggle('n$i'), isNull);
    }
    expect(await container.read(savedNoticesProvider.notifier).toggle('overflow'), '관심 공고는 100개까지 저장할 수 있습니다.');
    expect(container.read(savedNoticesProvider).requireValue, hasLength(100));
  });
}
