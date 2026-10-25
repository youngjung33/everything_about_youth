import 'dart:convert';
import 'dart:io';

import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:flutter_test/flutter_test.dart';

final _contractsDir = Directory('${Directory.current.path}${Platform.pathSeparator}..${Platform.pathSeparator}contracts${Platform.pathSeparator}api');

void main() {
  test('error-codes.json 과 서버·앱 오류 코드가 같다', () {
    final file = File('${_contractsDir.path}${Platform.pathSeparator}error-codes.json');
    final json = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    final server = (json['server'] as List).map((e) => (e as Map)['code'] as String).toSet();
    expect(server, ApiErrorCode.serverCodes);
    expect((json['clientOnly'] as List).map((e) => e as String).toSet(), ApiErrorCode.clientOnlyCodes);
  });
}
