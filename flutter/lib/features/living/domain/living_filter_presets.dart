import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'living_filters.dart';

/// 저장·적용할 수 있는 필터 조합 하나.
@immutable
class LivingFilterPreset {
  const LivingFilterPreset({required this.id, required this.label, required this.procedureTypeIds});

  final String id; // 항목 식별자
  final String label; // 화면에 보이는 한글 라벨
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
