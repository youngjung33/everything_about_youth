import 'package:everything_about_youth/features/finance/domain/finance_filter_presets.dart';
import 'package:everything_about_youth/features/finance/domain/finance_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('전세·대출 프리셋이 유형 필터를 바꾼다', () {
    const filters = FinanceFilters.initial;
    final jeonse = financeProductTypeFilterPresets.first;
    final next = jeonse.applyTo(filters);
    expect(next.productTypeIds, jeonse.productTypeIds);
    expect(jeonse.matches(next), isTrue);
  });
}
