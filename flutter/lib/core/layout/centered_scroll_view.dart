import 'package:flutter/material.dart';

/// 내용이 짧으면 **가운데**에, 화면보다 길면 **스크롤**되는 영역.
///
/// 오류·안내처럼 높이가 정해진 내용을 `Center(child: Column(...))` 로만 두면 작은 폰, 가로 모드, 큰 글꼴 설정,
/// 키보드가 올라온 상태에서 아래가 잘리거나 오버플로 경고가 난다. 이럴 때 이 위젯으로 감싼다.
///
/// 높이가 정해지지 않은 곳(목록 안 등)에서는 스크롤 없이 가운데 정렬만 한다.
class CenteredScrollView extends StatelessWidget {
  const CenteredScrollView({super.key, required this.child, this.padding = const EdgeInsets.all(24)});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (!constraints.hasBoundedHeight) {
          return Padding(
            padding: padding,
            child: Center(child: child),
          );
        }
        final minHeight = (constraints.maxHeight - padding.vertical).clamp(0.0, double.infinity);
        return SingleChildScrollView(
          padding: padding,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: minHeight),
            child: Center(child: child),
          ),
        );
      },
    );
  }
}
