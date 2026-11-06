class LivingRoutes {
  const LivingRoutes._();

  static const base = '/living';
  static const saved = '/living/saved';
  static const schedule = '/living/schedule';

  static String guide(String id) => '/living/guides/${Uri.encodeComponent(id)}';
}
