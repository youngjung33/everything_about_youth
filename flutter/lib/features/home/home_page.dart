import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_controller.dart';
import '../../core/design/service_accent.dart';
import '../../core/feature/feature_flags.dart';
import '../../core/feature/feature_module.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/theme/app_fonts.dart';

/// 서비스 첫 화면. 켜져 있는 서비스를 카드로 보여준다.
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
              const SizedBox(height: 16),
              Text('청년의 모든 것', style: textTheme.headlineMedium?.copyWith(fontWeight: AppFonts.bold)),
              const SizedBox(height: 8),
              Text(
                '청년이 쓸 수 있는 정보를 한곳에서. 서비스를 고르면 목록·내 조건·관심·일정을 이어서 쓸 수 있습니다.',
                style: textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant, height: 1.45),
              ),
              const SizedBox(height: 8),
              Text(
                '자격 판정은 참고용입니다. 신청 전 원문을 꼭 확인하세요.',
                style: textTheme.bodySmall?.copyWith(color: scheme.outline),
              ),
              const SizedBox(height: 28),
              Text('이용 가능한 서비스', style: textTheme.titleSmall?.copyWith(fontWeight: AppFonts.bold)),
              const SizedBox(height: 12),
              for (final feature in features) ...[
                _FeatureCard(feature: feature, accent: _accentFor(feature.id)),
                const SizedBox(height: 12),
              ],
              if (features.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  child: Text(
                    '지금 켜져 있는 서비스가 없습니다. 서버 설정을 확인해 주세요.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: scheme.outline),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  ServiceAccent? _accentFor(String id) {
    for (final a in ServiceAccent.values) {
      if (a.id == id) return a;
    }
    return null;
  }
}

class _FeatureCard extends ConsumerStatefulWidget {
  const _FeatureCard({required this.feature, this.accent});

  final FeatureModule feature;
  final ServiceAccent? accent;

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
    final accent = widget.accent;
    final failed = ref.watch(featureAvailabilityProvider(widget.feature.id)) == FeatureAvailability.failed;
    final stripe = accent?.accent ?? scheme.primary;

    return Semantics(
      button: !failed,
      label: failed ? '${entry.title}, 사용 불가' : '${entry.title}, ${entry.description}',
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: failed ? null : () => context.push(widget.feature.basePath),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ColoredBox(color: failed ? scheme.outlineVariant : stripe, child: const SizedBox(width: 4)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: failed
                              ? scheme.surfaceContainerHighest
                              : (accent?.containerColor(context) ?? scheme.primaryContainer),
                          child: Icon(
                            entry.icon,
                            size: 26,
                            color: failed ? scheme.onSurfaceVariant : (accent?.accent ?? scheme.onPrimaryContainer),
                          ),
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
                              const SizedBox(height: 6),
                              Text(
                                failed ? '지금은 이 서비스를 불러오지 못했습니다.' : entry.description,
                                style: TextStyle(
                                  color: failed ? scheme.error : scheme.onSurfaceVariant,
                                  height: 1.4,
                                ),
                              ),
                              if (accent != null && !failed) ...[
                                const SizedBox(height: 8),
                                Text(
                                  accent.tagline,
                                  style: TextStyle(fontSize: 12, color: stripe, fontWeight: AppFonts.bold),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (failed)
                          _retrying
                              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))
                              : TextButton(onPressed: _retry, child: const Text('다시 시도'))
                        else
                          FilledButton.tonal(onPressed: () => context.push(widget.feature.basePath), child: const Text('열기')),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
