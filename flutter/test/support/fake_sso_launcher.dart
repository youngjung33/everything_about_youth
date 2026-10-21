import 'package:everything_about_youth/core/auth/sso.dart';

import 'fake_auth_server.dart';

/// 로그인 창을 열지 않고 정해 둔 결과를 돌려주는 가짜. (실제 로그인 업체와 시스템 브라우저를 대신한다)
class FakeSsoLauncher implements SsoLauncher {
  /// 로그인에 성공한 것처럼 서버가 준 티켓이 붙은 앱 주소를 돌려준다.
  FakeSsoLauncher.succeeding()
    : _result = (() async => Uri.parse('everythingaboutyouth://auth?ticket=${FakeAuthServer.ticket}'));

  /// 사용자가 로그인 창을 닫았다.
  FakeSsoLauncher.cancelling() : _result = (() async => throw const SsoCancelledException());

  /// 로그인 업체에서 실패해 `?error=failed` 로 돌아왔다.
  FakeSsoLauncher.failing() : _result = (() async => Uri.parse('everythingaboutyouth://auth?error=failed'));

  /// 사용자가 업체의 로그인 화면에서 "취소"를 눌러 `?error=cancelled` 로 돌아왔다.
  FakeSsoLauncher.declined() : _result = (() async => Uri.parse('everythingaboutyouth://auth?error=cancelled'));

  /// 결과를 직접 정한다. (예: 로그인 창이 열려 있는 동안을 흉내 내려고 Completer 를 기다린다)
  FakeSsoLauncher.custom(Future<Uri> Function(Uri url) result) : _custom = result, _result = null;

  final Future<Uri> Function()? _result;
  Future<Uri> Function(Uri url)? _custom;

  /// 열려고 했던 인증 주소들
  final opened = <Uri>[];

  @override
  Future<Uri> authenticate(Uri url) {
    opened.add(url);
    final custom = _custom;
    return custom != null ? custom(url) : _result!();
  }
}
