import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/design/service_accent.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../saved_program_reminder_sync.dart';
import '../widgets/program_card.dart';

const _accent = ServiceAccent.benefits;

/// 저장한 관심 정책. 비회원은 이 기기, 회원은 서버(로그인 때 기기 목록을 합친다).
class SavedProgramsPage extends ConsumerStatefulWidget {
  const SavedProgramsPage({super.key});

  @override
  ConsumerState<SavedProgramsPage> createState() => _SavedProgramsPageState();
}

class _SavedProgramsPageState extends ConsumerState<SavedProgramsPage> {
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(savedProgramListProvider);
    final reminderPrefs = ref.read(benefitsContainerProvider).reminderPrefs;
    final remindersOn = !kIsWeb && reminderPrefs.enabled;

    return AppScaffold(
      appBar: AppTopBar(title: Text(_accent.savedAppBarTitle)),
      body: async.when(
        loading: () => LoadingView(message: _accent.savedLoadingMessage),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(savedProgramListProvider)),
        data: (list) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(savedProgramsProvider);
              await ref.read(savedProgramListProvider.future);
              await syncSavedProgramReminders(ref);
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
                        await syncSavedProgramReminders(ref);
                      },
                    ),
                  ),
                if (list.items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 48),
                    child: EmptyView(message: _accent.savedEmptyMessage, hint: _accent.savedEmptyHint),
                  )
                else
                  for (final program in list.items)
                    Align(
                      alignment: Alignment.topCenter,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 900),
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: ProgramCard(program: program),
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
