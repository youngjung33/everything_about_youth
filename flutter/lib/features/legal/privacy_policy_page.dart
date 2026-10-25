import 'legal_document_page.dart';

/// 개인정보 처리방침 (앱·서버가 실제로 수집·이용하는 범위에 맞춘 요약)
class PrivacyPolicyPage extends LegalDocumentPage {
  const PrivacyPolicyPage({super.key})
    : super(
        title: '개인정보 처리방침',
        sections: const [
          LegalSection(
            heading: '1. 수집하는 개인정보',
            body:
                '• 서버: 소셜 로그인 시 로그인 업체가 제공하는 고유 식별자(subject)와 내부 회원 id, 세션 식별자, 마지막 로그인 시각을 저장합니다. 이메일·이름·프로필 사진은 요청하거나 저장하지 않습니다.\n'
                '• 앱(기기): "내 조건"(나이·소득·무주택 여부 등)과 비회원 관심 공고 목록은 기기에 암호화하여 저장합니다. 로그인 시 관심 공고 id 만 서버에 동기화됩니다.',
          ),
          LegalSection(
            heading: '2. 이용 목적',
            body: '공고 조회·자격 안내, 로그인 회원의 관심 공고 동기화, 서비스 안정성(요청 제한·오류 대응)에만 사용합니다.',
          ),
          LegalSection(
            heading: '3. 보관 및 파기',
            body:
                '회원 탈퇴 시 서버의 회원 정보와 로그인 연결 정보를 삭제합니다. 비회원 세션은 일정 기간 미사용 시 서버에서 정리될 수 있습니다. 기기에 저장된 내 조건은 앱 삭제 또는 앱 내 데이터 삭제 시 함께 제거됩니다.',
          ),
          LegalSection(
            heading: '4. 문의',
            body: '개인정보 관련 문의는 앱 스토어에 기재된 운영자 연락처로 보내 주세요.',
          ),
        ],
      );
}
