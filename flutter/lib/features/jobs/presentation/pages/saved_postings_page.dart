import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../saved_posting_reminder_sync.dart';
import '../widgets/posting_card.dart';

/// 저장한 관심 정책. 비회원은 이 기기, 회원은 서버(로그인 때 기기 목록을 합친다).
class SavedPostingsPage extends ConsumerStatefulWidget {
  const SavedPostingsPage({super.key});

  @override
  ConsumerState<SavedPostingsPage> createState() => _SavedPostingsPageState();
}

class _SavedPostingsPageState extends ConsumerState<SavedPostingsPage> {
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(savedPostingListProvider);
    final reminderPrefs = ref.read(jobsContainerProvider).reminderPrefs;
    final remindersOn = !kIsWeb && reminderPrefs.enabled;

    return AppScaffold(
      appBar: AppTopBar(title: const Text('관심 정책')),
      body: async.when(
        loading: () => const LoadingView(message: '관심 정책을 불러오는 중…'),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(savedPostingListProvider)),
        data: (list) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(savedPostingsProvider);
              await ref.read(savedPostingListProvider.future);
              await syncSavedPostingReminders(ref);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (!kIsWeb)
                  Card(
                    child: SwitchListTile(
                      title: const Text('접수·마감 알림'),
                      subtitle: const Text('관심 정책의 접수 시작·마감 하루 전·당일 오전 9시(한국 시간)에 알려 줍니다.'),
                      value: remindersOn,
                      onChanged: (value) async {
                        await reminderPrefs.setEnabled(value);
                        if (mounted) setState(() {});
                        await syncSavedPostingReminders(ref);
                      },
                    ),
                  ),
                if (list.items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 48),
                    child: EmptyView(message: '저장한 관심 정책이 없습니다.', hint: '정책 카드의 북마크를 눌러 저장하세요.'),
                  )
                else
                  for (final notice in list.items)
                    Align(
                      alignment: Alignment.topCenter,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 900),
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: PostingCard(posting: notice),
                        ),
                      ),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }
}
