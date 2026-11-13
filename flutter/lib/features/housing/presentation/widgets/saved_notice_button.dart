import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/design/service_accent.dart';
import '../providers.dart';
import '../saved_notice_reminder_sync.dart';

const _accent = ServiceAccent.housing;

/// 관심 공고 저장/해제. 카드와 상세에서 같이 쓴다.
class SavedNoticeButton extends ConsumerWidget {
  const SavedNoticeButton({super.key, required this.noticeId, this.compact = true});

  final String noticeId;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedNoticesProvider).value?.contains(noticeId) ?? false;
    final tooltip = _accent.savedBookmarkTooltip(saved: saved);
    return IconButton(
      tooltip: tooltip,
      visualDensity: compact ? VisualDensity.compact : VisualDensity.standard,
      onPressed: () async {
        final error = await ref.read(savedNoticesProvider.notifier).toggle(noticeId);
        if (error == null) {
          // ignore: discarded_futures
          syncSavedNoticeReminders(ref);
        }
        if (error != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      },
      icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border),
    );
  }
}
