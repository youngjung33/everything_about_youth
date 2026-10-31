import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../saved_program_reminder_sync.dart';

class SavedProgramButton extends ConsumerWidget {
  const SavedProgramButton({super.key, required this.programId, this.compact = true});

  final String programId;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedProgramsProvider).value?.contains(programId) ?? false;
    final tooltip = saved ? '관심 정책에서 빼기' : '관심 정책으로 저장';
    return IconButton(
      tooltip: tooltip,
      visualDensity: compact ? VisualDensity.compact : VisualDensity.standard,
      onPressed: () async {
        final error = await ref.read(savedProgramsProvider.notifier).toggle(programId);
        if (error == null) {
          // ignore: discarded_futures
          syncSavedProgramReminders(ref);
        }
        if (error != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      },
      icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border),
    );
  }
}
