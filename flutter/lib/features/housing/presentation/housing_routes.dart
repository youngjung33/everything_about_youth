/// 임대주택 섹션의 앱 내 경로
class HousingRoutes {
  const HousingRoutes._();

  static const base = '/housing';
  static const profile = '/housing/profile';
  static const saved = '/housing/saved';

  static String notice(String id) => '/housing/notices/${Uri.encodeComponent(id)}';
}
