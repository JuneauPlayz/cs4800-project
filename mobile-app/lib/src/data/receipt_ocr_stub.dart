import 'dart:io';

import 'package:flutter/services.dart';

const _receiptOcrChannel = MethodChannel('splitstack/receipt_ocr');

Future<String?> recognizeReceiptTextFromBytes({
  required Uint8List bytes,
  required String mimeType,
}) async {
  return null;
}

Future<String?> recognizeReceiptTextFromPath({
  required String imagePath,
}) async {
  if (imagePath.trim().isEmpty) return null;
  if (!(Platform.isAndroid || Platform.isIOS)) return null;

  try {
    final text = await _receiptOcrChannel.invokeMethod<String>(
      'recognizeReceiptText',
      {'path': imagePath},
    );
    final trimmed = text?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  } on PlatformException {
    return null;
  } on MissingPluginException {
    return null;
  }
}
