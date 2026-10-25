import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'api_error_code.dart';
import 'api_version.dart';
import 'auth_token_source.dart';

/// API 호출 실패. [message] 는 사용자에게 그대로 보여줘도 되는 한글 문장이다.
///
/// 서버 오류는 통합 템플릿(`{ error: { code, message, requestId, details } }`)에서 읽는다.
/// 서버까지 가지 못한 실패(연결, 시간 초과, 해석 불가)는 앱이 [ApiErrorCode] 의 코드를 붙인다.
class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.code = ApiErrorCode.unknown,
    this.requestId,
    this.details = const {},
    this.retryAfter,
  });

  final String message;
  final int? statusCode;

  /// [ApiErrorCode] 의 값
  final String code;

  /// 서버 로그와 대조할 요청 번호. 문의가 오면 이 값을 받는다.
  final String? requestId;

  /// 코드별 부가 정보 (예: 업데이트가 필요하면 `storeUrl`)
  final Map<String, Object?> details;

  /// 요청이 너무 많아 거절됐을 때, 이만큼 기다렸다가 다시 보내면 된다.
  final Duration? retryAfter;

  bool get isNotFound => statusCode == 404;
  bool get isUnauthorized => statusCode == 401;
  bool get isRateLimited => code == ApiErrorCode.rateLimited || statusCode == 429;

  /// 앱을 업데이트하기 전에는 쓸 수 없는 상태 (앱이 너무 오래됐거나, 서버가 이 API 버전을 닫았다)
  bool get isUpdateRequired => code == ApiErrorCode.appUpdateRequired || code == ApiErrorCode.apiVersionUnsupported;

  @override
  String toString() => message;
}

/// 앱이 업데이트를 해야 한다는 응답을 받았을 때 불린다. (실행 중에 서버가 최소 버전을 올린 경우 포함)
typedef UpdateRequiredCallback = void Function(ApiException error);

/// JSON 전용의 얇은 HTTP 클라이언트.
///
/// 경로는 버전 없이 `/housing/notices` 처럼 쓴다. 앞에 [apiPrefix](`/api/v1`)를 붙여서 보낸다.
///
/// [auth] 가 있으면 모든 요청에 `Authorization: Bearer <JWT>` 를 붙이고,
/// 서버가 401 을 주면 토큰을 갱신해서 **한 번만** 다시 보낸다.
/// 세션을 얻는 `/auth/*` 호출용 클라이언트는 [auth] 없이 만든다.
///
/// [defaultHeaders] 는 모든 요청에 붙는다. (앱 버전 `X-App-Version` 등)
class ApiClient {
  ApiClient({
    required String baseUrl,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 20),
    this.auth,
    this.apiPrefix = kApiPrefix,
    this.defaultHeaders = const {},
    this.onUpdateRequired,
  }) : _baseUri = Uri.parse(baseUrl),
       _http = httpClient ?? http.Client();

  final Uri _baseUri;
  final http.Client _http;
  final Duration timeout;
  final AuthTokenSource? auth;
  final String apiPrefix;
  final Map<String, String> defaultHeaders;
  final UpdateRequiredCallback? onUpdateRequired;

  /// [query] 값이 `Iterable` 이면 같은 키를 반복(`?a=1&a=2`)한다. null/빈 문자열/빈 목록은 보내지 않는다.
  Future<Map<String, dynamic>> getJson(String path, {Map<String, Object?> query = const {}}) =>
      _request('GET', path, query: query);

  Future<Map<String, dynamic>> postJson(String path, {Map<String, Object?>? body}) =>
      _request('POST', path, body: body);

  Future<Map<String, dynamic>> putJson(String path, {Map<String, Object?>? body}) => _request('PUT', path, body: body);

  Future<Map<String, dynamic>> deleteJson(String path) => _request('DELETE', path);

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, Object?> query = const {},
    Map<String, Object?>? body,
  }) async {
    final params = cleanQuery(query);
    final uri = _baseUri.replace(
      path: '${_baseUri.path}$apiPrefix$path',
      queryParameters: params.isEmpty ? null : params,
    );

    var token = await auth?.accessToken();
    var response = await _send(method, uri, body, token);

    if (response.statusCode == 401 && auth != null && token != null) {
      // 토큰이 만료/폐기됐을 수 있다. 새 토큰으로 한 번만 다시 시도한다.
      token = await auth!.accessToken(rejected: token);
      response = await _send(method, uri, body, token);
    }
    return _decode(response);
  }

  Future<http.Response> _send(String method, Uri uri, Map<String, Object?>? body, String? token) async {
    final headers = <String, String>{
      ...defaultHeaders,
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      if (body != null) 'Content-Type': 'application/json',
    };
    try {
      final encoded = body == null ? null : jsonEncode(body);
      final Future<http.Response> request;
      switch (method) {
        case 'POST':
          request = _http.post(uri, headers: headers, body: encoded);
        case 'PUT':
          request = _http.put(uri, headers: headers, body: encoded);
        case 'DELETE':
          request = _http.delete(uri, headers: headers);
        default:
          request = _http.get(uri, headers: headers);
      }
      return await request.timeout(timeout);
    } on TimeoutException {
      throw const ApiException('서버 응답이 너무 늦습니다. 잠시 후 다시 시도해 주세요.', code: ApiErrorCode.timeout);
    } on http.ClientException {
      throw ApiException(
        kReleaseMode
            ? '서버에 연결할 수 없습니다. 네트워크 연결을 확인해 주세요.'
            : '서버에 연결할 수 없습니다. 네트워크와 서버 주소(${_baseUri.origin})를 확인해 주세요.',
        code: ApiErrorCode.networkError,
      );
    }
  }

  Map<String, dynamic> _decode(http.Response response) {
    final Object? decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw ApiException(
        '서버 응답을 해석할 수 없습니다. (HTTP ${response.statusCode})',
        statusCode: response.statusCode,
        code: ApiErrorCode.badResponse,
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = parseError(decoded, response.statusCode, retryAfterHeader: response.headers['retry-after']);
      if (error.isUpdateRequired) onUpdateRequired?.call(error);
      throw error;
    }
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('서버 응답 형식이 올바르지 않습니다.', code: ApiErrorCode.badResponse);
    }
    return decoded;
  }

  /// 오류 응답 본문을 [ApiException] 으로 바꾼다. 서버 통합 템플릿만 인정한다.
  static ApiException parseError(Object? decoded, int statusCode, {String? retryAfterHeader}) {
    final fallback = '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    final error = decoded is Map<String, dynamic> ? decoded['error'] : null;

    if (error is Map) {
      final details = {
        for (final entry in (error['details'] is Map ? error['details'] as Map : const {}).entries)
          if (entry.key is String) entry.key as String: entry.value as Object?,
      };
      final seconds = details['retryAfterSeconds'];
      final retryAfter = seconds is num ? seconds : int.tryParse(retryAfterHeader ?? '');
      final code = error['code'];
      final message = error['message'];
      final knownCode = code is String && ApiErrorCode.serverCodes.contains(code);
      return ApiException(
        message is String && message.isNotEmpty ? message : fallback,
        statusCode: statusCode,
        code: knownCode ? code as String : ApiErrorCode.badResponse,
        requestId: error['requestId'] is String ? error['requestId'] as String : null,
        details: details,
        retryAfter: retryAfter == null ? null : Duration(seconds: retryAfter.toInt()),
      );
    }

    return ApiException(fallback, statusCode: statusCode, code: ApiErrorCode.badResponse);
  }

  void close() => _http.close();

  /// 쿼리 값을 문자열(또는 문자열 목록)로 바꾸고 비어 있는 값을 제거한다.
  static Map<String, dynamic> cleanQuery(Map<String, Object?> query) {
    final result = <String, dynamic>{};
    query.forEach((key, value) {
      if (value == null) return;
      if (value is Iterable) {
        final list = value.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
        if (list.isNotEmpty) result[key] = list;
        return;
      }
      final text = value.toString();
      if (text.isNotEmpty) result[key] = text;
    });
    return result;
  }
}
