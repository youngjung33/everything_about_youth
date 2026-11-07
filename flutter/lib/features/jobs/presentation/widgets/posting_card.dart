import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/widgets/collected_summary.dart';
import '../../../../core/format/format.dart';
import '../../domain/job_posting.dart';
import '../jobs_routes.dart';
import 'badges.dart';
import 'saved_posting_button.dart';
import '../../../../core/theme/app_fonts.dart';

class MetaItem extends StatelessWidget {
  const MetaItem({super.key, required this.label, required this.value, this.width = 150});

  final String label;
  final String value;
  final double width;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorPosting;
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: colors.outline)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

class PostingBadges extends StatelessWidget {
  const PostingBadges({super.key, required this.posting, this.largeEligibility = false});

  final PostingSummary posting;
  final bool largeEligibility;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorPosting;
    final showDday = posting.dday != null && posting.status != PostingStatus.closed;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        StatusBadge(status: posting.status, label: posting.statusLabel),
        if (showDday)
          Text(
            posting.dday!,
            style: TextStyle(fontSize: 13, fontWeight: AppFonts.bold, color: colors.primary),
          ),
        Pill(text: posting.categoryLabel, background: colors.primaryContainer, foreground: colors.onPrimaryContainer),
        for (final tag in posting.tags.take(3)) Pill(text: tag),
        EligibilityBadge(eligibility: posting.eligibility, large: largeEligibility),
      ],
    );
  }
}

class PostingCard extends StatelessWidget {
  const PostingCard({super.key, required this.posting, this.onTap});

  final PostingSummary posting;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? () => context.push(JobsRoutes.posting(posting.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                posting.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: PostingBadges(posting: posting)),
                  SavedPostingButton(postingId: posting.id),
                ],
              ),
              const SizedBox(height: 8),
              CollectedSummary(
                summary: posting.summary,
                maxLines: 2,
                missingText: ServiceCopy.missingSummaryCard,
                style: TextStyle(color: Theme.of(context).colorPosting.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  MetaItem(label: '주관', value: posting.organization, width: 170),
                  MetaItem(label: '지역', value: posting.regionLabel, width: 170),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(posting.applicationStart, posting.applicationEnd),
                    width: 170,
                  ),
                  MetaItem(label: '출처', value: posting.sourceLabels.join(', '), width: 170),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
