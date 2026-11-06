import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'living_filters.dart';

@immutable
class LivingFilterPreset {
  const LivingFilterPreset({required this.id, required this.label, required this.procedureTypeIds});

  final String id;
  final String label;
  final Set<String> procedureTypeIds;

  LivingFilters applyTo(LivingFilters current) => current.copyWith(procedureTypeIds: procedureTypeIds);

  bool matches(LivingFilters filters) => setEquals(filters.procedureTypeIds, procedureTypeIds);
}

const livingProcedureTypeFilterPresets = <LivingFilterPreset>[
  LivingFilterPreset(
    id: 'jeonse_loan',
    label: '전세·대출',
    procedureTypeIds: {'jeonse_loan'},
  ),
  LivingFilterPreset(
    id: 'housing_savings',
    label: '청약·저축',
    procedureTypeIds: {'housing_savings'},
  ),
  LivingFilterPreset(
    id: 'tax_benefit',
    label: '세금·공제',
    procedureTypeIds: {'tax_benefit'},
  ),
];
