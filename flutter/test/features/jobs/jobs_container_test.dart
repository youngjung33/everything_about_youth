import 'package:everything_about_youth/features/jobs/data/saved_posting_reminder_prefs.dart';
import 'package:everything_about_youth/features/jobs/domain/repositories/profile_local_store.dart';
import 'package:everything_about_youth/features/jobs/domain/repositories/saved_posting_local_store.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/paginated_posting_list.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/search_job_postings.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/toggle_saved_posting.dart';
import 'package:everything_about_youth/features/jobs/jobs_container.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/jobs_fixtures.dart';
import '../../support/jobs_memory_stores.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('fromStores: use case·포트가 한 세트로 조립된다', () async {
    final prefs = await SharedPreferences.getInstance();
    final container = JobsContainer.fromStores(
      repository: FakeJobsRepository(),
      profileLocalStore: MemoryJobsProfileStore(),
      savedNoticeLocalStore: MemorySavedPostingLocalStore(),
      reminderPrefs: SavedPostingReminderPrefs(prefs),
    );

    expect(container.searchPostings, isA<SearchJobPostingsUseCase>());
    expect(container.paginatedPostingList, isA<PaginatedPostingListUseCase>());
    expect(container.toggleSavedPosting, isA<ToggleSavedPostingUseCase>());
    expect(container.reminderPrefs, isA<SavedPostingReminderPrefs>());
    expect(container.profileLocalStore, isA<ProfileLocalStore>());
    expect(container.savedNoticeLocalStore, isA<SavedPostingLocalStore>());
  });
}
