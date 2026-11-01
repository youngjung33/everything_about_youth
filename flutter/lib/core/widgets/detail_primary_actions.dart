import 'package:flutter/material.dart';

/// 상세 화면 하단 고정 CTA — 스크롤해도 **다음 행동**이 보이게.
class DetailPrimaryActions extends StatelessWidget {
  const DetailPrimaryActions({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    // 안전 영역은 [AppScaffold.bottomBar] 가 처리한다.
    return Material(
      elevation: 4,
      color: scheme.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0) const SizedBox(height: 8),
              children[i],
            ],
          ],
        ),
      ),
    );
  }
}
