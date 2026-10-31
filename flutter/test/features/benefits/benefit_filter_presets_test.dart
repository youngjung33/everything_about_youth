import 'package:everything_about_youth/features/benefits/domain/benefit_filter_presets.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('주거 프리셋이 분야 필터를 바꾼다', () {
    const filters = BenefitFilters.initial;
    final housing = benefitCategoryFilterPresets.first;
    final next = housing.applyTo(filters);
    expect(next.categoryIds, housing.categoryIds);
    expect(housing.matches(next), isTrue);
  });
}
