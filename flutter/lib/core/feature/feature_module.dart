import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../bootstrap/bootstrap_task.dart';

/// 홈 화면에 보이는 서비스 카드 정보
class FeatureEntry {
  const FeatureEntry({required this.title, required this.description, required this.icon});

  final String title;
  final String description;
  final IconData icon;
}

/// 청년이 혜택을 받을 수 있는 서비스 하나(임대주택, 일자리, 금융 …)가 코어에 꽂히는 규격.
///
/// 서비스는 `features/<id>/` 폴더 하나로 끝나고, 이 클래스를 구현한 모듈 파일(`<id>_module.dart`)이 유일한 접점이다.
/// - 코어는 서비스를 모른다. 서비스가 코어의 이 규격을 구현해서 꽂힌다.
/// - 서비스끼리는 서로를 import 하지 않는다. (`test/architecture_test.dart` 가 검사)
/// - 켜고 끄기는 서버가 관리한다. 앱은 [defaultEnabled] 로 시작해서 서버 값을 받아 반영하고([FeatureFlags]),
///   꺼진 서비스는 숨긴다. 장애 격리는 [BootstrapController] 와 라우터 가드가 맡는다.
///
/// 새 서비스를 추가하는 방법은 `lib/features/README.md`.
abstract class FeatureModule {
  const FeatureModule();

  /// 설정·로그에서 서비스를 구분하는 키 (예: `housing`). 바꾸면 켜고 끄는 설정도 바뀐다.
  String get id;

  /// 서비스의 최상위 경로 (예: `/housing`). 이 아래의 모든 경로는 이 서비스의 것이다.
  String get basePath;

  /// 서버 설정을 받기 전(또는 받지 못했을 때)의 켜짐 여부. 켜고 끄는 건 서버가 관리하고, 이 값은 기본값일 뿐이다.
  /// 서버 응답에 이 서비스가 없을 때도 이 값을 쓴다.
  bool get defaultEnabled => true;

  /// 홈 카드
  FeatureEntry get entry;

  /// 서비스의 라우트. [basePath] 로 시작해야 한다.
  List<RouteBase> get routes;

  /// 앱이 시작할 때 이 서비스가 끝내 둘 작업.
  /// 필수(critical) 작업이 실패하면 앱 전체가 아니라 **이 서비스만** 사용할 수 없는 상태가 된다.
  List<BootstrapTask> get bootstrapTasks => const [];
}
