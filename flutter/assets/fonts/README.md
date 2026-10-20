# 글꼴

굵기는 **400(Regular)과 700(Bold) 두 가지만** 씁니다. (`AppFonts.regular`, `AppFonts.bold`)

| 폴더 | 쓰는 곳 | 상태 |
| --- | --- | --- |
| `pretendard/` | iOS, 웹, 그리고 아래 `android/` 글꼴이 없을 때의 대체 | 포함됨 (SIL OFL 1.1, `OFL.txt`) |
| `android/` | Android | 비어 있음. 아래 순서로 추가 |

## Android 글꼴을 추가하는 순서

1. 글꼴의 Regular(400), Bold(700) 파일을 `android/` 에 넣고, 라이선스 파일도 같이 둡니다.
2. `pubspec.yaml` 의 `flutter: fonts:` 에 family 를 등록합니다.

   ```yaml
   - family: 글꼴이름
     fonts:
       - asset: assets/fonts/android/글꼴이름-Regular.ttf
         weight: 400
       - asset: assets/fonts/android/글꼴이름-Bold.ttf
         weight: 700
   ```

3. `lib/core/theme/app_fonts.dart` 의 `AppFonts.android` 에 그 family 이름을 넣습니다. (`null` 이면 Pretendard)

파일을 넣기 전에 `pubspec.yaml` 에 등록하면 빌드가 실패하니, 위 순서를 지켜 주세요.
