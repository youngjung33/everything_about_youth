import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_fonts.dart';
import '../../application/providers.dart';
import '../../domain/eligibility_next_steps.dart';
import '../../domain/notice.dart';
import '../housing_routes.dart';
import 'notice_card.dart';

class EligibilityNextStepsSection extends ConsumerWidget {
  const EligibilityNextStepsSection({super.key, required this.detail});

  final NoticeDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notice = detail.summary;
    final steps = eligibilityNextSteps(notice: notice, eligibility: notice.eligibility);
    final similar = ref.watch(similarNoticesProvider(notice.id));

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
                  '비슷한 유형 공고',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
                ),
                const SizedBox(height: 8),
                for (final other in items) ...[
                  NoticeCard(notice: other, onTap: () => context.push(HousingRoutes.notice(other.id))),
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
