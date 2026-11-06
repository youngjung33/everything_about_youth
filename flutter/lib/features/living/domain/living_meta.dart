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
class LivingMeta {
  const LivingMeta({
    required this.procedureTypes,
    required this.statuses,
    required this.sorts,
    required this.sidos,
    this.dataUpdatedAt,
  });

  factory LivingMeta.fromJson(Map<String, dynamic> json) => LivingMeta(
    procedureTypes: asList(json['procedureTypes'], Option.fromJson),
    statuses: asList(json['statuses'], Option.fromJson),
    sorts: asList(json['sorts'], Option.fromJson),
    sidos: asStringList(json['sidos']),
    dataUpdatedAt: asString(json['dataUpdatedAt']),
  );

  final List<Option> procedureTypes;
  final List<Option> statuses;
  final List<Option> sorts;
  final List<String> sidos;
  final String? dataUpdatedAt;
}
