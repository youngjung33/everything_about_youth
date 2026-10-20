// 화면 표시용 포맷 함수. (웹 `common/presentation/format.ts` 와 같은 규칙)

String _group(int n) {
  final digits = n.abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }
  return n < 0 ? '-$buffer' : buffer.toString();
}

/// 정수에 천 단위 구분 기호를 붙인다. 예: 1234567 → "1,234,567"
String formatCount(int? n) => n == null ? '-' : _group(n);

/// 세대수. 예: 1095 → "1,095세대"
String formatHouseholds(int? n) => n == null ? '-' : '${_group(n)}세대';

/// 원 → "4억 7,550만원", "500만원", "12만원"
String formatWon(int? won) {
  if (won == null) return '-';
  if (won == 0) return '0원';
  // 1만원 미만은 반올림하지 않고 그대로 보여준다. (5,000원이 "1만원"이 되면 안 된다)
  if (won.abs() < 10000) return '${_group(won)}원';
  // 만원 단위로 먼저 반올림한 뒤 억/만을 나눠야 "10,000만원" 같은 표기가 생기지 않는다.
  final totalMan = (won / 10000).round();
  final eok = totalMan ~/ 10000;
  final man = totalMan % 10000;
  final parts = <String>[if (eok > 0) '${_group(eok)}억', if (man > 0) '${_group(man)}만'];
  return '${parts.join(' ')}원';
}

/// 전용면적. 예: 84.9587 → "84.96㎡", 20 → "20㎡"
String formatArea(double? m2) {
  if (m2 == null) return '-';
  if (m2 == m2.roundToDouble()) return '${m2.toInt()}㎡';
  return '${m2.toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '')}㎡';
}

/// "2026-10-14" → "2026.10.14"
String formatDate(String? isoDate) => isoDate == null ? '-' : isoDate.replaceAll('-', '.');

/// 접수기간. 시작/종료가 모두 없으면 "일정 미정/상시"
String formatPeriod(String? start, String? end) {
  if (start == null && end == null) return '일정 미정/상시';
  if (start != null && end != null && start == end) return formatDate(start);
  if (start == null) return '~ ${formatDate(end)}';
  if (end == null) return '${formatDate(start)} ~';
  return '${formatDate(start)} ~ ${formatDate(end)}';
}

/// 최소~최대 범위. 한쪽만 있거나 같으면 하나만 표시
String formatRange<T>(T? min, T? max, String Function(T value) format) {
  if (min == null && max == null) return '-';
  if (min == null || max == null || min == max) return format((min ?? max) as T);
  return '${format(min)} ~ ${format(max)}';
}

/// 값이 있을 때만 뒤에 "~" 를 붙인다. (최소금액 표시용)
String formatFrom(int? won) => won == null ? '-' : '${formatWon(won)}~';
