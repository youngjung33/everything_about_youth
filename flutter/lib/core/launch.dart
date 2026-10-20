import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// 원문 공고 등 외부 링크를 연다. (웹: 새 탭, 모바일: 브라우저)
Future<void> openExternal(BuildContext context, String url) async {
  final messenger = ScaffoldMessenger.of(context);
  final uri = Uri.tryParse(url);
  var opened = false;
  if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
    opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
  if (!opened) {
    messenger.showSnackBar(const SnackBar(content: Text('링크를 열 수 없습니다.')));
  }
}
