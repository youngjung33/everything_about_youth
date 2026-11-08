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
    id: 'move_in',
    label: '전입·전출',
    procedureTypeIds: {'move_in'},
  ),
  LivingFilterPreset(
    id: 'lease',
    label: '임대차',
    procedureTypeIds: {'lease'},
  ),
  LivingFilterPreset(
    id: 'moving',
    label: '이사',
    procedureTypeIds: {'moving'},
  ),
];
