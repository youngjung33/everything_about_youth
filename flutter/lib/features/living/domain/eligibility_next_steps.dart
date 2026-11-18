import 'package:meta/meta.dart';

import '../../../core/copy/service_copy.dart';
import 'living_guide.dart';

/// 판정 결과 기반 **다음에 할 일** 문구. jobs/finance 동형 — 소득 기준표 없이 절차·체크리스트 중

@immutable
class EligibilityNextSteps {
  const EligibilityNextSteps({
    required this.headline,
    required this.actions,
    required this.documentHints,
    required this.disclaimer,
  });

  final String headline;
  final List<String> actions;
  final List<String> documentHints;
  final String disclaimer;
}

EligibilityNextSteps eligibilityNextSteps({
  required GuideSummary guide,
  Eligibility? eligibility,
}) {
  final verdict = eligibility?.verdict ?? Verdict.check;
  final procedureType = guide.procedureTypeId;

  final actions = <String>[
    '상세 화면 요약·체크리스트·참고 판정을 먼저 확인하세요.',
    if (guide.url != null) '절차·서류·수수료 등 세부 사항은 기관 공식 안내에서 검증하세요.',
    if (verdict == Verdict.eligible) '체크리스트 순서대로 준비하고, 관할 기관 안내에 따라 신청·접수하세요.',
    if (verdict == Verdict.check) '지역·관할·예외 조항을 기관 안내에서 확인한 뒤 진행하세요.',
    if (verdict == Verdict.ineligible) '조건이 맞지 않을 수 있습니다. 유사 절차 안내를 검색하거나 내 조건을 수정해 보세요.',
  ];

  final headline = switch (verdict) {
    Verdict.eligible => '다음 절차를 준비해 보세요',
    Verdict.check => '조건을 꼼꼼히 확인하세요',
    Verdict.ineligible => '다른 안내를 찾아보세요',
  };

  return EligibilityNextSteps(
    headline: headline,
    actions: actions,
    documentHints: _documentHints(procedureType, verdict),
    disclaimer: ServiceCopy.detailVerificationFooter,
  );
}

List<String> _documentHints(String procedureTypeId, Verdict verdict) {
  final common = <String>[
    '신분증, 임대차계약서(해당 시)',
    '등기부등본·확정일자 확인(임대차 관련 시)',
  ];
  final extra = switch (procedureTypeId) {
    'move_in' || 'registry' => <String>['전입신고에 필요한 임대인 동의·계약서 사본'],
    'lease' => <String>['임대차 계약서, 확정일자 신청 서류'],
    'utilities' => <String>['전입 전·후 주소, 사용 해지·개통 정보'],
    'waste' => <String>['관할 지자체 종량제 봉투·배출 안내'],
    'moving' => <String>['하자 기록 사진, 관리비·주차 확인 메모'],
    _ => <String>['안내에 적힌 제출 서류 목록 전체'],
  };

  if (verdict == Verdict.ineligible) {
    return ['거주 지역·관할이 다르면 절차가 달라질 수 있습니다. 위 판정 사유와 기관 안내를 함께 확인하세요.', ...common.take(2)];
  }
  return [...common, ...extra];
}