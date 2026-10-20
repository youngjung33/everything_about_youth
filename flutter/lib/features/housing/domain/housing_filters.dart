import 'package:meta/meta.dart';
import '../../../core/util/pure_dart.dart';

/// 공고 목록 검색 조건. 서버 API 쿼리 파라미터와 같은 이름·단위를 쓴다.
@immutable
class HousingFilters {
  const HousingFilters({
    this.sidos = const {},
    this.sigungu = '',
    this.supplyTypes = const {},
    this.housingTypes = const {},
    this.statuses = defaultStatuses,
    this.keyword = '',
    this.maxDepositMan,
    this.maxRentMan,
    this.minArea,
    this.maxArea,
    this.verdicts = const {},
    this.sort = 'deadline',
  });

  /// 기본은 접수중 + 접수예정
  static const defaultStatuses = {'open', 'upcoming'};

  static const initial = HousingFilters();

  final Set<String> sidos;
  final String sigungu;
  final Set<String> supplyTypes;
  final Set<String> housingTypes;
  final Set<String> statuses;
  final String keyword;

  /// 보증금/분양가 상한 (만원)
  final int? maxDepositMan;

  /// 월 임대료 상한 (만원)
  final int? maxRentMan;

  /// 전용면적 범위 (㎡)
  final double? minArea;
  final double? maxArea;

  /// 자격 판정 결과로 거르기: eligible / check / ineligible. '내 조건'이 있을 때만 적용된다.
  final Set<String> verdicts;

  /// deadline(마감 임박순) / latest(최신 공고순)
  final String sort;

  /// 기본값과 다른 조건의 개수 (필터 버튼 배지용). 정렬·자격판정 거르기는 제외한다.
  int get activeCount {
    var count = 0;
    if (sidos.isNotEmpty) count++;
    if (supplyTypes.isNotEmpty) count++;
    if (housingTypes.isNotEmpty) count++;
    if (!setEquals(statuses, defaultStatuses)) count++;
    if (keyword.trim().isNotEmpty) count++;
    if (maxDepositMan != null) count++;
    if (maxRentMan != null) count++;
    if (minArea != null || maxArea != null) count++;
    return count;
  }

  /// null 로 되돌리려면 `() => null` 을 넘긴다.
  HousingFilters copyWith({
    Set<String>? sidos,
    String? sigungu,
    Set<String>? supplyTypes,
    Set<String>? housingTypes,
    Set<String>? statuses,
    String? keyword,
    ValueGetter<int?>? maxDepositMan,
    ValueGetter<int?>? maxRentMan,
    ValueGetter<double?>? minArea,
    ValueGetter<double?>? maxArea,
    Set<String>? verdicts,
    String? sort,
  }) {
    return HousingFilters(
      sidos: sidos ?? this.sidos,
      sigungu: sigungu ?? this.sigungu,
      supplyTypes: supplyTypes ?? this.supplyTypes,
      housingTypes: housingTypes ?? this.housingTypes,
      statuses: statuses ?? this.statuses,
      keyword: keyword ?? this.keyword,
      maxDepositMan: maxDepositMan != null ? maxDepositMan() : this.maxDepositMan,
      maxRentMan: maxRentMan != null ? maxRentMan() : this.maxRentMan,
      minArea: minArea != null ? minArea() : this.minArea,
      maxArea: maxArea != null ? maxArea() : this.maxArea,
      verdicts: verdicts ?? this.verdicts,
      sort: sort ?? this.sort,
    );
  }

  /// 서버 API 쿼리. 집합은 같은 키를 반복해 보낸다. (시군구는 시도를 고른 경우에만 의미가 있다.)
  Map<String, Object?> toQuery() => {
    'sido': sidos.toList(),
    'sigungu': sidos.isNotEmpty ? sigungu.trim() : null,
    'supply': supplyTypes.toList(),
    'housing': housingTypes.toList(),
    'status': statuses.toList(),
    'q': keyword.trim(),
    'maxDeposit': maxDepositMan,
    'maxRent': maxRentMan,
    'minArea': _number(minArea),
    'maxArea': _number(maxArea),
    'v': verdicts.toList(),
    'sort': sort,
  };

  static Object? _number(double? v) {
    if (v == null) return null;
    return v == v.roundToDouble() ? v.toInt() : v;
  }

  @override
  bool operator ==(Object other) =>
      other is HousingFilters &&
      setEquals(other.sidos, sidos) &&
      other.sigungu == sigungu &&
      setEquals(other.supplyTypes, supplyTypes) &&
      setEquals(other.housingTypes, housingTypes) &&
      setEquals(other.statuses, statuses) &&
      other.keyword == keyword &&
      other.maxDepositMan == maxDepositMan &&
      other.maxRentMan == maxRentMan &&
      other.minArea == minArea &&
      other.maxArea == maxArea &&
      setEquals(other.verdicts, verdicts) &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    Object.hashAllUnordered(sidos),
    sigungu,
    Object.hashAllUnordered(supplyTypes),
    Object.hashAllUnordered(housingTypes),
    Object.hashAllUnordered(statuses),
    keyword,
    maxDepositMan,
    maxRentMan,
    minArea,
    maxArea,
    Object.hashAllUnordered(verdicts),
    sort,
  );
}
