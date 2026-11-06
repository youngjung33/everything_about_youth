import 'package:everything_about_youth/features/living/domain/living_filter_presets.dart';
import 'package:everything_about_youth/features/living/domain/living_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('전세·대출 프리셋이 유형 필터를 바꾼다', () {
    const filters = LivingFilters.initial;
    final jeonse = livingProcedureTypeFilterPresets.first;
    final next = jeonse.applyTo(filters);
    expect(next.procedureTypeIds, jeonse.procedureTypeIds);
    expect(jeonse.matches(next), isTrue);
  });
}
