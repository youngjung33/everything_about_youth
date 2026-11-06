import '../../../core/bootstrap/bootstrap_task.dart';
import 'providers.dart';
import 'saved_guide_reminder_sync.dart';

final livingBootstrapTasks = <BootstrapTask>[
  BootstrapTask(
    name: '관심 안내 불러오기',
    run: (ref) async {
      await ref.read(savedGuidesProvider.future);
      await syncSavedGuideRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: '안내 목록 미리 불러오기',
    run: (ref) async {
      await Future.wait([ref.read(livingMetaProvider.future), ref.read(guideListProvider.future)]);
    },
  ),
];
