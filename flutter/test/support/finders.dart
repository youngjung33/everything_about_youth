import 'package:everything_about_youth/features/home/home_page.dart';
import 'package:flutter_test/flutter_test.dart';

/// 홈 화면 **안에서만** 글자를 찾는다.
///
/// 서비스 이름과 앱 이름은 홈 카드 말고 헤더 메뉴·로고에도 나오므로, "홈 카드에 보이는가"를 확인하는 테스트는
/// 화면 전체가 아니라 홈 안에서 찾아야 한다.
Finder homeText(String text) => find.descendant(of: find.byType(HomePage), matching: find.text(text));
