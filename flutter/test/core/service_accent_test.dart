import 'package:everything_about_youth/core/design/service_accent.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ServiceAccent', () {
    test('scheduleEmptyMessage: 섹션 명사에 맞는다', () {
      expect(ServiceAccent.benefits.scheduleEmptyMessage, contains('정책이'));
      expect(ServiceAccent.finance.scheduleEmptyMessage, contains('제도가'));
      expect(ServiceAccent.living.scheduleEmptyMessage, contains('안내가'));
      expect(ServiceAccent.housing.scheduleEmptyMessage, contains('공고가'));
    });

    test('savedMaxCountError: 관심 명사에 맞는다', () {
      expect(ServiceAccent.finance.savedMaxCountError(99), '관심 제도는 99개까지 저장할 수 있습니다.');
    });

    test('announcementDateLabel: housing·jobs 는 공고일', () {
      expect(ServiceAccent.housing.announcementDateLabel, '공고일');
      expect(ServiceAccent.benefits.announcementDateLabel, '게시일');
    });

    test('savedBookmarkTooltip: 섹션별 로·으로 조사', () {
      expect(ServiceAccent.housing.savedBookmarkTooltip(saved: false), '관심 공고로 저장');
      expect(ServiceAccent.jobs.savedBookmarkTooltip(saved: false), '관심 공고로 저장');
      expect(ServiceAccent.benefits.savedBookmarkTooltip(saved: false), '관심 정책으로 저장');
      expect(ServiceAccent.finance.savedBookmarkTooltip(saved: false), '관심 제도로 저장');
      expect(ServiceAccent.living.savedBookmarkTooltip(saved: false), '관심 안내로 저장');
      expect(ServiceAccent.housing.savedBookmarkTooltip(saved: true), '관심 공고에서 빼기');
    });

    test('savedEmptyMessage: 북마크 empty 화면 문구', () {
      expect(ServiceAccent.housing.savedEmptyMessage, '저장한 관심 공고가 없습니다.');
      expect(ServiceAccent.benefits.savedEmptyMessage, '저장한 관심 정책이 없습니다.');
      expect(ServiceAccent.finance.savedEmptyMessage, '저장한 관심 제도가 없습니다.');
      expect(ServiceAccent.jobs.savedEmptyMessage, '저장한 관심 공고가 없습니다.');
      expect(ServiceAccent.living.savedEmptyMessage, '저장한 관심 안내가 없습니다.');
    });
  });
}
