import '../core/feature/feature_module.dart';
import '../features/housing/housing_module.dart';

/// 앱에 꽂힌 서비스 전체. **서비스를 추가/제거하는 곳은 여기 한 줄뿐이다.**
/// (켜고 끄는 것은 이 목록을 건드리지 않고 서버가 관리한다. 앱은 각 서비스의 `defaultEnabled` 로 시작해서 서버 값을 받아 반영한다.)
const appFeatureModules = <FeatureModule>[HousingModule()];
