import 'package:meta/meta.dart';
import '../../../core/format/format.dart';
import '../../../core/util/pure_dart.dart';

/// 신청자 조건('내 조건'). 모든 값은 선택 입력이며 비어 있으면 서버가 "확인 필요"로 판정한다.
/// 이 기기에만 저장되고, 서버에는 조회할 때 쿼리로만 전달한다.
///
/// 금액은 사용자가 입력하기 쉬운 **만원** 단위로 들고 있다. (서버 쿼리도 만원 단위)
@immutable
class ApplicantProfile {
  const ApplicantProfile({
    this.age,
    this.isHomeless,
    this.isMarried,
    this.isNewlywed,
    this.isStudent,
    this.householdSize,
    this.monthlyIncomeMan,
    this.isDualIncome,
    this.totalAssetMan,
    this.carValueMan,
    this.hasSubscriptionAccount,
  });

  static const empty = ApplicantProfile();

  /// 가구원수 입력 범위. 소득 기준표가 1~8인까지 있다.
  static const minHouseholdSize = 1;
  static const maxHouseholdSize = 8;

  /// 만 나이
  final int? age;

  /// 무주택 여부 (유주택=false)
  final bool? isHomeless;

  /// 혼인 여부 (미혼=false)
  final bool? isMarried;

  /// 혼인 7년 이내 신혼부부 여부
  final bool? isNewlywed;

  /// 대학생·취업준비생 해당 여부
  final bool? isStudent;

  /// 가구원수 (1~8). 소득 기준이 가구원수별로 정해져 있다.
  final int? householdSize;

  /// 세대구성원 전원의 월평균 소득 합계 (세전, 만원)
  final int? monthlyIncomeMan;

  /// 맞벌이 여부. 신혼부부는 맞벌이일 때 소득 상한이 높다.
  final bool? isDualIncome;

  /// 총자산 (부동산·자동차·금융자산 등을 합하고 부채를 뺀 금액, 만원)
  final int? totalAssetMan;

  /// 자동차 가액 (만원). 보유하지 않으면 0
  final int? carValueMan;

  /// 청약통장(주택청약종합저축) 가입 여부
  final bool? hasSubscriptionAccount;

  bool get isEmpty =>
      age == null &&
      isHomeless == null &&
      isMarried == null &&
      isNewlywed == null &&
      isStudent == null &&
      householdSize == null &&
      monthlyIncomeMan == null &&
      isDualIncome == null &&
      totalAssetMan == null &&
      carValueMan == null &&
      hasSubscriptionAccount == null;

  /// null 로 되돌리려면 `() => null` 을 넘긴다.
  ApplicantProfile copyWith({
    ValueGetter<int?>? age,
    ValueGetter<bool?>? isHomeless,
    ValueGetter<bool?>? isMarried,
    ValueGetter<bool?>? isNewlywed,
    ValueGetter<bool?>? isStudent,
    ValueGetter<int?>? householdSize,
    ValueGetter<int?>? monthlyIncomeMan,
    ValueGetter<bool?>? isDualIncome,
    ValueGetter<int?>? totalAssetMan,
    ValueGetter<int?>? carValueMan,
    ValueGetter<bool?>? hasSubscriptionAccount,
  }) {
    return ApplicantProfile(
      age: age != null ? age() : this.age,
      isHomeless: isHomeless != null ? isHomeless() : this.isHomeless,
      isMarried: isMarried != null ? isMarried() : this.isMarried,
      isNewlywed: isNewlywed != null ? isNewlywed() : this.isNewlywed,
      isStudent: isStudent != null ? isStudent() : this.isStudent,
      householdSize: householdSize != null ? householdSize() : this.householdSize,
      monthlyIncomeMan: monthlyIncomeMan != null ? monthlyIncomeMan() : this.monthlyIncomeMan,
      isDualIncome: isDualIncome != null ? isDualIncome() : this.isDualIncome,
      totalAssetMan: totalAssetMan != null ? totalAssetMan() : this.totalAssetMan,
      carValueMan: carValueMan != null ? carValueMan() : this.carValueMan,
      hasSubscriptionAccount: hasSubscriptionAccount != null ? hasSubscriptionAccount() : this.hasSubscriptionAccount,
    );
  }

  /// 서버 API 의 '내 조건' 쿼리 파라미터. 저장 형식으로도 같이 쓴다.
  ///  - age, home, married, newlywed, student
  ///  - household(가구원수), monthly(월 소득, 만원), dual(맞벌이)
  ///  - asset(총자산, 만원), car(자동차 가액, 만원), account(청약통장)
  Map<String, String> toQuery() => {
    if (age != null) 'age': '$age',
    if (isHomeless != null) 'home': _yn(isHomeless!),
    if (isMarried != null) 'married': _yn(isMarried!),
    if (isNewlywed != null) 'newlywed': _yn(isNewlywed!),
    if (isStudent != null) 'student': _yn(isStudent!),
    if (householdSize != null) 'household': '$householdSize',
    if (monthlyIncomeMan != null) 'monthly': '$monthlyIncomeMan',
    if (isDualIncome != null) 'dual': _yn(isDualIncome!),
    if (totalAssetMan != null) 'asset': '$totalAssetMan',
    if (carValueMan != null) 'car': '$carValueMan',
    if (hasSubscriptionAccount != null) 'account': _yn(hasSubscriptionAccount!),
  };

  /// 범위를 벗어나거나 읽을 수 없는 값은 버린다. 예전 버전이 저장한 `income`(소득 비율)은 쓰지 않는다.
  factory ApplicantProfile.fromQuery(Map<String, dynamic> query) {
    int? intOf(Object? v, int min, int max) {
      final n = v is num ? v.toInt() : int.tryParse('${v ?? ''}');
      return n != null && n >= min && n <= max ? n : null;
    }

    bool? boolOf(Object? v) => v == 'y' ? true : (v == 'n' ? false : null);

    return ApplicantProfile(
      age: intOf(query['age'], 0, 120),
      isHomeless: boolOf(query['home']),
      isMarried: boolOf(query['married']),
      isNewlywed: boolOf(query['newlywed']),
      isStudent: boolOf(query['student']),
      householdSize: intOf(query['household'], minHouseholdSize, maxHouseholdSize),
      monthlyIncomeMan: intOf(query['monthly'], 0, maxMonthlyIncomeMan),
      isDualIncome: boolOf(query['dual']),
      totalAssetMan: intOf(query['asset'], 0, maxAmountMan),
      carValueMan: intOf(query['car'], 0, maxAmountMan),
      hasSubscriptionAccount: boolOf(query['account']),
    );
  }

  /// 입력 상한 (만원). 서버 상한과 같다.
  static const maxMonthlyIncomeMan = 100000;
  static const maxAmountMan = 10000000;

  static String _yn(bool v) => v ? 'y' : 'n';

  /// 화면 요약. 예: "만 29세 · 무주택 · 1인 가구 · 월 300만원"
  String get summary {
    final parts = <String>[
      if (age != null) '만 $age세',
      if (isHomeless != null) isHomeless! ? '무주택' : '유주택',
      if (isMarried != null) isMarried! ? '기혼' : '미혼',
      if (isNewlywed == true) '신혼부부',
      if (isStudent == true) '대학생·취준생',
      if (householdSize != null) '$householdSize인 가구',
      if (monthlyIncomeMan != null) '월 ${formatWon(monthlyIncomeMan! * 10000)}',
      if (isDualIncome == true) '맞벌이',
      if (totalAssetMan != null) '자산 ${formatWon(totalAssetMan! * 10000)}',
      if (carValueMan != null) carValueMan == 0 ? '자동차 없음' : '자동차 ${formatWon(carValueMan! * 10000)}',
      if (hasSubscriptionAccount != null) hasSubscriptionAccount! ? '청약통장 있음' : '청약통장 없음',
    ];
    return parts.join(' · ');
  }

  @override
  bool operator ==(Object other) =>
      other is ApplicantProfile &&
      other.age == age &&
      other.isHomeless == isHomeless &&
      other.isMarried == isMarried &&
      other.isNewlywed == isNewlywed &&
      other.isStudent == isStudent &&
      other.householdSize == householdSize &&
      other.monthlyIncomeMan == monthlyIncomeMan &&
      other.isDualIncome == isDualIncome &&
      other.totalAssetMan == totalAssetMan &&
      other.carValueMan == carValueMan &&
      other.hasSubscriptionAccount == hasSubscriptionAccount;

  @override
  int get hashCode => Object.hash(
    age,
    isHomeless,
    isMarried,
    isNewlywed,
    isStudent,
    householdSize,
    monthlyIncomeMan,
    isDualIncome,
    totalAssetMan,
    carValueMan,
    hasSubscriptionAccount,
  );
}
