import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'finance_filters.dart';

@immutable
class FinanceFilterPreset {
  const FinanceFilterPreset({required this.id, required this.label, required this.productTypeIds});

  final String id;
  final String label;
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
