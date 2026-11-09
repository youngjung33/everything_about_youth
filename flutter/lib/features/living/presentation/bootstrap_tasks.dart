import '../../../core/bootstrap/bootstrap_task.dart';
import '../../../core/design/service_accent.dart';
import 'providers.dart';
import 'saved_guide_reminder_sync.dart';

const _accent = ServiceAccent.living;

/// 이사·생활 섹션이 앱 시작 때 끝내 둘 작업.
final livingBootstrapTasks = <BootstrapTask>[
  BootstrapTask(
    name: _accent.bootstrapSavedTaskName,
    run: (ref) async {
      await ref.read(savedGuidesProvider.future);
      await syncSavedGuideRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapListPrefetchName,
    run: (ref) async {
      await Future.wait([ref.read(livingMetaProvider.future), ref.read(guideListProvider.future)]);
    },
  ),
];
