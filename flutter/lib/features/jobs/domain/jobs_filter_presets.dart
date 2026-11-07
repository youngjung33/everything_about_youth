import 'package:meta/meta.dart';

import '../../../core/util/pure_dart.dart';
import 'jobs_filters.dart';

/// 프리셋: 목록 필터 유형을 한 번에 바꿉니다.
@immutable
class JobsFilterPreset {
  const JobsFilterPreset({required this.id, required this.label, required this.hireTypeIds});

  final String id;
  final String label;
  final Set<String> hireTypeIds;

  JobsFilters applyTo(JobsFilters current) => current.copyWith(hireTypeIds: hireTypeIds);

  bool matches(JobsFilters filters) => setEquals(filters.hireTypeIds, hireTypeIds);
}

const jobsHireTypeFilterPresets = <JobsFilterPreset>[
  JobsFilterPreset(id: 'public', label: '공공·공기업', hireTypeIds: {'public_official', 'public_corp'}),
  JobsFilterPreset(id: 'youth', label: '청년', hireTypeIds: {'youth'}),
  JobsFilterPreset(id: 'new_grad', label: '신입', hireTypeIds: {'new_grad'}),
];
