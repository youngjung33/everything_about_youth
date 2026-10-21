import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../providers/core_providers.dart';
import 'auth_mode.dart';
import 'auth_session.dart';
import 'sso.dart';
import 'web_auth_launcher.dart';

/// 로그인 창을 여는 곳. 테스트에서는 가짜로 바꾼다.
final ssoLauncherProvider = Provider<SsoLauncher>((ref) => const WebAuthLauncher());

/// 로그인이 끝나고 서버가 앱으로 돌려보낼 주소.
/// 웹은 지금 열려 있는 앱 주소의 `/auth.html`, 앱(Android/iOS)은 커스텀 스킴이다.
final ssoRedirectUriProvider = Provider<String>((ref) => kIsWeb ? ssoWebRedirect(Uri.base) : ssoAppRedirect);

/// 로그인 관련 서버 API. 로그인 전에도 불러야 하므로 토큰을 붙이지 않는 클라이언트를 쓴다.
final ssoClientProvider = Provider<SsoClient>((ref) => SsoClient(ref.watch(plainApiClientProvider)));

/// 서버에서 지금 쓸 수 있는 로그인 방법의 id. 로그인 화면이 열릴 때마다 새로 묻는다.
/// 서버 설정이 바뀌면(업체 키를 새로 넣음) 화면을 다시 열어서 반영된다.
final enabledSsoProvidersProvider = FutureProvider.autoDispose<Set<String>>(
  (ref) => ref.watch(ssoClientProvider).enabledProviders(),
);

/// 로그인, 비회원 시작, 로그아웃, 회원 탈퇴. 화면은 이것만 부른다.
final authActionsProvider = Provider<AuthActions>(
  (ref) => AuthActions(
    flow: SsoSignInFlow(
      client: ref.watch(ssoClientProvider),
      launcher: ref.watch(ssoLauncherProvider),
      redirectUri: ref.watch(ssoRedirectUriProvider),
    ),
    session: ref.watch(authSessionProvider),
    api: ref.watch(apiClientProvider),
    setMode: ref.read(authModeProvider.notifier).set,
  ),
);

class AuthActions {
  AuthActions({required this.flow, required this.session, required this.api, required this.setMode});

  final SsoSignInFlow flow;
  final AuthSession session;
  final ApiClient api;
  final Future<void> Function(AuthMode mode) setMode;

  /// "비회원으로 시작하기". 서버 호출 없이 모드만 정한다. (세션은 첫 API 호출 때 서버가 만든다)
  Future<void> continueAsGuest() => setMode(AuthMode.guest);

  /// 소셜 로그인. 성공하면 회원 세션으로 바뀐다.
  /// 취소는 [SsoCancelledException], 실패는 [SsoFailedException] 또는 [ApiException] 이다.
  Future<void> signIn(SsoProvider provider) async {
    final sessionJson = await flow.run(provider);
    await session.signIn(sessionJson);
    await setMode(AuthMode.member);
  }

  /// 로그아웃. 서버에 알리지 못해도(오프라인 등) 이 기기에서는 반드시 로그아웃한다.
  Future<void> signOut() async {
    try {
      await api.postJson('/auth/logout');
    } on ApiException catch (e) {
      debugPrint('[auth] 서버에 로그아웃을 알리지 못했습니다: ${e.code}');
    }
    await _leave();
  }

  /// 회원 탈퇴. 서버에서 지우지 못했으면 오류를 그대로 던지고 로그인 상태를 유지한다. (지워진 줄 알고 떠나면 안 된다)
  Future<void> deleteAccount() async {
    await api.postJson('/auth/account/delete');
    await _leave();
  }

  Future<void> _leave() async {
    await session.clear();
    await setMode(AuthMode.none);
  }
}
