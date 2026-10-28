import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../../domain/housing_filter_presets.dart';

/// 청년·신혼·매입임대 빠른 필터.
class HousingFilterPresetChips extends ConsumerWidget {
  const HousingFilterPresetChips({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(filtersProvider);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: [
          for (final preset in housingYouthFilterPresets)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(preset.label),
                selected: preset.matches(filters),
                onSelected: (selected) {
                  if (selected) {
                    ref.read(filtersProvider.notifier).apply(preset.applyTo(filters));
                  } else if (preset.matches(filters)) {
                    ref.read(filtersProvider.notifier).apply(filters.copyWith(supplyTypes: {}));
                  }
                },
              ),
            ),
        ],
      ),
    );
  }
}
