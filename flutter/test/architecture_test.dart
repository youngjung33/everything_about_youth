import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 서비스가 독립적으로 켜지고 꺼지고 죽을 수 있으려면 의존 방향이 지켜져야 한다.
/// 이 테스트는 `lib` 아래의 import 를 읽어 그 규칙을 검사한다. 어기면 어느 파일이 어디를 import 했는지 알려준다.
///
///   app ──▶ features/* ──▶ core          (화살표 반대 방향 import 금지)
///   features/A ──✗──▶ features/B         (서비스끼리 금지)
///   서비스 안: presentation ▶ application ▶ data ▶ domain  (안쪽은 바깥을 모른다)

/// lib 기준 상대 경로 (예: `features/housing/domain/notice.dart`) 와 그 파일이 import 한 lib 기준 경로들
typedef Dependency = ({String from, String to});

const _package = 'everything_about_youth';

List<Dependency> _collectDependencies() {
  final lib = Directory('lib').absolute;
  final libUri = lib.uri;
  final result = <Dependency>[];

  for (final entity in lib.listSync(recursive: true)) {
    if (entity is! File || !entity.path.endsWith('.dart')) continue;
    final from = entity.uri.path.substring(libUri.path.length);

    for (final match in RegExp(
      r'''^\s*(?:import|export)\s+['"]([^'"]+)['"]''',
      multiLine: true,
    ).allMatches(entity.readAsStringSync())) {
      final target = match.group(1)!;
      String? to;
      if (target.startsWith('package:$_package/')) {
        to = target.substring('package:$_package/'.length);
      } else if (!target.contains(':')) {
        final resolved = entity.uri.resolve(target).path;
        to = resolved.substring(libUri.path.length);
      }
      if (to != null) result.add((from: from, to: to));
    }
  }
  return result;
}

String? _featureOf(String path) {
  final parts = path.split('/');
  return parts.length > 2 && parts.first == 'features' ? parts[1] : null;
}

String? _layerOf(String path) {
  final parts = path.split('/');
  if (parts.length < 4 || parts.first != 'features') return null;
  const layers = {'domain', 'data', 'application', 'presentation'};
  return layers.contains(parts[2]) ? parts[2] : null;
}

String _describe(Iterable<Dependency> violations) => violations.map((d) => '  ${d.from}  ->  ${d.to}').join('\n');

void main() {
  final deps = _collectDependencies();

  test('import 를 읽을 수 있다 (검사가 비어 있지 않다)', () {
    expect(deps.length, greaterThan(50));
  });

  test('core 는 features/app 을 import 하지 않는다 (코어는 서비스를 모른다)', () {
    final bad = deps.where(
      (d) => d.from.startsWith('core/') && (d.to.startsWith('features/') || d.to.startsWith('app/')),
    );
    expect(bad, isEmpty, reason: '\n${_describe(bad)}');
  });

  test('features 는 app 을 import 하지 않는다', () {
    final bad = deps.where((d) => d.from.startsWith('features/') && d.to.startsWith('app/'));
    expect(bad, isEmpty, reason: '\n${_describe(bad)}');
  });

  test('서비스끼리 import 하지 않는다 (한 서비스가 죽어도 다른 서비스에 영향이 없으려면)', () {
    final bad = deps.where((d) {
      final a = _featureOf(d.from);
      final b = _featureOf(d.to);
      return a != null && b != null && a != b;
    });
    expect(bad, isEmpty, reason: '\n${_describe(bad)}');
  });

  test('서비스 안의 레이어 방향: domain ◀ data ◀ application ◀ presentation', () {
    // 레이어별로 import 해선 안 되는 바깥 레이어
    const forbidden = {
      'domain': {'data', 'application', 'presentation'},
      'data': {'application', 'presentation'},
      'application': {'presentation'},
    };

    final bad = deps.where((d) {
      final from = _layerOf(d.from);
      final to = _layerOf(d.to);
      if (from == null || to == null) return false;
      if (_featureOf(d.from) != _featureOf(d.to)) return false; // 서비스 간 import 는 위에서 따로 검사
      return forbidden[from]?.contains(to) ?? false;
    });
    expect(bad, isEmpty, reason: '\n${_describe(bad)}');
  });

  test('domain 은 Flutter 에 의존하지 않는다 (순수 Dart)', () {
    final bad = <String>[];
    for (final entity in Directory('lib/features').listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;
      final normalized = entity.path.replaceAll('\\', '/');
      if (!normalized.contains('/domain/')) continue;
      if (RegExp(r'''import\s+['"]package:flutter/''').hasMatch(entity.readAsStringSync())) bad.add(normalized);
    }
    expect(bad, isEmpty, reason: '\n${bad.join('\n')}');
  });

  test('화면은 Scaffold/AppBar/SafeArea/showModalBottomSheet 를 직접 쓰지 않는다 (core/layout 의 공통 틀만 사용)', () {
    // 기기마다 다른 안전 영역(아이폰 홈 인디케이터, 갤럭시 내비게이션바, 노치)과 키보드를 한곳에서만 처리하려는 규칙.
    // 한 화면이라도 직접 쓰면 그 화면만 아래가 잘릴 수 있다.
    final pattern = RegExp(r'(?<![A-Za-z])(Scaffold|AppBar|SafeArea)\(|showModalBottomSheet[<(]');
    final bad = <String>[];
    for (final entity in Directory('lib').listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;
      final normalized = entity.path.replaceAll('\\', '/');
      if (normalized.startsWith('lib/core/layout/')) continue;
      final source = entity.readAsStringSync().split('\n').where((l) => !l.trimLeft().startsWith('//')).join('\n');
      for (final m in pattern.allMatches(source)) {
        bad.add('$normalized  ${m.group(0)}');
      }
    }
    expect(bad, isEmpty, reason: '\nAppScaffold / AppTopBar / showAppBottomSheet 를 쓰세요:\n${bad.join('\n')}');
  });

  test('서비스의 유일한 접점은 <id>_module.dart 이다 (바깥은 서비스 안쪽 파일을 import 하지 않는다)', () {
    final bad = deps.where((d) {
      final target = _featureOf(d.to);
      if (target == null) return false;
      if (_featureOf(d.from) == target) return false; // 서비스 안
      // 바깥(app)에서는 모듈 파일만 import 할 수 있다. 홈/스플래시 같은 셸 화면은 서비스 파일을 import 하지 않는다.
      return !d.to.endsWith('/${target}_module.dart') && d.from.startsWith('app/') && _isServiceFeature(target);
    });
    expect(bad, isEmpty, reason: '\n${_describe(bad)}');
  });
}

/// `<id>_module.dart` 가 있는 폴더만 서비스다. (home, splash, unavailable 은 앱 셸 화면)
bool _isServiceFeature(String id) => File('lib/features/$id/${id}_module.dart').existsSync();
