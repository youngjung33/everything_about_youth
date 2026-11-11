import 'package:meta/meta.dart';
import '../../../core/util/pure_dart.dart';

/// 안내 목록 검색 조건. 서버 API 쿼리 파라미터와 같은 이름·단위를 쓴다.
@immutable
class LivingFilters {
  const LivingFilters({
    this.sidos = const {},
    this.sigungu = '',
    this.procedureTypeIds = const {},
    this.tags = const {},
    this.statuses = defaultStatuses,
    this.keyword = '',
    this.verdicts = const {},
    this.sort = 'deadline',
  });

  static const defaultStatuses = {'open', 'upcoming'};
  static const initial = LivingFilters();

  final Set<String> sidos;
  final String sigungu;
  final Set<String> procedureTypeIds;
  final Set<String> tags;
  final Set<String> statuses;
  final String keyword;
  final Set<String> verdicts;
  final String sort;

  int get activeCount {
    var count = 0;
    if (sidos.isNotEmpty) count++;
    if (procedureTypeIds.isNotEmpty) count++;
    if (tags.isNotEmpty) count++;
    if (!setEquals(statuses, defaultStatuses)) count++;
    if (keyword.trim().isNotEmpty) count++;
    return count;
  }

  LivingFilters copyWith({
    Set<String>? sidos,
    String? sigungu,
    Set<String>? procedureTypeIds,
    Set<String>? tags,
    Set<String>? statuses,
    String? keyword,
    Set<String>? verdicts,
    String? sort,
  }) {
    return LivingFilters(
      sidos: sidos ?? this.sidos,
      sigungu: sigungu ?? this.sigungu,
      procedureTypeIds: procedureTypeIds ?? this.procedureTypeIds,
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
    'category': procedureTypeIds.toList(),
    'tag': tags.toList(),
    'status': statuses.toList(),
    'q': keyword.trim(),
    'v': verdicts.toList(),
    'sort': sort,
  };

  @override
  bool operator ==(Object other) =>
      other is LivingFilters &&
      setEquals(other.sidos, sidos) &&
      other.sigungu == sigungu &&
      setEquals(other.procedureTypeIds, procedureTypeIds) &&
      setEquals(other.tags, tags) &&
      setEquals(other.statuses, statuses) &&
      other.keyword == keyword &&
      setEquals(other.verdicts, verdicts) &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    Object.hashAllUnordered(sidos),
    sigungu,
    Object.hashAllUnordered(procedureTypeIds),
    Object.hashAllUnordered(tags),
    Object.hashAllUnordered(statuses),
    keyword,
    Object.hashAllUnordered(verdicts),
    sort,
  );
}
