import 'package:shared_preferences/shared_preferences.dart';

/// 사용자가 앱을 어떤 상태로 쓰고 있는가.
///
/// - [none]: 아직 고르지 않았다. 로그인 화면만 보인다. (처음 설치, 로그아웃, 회원 탈퇴 뒤)
/// - [guest]: "비회원으로 시작하기". 조회는 모두 되고, 로그인이 필요한 기능만 막힌다.
/// - [member]: Google/Apple/네이버/카카오로 로그인했다.
enum AuthMode {
  none,
  guest,
  member;

  bool get isMember => this == member;

  /// 로그인 화면을 지나 앱 안으로 들어올 수 있는가
  bool get canEnter => this != none;
}

/// [AuthMode] 를 기기에 보관한다. 값은 민감하지 않으므로 SharedPreferences 에 둔다.
/// (실제 인증은 보안 저장소의 토큰이 한다. 이 값은 "로그인 화면을 보여줄까"만 정한다)
class AuthModeStore {
  const AuthModeStore(this._prefs);

  static const key = 'eay.auth.mode';

  final SharedPreferences _prefs;

  /// 저장된 값이 없거나 모르는 값이면 [AuthMode.none]
  AuthMode read() {
    final raw = _prefs.getString(key);
    return AuthMode.values.where((m) => m.name == raw).firstOrNull ?? AuthMode.none;
  }

  Future<void> write(AuthMode mode) async {
    if (mode == AuthMode.none) {
      await _prefs.remove(key);
    } else {
      await _prefs.setString(key, mode.name);
    }
  }
}
