import 'package:everything_about_youth/features/housing/domain/housing_filter_presets.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('청년 프리셋이 공급유형을 바꾼다', () {
    const filters = HousingFilters.initial;
    final youth = housingYouthFilterPresets.first;
    final next = youth.applyTo(filters);
    expect(next.supplyTypes, youth.supplyTypes);
    expect(youth.matches(next), isTrue);
  });
}
