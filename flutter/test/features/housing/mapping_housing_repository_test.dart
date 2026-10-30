import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/features/housing/data/mapping_housing_repository.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/failures.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

void main() {
  group('MappingHousingRepository', () {
    test('404 는 HousingNoticeNotFound', () async {
      final inner = FakeHousingRepository();
      final repo = MappingHousingRepository(inner);
      await expectLater(
        repo.getNotice('missing', profile: ApplicantProfile.empty),
        throwsA(isA<HousingNoticeNotFound>()),
      );
    });

    test('noticeNotFound 코드도 HousingNoticeNotFound', () async {
      final inner = FakeHousingRepository(
        searchError: const ApiException('x', statusCode: 404, code: ApiErrorCode.noticeNotFound),
      );
      final repo = MappingHousingRepository(inner);
      await expectLater(
        repo.searchNotices(filters: HousingFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<HousingNoticeNotFound>()),
      );
    });

    test('기타 ApiException 은 HousingUserMessage', () async {
      final inner = FakeHousingRepository(searchError: const ApiException('한도', statusCode: 400));
      final repo = MappingHousingRepository(inner);
      await expectLater(
        repo.searchNotices(filters: HousingFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<HousingUserMessage>().having((e) => e.message, 'message', '한도')),
      );
    });

    test('saveNotice 실패도 HousingUserMessage', () async {
      final inner = FakeHousingRepository(saveError: const ApiException('저장 불가'));
      final repo = MappingHousingRepository(inner);
      await expectLater(repo.saveNotice('n1'), throwsA(isA<HousingUserMessage>()));
    });

    test('fetchMeta·mergeSaved·unsave·fetchSaved 실패도 HousingUserMessage', () async {
      var inner = FakeHousingRepository(fetchMetaError: const ApiException('meta fail'));
      var repo = MappingHousingRepository(inner);
      await expectLater(repo.fetchMeta(), throwsA(isA<HousingUserMessage>().having((e) => e.message, 'msg', 'meta fail')));

      inner = FakeHousingRepository(mergeError: const ApiException('merge fail'));
      repo = MappingHousingRepository(inner);
      await expectLater(repo.mergeSaved(['a']), throwsA(isA<HousingUserMessage>()));

      inner = FakeHousingRepository(unsaveError: const ApiException('unsave fail'));
      repo = MappingHousingRepository(inner);
      await expectLater(repo.unsaveNotice('a'), throwsA(isA<HousingUserMessage>()));

      inner = FakeHousingRepository(fetchSavedError: const ApiException('saved list fail'));
      repo = MappingHousingRepository(inner);
      await expectLater(
        repo.fetchSaved(profile: ApplicantProfile.empty),
        throwsA(isA<HousingUserMessage>()),
      );
    });
  });
}
