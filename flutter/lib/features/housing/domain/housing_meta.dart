import 'package:meta/meta.dart';

import '../../../core/json.dart';

/// 값(코드)과 한글 라벨 쌍
@immutable
class Option {
  const Option({required this.value, required this.label});

  factory Option.fromJson(Map<String, dynamic> json) =>
      Option(value: asString(json['value']) ?? '', label: asString(json['label']) ?? '');

  final String value;
  final String label;
}

/// 필터 선택지와 라벨. 서버(`/api/v1/housing/meta`)가 단일 출처이므로 앱에 라벨 표를 복제하지 않는다.
@immutable
class HousingMeta {
  const HousingMeta({
    required this.supplyTypes,
    required this.housingTypes,
    required this.statuses,
    required this.verdicts,
    required this.sorts,
    required this.sidos,
  });

  factory HousingMeta.fromJson(Map<String, dynamic> json) => HousingMeta(
    supplyTypes: asList(json['supplyTypes'], Option.fromJson),
    housingTypes: asList(json['housingTypes'], Option.fromJson),
    statuses: asList(json['statuses'], Option.fromJson),
    verdicts: asList(json['verdicts'], Option.fromJson),
    sorts: asList(json['sorts'], Option.fromJson),
    sidos: asStringList(json['sidos']),
  );

  final List<Option> supplyTypes;
  final List<Option> housingTypes;
  final List<Option> statuses;
  final List<Option> verdicts;
  final List<Option> sorts;
  final List<String> sidos;
}
