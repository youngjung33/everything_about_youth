/// 앱 전역: **정보 우선** — 본문(수집·판정·안내)을 먼저, 링크는 더 보기·검증용.
abstract final class ServiceCopy {
  static const listEligibilityHint =
      '자격 판정은 일반 기준의 참고입니다. 위 내용을 먼저 보고, 세부·최신 사항은 기관 공식 안내에서 확인하세요.';

  static const detailVerificationFooter =
      '위 내용은 수집·정리한 참고 정보입니다. 세부 조건·서류·한도 등 최종 확인은 기관 공식 안내에서 하세요.';

  static const financeDetailVerificationFooter =
      '위 내용은 수집·정리한 참고 정보입니다. 한도·금리·서류 등 최종 확인은 기관 공식 안내에서 하세요.';

  static const homeDisclaimer = '자격 판정은 참고용입니다. 앱 본문을 확인한 뒤, 필요하면 기관 공식 안내로 검증하세요.';

  static const footerDisclaimer =
      '제공 정보는 참고용입니다. 신청·중요 결정 전 기관 공식 안내에서 최종 확인하세요.';

  static const officialNoticeButtonLabel = '기관 공고 · 검증';
  static const officialPolicyButtonLabel = '기관 공식 안내';
  static const sourceLinkLabel = '출처 링크';

  /// DB/API 에 summary 가 없을 때 상세·목록에 표시
  static const missingSummaryBody =
      '상세 설명을 아직 수집하지 못했습니다. 아래 개요·판정·다음 행동을 참고하고, 필요하면 기관 공식 안내에서 확인하세요.';

  /// 목록 카드용 (짧게)
  static const missingSummaryCard = '설명 수집 중 · 개요·판정을 참고하세요.';
}
