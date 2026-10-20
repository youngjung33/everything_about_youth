import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 작업 본문. 필요한 provider 는 [ref] 로 읽는다.
typedef BootstrapAction = Future<void> Function(Ref ref);

/// 메인 화면을 보여주기 전에 끝내 둘 작업 하나.
///
/// - [critical] 이 true 면 실패했을 때 앱이 시작되지 않고 스플래시에서 "다시 시도"를 보여준다.
///   (예: 기기에 저장된 값을 읽는 일처럼, 실패하면 앱이 정상 동작할 수 없는 작업)
/// - false 면 실패하거나 [timeout] 을 넘겨도 건너뛰고 앱을 시작한다.
///   (예: 서버에서 미리 받아 두는 데이터. 화면이 자체 오류/재시도를 처리한다)
class BootstrapTask {
  const BootstrapTask({
    required this.name,
    required this.run,
    this.critical = false,
    this.timeout = const Duration(seconds: 10),
  });

  /// 로그에 남길 이름
  final String name;
  final BootstrapAction run;
  final bool critical;
  final Duration timeout;
}
