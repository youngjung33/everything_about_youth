import 'package:everything_about_youth/features/living/domain/eligibility_next_steps.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/living_fixtures.dart';

void main() {
  test('ineligible 이면 다른 안내 헤드라인', () {
    final guide = sampleGuideSummary();
    final steps = eligibilityNextSteps(
      guide: guide,
      eligibility: const Eligibility(
        verdict: Verdict.ineligible,
        verdictLabel: '신청 불가',
        reasons: ['거주 지역이 안내 대상 지역과 다릅니다'],
        notes: [],
      ),
    );
    expect(steps.headline, '다른 안내를 찾아보세요');
    expect(steps.actions.any((a) => a.contains('유사 절차')), isTrue);
  });

  test('판정 없으면 check 기본 메시지', () {
    final steps = eligibilityNextSteps(guide: sampleGuideSummary(), eligibility: null);
    expect(steps.headline, '조건을 꼼꼼히 확인하세요');
    expect(steps.documentHints, isNotEmpty);
  });
}