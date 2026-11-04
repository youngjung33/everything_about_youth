import 'package:meta/meta.dart';

import '../../../core/copy/service_copy.dart';
import 'benefit_program.dart';

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
  required ProgramSummary program,
  Eligibility? eligibility,
}) {
  final verdict = eligibility?.verdict ?? Verdict.check;
  final category = program.categoryId;

  final actions = <String>[
    '상세 화면 요약·판정·다음 행동을 먼저 확인하세요.',
    if (program.url != null) '세부 자격·서류·양식은 기관 공식 안내에서 검증하세요.',
    if (verdict == Verdict.eligible) '신청 기간 안에 안내에 따라 신청하세요.',
    if (verdict == Verdict.check) '안내 문서의 예외 조항을 확인한 뒤 신청 여부를 결정하세요.',
    if (verdict == Verdict.ineligible) '조건이 맞지 않을 수 있습니다. 유사 분야 정책을 검색하거나 내 조건을 수정해 보세요.',
  ];

  final headline = switch (verdict) {
    Verdict.eligible => '신청을 준비해 보세요',
    Verdict.check => '조건을 꼼꼼히 확인하세요',
    Verdict.ineligible => '다른 정책을 찾아보세요',
  };

  return EligibilityNextSteps(
    headline: headline,
    actions: actions,
    documentHints: _documentHints(category, verdict),
    disclaimer: ServiceCopy.detailVerificationFooter,
  );
}

List<String> _documentHints(String categoryId, Verdict verdict) {
  final common = <String>[
    '신분증, 주민등록등본(또는 초본)',
    '소득·재직 증빙(해당 시)',
  ];
  final extra = switch (categoryId) {
    'housing' => <String>['무주택·주택 관련 확인 서류(안내별)'],
    'employment' => <String>['경력·재직 증빙(해당 시)'],
    _ => <String>['안내에 적힌 제출 서류 목록 전체'],
  };

  if (verdict == Verdict.ineligible) {
    return ['자격 미충족 시 제출이 거절될 수 있습니다. 위 판정 사유와 안내 자격 요건을 함께 확인하세요.', ...common.take(2)];
  }
  return [...common, ...extra];
}
