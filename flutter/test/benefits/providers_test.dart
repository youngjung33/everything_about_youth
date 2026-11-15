import 'dart:async';

import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:everything_about_youth/features/benefits/data/saved_program_reminder_prefs.dart';
import 'package:everything_about_youth/features/benefits/data/mapping_benefits_repository.dart';
import 'package:everything_about_youth/features/benefits/data/profile_store.dart';
import 'package:everything_about_youth/features/benefits/data/saved_program_store.dart';
import 'package:everything_about_youth/features/benefits/benefits_container.dart';
import 'package:everything_about_youth/features/benefits/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/benefits/domain/failures.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_filters.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_program.dart';
import 'package:everything_about_youth/features/benefits/presentation/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/benefits_fixtures.dart';

ProgramPage page(List<String> ids, {int total = 4, int pageNo = 1, int totalPages = 2}) => ProgramPage.fromJson(
  programPageJson(
    items: [for (final id in ids) programSummaryJson(id: id, title: '정책 $id')],
    total: total,
    page: pageNo,
    totalPages: totalPages,
  ),
);

Future<ProviderContainer> makeContainer(FakeBenefitsRepository repo) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      benefitsContainerProvider.overrideWithValue(
        BenefitsContainer.fromStores(
          repository: MappingBenefitsRepository(repo),
          profileLocalStore: ProfileStore(prefs, cipher),
          savedProgramLocalStore: SavedProgramStore(prefs, cipher),
          reminderPrefs: SavedProgramReminderPrefs(prefs),
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
    final repo = FakeBenefitsRepository(
      pages: [
        page(['a', 'b']),
        page(['c', 'd'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});

    final first = await container.read(programListProvider.future);
    expect(first.items.map((e) => e.id), ['a', 'b']);
    expect(first.hasMore, isTrue);

    await container.read(programListProvider.notifier).loadMore();
    final all = container.read(programListProvider).requireValue;
    expect(all.items.map((e) => e.id), ['a', 'b', 'c', 'd']);
    expect(all.hasMore, isFalse);
    expect(repo.searchCalls.map((c) => c.page), [1, 2]);

    // 마지막 페이지에서는 더 요청하지 않는다.
    await container.read(programListProvider.notifier).loadMore();
    expect(repo.searchCalls, hasLength(2));
  });

  test('목록: 페이지 경계가 밀려 중복된 정책는 id 로 제거', () async {
    final repo = FakeBenefitsRepository(
      pages: [
        page(['a', 'b']),
        page(['b', 'c'], pageNo: 2),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});
    await container.read(programListProvider.future);

    await container.read(programListProvider.notifier).loadMore();
    expect(container.read(programListProvider).requireValue.items.map((e) => e.id), ['a', 'b', 'c']);
  });

  test('목록: 추가 로딩 실패해도 기존 목록은 유지하고 오류 문구를 보관', () async {
    final repo = FakeBenefitsRepository(
      pages: [
        page(['a', 'b']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});
    await container.read(programListProvider.future);

    repo.searchError = const BenefitsUserMessage(ApiUserMessages.networkUnavailable);
    await container.read(programListProvider.notifier).loadMore();

    final state = container.read(programListProvider).requireValue;
    expect(state.items, hasLength(2));
    expect(state.loadingMore, isFalse);
    expect(state.loadMoreError, ApiUserMessages.networkUnavailable);

    // 다시 시도하면 오류가 지워진다.
    repo.searchError = null;
    repo.pages.add(page(['c'], pageNo: 2));
    await container.read(programListProvider.notifier).loadMore();
    final retried = container.read(programListProvider).requireValue;
    expect(retried.loadMoreError, isNull);
    expect(retried.items, hasLength(3));
  });

  test('목록: 1페이지 실패는 오류 상태가 된다', () async {
    final repo = FakeBenefitsRepository(searchError: const ApiException('요청에 실패했습니다. (HTTP 500)'));
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});

    await expectLater(container.read(programListProvider.future), throwsA(isA<BenefitsUserMessage>()));
    expect(errorMessage(container.read(programListProvider).error!), ApiUserMessages.requestFailed);
  });

  test('필터를 바꾸면 1페이지부터 다시 조회한다', () async {
    final repo = FakeBenefitsRepository(
      pages: [
        page(['a', 'b'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});
    await container.read(programListProvider.future);

    container.read(filtersProvider.notifier).apply(const BenefitFilters().copyWith(sidos: {'서울'}));
    await container.read(programListProvider.future);

    expect(repo.searchCalls, hasLength(2));
    expect(repo.searchCalls.last.filters.sidos, {'서울'});
    expect(repo.searchCalls.last.page, 1);
  });

  test('내 조건을 저장하면 목록을 다시 조회하고 서버 쿼리에 실린다', () async {
    final repo = FakeBenefitsRepository(
      pages: [
        page(['a'], totalPages: 1),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});
    await container.read(programListProvider.future);

    await container.read(profileProvider.notifier).save(const ApplicantProfile(age: 29));
    await container.read(programListProvider.future);

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
        benefitsContainerProvider.overrideWithValue(
          BenefitsContainer.fromStores(
            repository: MappingBenefitsRepository(FakeBenefitsRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedProgramLocalStore: SavedProgramStore(prefs, cipher),
            reminderPrefs: SavedProgramReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(cipher),
      ],
    );
    addTearDown(container.dispose);

    await container.read(benefitsContainerProvider).profileLocalStore.load();
    expect(container.read(profileProvider), const ApplicantProfile(age: 33, isHomeless: true));
  });

  test('내 조건: 읽기가 끝나기 전에 먼저 불러도, 끝나면 값이 반영된다', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cipher = AesGcmFieldCipher(MemoryCipherKeyStore());
    await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 41));

    final container = ProviderContainer(
      overrides: [
        benefitsContainerProvider.overrideWithValue(
          BenefitsContainer.fromStores(
            repository: MappingBenefitsRepository(FakeBenefitsRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedProgramLocalStore: SavedProgramStore(prefs, cipher),
            reminderPrefs: SavedProgramReminderPrefs(prefs),
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
        benefitsContainerProvider.overrideWithValue(
          BenefitsContainer.fromStores(
            repository: MappingBenefitsRepository(FakeBenefitsRepository()),
            profileLocalStore: ProfileStore(prefs, cipher),
            savedProgramLocalStore: SavedProgramStore(prefs, cipher),
            reminderPrefs: SavedProgramReminderPrefs(prefs),
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
    final gate = Completer<ProgramPage>();
    final repo = FakeBenefitsRepository();
    repo.searchHook = (filters, pageNo) {
      if (pageNo == 2) return gate.future; // 이전 조건의 2페이지 응답은 일부러 지연
      final ids = filters.sidos.contains('경기') ? ['x', 'y'] : ['a', 'b'];
      return Future.value(page(ids, pageNo: 1, totalPages: 2));
    };
    final container = await makeContainer(repo);
    container.listen(programListProvider, (_, _) {});
    await container.read(programListProvider.future);

    final pending = container.read(programListProvider.notifier).loadMore();

    // 응답이 오기 전에 조건을 바꾼다.
    container.read(filtersProvider.notifier).apply(const BenefitFilters().copyWith(sidos: {'경기'}));
    final fresh = await container.read(programListProvider.future);
    expect(fresh.items.map((e) => e.id), ['x', 'y']);

    gate.complete(page(['c', 'd'], pageNo: 2));
    await pending;

    expect(container.read(programListProvider).requireValue.items.map((e) => e.id), ['x', 'y']);
  });

  test('상세: id 가 있으면 조회에 성공한다', () async {
    final repo = FakeBenefitsRepository(detail: ProgramDetail.fromJson(programDetailJson()));
    final container = await makeContainer(repo);
    container.listen(programDetailProvider('b1'), (_, _) {});

    final detail = await container.read(programDetailProvider('b1').future);
    expect(detail.summary.id, 'b1');
  });

  test('상세: 없는 정책는 404 오류', () async {
    final container = await makeContainer(FakeBenefitsRepository());
    container.listen(programDetailProvider('none'), (_, _) {});

    await expectLater(
      container.read(programDetailProvider('none').future),
      throwsA(isA<BenefitsProgramNotFound>()),
    );
  });

  test('errorMessage: 알 수 없는 오류는 일반 문구', () {
    expect(errorMessage(StateError('x')), '알 수 없는 오류가 발생했습니다.');
  });

  test('관심 정책: 비회원은 기기에 저장하고, 회원이 되면 서버에 합친다', () async {
    final repo = FakeBenefitsRepository(
      pages: [
        page(['b1', 'n2']),
      ],
    );
    final container = await makeContainer(repo);
    container.listen(savedProgramsProvider, (_, _) {});

    expect(await container.read(savedProgramsProvider.future), isEmpty);
    expect(await container.read(savedProgramsProvider.notifier).toggle('b1'), isNull);
    expect(container.read(savedProgramsProvider).requireValue, ['b1']);
    expect(repo.saveCalls, isEmpty);

    await container.read(authModeProvider.notifier).set(AuthMode.member);
    expect(await container.read(savedProgramsProvider.future), ['b1']);
    expect(repo.mergeCalls, [
      ['b1'],
    ]);

    expect(await container.read(savedProgramsProvider.notifier).toggle('n2'), isNull);
    expect(repo.saveCalls, ['n2']);
    expect(container.read(savedProgramsProvider).requireValue, ['n2', 'b1']);
  });

  test('관심 정책: 회원 save API 실패면 문구를 돌려주고 목록은 그대로', () async {
    final repo = FakeBenefitsRepository(
      pages: [page(['b1'])],
      saveError: const BenefitsUserMessage('저장 실패'),
    );
    final container = await makeContainer(repo);
    container.listen(savedProgramsProvider, (_, _) {});
    await container.read(authModeProvider.notifier).set(AuthMode.member);
    await container.read(savedProgramsProvider.future);

    expect(await container.read(savedProgramsProvider.notifier).toggle('b1'), '저장 실패');
    expect(container.read(savedProgramsProvider).requireValue, isEmpty);
  });

  test('관심 정책: 상한을 넘기면 안내하고 넣지 않는다', () async {
    final container = await makeContainer(FakeBenefitsRepository());
    container.listen(savedProgramsProvider, (_, _) {});
    await container.read(savedProgramsProvider.future);
    for (var i = 0; i < 100; i++) {
      expect(await container.read(savedProgramsProvider.notifier).toggle('n$i'), isNull);
    }
    expect(await container.read(savedProgramsProvider.notifier).toggle('overflow'), '관심 정책은 100개까지 저장할 수 있습니다.');
    expect(container.read(savedProgramsProvider).requireValue, hasLength(100));
  });
}
