import 'package:meta/meta.dart';
import '../../../core/format/format.dart';
import '../../../core/util/pure_dart.dart';

/// 신청자 조건('내 조건'). 금액 쿼리는 **만원** 단위(서버 search-params 와 동일).
@immutable
class ApplicantProfile {
  const ApplicantProfile({
    this.age,
    this.residenceSido,
    this.isHomeless,
    this.isMarried,
    this.isNewlywed,
    this.isStudent,
    this.householdSize,
    this.monthlyIncomeMan,
    this.isDualIncome,
    this.totalAssetMan,
    this.carValueMan,
    this.incomeRatioPercent,
  });

  static const empty = ApplicantProfile();

  static const minHouseholdSize = 1;
  static const maxHouseholdSize = 8;

  final int? age;
  final String? residenceSido;
  final bool? isHomeless;
  final bool? isMarried;
  final bool? isNewlywed;
  final bool? isStudent;
  final int? householdSize;
  final int? monthlyIncomeMan;
  final bool? isDualIncome;
  final int? totalAssetMan;
  final int? carValueMan;
  final int? incomeRatioPercent;

  bool get isEmpty =>
      age == null &&
      residenceSido == null &&
      isHomeless == null &&
      isMarried == null &&
      isNewlywed == null &&
      isStudent == null &&
      householdSize == null &&
      monthlyIncomeMan == null &&
      isDualIncome == null &&
      totalAssetMan == null &&
      carValueMan == null &&
      incomeRatioPercent == null;

  ApplicantProfile copyWith({
    ValueGetter<int?>? age,
    ValueGetter<String?>? residenceSido,
    ValueGetter<bool?>? isHomeless,
    ValueGetter<bool?>? isMarried,
    ValueGetter<bool?>? isNewlywed,
    ValueGetter<bool?>? isStudent,
    ValueGetter<int?>? householdSize,
    ValueGetter<int?>? monthlyIncomeMan,
    ValueGetter<bool?>? isDualIncome,
    ValueGetter<int?>? totalAssetMan,
    ValueGetter<int?>? carValueMan,
    ValueGetter<int?>? incomeRatioPercent,
  }) {
    return ApplicantProfile(
      age: age != null ? age() : this.age,
      residenceSido: residenceSido != null ? residenceSido() : this.residenceSido,
      isHomeless: isHomeless != null ? isHomeless() : this.isHomeless,
      isMarried: isMarried != null ? isMarried() : this.isMarried,
      isNewlywed: isNewlywed != null ? isNewlywed() : this.isNewlywed,
      isStudent: isStudent != null ? isStudent() : this.isStudent,
      householdSize: householdSize != null ? householdSize() : this.householdSize,
      monthlyIncomeMan: monthlyIncomeMan != null ? monthlyIncomeMan() : this.monthlyIncomeMan,
      isDualIncome: isDualIncome != null ? isDualIncome() : this.isDualIncome,
      totalAssetMan: totalAssetMan != null ? totalAssetMan() : this.totalAssetMan,
      carValueMan: carValueMan != null ? carValueMan() : this.carValueMan,
      incomeRatioPercent: incomeRatioPercent != null ? incomeRatioPercent() : this.incomeRatioPercent,
    );
  }

  Map<String, String> toQuery() => {
    if (age != null) 'age': '$age',
    if (residenceSido != null && residenceSido!.isNotEmpty) 'residence': residenceSido!,
    if (isHomeless != null) 'home': _yn(isHomeless!),
    if (isMarried != null) 'married': _yn(isMarried!),
    if (isNewlywed != null) 'newlywed': _yn(isNewlywed!),
    if (isStudent != null) 'student': _yn(isStudent!),
    if (householdSize != null) 'household': '$householdSize',
    if (monthlyIncomeMan != null) 'monthly': '$monthlyIncomeMan',
    if (isDualIncome != null) 'dual': _yn(isDualIncome!),
    if (totalAssetMan != null) 'asset': '$totalAssetMan',
    if (carValueMan != null) 'car': '$carValueMan',
    if (incomeRatioPercent != null) 'income': '$incomeRatioPercent',
  };

  factory ApplicantProfile.fromQuery(Map<String, dynamic> query) {
    int? intOf(Object? v, int min, int max) {
      final n = v is num ? v.toInt() : int.tryParse('${v ?? ''}');
      return n != null && n >= min && n <= max ? n : null;
    }

    bool? boolOf(Object? v) => v == 'y' ? true : (v == 'n' ? false : null);

    final residence = query['residence']?.toString().trim();
    return ApplicantProfile(
      age: intOf(query['age'], 0, 120),
      residenceSido: residence != null && residence.isNotEmpty ? residence : null,
      isHomeless: boolOf(query['home']),
      isMarried: boolOf(query['married']),
      isNewlywed: boolOf(query['newlywed']),
      isStudent: boolOf(query['student']),
      householdSize: intOf(query['household'], minHouseholdSize, maxHouseholdSize),
      monthlyIncomeMan: intOf(query['monthly'], 0, maxMonthlyIncomeMan),
      isDualIncome: boolOf(query['dual']),
      totalAssetMan: intOf(query['asset'], 0, maxAmountMan),
      carValueMan: intOf(query['car'], 0, maxAmountMan),
      incomeRatioPercent: intOf(query['income'], 0, 1000),
    );
  }

  static const maxMonthlyIncomeMan = 100000;
  static const maxAmountMan = 10000000;

  static String _yn(bool v) => v ? 'y' : 'n';

  String get summary {
    final parts = <String>[
      if (age != null) '만 $age세',
      if (residenceSido != null) '거주 $residenceSido',
      if (isHomeless != null) isHomeless! ? '무주택' : '유주택',
      if (isMarried != null) isMarried! ? '기혼' : '미혼',
      if (isNewlywed == true) '신혼부부',
      if (isStudent == true) '대학생·취준생',
      if (householdSize != null) '$householdSize인 가구',
      if (monthlyIncomeMan != null) '월 ${formatWon(monthlyIncomeMan! * 10000)}',
      if (isDualIncome == true) '맞벌이',
      if (totalAssetMan != null) '자산 ${formatWon(totalAssetMan! * 10000)}',
      if (carValueMan != null) carValueMan == 0 ? '자동차 없음' : '자동차 ${formatWon(carValueMan! * 10000)}',
      if (incomeRatioPercent != null) '소득 ${incomeRatioPercent!}%',
    ];
    return parts.join(' · ');
  }

  @override
  bool operator ==(Object other) =>
      other is ApplicantProfile &&
      other.age == age &&
      other.residenceSido == residenceSido &&
      other.isHomeless == isHomeless &&
      other.isMarried == isMarried &&
      other.isNewlywed == isNewlywed &&
      other.isStudent == isStudent &&
      other.householdSize == householdSize &&
      other.monthlyIncomeMan == monthlyIncomeMan &&
      other.isDualIncome == isDualIncome &&
      other.totalAssetMan == totalAssetMan &&
      other.carValueMan == carValueMan &&
      other.incomeRatioPercent == incomeRatioPercent;

  @override
  int get hashCode => Object.hash(
    age,
    residenceSido,
    isHomeless,
    isMarried,
    isNewlywed,
    isStudent,
    householdSize,
    monthlyIncomeMan,
    isDualIncome,
    totalAssetMan,
    carValueMan,
    incomeRatioPercent,
  );
}
