import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/repositories/profile_local_store.dart';
import 'package:everything_about_youth/features/housing/domain/repositories/saved_notice_local_store.dart';

class MemoryProfileStore implements ProfileLocalStore {
  MemoryProfileStore([this._current = ApplicantProfile.empty]) : _loaded = true;

  ApplicantProfile _current;
  bool _loaded;

  @override
  ApplicantProfile get current => _current;

  @override
  bool get isLoaded => _loaded;

  @override
  Future<ApplicantProfile> load() async {
    _loaded = true;
    return _current;
  }

  @override
  Future<void> save(ApplicantProfile profile) async {
    _current = profile;
    _loaded = true;
  }
}

class MemorySavedNoticeLocalStore implements SavedNoticeLocalStore {
  MemorySavedNoticeLocalStore([List<String>? ids]) : _ids = ids ?? [];

  List<String> _ids;
  bool _loaded = true;

  @override
  List<String> get current => List.unmodifiable(_ids);

  @override
  bool get isLoaded => _loaded;

  @override
  Future<List<String>> load() async {
    _loaded = true;
    return List.of(_ids);
  }

  @override
  Future<void> replace(List<String> ids) async {
    _ids = [...ids.where((e) => e.isNotEmpty)];
    _loaded = true;
  }
}
