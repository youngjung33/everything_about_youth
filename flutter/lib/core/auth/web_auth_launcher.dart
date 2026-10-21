import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

import 'sso.dart';

/// 앱이 돌아오는 주소의 스킴. Android `AndroidManifest.xml` 의 `CallbackActivity` 와 iOS 가 이 스킴을 받는다.
/// 서버의 `DEFAULT_APP_REDIRECT`(`everythingaboutyouth://auth`) 와 같은 값이어야 한다.
const ssoCallbackScheme = 'everythingaboutyouth';
const ssoAppRedirect = '$ssoCallbackScheme://auth';

/// 웹에서 돌아오는 주소. 서버의 `SSO_ALLOWED_REDIRECTS` 에 `<앱 주소>/auth.html` 을 넣어야 한다.
/// (`web/auth.html` 이 결과를 열어 준 창에 전달한다)
String ssoWebRedirect(Uri base) => '${base.origin}/auth.html';

/// 실제 로그인 창. Android 는 Chrome 커스텀 탭, iOS 는 ASWebAuthenticationSession, 웹은 팝업을 쓴다.
class WebAuthLauncher implements SsoLauncher {
  const WebAuthLauncher();

  @override
  Future<Uri> authenticate(Uri url) async {
    try {
      final result = await FlutterWebAuth2.authenticate(url: url.toString(), callbackUrlScheme: ssoCallbackScheme);
      return Uri.parse(result);
    } on PlatformException catch (e) {
      // 사용자가 창을 닫으면 플랫폼마다 CANCELED 로 알려 준다.
      if (e.code == 'CANCELED') throw const SsoCancelledException();
      throw const SsoFailedException();
    } on FormatException {
      throw const SsoFailedException();
    }
  }
}
