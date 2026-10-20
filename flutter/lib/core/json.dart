/// 서버 JSON 을 느슨하게 읽는 도우미. 값이 없거나 타입이 다르면 null/빈 값으로 처리한다.
String? asString(Object? v) => v is String ? v : null;

int? asInt(Object? v) => v is num ? v.toInt() : null;

double? asDouble(Object? v) => v is num ? v.toDouble() : null;

Map<String, dynamic> asMap(Object? v) => v is Map<String, dynamic> ? v : const {};

List<T> asList<T>(Object? v, T Function(Map<String, dynamic> json) fromJson) {
  if (v is! List) return const [];
  return [
    for (final e in v)
      if (e is Map<String, dynamic>) fromJson(e),
  ];
}

List<String> asStringList(Object? v) {
  if (v is! List) return const [];
  return [
    for (final e in v)
      if (e is String) e,
  ];
}
