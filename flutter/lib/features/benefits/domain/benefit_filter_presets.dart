import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'benefit_filters.dart';

/// 저장·적용할 수 있는 필터 조합 하나.
@immutable
class BenefitFilterPreset {
  const BenefitFilterPreset({required this.id, required this.label, required this.categoryIds});

  final String id; // 항목 식별자
  final String label; // 화면에 보이는 한글 라벨
  final Set<String> categoryIds;

  BenefitFilters applyTo(BenefitFilters current) => current.copyWith(categoryIds: categoryIds);

  bool matches(BenefitFilters filters) => setEquals(filters.categoryIds, categoryIds);
}

const benefitCategoryFilterPresets = <BenefitFilterPreset>[
  BenefitFilterPreset(id: 'housing', label: '주거', categoryIds: {'housing'}),
  BenefitFilterPreset(id: 'employment', label: '일자리', categoryIds: {'employment'}),
  BenefitFilterPreset(id: 'finance', label: '금융·세금', categoryIds: {'finance'}),
];
