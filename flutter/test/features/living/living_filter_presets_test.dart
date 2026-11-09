import 'package:everything_about_youth/features/living/domain/living_filter_presets.dart';
import 'package:everything_about_youth/features/living/domain/living_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('잘못된 id 가 있으면 matches 는 false', () {
    const filters = LivingFilters(procedureTypeIds: {'unknown'});
    expect(livingProcedureTypeFilterPresets.every((p) => !p.matches(filters)), isTrue);
  });

  test('전입·전출 프리셋이 유형 필터를 바꾼다', () {
    const filters = LivingFilters.initial;
    final moveIn = livingProcedureTypeFilterPresets.firstWhere((p) => p.id == 'move_in');
    final next = moveIn.applyTo(filters);
    expect(next.procedureTypeIds, moveIn.procedureTypeIds);
    expect(moveIn.matches(next), isTrue);
  });

  test('임대차·이사 프리셋도 각각 procedureTypeIds 를 세팅한다', () {
    const filters = LivingFilters.initial;
    final lease = livingProcedureTypeFilterPresets.firstWhere((p) => p.id == 'lease');
    final moving = livingProcedureTypeFilterPresets.firstWhere((p) => p.id == 'moving');
    expect(lease.applyTo(filters).procedureTypeIds, {'lease'});
    expect(moving.applyTo(filters).procedureTypeIds, {'moving'});
  });
}
