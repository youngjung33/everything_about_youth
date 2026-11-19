/// go_router 경로·이름 상수.
class FinanceRoutes {
  const FinanceRoutes._();

  static const base = '/finance';
  static const profile = '/finance/profile';
  static const saved = '/finance/saved';
  static const schedule = '/finance/schedule';

  static String scheme(String id) => '/finance/schemes/${Uri.encodeComponent(id)}';
}
