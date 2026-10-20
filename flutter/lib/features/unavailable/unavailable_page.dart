import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_controller.dart';
import '../../core/feature/feature_flags.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/layout/app_top_bar.dart';
import '../../core/layout/centered_scroll_view.dart';

/// 꺼져 있거나 장애인 서비스의 주소로 들어왔을 때 보이는 화면.
///
/// - 꺼짐: 안내 + 홈으로
/// - 장애: 안내 + 다시 시도 (성공하면 원래 서비스 화면으로 이동)
/// - 정상으로 돌아온 경우(다시 켜짐, 복구)와 모르는 서비스는 라우터 가드가 알아서 보낸다.
class UnavailablePage extends ConsumerStatefulWidget {
  const UnavailablePage({super.key, required this.featureId});

  final String featureId;

  @override
  ConsumerState<UnavailablePage> createState() => _UnavailablePageState();
}

class _UnavailablePageState extends ConsumerState<UnavailablePage> {
  bool _retrying = false;

  Future<void> _retry() async {
    setState(() => _retrying = true);
    // 성공하면 라우터 가드(featureRedirect)가 알아서 서비스 화면으로 보낸다.
    await ref.read(bootstrapProvider.notifier).retryFeature(widget.featureId);
    if (mounted) setState(() => _retrying = false);
  }

  @override
  Widget build(BuildContext context) {
    final availability = ref.watch(featureAvailabilityProvider(widget.featureId));
    final module = ref.watch(featureModulesProvider).where((m) => m.id == widget.featureId).firstOrNull;
    final title = module?.entry.title ?? '서비스';
    final failed = availability == FeatureAvailability.failed;

    return AppScaffold(
      appBar: AppTopBar(title: Text(title)),
      // 작은 화면이나 큰 글꼴에서도 버튼이 잘리지 않도록, 짧으면 가운데 길면 스크롤
      body: CenteredScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              failed ? Icons.cloud_off_outlined : Icons.block_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              failed ? '$title 서비스를 불러오지 못했습니다.' : '$title 서비스는 지금 사용할 수 없습니다.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              failed ? '다른 서비스는 그대로 쓸 수 있어요. 잠시 후 다시 시도해 주세요.' : '다른 서비스는 그대로 쓸 수 있어요.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (failed)
              FilledButton(
                onPressed: _retrying ? null : _retry,
                child: _retrying
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : const Text('다시 시도'),
              ),
            TextButton(onPressed: () => context.go('/'), child: const Text('홈으로')),
          ],
        ),
      ),
    );
  }
}
