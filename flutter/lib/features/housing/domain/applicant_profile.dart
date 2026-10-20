import 'package:meta/meta.dart';
import '../../../core/util/pure_dart.dart';

/// 신청자 조건('내 조건'). 모든 값은 선택 입력이며 비어 있으면 서버가 "확인 필요"로 판정한다.
/// 이 기기에만 저장되고, 서버에는 조회할 때 쿼리로만 전달한다.
@immutable
class ApplicantProfile {
  const ApplicantProfile({
    this.age,
    this.isHomeless,
    this.isMarried,
    this.isNewlywed,
    this.isStudent,
    this.incomeRatioPercent,
  });

  static const empty = ApplicantProfile();

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

  /// 도시근로자 월평균소득 대비 가구소득(%)
  final int? incomeRatioPercent;

  bool get isEmpty =>
      age == null &&
      isHomeless == null &&
      isMarried == null &&
      isNewlywed == null &&
      isStudent == null &&
      incomeRatioPercent == null;

  /// null 로 되돌리려면 `() => null` 을 넘긴다.
  ApplicantProfile copyWith({
    ValueGetter<int?>? age,
    ValueGetter<bool?>? isHomeless,
    ValueGetter<bool?>? isMarried,
    ValueGetter<bool?>? isNewlywed,
    ValueGetter<bool?>? isStudent,
    ValueGetter<int?>? incomeRatioPercent,
  }) {
    return ApplicantProfile(
      age: age != null ? age() : this.age,
      isHomeless: isHomeless != null ? isHomeless() : this.isHomeless,
      isMarried: isMarried != null ? isMarried() : this.isMarried,
      isNewlywed: isNewlywed != null ? isNewlywed() : this.isNewlywed,
      isStudent: isStudent != null ? isStudent() : this.isStudent,
      incomeRatioPercent: incomeRatioPercent != null ? incomeRatioPercent() : this.incomeRatioPercent,
    );
  }

  /// 서버 API 의 '내 조건' 쿼리 파라미터 (age, home, married, newlywed, student, income).
  /// 저장 형식으로도 같이 쓴다.
  Map<String, String> toQuery() => {
    if (age != null) 'age': '$age',
    if (isHomeless != null) 'home': _yn(isHomeless!),
    if (isMarried != null) 'married': _yn(isMarried!),
    if (isNewlywed != null) 'newlywed': _yn(isNewlywed!),
    if (isStudent != null) 'student': _yn(isStudent!),
    if (incomeRatioPercent != null) 'income': '$incomeRatioPercent',
  };

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
      incomeRatioPercent: intOf(query['income'], 0, 1000),
    );
  }

  static String _yn(bool v) => v ? 'y' : 'n';

  /// 화면 요약. 예: "만 29세 · 무주택 · 소득 80%"
  String get summary {
    final parts = <String>[
      if (age != null) '만 $age세',
      if (isHomeless != null) isHomeless! ? '무주택' : '유주택',
      if (isMarried != null) isMarried! ? '기혼' : '미혼',
      if (isNewlywed == true) '신혼부부',
      if (isStudent == true) '대학생·취준생',
      if (incomeRatioPercent != null) '소득 $incomeRatioPercent%',
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
      other.incomeRatioPercent == incomeRatioPercent;

  @override
  int get hashCode => Object.hash(age, isHomeless, isMarried, isNewlywed, isStudent, incomeRatioPercent);
}
