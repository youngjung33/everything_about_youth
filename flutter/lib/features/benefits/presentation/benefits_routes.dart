/// go_router 경로·이름 상수.
class BenefitsRoutes {
  const BenefitsRoutes._();

  static const base = '/benefits';
  static const profile = '/benefits/profile';
  static const saved = '/benefits/saved';
  static const schedule = '/benefits/schedule';

  static String program(String id) => '/benefits/programs/${Uri.encodeComponent(id)}';
}
