/// go_router 경로·이름 상수.
class JobsRoutes {
  const JobsRoutes._();

  static const base = '/jobs';
  static const profile = '/jobs/profile';
  static const saved = '/jobs/saved';
  static const schedule = '/jobs/schedule';

  static String posting(String id) => '/jobs/postings/${Uri.encodeComponent(id)}';
}
