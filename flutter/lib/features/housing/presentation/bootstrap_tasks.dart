import '../../../core/bootstrap/bootstrap_task.dart';
import 'providers.dart';
import 'saved_notice_reminder_sync.dart';

/// 임대주택 섹션이 앱 시작 때 끝내 둘 작업.
/// 이 목록을 앱 조립부(`lib/app/bootstrap_tasks.dart`)가 모아서 실행한다.
final housingBootstrapTasks = <BootstrapTask>[
  BootstrapTask(
    name: '내 조건 불러오기',
    critical: true,
    run: (ref) async {
      await ref.read(housingContainerProvider).loadProfile();
      ref.read(profileProvider);
    },
  ),

  BootstrapTask(
    name: '관심 공고 불러오기',
    run: (ref) async {
      await ref.read(savedNoticesProvider.future);
      await syncSavedNoticeRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: '임대주택 미리 불러오기',
    run: (ref) async {
      await Future.wait([ref.read(housingMetaProvider.future), ref.read(noticeListProvider.future)]);
    },
  ),
];
