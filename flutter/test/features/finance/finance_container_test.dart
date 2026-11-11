import 'package:everything_about_youth/features/finance/data/saved_scheme_reminder_prefs.dart';
import 'package:everything_about_youth/features/finance/domain/repositories/profile_local_store.dart';
import 'package:everything_about_youth/features/finance/domain/repositories/saved_scheme_local_store.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/paginated_scheme_list.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/search_schemes.dart';
import 'package:everything_about_youth/features/finance/domain/use_cases/toggle_saved_scheme.dart';
import 'package:everything_about_youth/features/finance/finance_container.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/finance_fixtures.dart';
import '../../support/finance_memory_stores.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('fromStores: use case·포트가 한 세트로 조립된다', () async {
    final prefs = await SharedPreferences.getInstance();
    final container = FinanceContainer.fromStores(
      repository: FakeFinanceRepository(),
      profileLocalStore: MemoryFinanceProfileStore(),
      savedSchemeLocalStore: MemorySavedSchemeLocalStore(),
      reminderPrefs: SavedSchemeReminderPrefs(prefs),
    );

    expect(container.searchSchemes, isA<SearchSchemesUseCase>());
    expect(container.paginatedSchemeList, isA<PaginatedSchemeListUseCase>());
    expect(container.toggleSavedScheme, isA<ToggleSavedSchemeUseCase>());
    expect(container.reminderPrefs, isA<SavedSchemeReminderPrefs>());
    expect(container.profileLocalStore, isA<ProfileLocalStore>());
    expect(container.savedSchemeLocalStore, isA<SavedSchemeLocalStore>());
  });
}
