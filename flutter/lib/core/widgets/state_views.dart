import 'package:flutter/material.dart';

import '../layout/centered_scroll_view.dart';

/// 공용 로딩 표시. 화면(또는 영역) 전체를 채우는 로딩에 쓴다.
/// [message] 가 있으면 스피너 아래에 보여준다.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: message ?? '불러오는 중',
      liveRegion: true,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(width: 36, height: 36, child: CircularProgressIndicator(strokeWidth: 3.5)),
            if (message != null) ...[
              const SizedBox(height: 16),
              Text(message!, style: TextStyle(color: scheme.onSurfaceVariant)),
            ],
          ],
        ),
      ),
    );
  }
}

/// 공용 로딩 표시(작은 크기). 목록 아래 "더 불러오는 중" 처럼 일부 영역에 끼워 넣는 용도.
class InlineLoading extends StatelessWidget {
  const InlineLoading({super.key, this.size = 22, this.padding = const EdgeInsets.all(24)});

  final double size;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Center(
        child: Semantics(
          label: '불러오는 중',
          liveRegion: true,
          child: SizedBox(width: size, height: size, child: const CircularProgressIndicator(strokeWidth: 2.5)),
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    // 작은 화면·가로 모드·큰 글꼴에서 '다시 시도' 버튼이 잘리지 않도록, 짧으면 가운데 길면 스크롤
    return CenteredScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_off_outlined, size: 40, color: Theme.of(context).colorScheme.outline),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            FilledButton.tonal(onPressed: onRetry, child: const Text('다시 시도')),
          ],
        ],
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.message, this.hint});

  final String message;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_outlined, size: 40, color: scheme.outline),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (hint != null) ...[
              const SizedBox(height: 8),
              Text(
                hint!,
                textAlign: TextAlign.center,
                style: TextStyle(color: scheme.outline),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
