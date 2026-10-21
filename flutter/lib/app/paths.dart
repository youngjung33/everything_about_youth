/// 로그인 화면. 소셜 로그인 네 가지와 "비회원으로 시작하기"가 있다.
const loginPath = '/login';

/// 로그인 화면으로 가는 주소. 로그인하고 나면 [from] 으로 돌아간다.
///
/// 라우터와 헤더의 계정 메뉴가 함께 쓴다. (서로를 import 하면 순환이 되므로 따로 둔다)
String loginLocation({String? from}) =>
    Uri(path: loginPath, queryParameters: from == null || from == '/' ? null : {'from': from}).toString();
