import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';

/// 관심 공고 저장/해제. 카드와 상세에서 같이 쓴다.
class SavedNoticeButton extends ConsumerWidget {
  const SavedNoticeButton({super.key, required this.noticeId, this.compact = true});

  final String noticeId;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedNoticesProvider).value?.contains(noticeId) ?? false;
    final tooltip = saved ? '관심 공고에서 빼기' : '관심 공고로 저장';
    return IconButton(
      tooltip: tooltip,
      visualDensity: compact ? VisualDensity.compact : VisualDensity.standard,
      onPressed: () async {
        final error = await ref.read(savedNoticesProvider.notifier).toggle(noticeId);
        if (error != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      },
      icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border),
    );
  }
}
