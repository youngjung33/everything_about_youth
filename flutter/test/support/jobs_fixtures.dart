import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/jobs/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_filters.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_meta.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_repository.dart';
import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';

Map<String, dynamic> postingSummaryJson({
  String id = 'b1',
  String title = '청년 인턴 채용',
  String status = 'open',
  Map<String, dynamic>? eligibility,
}) => {
  'id': id,
  'title': title,
  'organization': '서울시',
  'hireTypeId': 'public_corp',
  'categoryLabel': '청년 전용',
  'tags': ['월세', '청년'],
  'status': status,
  'statusLabel': status == 'open' ? '신청중' : '마감',
  'dday': 'D-8',
  'regions': [
    {'sido': '서울', 'sigungu': ''},
  ],
  'regionLabel': '서울',
  'applicationStart': '2026-10-01',
  'applicationEnd': '2026-10-20',
  'announcementDate': '2026-09-25',
  'summary': '만 19~39세 청년 대상 인턴 채용',
  'url': 'https://example.com/b1',
  'sourceLabels': ['데모 데이터'],
  'eligibility': eligibility,
};

Map<String, dynamic> postingDetailJson({Map<String, dynamic>? eligibility}) => {
  ...postingSummaryJson(eligibility: eligibility),
  'googleCalendarUrl': 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  'sources': [
    {
      'source': 'demo',
      'sourceLabel': '데모 데이터',
      'externalId': 'demo-1',
      'url': 'https://example.com/demo/1',
      'fetchedAt': '2026-10-11T00:00:00.000Z',
    },
  ],
};

Map<String, dynamic> postingPageJson({
  required List<Map<String, dynamic>> items,
  int total = 0,
  int page = 1,
  int totalPages = 1,
}) => {
  'items': items,
  'total': total == 0 ? items.length : total,
  'page': page,
  'pageSize': 20,
  'totalPages': totalPages,
  'today': '2026-10-13',
};

Map<String, dynamic> jobsMetaJson() => {
  'dataUpdatedAt': '2026-10-12T01:00:00.000Z',
  'categories': [
    {'value': 'public_corp', 'label': '공기업·준정부'},
    {'value': 'youth', 'label': '청년 전용'},
    {'value': 'new_grad', 'label': '신입·수습'},
  ],
  'statuses': [
    {'value': 'upcoming', 'label': '신청예정'},
    {'value': 'open', 'label': '신청중'},
    {'value': 'closed', 'label': '마감'},
  ],
  'verdicts': [
    {'value': 'eligible', 'label': '신청 가능'},
    {'value': 'check', 'label': '조건 확인 필요'},
    {'value': 'ineligible', 'label': '신청 불가'},
  ],
  'sorts': [
    {'value': 'deadline', 'label': '마감 임박순'},
    {'value': 'latest', 'label': '최신 공고순'},
  ],
  'sidos': ['서울', '경기'],
  'standards': {
    'year': 2026,
    'maxHouseholdSize': 8,
    'urbanWorkerIncome': [3813363, 5866270, 8168429, 8802202, 9326985, 9906263, 10485541, 11064819],
  },
};

PostingSummary samplePostingSummary({String id = 'b1', String title = '청년 인턴'}) =>
    PostingSummary.fromJson(postingSummaryJson(id: id, title: title));

class FakeJobsRepository implements JobsRepository {
  FakeJobsRepository({
    List<PostingPage>? pages,
    this.meta,
    this.detail,
    this.searchError,
    this.fetchMetaError,
    this.getPostingError,
    this.fetchSavedError,
    this.saveError,
    this.unsaveError,
    this.mergeError,
    this.searchHook,
    List<String>? savedIds,
  }) : pages = pages ?? [],
       savedIds = savedIds ?? [];

  final List<PostingPage> pages;
  final JobsMeta? meta;
  final PostingDetail? detail;
  Object? searchError;
  Object? fetchMetaError;
  Object? getPostingError;
  Object? fetchSavedError;
  Object? saveError;
  Object? unsaveError;
  Object? mergeError;
  List<String> savedIds;

  Future<PostingPage> Function(JobsFilters filters, int page)? searchHook;

  final List<({JobsFilters filters, ApplicantProfile profile, int page})> searchCalls = [];
  final List<String> saveCalls = [];
  final List<String> unsaveCalls = [];
  final List<List<String>> mergeCalls = [];

  @override
  Future<JobsMeta> fetchMeta() async {
    if (fetchMetaError != null) throw fetchMetaError!;
    return meta ?? JobsMeta.fromJson(jobsMetaJson());
  }

  @override
  Future<PostingPage> searchPostings({
    required JobsFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    searchCalls.add((filters: filters, profile: profile, page: page));
    if (searchError != null) throw searchError!;
    if (searchHook != null) return searchHook!(filters, page);
    return pages[page - 1];
  }

  @override
  Future<PostingDetail> getPosting(String id, {required ApplicantProfile profile}) async {
    if (getPostingError != null) throw getPostingError!;
    if (detail != null) return detail!;
    for (final page in pages) {
      for (final item in page.items) {
        if (item.id == id) {
          return PostingDetail(summary: item, sources: const []);
        }
      }
    }
    throw const ApiException('공고를 찾을 수 없습니다.', statusCode: 404);
  }

  @override
  Future<List<String>> fetchSavedIds() async => List.of(savedIds);

  @override
  Future<SavedPostingList> fetchSaved({required ApplicantProfile profile}) async {
    if (fetchSavedError != null) throw fetchSavedError!;
    final items = [
      for (final page in pages)
        for (final item in page.items)
          if (savedIds.contains(item.id)) item,
    ];
    return SavedPostingList(items: items, total: items.length, today: '2026-10-13');
  }

  @override
  Future<void> savePosting(String id) async {
    if (saveError != null) throw saveError!;
    saveCalls.add(id);
    if (!savedIds.contains(id)) savedIds = [id, ...savedIds];
  }

  @override
  Future<void> unsavePosting(String id) async {
    if (unsaveError != null) throw unsaveError!;
    unsaveCalls.add(id);
    savedIds = [
      for (final e in savedIds)
        if (e != id) e,
    ];
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    if (mergeError != null) throw mergeError!;
    mergeCalls.add(ids);
    for (final id in ids) {
      if (!savedIds.contains(id)) savedIds = [...savedIds, id];
    }
    return List.of(savedIds);
  }
}
