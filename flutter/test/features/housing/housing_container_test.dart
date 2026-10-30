import 'package:everything_about_youth/features/housing/data/saved_notice_reminder_prefs.dart';
import 'package:everything_about_youth/features/housing/domain/repositories/profile_local_store.dart';
import 'package:everything_about_youth/features/housing/domain/repositories/saved_notice_local_store.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/paginated_notice_list.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/search_notices.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/toggle_saved_notice.dart';
import 'package:everything_about_youth/features/housing/housing_container.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/fixtures.dart';
import '../../support/housing_memory_stores.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('fromStores: use case·포트가 한 세트로 조립된다', () async {
    final prefs = await SharedPreferences.getInstance();
    final container = HousingContainer.fromStores(
      repository: FakeHousingRepository(),
      profileLocalStore: MemoryProfileStore(),
      savedNoticeLocalStore: MemorySavedNoticeLocalStore(),
      reminderPrefs: SavedNoticeReminderPrefs(prefs),
    );

    expect(container.searchNotices, isA<SearchNoticesUseCase>());
    expect(container.paginatedNoticeList, isA<PaginatedNoticeListUseCase>());
    expect(container.toggleSavedNotice, isA<ToggleSavedNoticeUseCase>());
    expect(container.reminderPrefs, isA<SavedNoticeReminderPrefs>());
    expect(container.profileLocalStore, isA<ProfileLocalStore>());
    expect(container.savedNoticeLocalStore, isA<SavedNoticeLocalStore>());
  });
}
