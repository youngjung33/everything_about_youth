import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/auth_session.dart';
import '../auth/token_store.dart';
import '../config/app_config.dart';
import '../network/api_client.dart';
import '../network/auth_token_source.dart';
import '../security/cipher_key_store.dart';
import '../security/field_cipher.dart';
import '../update/app_info.dart';
import '../update/update_gate.dart';
import '../update/update_requirement.dart';

// 모든 서비스가 코어에서 받아 쓰는 공용 인프라. 서비스는 이것을 가져다 쓰고, 자기 것을 따로 만들지 않는다.

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

/// 토큰 보관 위치. 기본은 플랫폼 보안 저장소이고, 테스트에서는 메모리 저장소로 바꾼다.
final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

/// API 클라이언트를 만든다. 모든 클라이언트가 같은 규칙을 따른다.
/// - 모든 요청에 앱 버전 헤더가 붙는다. (서버가 강제 업데이트 대상인지 판단)
/// - 업데이트가 필요하다는 응답을 받으면 업데이트 게이트를 켠다. (어느 서비스가 부르든 앱 전체가 업데이트 화면으로)
ApiClient _newClient(Ref ref, {AuthTokenSource? auth}) {
  final client = ApiClient(
    baseUrl: ref.watch(appConfigProvider).apiBaseUrl,
    auth: auth,
    defaultHeaders: ref.watch(appInfoProvider).headers,
    onUpdateRequired: (error) => ref.read(updateGateProvider.notifier).requireFrom(error),
  );
  ref.onDispose(client.close);
  return client;
}

/// 토큰을 붙이지 않는 클라이언트. 세션을 얻는 `/auth/*` 와 앱 설정 확인 전용이다. 서비스는 쓰지 않는다.
final plainApiClientProvider = Provider<ApiClient>((ref) => _newClient(ref));

/// JWT 세션. 토큰 발급/갱신/보관을 맡는다.
final authSessionProvider = Provider<AuthSession>(
  (ref) => AuthSession(plainApi: ref.watch(plainApiClientProvider), store: ref.watch(tokenStoreProvider)),
);

/// 서버 JSON API 클라이언트. 서비스의 data 레이어가 이것으로 자기 API 를 호출한다.
/// 모든 요청에 JWT 가 자동으로 붙고, 만료되면 갱신해서 다시 보낸다. 서비스가 토큰을 신경 쓸 일은 없다.
final apiClientProvider = Provider<ApiClient>((ref) => _newClient(ref, auth: ref.watch(authSessionProvider)));

/// 서버에 앱 업데이트가 필요한지 묻는 곳. 테스트에서는 가짜로 바꾼다.
final appUpdateRemoteProvider = Provider<AppUpdateRemote>(
  (ref) => ApiAppUpdateRemote(ref.watch(plainApiClientProvider)),
);

/// 개인정보를 기기에 저장하기 전에 암호화하는 곳. (AES-256-GCM, 키는 플랫폼 보안 저장소)
/// 서비스는 '내 조건' 같은 민감한 값을 SharedPreferences 에 평문으로 두지 말고 이것으로 암호화해서 둔다.
final fieldCipherProvider = Provider<FieldCipher>((ref) => AesGcmFieldCipher(SecureCipherKeyStore()));

/// 기기 저장소. main.dart 에서 실제 인스턴스로 override 한다.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider 를 override 해야 합니다.'),
);
