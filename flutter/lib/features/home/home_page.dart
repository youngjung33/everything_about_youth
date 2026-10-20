import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_controller.dart';
import '../../core/feature/feature_flags.dart';
import '../../core/feature/feature_module.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/theme/app_fonts.dart';

/// 서비스 첫 화면. 켜져 있는 서비스를 카드로 보여준다.
/// 어떤 서비스가 있는지는 모르고, 코어의 [enabledFeaturesProvider] 가 주는 목록만 그린다.
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final features = ref.watch(enabledFeaturesProvider);

    return AppScaffold(
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 24),
              Text('청년의 모든 것', style: textTheme.headlineMedium?.copyWith(fontWeight: AppFonts.bold)),
              const SizedBox(height: 8),
              Text(
                '청년이 쓸 수 있는 모든 정보를 한곳에서 확인하세요.',
                style: textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 32),
              for (final feature in features) ...[_FeatureCard(feature: feature), const SizedBox(height: 12)],
            ],
          ),
        ),
      ),
    );
  }
}

/// 서비스 하나의 카드. 한 카드가 장애여도 다른 카드에는 영향이 없다.
class _FeatureCard extends ConsumerStatefulWidget {
  const _FeatureCard({required this.feature});

  final FeatureModule feature;

  @override
  ConsumerState<_FeatureCard> createState() => _FeatureCardState();
}

class _FeatureCardState extends ConsumerState<_FeatureCard> {
  bool _retrying = false;

  Future<void> _retry() async {
    setState(() => _retrying = true);
    await ref.read(bootstrapProvider.notifier).retryFeature(widget.feature.id);
    if (mounted) setState(() => _retrying = false);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final entry = widget.feature.entry;
    final failed = ref.watch(featureAvailabilityProvider(widget.feature.id)) == FeatureAvailability.failed;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        // push 로 열어야 서비스 첫 화면에 뒤로가기(홈으로)가 생긴다.
        onTap: failed ? null : () => context.push(widget.feature.basePath),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: failed ? scheme.surfaceContainerHighest : scheme.primaryContainer,
                child: Icon(entry.icon, color: failed ? scheme.onSurfaceVariant : scheme.onPrimaryContainer),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      failed ? '지금은 이 서비스를 불러오지 못했습니다.' : entry.description,
                      style: TextStyle(color: failed ? scheme.error : scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              if (failed)
                _retrying
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : TextButton(onPressed: _retry, child: const Text('다시 시도'))
              else
                const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
