import 'package:meta/meta.dart';

import '../../../core/json.dart';

/// 값(코드)과 한글 라벨 쌍
@immutable
class Option {
  const Option({required this.value, required this.label});

  factory Option.fromJson(Map<String, dynamic> json) =>
      Option(value: asString(json['value']) ?? '', label: asString(json['label']) ?? '');

  final String value; // 코드 값
  final String label; // 화면에 보이는 한글 라벨
}

/// 자격 판정에 쓰는 소득 기준표(참고용). 서버가 단일 출처이며, 입력 화면에서 소득 수준을 안내할 때만 쓴다.
@immutable
class EligibilityStandards {
  const EligibilityStandards({
    required this.year,
    required this.maxHouseholdSize,
    required this.urbanWorkerIncome,
  });

  factory EligibilityStandards.fromJson(Map<String, dynamic> json) {
    final table = json['urbanWorkerIncome'];
    return EligibilityStandards(
      year: asInt(json['year']) ?? 0,
      maxHouseholdSize: asInt(json['maxHouseholdSize']) ?? 8,
      urbanWorkerIncome: [
        if (table is List)
          for (final v in table)
            if (v is num) v.toInt(),
      ],
    );
  }

  final int year; // 기준표 적용 연도
  final int maxHouseholdSize; // 기준표에 포함된 최대 가구원 수
  final List<int> urbanWorkerIncome; // 전년도 도시근로자 가구원수별 월평균소득 100% (원). 인덱스 0 = 1인 가구

  int? urbanWorkerIncomeFor(int householdSize) {
    final index = householdSize - 1;
    if (index < 0 || index >= urbanWorkerIncome.length) return null;
    return urbanWorkerIncome[index];
  }

  int? urbanWorkerRatioPercent({required int householdSize, required int monthlyIncomeMan}) {
    final base = urbanWorkerIncomeFor(householdSize);
    if (base == null || base <= 0) return null;
    return (monthlyIncomeMan * 10000 * 100 / base).round();
  }
}

/// 필터 선택지와 라벨. 서버(`/api/v1/programs/meta` 등)가 단일 출처이므로 앱에 라벨 표를 복제하지 않는다.
@immutable
class BenefitMeta {
  const BenefitMeta({
    required this.categories,
    required this.statuses,
    required this.verdicts,
    required this.sorts,
    required this.sidos,
    this.standards,
    this.dataUpdatedAt,
  });

  factory BenefitMeta.fromJson(Map<String, dynamic> json) => BenefitMeta(
    categories: asList(json['categories'], Option.fromJson),
    statuses: asList(json['statuses'], Option.fromJson),
    verdicts: asList(json['verdicts'], Option.fromJson),
    sorts: asList(json['sorts'], Option.fromJson),
    sidos: asStringList(json['sidos']),
    standards: json['standards'] is Map<String, dynamic>
        ? EligibilityStandards.fromJson(json['standards'] as Map<String, dynamic>)
        : null,
    dataUpdatedAt: asString(json['dataUpdatedAt']),
  );

  final List<Option> categories;
  final List<Option> statuses;
  final List<Option> verdicts;
  final List<Option> sorts;
  final List<String> sidos; // 시·도 필터
  final EligibilityStandards? standards; // 소득 기준표. 서버가 주지 않으면 null
  final String? dataUpdatedAt; // 데이터 마지막 수집 시각(ISO 8601 UTC). 없으면 null
}
