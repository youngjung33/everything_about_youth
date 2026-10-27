import 'package:meta/meta.dart';

import 'notice.dart';

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

const _disclaimer = '아래 안내는 참고용이며 법적 효력이 없습니다. 최종 자격·서류는 원문 공고와 담당 기관 확인이 필요합니다.';

/// 판정 결과에 맞춰 사용자가 할 일을 정리한다.
EligibilityNextSteps eligibilityNextSteps({
  required NoticeSummary notice,
  Eligibility? eligibility,
}) {
  final verdict = eligibility?.verdict ?? Verdict.check;
  final supply = notice.supplyType;

  final actions = <String>[
    if (notice.url != null) '원문 공고에서 세부 자격·순위·제출 서류를 확인하세요.',
    if (verdict == Verdict.eligible) '접수 기간 안에 공급기관 안내에 따라 신청하세요.',
    if (verdict == Verdict.check) '공고문의 순위·우선공급·예외 조항을 확인한 뒤 신청 여부를 결정하세요.',
    if (verdict == Verdict.ineligible) '조건이 맞지 않을 수 있습니다. 유사 유형 공고를 검색하거나 내 조건을 수정해 보세요.',
  ];

  final headline = switch (verdict) {
    Verdict.eligible => '신청을 준비해 보세요',
    Verdict.check => '공고문을 꼼꼼히 확인하세요',
    Verdict.ineligible => '다른 공고를 찾아보세요',
  };

  return EligibilityNextSteps(
    headline: headline,
    actions: actions,
    documentHints: _documentHints(supply, verdict),
    disclaimer: _disclaimer,
  );
}

List<String> _documentHints(String supplyType, Verdict verdict) {
  final common = <String>[
    '신분증, 주민등록등본(또는 초본)',
    '소득·재직 증빙(급여명세, 원천징수, 건강보험 자격득실 등)',
    '무주택·주택소유 관련 서약·확인서(공고별)',
  ];
  final extra = switch (supplyType) {
    'happy_housing' || 'youth_purchase_rental' => <String>[
      '청년·학생·신혼 해당 증빙(연령·학적·혼인관계)',
      '총자산·자동차 가액 관련 서류(공고 기준)',
    ],
    'newlywed_hope_town' => <String>['혼인관계증명, 신혼 해당 증빙'],
    'national_rental' || 'permanent_rental' || 'integrated_public_rental' => <String>[
      '수급·차상위 등 해당 시 증빙(순위 관련)',
    ],
    _ => <String>['공고문에 적힌 제출 서류 목록 전체'],
  };

  if (verdict == Verdict.ineligible) {
    return ['자격 미충족 시 제출이 거절될 수 있으니, 원문 공고의 자격 요건을 먼저 확인하세요.', ...common.take(2)];
  }
  return [...common, ...extra];
}
