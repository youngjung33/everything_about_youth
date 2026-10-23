import 'package:everything_about_youth/core/format/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formatCount / formatHouseholds', () {
    expect(formatCount(1234567), '1,234,567');
    expect(formatCount(0), '0');
    expect(formatCount(null), '-');
    expect(formatHouseholds(1095), '1,095세대');
    expect(formatHouseholds(null), '-');
  });

  test('formatWon: 억/만 단위', () {
    expect(formatWon(475500000), '4억 7,550만원');
    expect(formatWon(500000000), '5억원');
    expect(formatWon(5000000), '500만원');
    expect(formatWon(120000), '12만원');
    expect(formatWon(5000), '5,000원');
    expect(formatWon(9999), '9,999원');
    expect(formatWon(10000), '1만원');
    expect(formatWon(99995000), '1억원'); // "10,000만원" 이 되면 안 된다
    expect(formatWon(0), '0원');
    expect(formatWon(null), '-');
  });

  test('formatArea', () {
    expect(formatArea(84.9587), '84.96㎡');
    expect(formatArea(20), '20㎡');
    expect(formatArea(26.5), '26.5㎡');
    expect(formatArea(null), '-');
  });

  test('formatDate / formatPeriod', () {
    expect(formatDate('2026-10-14'), '2026.10.14');
    expect(formatDate(null), '-');
    expect(formatPeriod('2026-10-01', '2026-10-16'), '2026.10.01 ~ 2026.10.16');
    expect(formatPeriod('2026-10-01', '2026-10-01'), '2026.10.01');
    expect(formatPeriod(null, '2026-10-16'), '~ 2026.10.16');
    expect(formatPeriod('2026-10-01', null), '2026.10.01 ~');
    expect(formatPeriod(null, null), '일정 미정/상시');
  });

  test('formatUpdatedAt: UTC 를 한국 시간으로', () {
    expect(formatUpdatedAt('2026-10-12T01:00:00.000Z'), '2026.10.12 10:00 갱신');
    expect(formatUpdatedAt('2026-10-12T15:30:00Z'), '2026.10.13 00:30 갱신');
    expect(formatUpdatedAt(null), isNull);
    expect(formatUpdatedAt(''), isNull);
    expect(formatUpdatedAt('not-a-date'), isNull);
  });

  test('formatRange / formatFrom', () {
    expect(formatRange<double>(16.5, 26, formatArea), '16.5㎡ ~ 26㎡');
    expect(formatRange<double>(20, 20, formatArea), '20㎡');
    expect(formatRange<double>(null, 30, formatArea), '30㎡');
    expect(formatRange<double>(null, null, formatArea), '-');
    expect(formatFrom(5000000), '500만원~');
    expect(formatFrom(null), '-');
  });
}
