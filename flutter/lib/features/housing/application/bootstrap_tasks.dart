import '../../../core/bootstrap/bootstrap_task.dart';
import 'providers.dart';

/// 임대주택 섹션이 앱 시작 때 끝내 둘 작업.
/// 이 목록을 앱 조립부(`lib/app/bootstrap_tasks.dart`)가 모아서 실행한다.
final housingBootstrapTasks = <BootstrapTask>[
  // 기기에 암호화해서 저장된 '내 조건'을 읽고 복호화해 둔다. 실패하면 판정이 틀어지므로 필수.
  // (읽을 수 없는 값은 던지지 않고 빈 조건이 되므로, 여기서 실패하는 일은 저장소 자체가 고장 난 경우뿐이다)
  BootstrapTask(
    name: '내 조건 불러오기',
    critical: true,
    run: (ref) async {
      await ref.read(profileStoreProvider).load();
      ref.read(profileProvider);
    },
  ),

  // 필터 선택지와 첫 페이지 공고를 미리 받아 둔다. 임대주택에 들어갔을 때 바로 목록이 보인다.
  // 서버가 느리거나 꺼져 있어도 앱은 시작해야 하므로 필수가 아니고, 실패하면 목록 화면이 자체 오류/재시도를 보여준다.
  BootstrapTask(
    name: '임대주택 미리 불러오기',
    run: (ref) async {
      await Future.wait([ref.read(housingMetaProvider.future), ref.read(noticeListProvider.future)]);
    },
  ),
];
