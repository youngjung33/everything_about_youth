import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/features/jobs/data/mapping_jobs_repository.dart';
import 'package:everything_about_youth/features/jobs/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/failures.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_filters.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/jobs_fixtures.dart';

void main() {
  group('MappingJobsRepository', () {
    test('404 는 JobPostingNotFound', () async {
      final inner = FakeJobsRepository();
      final repo = MappingJobsRepository(inner);
      await expectLater(
        repo.getPosting('missing', profile: ApplicantProfile.empty),
        throwsA(isA<JobPostingNotFound>()),
      );
    });

    test('postingNotFound 코드도 JobPostingNotFound', () async {
      final inner = FakeJobsRepository(
        searchError: const ApiException('x', statusCode: 404, code: ApiErrorCode.postingNotFound),
      );
      final repo = MappingJobsRepository(inner);
      await expectLater(
        repo.searchPostings(filters: JobsFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<JobPostingNotFound>()),
      );
    });

    test('기타 ApiException 은 JobsUserMessage', () async {
      final inner = FakeJobsRepository(searchError: const ApiException('한도', statusCode: 400));
      final repo = MappingJobsRepository(inner);
      await expectLater(
        repo.searchPostings(filters: JobsFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<JobsUserMessage>().having((e) => e.message, 'message', '한도')),
      );
    });

    test('savePosting 실패도 JobsUserMessage', () async {
      final inner = FakeJobsRepository(saveError: const ApiException('저장 불가'));
      final repo = MappingJobsRepository(inner);
      await expectLater(repo.savePosting('n1'), throwsA(isA<JobsUserMessage>()));
    });

    test('fetchMeta·mergeSaved·unsave·fetchSaved 실패도 JobsUserMessage', () async {
      var inner = FakeJobsRepository(fetchMetaError: const ApiException('meta fail'));
      var repo = MappingJobsRepository(inner);
      await expectLater(repo.fetchMeta(), throwsA(isA<JobsUserMessage>().having((e) => e.message, 'msg', 'meta fail')));

      inner = FakeJobsRepository(mergeError: const ApiException('merge fail'));
      repo = MappingJobsRepository(inner);
      await expectLater(repo.mergeSaved(['a']), throwsA(isA<JobsUserMessage>()));

      inner = FakeJobsRepository(unsaveError: const ApiException('unsave fail'));
      repo = MappingJobsRepository(inner);
      await expectLater(repo.unsavePosting('a'), throwsA(isA<JobsUserMessage>()));

      inner = FakeJobsRepository(fetchSavedError: const ApiException('saved list fail'));
      repo = MappingJobsRepository(inner);
      await expectLater(
        repo.fetchSaved(profile: ApplicantProfile.empty),
        throwsA(isA<JobsUserMessage>()),
      );
    });
  });
}
