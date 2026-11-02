import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/format.dart';
import '../../domain/finance_scheme.dart';
import '../finance_routes.dart';
import 'badges.dart';
import 'saved_program_button.dart';
import '../../../../core/theme/app_fonts.dart';

class MetaItem extends StatelessWidget {
  const MetaItem({super.key, required this.label, required this.value, this.width = 150});

  final String label;
  final String value;
  final double width;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: scheme.outline)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

class SchemeBadges extends StatelessWidget {
  const SchemeBadges({super.key, required this.scheme, this.largeEligibility = false});

  final SchemeSummary program;
  final bool largeEligibility;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final showDday = scheme.dday != null && scheme.status != SchemeStatus.closed;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        StatusBadge(status: scheme.status, label: scheme.statusLabel),
        if (showDday)
          Text(
            scheme.dday!,
            style: TextStyle(fontSize: 13, fontWeight: AppFonts.bold, color: scheme.primary),
          ),
        Pill(text: scheme.categoryLabel, background: scheme.primaryContainer, foreground: scheme.onPrimaryContainer),
        for (final tag in scheme.tags.take(3)) Pill(text: tag),
        EligibilityBadge(eligibility: scheme.eligibility, large: largeEligibility),
      ],
    );
  }
}

class SchemeCard extends StatelessWidget {
  const SchemeCard({super.key, required this.scheme, this.onTap});

  final SchemeSummary program;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? () => context.push(FinanceRoutes.scheme(scheme.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                scheme.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: SchemeBadges(scheme: scheme)),
                  SavedSchemeButton(schemeId: scheme.id),
                ],
              ),
              if (scheme.summary != null && scheme.summary!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  scheme.summary!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ],
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  MetaItem(label: '주관', value: scheme.organization, width: 170),
                  MetaItem(label: '지역', value: scheme.regionLabel, width: 170),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(scheme.applicationStart, scheme.applicationEnd),
                    width: 170,
                  ),
                  MetaItem(label: '출처', value: scheme.sourceLabels.join(', '), width: 170),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
