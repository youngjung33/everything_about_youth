// Flutter 에 의존하지 않는 작은 도구들. 서비스의 domain 레이어(순수 Dart)가 쓴다.
// 이름은 Flutter 의 것과 같아서 `package:flutter/foundation.dart` 대신 이 파일을 import 하면 그대로 동작한다.

/// 값을 돌려주는 함수 ([copyWith] 에서 "null 로 바꾸기"를 구분할 때 쓴다)
typedef ValueGetter<T> = T Function();

/// 두 집합이 같은 원소를 가지는지
bool setEquals<T>(Set<T>? a, Set<T>? b) {
  if (identical(a, b)) return true;
  if (a == null || b == null) return false;
  return a.length == b.length && a.containsAll(b);
}
