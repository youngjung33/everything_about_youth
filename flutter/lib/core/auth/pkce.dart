import 'dart:convert';
import 'dart:math';

import 'package:cryptography/cryptography.dart';

/// PKCE (RFC 7636). 로그인을 시작한 앱만 일회용 티켓을 쓸 수 있게 묶는다.
///
/// 앱은 무작위 [verifier] 를 기기에 두고, 그 해시인 [challenge] 만 서버에 보낸다.
/// 다른 앱이 돌아오는 주소(커스텀 스킴)로 티켓을 가로채도 verifier 가 없으므로 교환할 수 없다.
class Pkce {
  const Pkce._(this.verifier, this.challenge);

  /// 서버가 받는 길이(43~128자)의 무작위 문자열. 서버로는 교환할 때만 보낸다.
  final String verifier;

  /// `base64url(sha256(verifier))`, 패딩 없음 (43자)
  final String challenge;

  static Future<Pkce> generate({Random? random}) async {
    final rng = random ?? Random.secure();
    // 48바이트 = base64url 64자
    final verifier = _base64Url(List<int>.generate(48, (_) => rng.nextInt(256)));
    return Pkce._(verifier, await challengeOf(verifier));
  }

  static Future<String> challengeOf(String verifier) async {
    final hash = await Sha256().hash(ascii.encode(verifier));
    return _base64Url(hash.bytes);
  }

  static String _base64Url(List<int> bytes) => base64Url.encode(bytes).replaceAll('=', '');
}
