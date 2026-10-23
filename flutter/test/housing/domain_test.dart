import 'dart:convert';

import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:everything_about_youth/features/housing/data/profile_store.dart';
import 'package:everything_about_youth/features/housing/data/saved_notice_store.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:everything_about_youth/features/housing/domain/housing_meta.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fixtures.dart';

void main() {
  group('모델 파싱', () {
    test('요약: 값과 라벨을 그대로 읽는다', () {
      final n = NoticeSummary.fromJson(summaryJson());
      expect(n.id, 'n1');
      expect(n.status, NoticeStatus.open);
      expect(n.statusLabel, '접수중');
      expect(n.supplyTypeLabel, '행복주택');
      expect(n.housingTypeLabels, ['아파트']);
      expect(n.totalHouseholds, 120);
      expect(n.minDeposit, 50000000);
      expect(n.minAreaM2, 16.5);
      expect(n.regionLabel, '서울특별시 강남구');
      expect(n.eligibility, isNull);
    });

    test('자격 판정이 있으면 사유와 안내를 읽는다', () {
      final n = NoticeSummary.fromJson(
        summaryJson(
          eligibility: {
            'verdict': 'ineligible',
            'verdictLabel': '신청 불가',
            'reasons': ['연령 조건 초과'],
            'notes': ['소득 기준은 공고문 확인'],
          },
        ),
      );
      expect(n.eligibility!.verdict, Verdict.ineligible);
      expect(n.eligibility!.reasons, ['연령 조건 초과']);
      expect(n.eligibility!.notes, ['소득 기준은 공고문 확인']);
    });

    test('상세: 단지와 세대유형, null 금액', () {
      final d = NoticeDetail.fromJson(detailJson());
      expect(d.summary.id, 'n1');
      expect(d.winnerAnnouncementDate, '2026-11-05');
      expect(d.complexes, hasLength(1));
      final units = d.complexes.first.units;
      expect(units, hasLength(2));
      expect(units.first.deposit, 50000000);
      expect(units.last.deposit, isNull);
      expect(d.sources.single.fetchedDate, '2026-10-12');
      expect(d.googleCalendarUrl, contains('calendar.google.com'));
    });

    test('알 수 없는 상태/판정 코드는 안전한 기본값', () {
      expect(NoticeStatus.fromCode('???'), NoticeStatus.open);
      expect(Verdict.fromCode(null), Verdict.check);
    });

    test('정수가 실수(120.0)로 와도 읽고, 숫자가 아닌 값은 null', () {
      final n = NoticeSummary.fromJson({...summaryJson(), 'totalHouseholds': 120.0, 'minDeposit': '5000'});
      expect(n.totalHouseholds, 120);
      expect(n.minDeposit, isNull);
    });

    test('페이지와 메타', () {
      final p = NoticePage.fromJson(pageJson(items: [summaryJson()], total: 41, totalPages: 3));
      expect(p.total, 41);
      expect(p.totalPages, 3);
      final m = HousingMeta.fromJson(metaJson());
      expect(m.sidos, ['서울특별시', '경기도']);
      expect(m.sorts.first.label, '마감 임박순');
      expect(m.dataUpdatedAt, '2026-10-12T01:00:00.000Z');
    });
  });

  group('HousingFilters', () {
    test('기본 조건: 접수중+접수예정, 활성 개수 0', () {
      const f = HousingFilters.initial;
      expect(f.statuses, {'open', 'upcoming'});
      expect(f.activeCount, 0);
    });

    test('쿼리: 시도를 고르지 않으면 시군구를 보내지 않는다', () {
      final f = const HousingFilters().copyWith(sigungu: '강남구');
      expect(f.toQuery()['sigungu'], isNull);
      final g = f.copyWith(sidos: {'서울특별시'});
      expect(g.toQuery()['sigungu'], '강남구');
      expect(g.toQuery()['sido'], ['서울특별시']);
    });

    test('쿼리: 면적은 정수면 정수로, 아니면 실수로', () {
      final f = const HousingFilters().copyWith(minArea: () => 20, maxArea: () => 59.5);
      expect(f.toQuery()['minArea'], 20);
      expect(f.toQuery()['maxArea'], 59.5);
    });

    test('활성 개수: 정렬과 자격 거르기는 제외', () {
      final f = const HousingFilters().copyWith(
        sidos: {'서울특별시'},
        keyword: ' 강남 ',
        maxDepositMan: () => 5000,
        sort: 'latest',
        verdicts: {'eligible'},
      );
      expect(f.activeCount, 3);
    });

    test('같은 값이면 같고 hashCode 도 같다', () {
      final a = const HousingFilters().copyWith(sidos: {'서울특별시', '경기도'});
      final b = const HousingFilters().copyWith(sidos: {'경기도', '서울특별시'});
      expect(a, b);
      expect(a.hashCode, b.hashCode);
      expect(a == a.copyWith(sort: 'latest'), isFalse);
    });

    test('copyWith 로 null 로 되돌린다', () {
      final f = const HousingFilters().copyWith(maxRentMan: () => 30);
      expect(f.copyWith(maxRentMan: () => null).maxRentMan, isNull);
      expect(f.copyWith(keyword: 'x').maxRentMan, 30);
    });
  });

  group('ApplicantProfile', () {
    test('빈 조건은 쿼리가 비어 있다', () {
      expect(ApplicantProfile.empty.isEmpty, isTrue);
      expect(ApplicantProfile.empty.toQuery(), isEmpty);
      expect(ApplicantProfile.empty.summary, '');
    });

    test('쿼리 왕복', () {
      const p = ApplicantProfile(age: 29, isHomeless: true, isMarried: false, isNewlywed: false, isStudent: true);
      expect(p.toQuery(), {'age': '29', 'home': 'y', 'married': 'n', 'newlywed': 'n', 'student': 'y'});
      expect(ApplicantProfile.fromQuery(p.toQuery()), p);
    });

    test('소득·자산·청약통장도 쿼리로 왕복한다 (금액은 만원 단위)', () {
      const p = ApplicantProfile(
        householdSize: 3,
        monthlyIncomeMan: 650,
        isDualIncome: true,
        totalAssetMan: 12000,
        carValueMan: 0,
        hasSubscriptionAccount: false,
      );
      expect(p.toQuery(), {
        'household': '3',
        'monthly': '650',
        'dual': 'y',
        'asset': '12000',
        'car': '0',
        'account': 'n',
      });
      expect(ApplicantProfile.fromQuery(p.toQuery()), p);
      expect(p.isEmpty, isFalse);
    });

    test('자동차 0 은 "입력 안 함"이 아니라 "없음"이다', () {
      const p = ApplicantProfile(carValueMan: 0);
      expect(p.isEmpty, isFalse);
      expect(p.toQuery(), {'car': '0'});
    });

    test('범위를 벗어난 값은 버린다', () {
      final p = ApplicantProfile.fromQuery({'age': '200', 'income': '-1', 'home': 'maybe'});
      expect(p.isEmpty, isTrue);

      final q = ApplicantProfile.fromQuery({
        'household': '9',
        'monthly': '-5',
        'asset': '99999999999',
        'car': 'abc',
        'dual': 'x',
      });
      expect(q.isEmpty, isTrue);
      expect(ApplicantProfile.fromQuery({'household': '0'}).householdSize, isNull);
      expect(ApplicantProfile.fromQuery({'household': '8'}).householdSize, 8);
    });

    test('예전 버전이 저장한 소득 비율(income)은 읽지 않는다', () {
      final p = ApplicantProfile.fromQuery({'age': '30', 'income': '80'});
      expect(p, const ApplicantProfile(age: 30));
    });

    test('요약 문구', () {
      const p = ApplicantProfile(age: 29, isHomeless: true);
      expect(p.summary, '만 29세 · 무주택');

      const full = ApplicantProfile(
        age: 29,
        isHomeless: true,
        householdSize: 1,
        monthlyIncomeMan: 300,
        totalAssetMan: 12000,
        carValueMan: 0,
        hasSubscriptionAccount: true,
      );
      expect(full.summary, '만 29세 · 무주택 · 1인 가구 · 월 300만원 · 자산 1억 2,000만원 · 자동차 없음 · 청약통장 있음');
    });

    test('copyWith 로 새 항목을 null 로 되돌린다', () {
      const p = ApplicantProfile(householdSize: 2, monthlyIncomeMan: 400);
      expect(p.copyWith(householdSize: () => null).householdSize, isNull);
      expect(p.copyWith(householdSize: () => null).monthlyIncomeMan, 400);
    });
  });

  group('EligibilityStandards', () {
    test('메타에서 기준표를 읽는다', () {
      final s = HousingMeta.fromJson(metaJson()).standards!;
      expect(s.year, 2026);
      expect(s.urbanWorkerIncomeFor(1), 3813363);
      expect(s.urbanWorkerIncomeFor(8), 11064819);
      expect(s.urbanWorkerIncomeFor(0), isNull);
      expect(s.urbanWorkerIncomeFor(9), isNull);
    });

    test('월 소득(만원)이 도시근로자 월평균소득의 몇 %인지 계산한다', () {
      final s = HousingMeta.fromJson(metaJson()).standards!;
      // 3인 가구 기준 8,168,429원. 월 650만원 → 약 80%
      expect(s.urbanWorkerRatioPercent(householdSize: 3, monthlyIncomeMan: 650), 80);
      expect(s.urbanWorkerRatioPercent(householdSize: 1, monthlyIncomeMan: 0), 0);
      expect(s.urbanWorkerRatioPercent(householdSize: 9, monthlyIncomeMan: 300), isNull);
    });

    test('서버가 기준표를 주지 않으면 null 이다 (오래된 서버와도 호환)', () {
      final json = metaJson()..remove('standards');
      expect(HousingMeta.fromJson(json).standards, isNull);
    });

    test('숫자가 아닌 항목은 건너뛴다', () {
      final s = EligibilityStandards.fromJson({
        'year': 2026,
        'urbanWorkerIncome': [100, 'x', 300],
      });
      expect(s.urbanWorkerIncome, [100, 300]);
    });
  });

  group('ProfileStore (암호화 저장)', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    Future<(SharedPreferences, AesGcmFieldCipher)> open([MemoryCipherKeyStore? keys]) async =>
        (await SharedPreferences.getInstance(), AesGcmFieldCipher(keys ?? MemoryCipherKeyStore()));

    test('저장하고 다시 읽는다. 비우면 키를 지운다', () async {
      final (prefs, cipher) = await open();
      final store = ProfileStore(prefs, cipher);
      expect((await store.load()).isEmpty, isTrue);
      expect(store.isLoaded, isTrue);

      await store.save(const ApplicantProfile(age: 30, isHomeless: true));
      expect(store.current, const ApplicantProfile(age: 30, isHomeless: true));
      expect(await ProfileStore(prefs, cipher).load(), const ApplicantProfile(age: 30, isHomeless: true));

      await store.save(ApplicantProfile.empty);
      expect(prefs.containsKey(ProfileStore.storageKey), isFalse);
    });

    test('기기에는 평문이 남지 않는다', () async {
      final (prefs, cipher) = await open();
      await ProfileStore(
        prefs,
        cipher,
      ).save(const ApplicantProfile(age: 31, isHomeless: true, monthlyIncomeMan: 777, totalAssetMan: 4321));

      final raw = prefs.getString(ProfileStore.storageKey)!;
      expect(AesGcmFieldCipher.looksEncrypted(raw), isTrue);
      // 암호문은 매번 무작위 base64 라서 두 글자짜리 값은 우연히 들어 있을 수 있다. 충분히 긴 값으로만 확인한다.
      expect(raw, isNot(contains('777')));
      expect(raw, isNot(contains('4321')));
      expect(raw, isNot(contains('age')));
      expect(raw, isNot(contains('asset')));
    });

    test('읽는 도중에 저장하면, 늦게 끝난 읽기가 새 값을 덮어쓰지 않는다', () async {
      final (prefs, cipher) = await open();
      await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 40));

      final store = ProfileStore(prefs, cipher);
      final loading = store.load();
      await store.save(const ApplicantProfile(age: 22));
      await loading;

      expect(store.current.age, 22);
      expect((await ProfileStore(prefs, cipher).load()).age, 22);
    });

    test('로드하기 전의 current 는 빈 조건', () async {
      final (prefs, cipher) = await open();
      final store = ProfileStore(prefs, cipher);
      expect(store.isLoaded, isFalse);
      expect(store.current.isEmpty, isTrue);
    });

    test('암호화 이전 버전의 평문 저장값은 읽고 나서 암호화해 다시 저장한다', () async {
      final legacy = jsonEncode(const ApplicantProfile(age: 28, isHomeless: true).toQuery());
      SharedPreferences.setMockInitialValues({ProfileStore.storageKey: legacy});
      final (prefs, cipher) = await open();

      expect(await ProfileStore(prefs, cipher).load(), const ApplicantProfile(age: 28, isHomeless: true));

      final raw = prefs.getString(ProfileStore.storageKey)!;
      expect(AesGcmFieldCipher.looksEncrypted(raw), isTrue);
      expect(await ProfileStore(prefs, cipher).load(), const ApplicantProfile(age: 28, isHomeless: true));
    });

    test('키를 잃어 풀 수 없는 값은 지우고 빈 조건으로 시작한다 (앱이 죽지 않는다)', () async {
      final (prefs, cipher) = await open();
      await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 30));

      final (_, otherCipher) = await open(MemoryCipherKeyStore()); // 다른 키
      expect((await ProfileStore(prefs, otherCipher).load()).isEmpty, isTrue);
      expect(prefs.containsKey(ProfileStore.storageKey), isFalse);
    });

    test('변조된 암호문은 빈 조건으로 처리', () async {
      final (prefs, cipher) = await open();
      await ProfileStore(prefs, cipher).save(const ApplicantProfile(age: 30));
      final raw = prefs.getString(ProfileStore.storageKey)!;
      await prefs.setString(ProfileStore.storageKey, '${raw.substring(0, raw.length - 4)}AAAA');

      expect((await ProfileStore(prefs, cipher).load()).isEmpty, isTrue);
    });

    test('다른 용도의 암호문을 끼워 넣어도 읽히지 않는다 (context 불일치)', () async {
      final (prefs, cipher) = await open();
      final other = await cipher.encrypt(jsonEncode({'age': 99}), context: 'something.else');
      await prefs.setString(ProfileStore.storageKey, other);

      expect((await ProfileStore(prefs, cipher).load()).isEmpty, isTrue);
    });

    test('손상된 평문 저장값은 빈 조건으로 처리', () async {
      SharedPreferences.setMockInitialValues({ProfileStore.storageKey: '{not json'});
      final (prefs, cipher) = await open();
      expect((await ProfileStore(prefs, cipher).load()).isEmpty, isTrue);

      SharedPreferences.setMockInitialValues({
        ProfileStore.storageKey: jsonEncode([1, 2]),
      });
      final (prefs2, cipher2) = await open();
      expect((await ProfileStore(prefs2, cipher2).load()).isEmpty, isTrue);
    });
  });

  group('SavedNoticeStore (암호화 저장)', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    Future<(SharedPreferences, AesGcmFieldCipher)> open([MemoryCipherKeyStore? keys]) async =>
        (await SharedPreferences.getInstance(), AesGcmFieldCipher(keys ?? MemoryCipherKeyStore()));

    test('저장하고 다시 읽는다. 비우면 키를 지운다', () async {
      final (prefs, cipher) = await open();
      final store = SavedNoticeStore(prefs, cipher);
      expect(await store.load(), isEmpty);

      await store.replace(['n1', 'n2', 'n1', '']);
      expect(store.current, ['n1', 'n2']);
      expect(await SavedNoticeStore(prefs, cipher).load(), ['n1', 'n2']);

      await store.replace(const []);
      expect(prefs.containsKey(SavedNoticeStore.storageKey), isFalse);
    });

    test('기기에는 평문 id 가 남지 않는다', () async {
      final (prefs, cipher) = await open();
      await SavedNoticeStore(prefs, cipher).replace(const ['notice-secret-id']);

      final raw = prefs.getString(SavedNoticeStore.storageKey)!;
      expect(AesGcmFieldCipher.looksEncrypted(raw), isTrue);
      expect(raw, isNot(contains('notice-secret-id')));
    });

    test('상한을 넘기면 앞에서부터만 남긴다', () async {
      final (prefs, cipher) = await open();
      final store = SavedNoticeStore(prefs, cipher);
      final ids = [for (var i = 0; i < SavedNoticeStore.maxCount + 5; i++) 'n$i'];
      await store.replace(ids);
      expect(store.current, hasLength(SavedNoticeStore.maxCount));
      expect((await SavedNoticeStore(prefs, cipher).load()).first, 'n0');
    });
  });
}
