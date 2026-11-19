import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'finance_filters.dart';

/// 저장·적용할 수 있는 필터 조합 하나.
@immutable
class FinanceFilterPreset {
  const FinanceFilterPreset({required this.id, required this.label, required this.productTypeIds});

  final String id; // 항목 식별자
  final String label; // 화면에 보이는 한글 라벨
  final Set<String> productTypeIds;

  FinanceFilters applyTo(FinanceFilters current) => current.copyWith(productTypeIds: productTypeIds);

  bool matches(FinanceFilters filters) => setEquals(filters.productTypeIds, productTypeIds);
}

const financeProductTypeFilterPresets = <FinanceFilterPreset>[
  FinanceFilterPreset(
    id: 'jeonse_loan',
    label: '전세·대출',
    productTypeIds: {'jeonse_loan'},
  ),
  FinanceFilterPreset(
    id: 'housing_savings',
    label: '청약·저축',
    productTypeIds: {'housing_savings'},
  ),
  FinanceFilterPreset(
    id: 'tax_benefit',
    label: '세금·공제',
    productTypeIds: {'tax_benefit'},
  ),
];
