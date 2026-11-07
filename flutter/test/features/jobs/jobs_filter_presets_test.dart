import 'package:everything_about_youth/features/jobs/domain/jobs_filter_presets.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('공공·청년 프리셋이 유형 필터를 바꾼다', () {
    const filters = JobsFilters.initial;
    final preset = jobsHireTypeFilterPresets.first;
    final next = preset.applyTo(filters);
    expect(next.hireTypeIds, preset.hireTypeIds);
    expect(preset.matches(next), isTrue);
  });
}
