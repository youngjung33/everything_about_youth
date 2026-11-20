import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/design/service_accent.dart';
import '../providers.dart';
import '../saved_guide_reminder_sync.dart';

const _accent = ServiceAccent.living;

/// 관심 저장 토글 버튼.
class SavedGuideButton extends ConsumerWidget {
  const SavedGuideButton({super.key, required this.guideId, this.compact = true});

  final String guideId; // 가이드 id
  final bool compact; // 작은 버튼 레이아웃

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedGuidesProvider).value?.contains(guideId) ?? false;
    final tooltip = _accent.savedBookmarkTooltip(saved: saved);
    return IconButton(
      tooltip: tooltip,
      visualDensity: compact ? VisualDensity.compact : VisualDensity.standard,
      onPressed: () async {
        final error = await ref.read(savedGuidesProvider.notifier).toggle(guideId);
        if (error == null) {
          // ignore: discarded_futures
          syncSavedGuideReminders(ref);
        }
        if (error != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      },
      icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border),
    );
  }
}
