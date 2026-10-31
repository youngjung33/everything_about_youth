import 'package:everything_about_youth/features/benefits/data/saved_program_reminder_prefs.dart';
import 'package:everything_about_youth/features/benefits/domain/repositories/profile_local_store.dart';
import 'package:everything_about_youth/features/benefits/domain/repositories/saved_program_local_store.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/paginated_program_list.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/search_programs.dart';
import 'package:everything_about_youth/features/benefits/domain/use_cases/toggle_saved_program.dart';
import 'package:everything_about_youth/features/benefits/benefits_container.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/benefits_fixtures.dart';
import '../../support/benefits_memory_stores.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('fromStores: use case·포트가 한 세트로 조립된다', () async {
    final prefs = await SharedPreferences.getInstance();
    final container = BenefitsContainer.fromStores(
      repository: FakeBenefitsRepository(),
      profileLocalStore: MemoryBenefitsProfileStore(),
      savedNoticeLocalStore: MemorySavedProgramLocalStore(),
      reminderPrefs: SavedProgramReminderPrefs(prefs),
    );

    expect(container.searchPrograms, isA<SearchProgramsUseCase>());
    expect(container.paginatedProgramList, isA<PaginatedProgramListUseCase>());
    expect(container.toggleSavedProgram, isA<ToggleSavedProgramUseCase>());
    expect(container.reminderPrefs, isA<SavedProgramReminderPrefs>());
    expect(container.profileLocalStore, isA<ProfileLocalStore>());
    expect(container.savedNoticeLocalStore, isA<SavedProgramLocalStore>());
  });
}
