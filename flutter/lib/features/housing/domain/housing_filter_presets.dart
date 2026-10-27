import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'housing_filters.dart';

/// 목록 상단 빠른 필터. 공급유형 코드는 서버 `supplyType` 과 같다.
@immutable
class HousingFilterPreset {
  const HousingFilterPreset({required this.id, required this.label, required this.supplyTypes});

  final String id;
  final String label;
  final Set<String> supplyTypes;

  HousingFilters applyTo(HousingFilters current) => current.copyWith(supplyTypes: supplyTypes);

  bool matches(HousingFilters filters) => setEquals(filters.supplyTypes, supplyTypes);
}

const housingYouthFilterPresets = <HousingFilterPreset>[
  HousingFilterPreset(
    id: 'youth',
    label: '청년·행복',
    supplyTypes: {'happy_housing', 'youth_purchase_rental'},
  ),
  HousingFilterPreset(
    id: 'newlywed',
    label: '신혼',
    supplyTypes: {'newlywed_hope_town', 'happy_housing'},
  ),
  HousingFilterPreset(
    id: 'purchase_rental',
    label: '매입임대',
    supplyTypes: {'youth_purchase_rental', 'purchase_rental'},
  ),
];
