import 'package:flutter/material.dart';

/// 스플래시 가운데에 들어갈 로고/문구 자리.
///
/// 지금은 의도적으로 비워 두었다. 나중에 로고나 앱 이름을 넣으려면 이 위젯의 반환값만 바꾸면 된다.
/// (웹은 `web/index.html` 의 `#boot` 안쪽도 같이 바꾼다.)
class SplashBrand extends StatelessWidget {
  const SplashBrand({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
