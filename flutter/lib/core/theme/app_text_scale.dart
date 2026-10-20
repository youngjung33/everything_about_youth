import 'package:flutter/widgets.dart';

/// 글꼴 크기(시스템 "글자 크기" 설정) 확대 정책.
///
/// 기기 설정은 따르되(접근성) 일정 범위를 넘지 않게 한다. 설정이 매우 크면(안드로이드 최대 약 2.0, iOS 접근성 3배 이상)
/// 헤더·칩·버튼이 깨지거나 잘린다. 본문은 스크롤되어 견디지만 고정 높이 영역은 그렇지 않기 때문이다.
///
/// - [max] 1.4  : 기본 크기의 1.4배까지는 그대로 따른다. 이보다 크게 설정해도 1.4배로 보인다.
/// - [min] 0.85 : 너무 작아져 읽기 어려워지는 것을 막는다.
///
/// 값을 바꿀 때는 여기 두 상수만 고치면 앱 전체에 적용된다. (접근성을 더 우선하려면 max 를 올리고, 레이아웃을 더 보호하려면 내린다)
abstract final class AppTextScale {
  static const double min = 0.85;
  static const double max = 1.4;
}

/// 앱 전체의 글꼴 배율을 [AppTextScale] 범위로 제한한다. `MaterialApp.builder` 에서 한 번 감싼다.
///
/// 시스템 설정을 `MediaQuery` 로 읽는 모든 위젯(`Text` 포함)에 적용된다. (`textScaler` 의 비선형 확대도 범위로 제한)
class AppTextScaleClamp extends StatelessWidget {
  const AppTextScaleClamp({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MediaQuery.withClampedTextScaling(
      minScaleFactor: AppTextScale.min,
      maxScaleFactor: AppTextScale.max,
      child: child,
    );
  }
}
