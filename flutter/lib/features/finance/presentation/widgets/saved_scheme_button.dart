import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../saved_scheme_reminder_sync.dart';

class SavedSchemeButton extends ConsumerWidget {
  const SavedSchemeButton({super.key, required this.schemeId, this.compact = true});

  final String schemeId;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedSchemesProvider).value?.contains(schemeId) ?? false;
    final tooltip = saved ? '관심 정책에서 빼기' : '관심 정책으로 저장';
    return IconButton(
      tooltip: tooltip,
      visualDensity: compact ? VisualDensity.compact : VisualDensity.standard,
      onPressed: () async {
        final error = await ref.read(savedSchemesProvider.notifier).toggle(schemeId);
        if (error == null) {
          // ignore: discarded_futures
          syncSavedSchemeReminders(ref);
        }
        if (error != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      },
      icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border),
    );
  }
}
