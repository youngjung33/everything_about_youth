import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'benefit_filters.dart';

@immutable
class BenefitFilterPreset {
  const BenefitFilterPreset({required this.id, required this.label, required this.categoryIds});

  final String id;
  final String label;
  final Set<String> categoryIds;

  BenefitFilters applyTo(BenefitFilters current) => current.copyWith(categoryIds: categoryIds);

  bool matches(BenefitFilters filters) => setEquals(filters.categoryIds, categoryIds);
}

const benefitCategoryFilterPresets = <BenefitFilterPreset>[
  BenefitFilterPreset(id: 'housing', label: '주거', categoryIds: {'housing'}),
  BenefitFilterPreset(id: 'employment', label: '일자리', categoryIds: {'employment'}),
  BenefitFilterPreset(id: 'finance', label: '금융·세금', categoryIds: {'finance'}),
];
