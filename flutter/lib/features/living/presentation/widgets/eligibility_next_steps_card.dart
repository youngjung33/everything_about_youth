import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_fonts.dart';
import '../../domain/eligibility_next_steps.dart';
import '../../domain/living_guide.dart';
import '../living_routes.dart';
import '../providers.dart';
import 'guide_card.dart';

/// 상세 화면에서 자격 다음 단계 문구 블록.
class EligibilityNextStepsSection extends ConsumerWidget {
  const EligibilityNextStepsSection({super.key, required this.detail});

  final GuideDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final guide = detail.summary;
    final steps = eligibilityNextSteps(guide: guide, eligibility: guide.eligibility);
    final similar = ref.watch(similarGuidesProvider(guide.id));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  steps.headline,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
                ),
                const SizedBox(height: 12),
                for (final action in steps.actions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('• '),
                        Expanded(child: Text(action)),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
                Text('준비하면 좋은 서류 (참고)', style: TextStyle(fontWeight: AppFonts.bold, fontSize: 14)),
                const SizedBox(height: 8),
                for (final hint in steps.documentHints)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('· $hint', style: const TextStyle(fontSize: 13)),
                  ),
                const SizedBox(height: 12),
                Text(steps.disclaimer, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
              ],
            ),
          ),
        ),
        similar.when(
          data: (items) {
            if (items.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Text(
                  '비슷한 분야 안내',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
                ),
                const SizedBox(height: 8),
                for (final other in items) ...[
                  GuideCard(guide: other, onTap: () => context.push(LivingRoutes.guide(other.id))),
                  const SizedBox(height: 8),
                ],
              ],
            );
          },
          loading: () => const SizedBox.shrink(),
          error: (_, _) => const SizedBox.shrink(),
        ),
      ],
    );
  }
}