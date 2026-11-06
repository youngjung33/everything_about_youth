import 'package:flutter/material.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/launch.dart';
import '../../../../core/theme/app_fonts.dart';
import '../../domain/living_guide.dart';

class ChecklistStepsSection extends StatelessWidget {
  const ChecklistStepsSection({super.key, required this.steps});

  final List<ChecklistStep> steps;

  @override
  Widget build(BuildContext context) {
    if (steps.isEmpty) return const SizedBox.shrink();
    final sorted = [...steps]..sort((a, b) => a.order.compareTo(b.order));
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('진행 단계', style: textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold)),
        const SizedBox(height: 8),
        for (final step in sorted) ...[
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${step.order}. ${step.title}', style: const TextStyle(fontWeight: AppFonts.bold)),
                  if (step.summary.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(step.summary),
                  ],
                  if (step.url != null) ...[
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: () => openExternal(context, step.url!),
                      icon: const Icon(Icons.open_in_new, size: 18),
                      label: const Text(ServiceCopy.sourceLinkLabel),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
