import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/format/format.dart';
import '../../../../core/widgets/collected_summary.dart';
import '../../domain/benefit_program.dart';
import '../benefits_routes.dart';
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

class ProgramBadges extends StatelessWidget {
  const ProgramBadges({super.key, required this.program, this.largeEligibility = false});

  final ProgramSummary program;
  final bool largeEligibility;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final showDday = program.dday != null && program.status != ProgramStatus.closed;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        StatusBadge(status: program.status, label: program.statusLabel),
        if (showDday)
          Text(
            program.dday!,
            style: TextStyle(fontSize: 13, fontWeight: AppFonts.bold, color: scheme.primary),
          ),
        Pill(text: program.categoryLabel, background: scheme.primaryContainer, foreground: scheme.onPrimaryContainer),
        for (final tag in program.tags.take(3)) Pill(text: tag),
        EligibilityBadge(eligibility: program.eligibility, large: largeEligibility),
      ],
    );
  }
}

class ProgramCard extends StatelessWidget {
  const ProgramCard({super.key, required this.program, this.onTap});

  final ProgramSummary program;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap ?? () => context.push(BenefitsRoutes.program(program.id)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                program.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: ProgramBadges(program: program)),
                  SavedProgramButton(programId: program.id),
                ],
              ),
              const SizedBox(height: 8),
              CollectedSummary(
                summary: program.summary,
                maxLines: 2,
                missingText: ServiceCopy.missingSummaryCard,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 10,
                children: [
                  MetaItem(label: '주관', value: program.organization, width: 170),
                  MetaItem(label: '지역', value: program.regionLabel, width: 170),
                  MetaItem(
                    label: '신청기간',
                    value: formatPeriod(program.applicationStart, program.applicationEnd),
                    width: 170,
                  ),
                  MetaItem(label: '출처', value: program.sourceLabels.join(', '), width: 170),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
