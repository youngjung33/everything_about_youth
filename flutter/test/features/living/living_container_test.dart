import 'package:everything_about_youth/features/living/data/saved_guide_reminder_prefs.dart';
import 'package:everything_about_youth/features/living/domain/repositories/profile_local_store.dart';
import 'package:everything_about_youth/features/living/domain/repositories/saved_guide_local_store.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/paginated_guide_list.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/search_guides.dart';
import 'package:everything_about_youth/features/living/domain/use_cases/toggle_saved_guide.dart';
import 'package:everything_about_youth/features/living/living_container.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/living_fixtures.dart';
import '../../support/living_memory_stores.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('fromStores: use case·포트가 한 세트로 조립된다', () async {
    final prefs = await SharedPreferences.getInstance();
    final container = LivingContainer.fromStores(
      repository: FakeLivingRepository(),
      profileLocalStore: MemoryFinanceProfileStore(),
      savedGuideLocalStore: MemorySavedGuideLocalStore(),
      reminderPrefs: SavedGuideReminderPrefs(prefs),
    );

    expect(container.searchGuides, isA<SearchGuidesUseCase>());
    expect(container.paginatedGuideList, isA<PaginatedGuideListUseCase>());
    expect(container.toggleSavedGuide, isA<ToggleSavedGuideUseCase>());
    expect(container.reminderPrefs, isA<SavedGuideReminderPrefs>());
    expect(container.profileLocalStore, isA<ProfileLocalStore>());
    expect(container.savedGuideLocalStore, isA<SavedGuideLocalStore>());
  });
}
