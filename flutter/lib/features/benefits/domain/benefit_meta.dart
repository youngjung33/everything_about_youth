import 'package:meta/meta.dart';

import '../../../core/json.dart';

@immutable
class Option {
  const Option({required this.value, required this.label});

  factory Option.fromJson(Map<String, dynamic> json) =>
      Option(value: asString(json['value']) ?? '', label: asString(json['label']) ?? '');

  final String value;
  final String label;
}

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

  final int year;
  final int maxHouseholdSize;
  final List<int> urbanWorkerIncome;

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
  final List<String> sidos;
  final EligibilityStandards? standards;
  final String? dataUpdatedAt;
}
