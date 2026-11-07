import 'package:meta/meta.dart';
import '../../../core/util/pure_dart.dart';

/// 정책 목록 검색 조건. 서버 API 쿼리 파라미터와 같은 이름·단위를 쓴다.
@immutable
class JobsFilters {
  const JobsFilters({
    this.sidos = const {},
    this.sigungu = '',
    this.hireTypeIds = const {},
    this.tags = const {},
    this.statuses = defaultStatuses,
    this.keyword = '',
    this.verdicts = const {},
    this.sort = 'deadline',
  });

  static const defaultStatuses = {'open', 'upcoming'};
  static const initial = JobsFilters();

  final Set<String> sidos;
  final String sigungu;
  final Set<String> hireTypeIds;
  final Set<String> tags;
  final Set<String> statuses;
  final String keyword;
  final Set<String> verdicts;
  final String sort;

  int get activeCount {
    var count = 0;
    if (sidos.isNotEmpty) count++;
    if (hireTypeIds.isNotEmpty) count++;
    if (tags.isNotEmpty) count++;
    if (!setEquals(statuses, defaultStatuses)) count++;
    if (keyword.trim().isNotEmpty) count++;
    return count;
  }

  JobsFilters copyWith({
    Set<String>? sidos,
    String? sigungu,
    Set<String>? hireTypeIds,
    Set<String>? tags,
    Set<String>? statuses,
    String? keyword,
    Set<String>? verdicts,
    String? sort,
  }) {
    return JobsFilters(
      sidos: sidos ?? this.sidos,
      sigungu: sigungu ?? this.sigungu,
      hireTypeIds: hireTypeIds ?? this.hireTypeIds,
      tags: tags ?? this.tags,
      statuses: statuses ?? this.statuses,
      keyword: keyword ?? this.keyword,
      verdicts: verdicts ?? this.verdicts,
      sort: sort ?? this.sort,
    );
  }

  Map<String, Object?> toQuery() => {
    'sido': sidos.toList(),
    'sigungu': sidos.isNotEmpty ? sigungu.trim() : null,
    'category': hireTypeIds.toList(),
    'tag': tags.toList(),
    'status': statuses.toList(),
    'q': keyword.trim(),
    'v': verdicts.toList(),
    'sort': sort,
  };

  @override
  bool operator ==(Object other) =>
      other is JobsFilters &&
      setEquals(other.sidos, sidos) &&
      other.sigungu == sigungu &&
      setEquals(other.hireTypeIds, hireTypeIds) &&
      setEquals(other.tags, tags) &&
      setEquals(other.statuses, statuses) &&
      other.keyword == keyword &&
      setEquals(other.verdicts, verdicts) &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    Object.hashAllUnordered(sidos),
    sigungu,
    Object.hashAllUnordered(hireTypeIds),
    Object.hashAllUnordered(tags),
    Object.hashAllUnordered(statuses),
    keyword,
    Object.hashAllUnordered(verdicts),
    sort,
  );
}
