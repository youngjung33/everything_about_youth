import 'package:flutter/material.dart';

/// 앱의 모든 바텀시트. `showModalBottomSheet` 를 직접 쓰지 말고 이것을 쓴다.
///
/// 기본 `useSafeArea: true` 는 위·좌·우만 피한다. **아래쪽(아이폰 홈 인디케이터, 갤럭시 내비게이션바)은 피하지 않아서**
/// 시트 맨 아래 버튼이 가려지므로 여기서 아래도 처리한다. 키보드가 올라오면 그 높이만큼 시트를 올리고,
/// 내용이 길면 시트 안에서 스크롤한다.
Future<T?> showAppBottomSheet<T>({required BuildContext context, required WidgetBuilder builder}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (sheetContext) => Padding(
      // 키보드 높이. 키보드가 열려 있는 동안은 아래 SafeArea 의 하단 여백이 0 이라 두 번 더해지지 않는다.
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(sheetContext).bottom),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), child: builder(sheetContext)),
      ),
    ),
  );
}
