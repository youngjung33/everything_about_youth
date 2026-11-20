import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/design/service_accent.dart';
import '../providers.dart';
import '../saved_program_reminder_sync.dart';

const _accent = ServiceAccent.benefits;

/// 관심 저장 토글 버튼.
class SavedProgramButton extends ConsumerWidget {
  const SavedProgramButton({super.key, required this.programId, this.compact = true});

  final String programId; // 프로그램 id
  final bool compact; // 작은 버튼 레이아웃

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedProgramsProvider).value?.contains(programId) ?? false;
    final tooltip = _accent.savedBookmarkTooltip(saved: saved);
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
