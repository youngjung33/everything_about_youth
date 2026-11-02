import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 레포 원칙: 각 [group] 안에서 실패·경계 test 이름이 happy path test 보다 **위**에 있어야 한다.
void main() {
  test('failure-first: group 내 test 순서 (실패·경계 → 성공)', () {
    final root = Directory('test');
    final violations = <String>[];

    final failureName = RegExp(
      r'실패|전파|오류|throws|stale|404|NOT_FOUND|비어|상한|invalid|failed|skipped|'
      r'BAD_REQUEST|건너|missing|limit|clamp|cancelAll|not_found|없는|잘못|늦게|'
      r'변조|손상|거절|네트워크|실패면|실패는|실패 전|조회 실패|search 실패|'
      r'getProgram 실패|getNotice 실패|getScheme 실패|fetchMeta 실패|fetchSaved 실패|'
      r'merge 실패|저장 실패|해제 실패|상세 실패|목록 실패|first fail|page2 fail|'
      r'hasMore 가 false|generation 이면|id 가 비어|알림이 꺼져|로드하기 전|'
      r'키를 잃|평문|context 불일치|손상된|rejects|clearError|error 팩토리|'
      r'오류가|오류와|오류 문구|다시 시도|장애|끈 서비스|닿지|거부|incompatible|'
      r'취소|Cancelled|닫으면|탈퇴할 수 없|BAD_RESPONSE|이상하면|https 가 아니',
      caseSensitive: false,
    );

    final happyName = RegExp(
      r'위임한다|위임\$|성공 시|정상 저장|목록·|캘린더 ICS|load 와 save|'
      r'fetchMeta 위임|fetchSaved[^실]|merged 상태|generation 을 올리|'
      r'dedup|이번 주|프리셋|조립|eligible\$|켜져 있으면|기본값|'
      r'정상 수집|있으면 program|있으면 notice|페이지 필드|다음 페이지를|'
      r'선택해|로그인|비회원|회원이|카드|필터|판정|북마크|타임라인|'
      r'신청 가능|파싱한다\$|contract|fromJson|green',
      caseSensitive: false,
    );

    void walk(Directory dir) {
      for (final entity in dir.listSync(followLinks: false)) {
        if (entity is Directory) {
          walk(entity);
        } else if (entity is File && entity.path.endsWith('_test.dart')) {
          final rel = entity.path.replaceAll('\\', '/');
          if (rel.contains('principles/failure_first_order_test.dart')) continue;
          _checkFile(entity, failureName, happyName, violations);
        }
      }
    }

    walk(root);
    expect(
      violations,
      isEmpty,
      reason: 'failure-first 순서 위반 (group 내 happy 가 failure 보다 앞):\n${violations.join('\n')}',
    );
  });
}

int _indent(String line) {
  var n = 0;
  for (final c in line.runes) {
    if (c == 32) {
      n++;
    } else {
      break;
    }
  }
  return n;
}

void _checkFile(File file, RegExp failureName, RegExp happyName, List<String> violations) {
  final lines = file.readAsLinesSync();
  final groupStack = <String>[];
  final groupIndents = <int>[];
  final groupTests = <String, List<String>>{};

  for (final line in lines) {
    final groupMatch = RegExp(r"group\s*\(\s*'([^']+)'").firstMatch(line);
    if (groupMatch != null && line.contains('{')) {
      groupStack.add(groupMatch.group(1)!);
      groupIndents.add(_indent(line));
      final key = groupStack.join(' > ');
      groupTests.putIfAbsent(key, () => []);
      continue;
    }

    if (line.trim() == '});' && groupStack.isNotEmpty) {
      final lineIndent = _indent(line);
      if (lineIndent == groupIndents.last) {
        groupStack.removeLast();
        groupIndents.removeLast();
      }
      continue;
    }

    final testMatch = RegExp(r"test\s*\(\s*'([^']+)'").firstMatch(line);
    if (testMatch != null && groupStack.isNotEmpty) {
      final key = groupStack.join(' > ');
      groupTests.putIfAbsent(key, () => []);
      groupTests[key]!.add(testMatch.group(1)!);
    }
  }

  final rel = file.path.replaceAll('\\', '/');
  for (final entry in groupTests.entries) {
    final names = entry.value;
    if (names.length < 2) continue;
    int? firstFailure;
    int? firstHappy;
    for (var i = 0; i < names.length; i++) {
      if (firstFailure == null && failureName.hasMatch(names[i])) firstFailure = i;
      if (firstHappy == null &&
          happyName.hasMatch(names[i]) &&
          !failureName.hasMatch(names[i])) {
        firstHappy = i;
      }
    }
    if (firstFailure != null && firstHappy != null && firstHappy < firstFailure) {
      violations.add('$rel :: ${entry.key}');
    }
  }
}
