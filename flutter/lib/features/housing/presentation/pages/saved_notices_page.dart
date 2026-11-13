import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/design/service_accent.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../saved_notice_reminder_sync.dart';
import '../widgets/notice_card.dart';

const _accent = ServiceAccent.housing;

/// 저장한 관심 공고. 비회원은 이 기기, 회원은 서버(로그인 때 기기 목록을 합친다).
class SavedNoticesPage extends ConsumerStatefulWidget {
  const SavedNoticesPage({super.key});

  @override
  ConsumerState<SavedNoticesPage> createState() => _SavedNoticesPageState();
}

class _SavedNoticesPageState extends ConsumerState<SavedNoticesPage> {
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(savedNoticeListProvider);
    final reminderPrefs = ref.read(housingContainerProvider).reminderPrefs;
    final remindersOn = !kIsWeb && reminderPrefs.enabled;

    return AppScaffold(
      appBar: AppTopBar(title: Text(_accent.savedAppBarTitle)),
      body: async.when(
        loading: () => LoadingView(message: _accent.savedLoadingMessage),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(savedNoticeListProvider)),
        data: (list) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(savedNoticesProvider);
              await ref.read(savedNoticeListProvider.future);
              await syncSavedNoticeReminders(ref);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (!kIsWeb)
                  Card(
                    child: SwitchListTile(
                      title: const Text('접수·마감 알림'),
                      subtitle: Text(_accent.savedReminderSubtitle),
                      value: remindersOn,
                      onChanged: (value) async {
                        await reminderPrefs.setEnabled(value);
                        if (mounted) setState(() {});
                        await syncSavedNoticeReminders(ref);
                      },
                    ),
                  ),
                if (list.items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 48),
                    child: EmptyView(message: _accent.savedEmptyMessage, hint: _accent.savedEmptyHint),
                  )
                else
                  for (final notice in list.items)
                    Align(
                      alignment: Alignment.topCenter,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 900),
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: NoticeCard(notice: notice),
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
