import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../saved_posting_reminder_sync.dart';

class SavedPostingButton extends ConsumerWidget {
  const SavedPostingButton({super.key, required this.postingId, this.compact = true});

  final String postingId;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedPostingsProvider).value?.contains(postingId) ?? false;
    final tooltip = saved ? '관심 정책에서 빼기' : '관심 정책으로 저장';
    return IconButton(
      tooltip: tooltip,
      visualDensity: compact ? VisualDensity.compact : VisualDensity.standard,
      onPressed: () async {
        final error = await ref.read(savedPostingsProvider.notifier).toggle(postingId);
        if (error == null) {
          // ignore: discarded_futures
          syncSavedPostingReminders(ref);
        }
        if (error != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      },
      icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border),
    );
  }
}
