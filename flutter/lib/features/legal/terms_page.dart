import 'legal_document_page.dart';

/// 서비스 이용약관 (요약)
class TermsPage extends LegalDocumentPage {
  const TermsPage({super.key})
    : super(
        title: '이용약관',
        sections: const [
          LegalSection(
            heading: '1. 서비스 내용',
            body:
                '본 앱은 공공 임대주택 등 청년 관련 정보를 모아 보여 주는 참고용 서비스입니다. 공고 내용·자격 판정 결과는 각 기관의 원문을 반드시 확인해야 하며, 앱의 안내는 법적 효력이 없습니다.',
          ),
          LegalSection(
            heading: '2. 회원과 비회원',
            body: '비회원은 조회 기능을 이용할 수 있습니다. 회원은 소셜 로그인으로 가입하며, 관심 공고를 서버에 저장할 수 있습니다.',
          ),
          LegalSection(
            heading: '3. 금지 행위',
            body: '서버에 과도한 요청을 보내거나, 자동화 도구로 데이터를 무단 수집·재배포하는 행위를 금지합니다.',
          ),
          LegalSection(
            heading: '4. 면책',
            body: '서비스는 "있는 그대로" 제공됩니다. 정보 오류·중단·손해에 대해 법이 허용하는 범위를 넘어 책임지지 않습니다.',
          ),
          LegalSection(
            heading: '5. 약관 변경',
            body: '약관을 바꿀 경우 앱 또는 스토어 설명을 통해 안내합니다. 계속 이용하면 변경에 동의한 것으로 봅니다.',
          ),
        ],
      );
}
