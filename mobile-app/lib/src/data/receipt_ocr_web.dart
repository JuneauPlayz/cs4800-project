import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';
import 'dart:typed_data';

extension type _Blob(JSObject _) implements JSObject {}

extension type _ImageElement(JSObject _) implements JSObject {
  external set src(String value);
  external set onload(JSFunction value);
  external set onerror(JSFunction value);
}

extension type _TextDetector(JSObject _) implements JSObject {
  external JSPromise<JSArray<_DetectedText>> detect(_ImageElement image);
}

extension type _DetectedText(JSObject _) implements JSObject {
  external String get rawValue;
}

Future<String?> recognizeReceiptTextFromBytes({
  required Uint8List bytes,
  required String mimeType,
}) async {
  final blobConstructor = globalContext.getProperty<JSFunction>('Blob'.toJS);
  final blob = _Blob(
    blobConstructor.callAsConstructorVarArgs<JSObject>([
      [bytes.toJS].toJS,
      {'type': mimeType}.jsify() as JSObject,
    ]),
  );
  final urlConstructor = globalContext.getProperty<JSObject>('URL'.toJS);
  final url = urlConstructor
      .callMethod<JSString>('createObjectURL'.toJS, blob)
      .toDart;

  try {
    final textDetectorText = await _recognizeWithTextDetector(url);
    final tesseractText = await _recognizeWithTesseract(url);
    final parts = [
      if (textDetectorText != null && textDetectorText.trim().isNotEmpty)
        textDetectorText.trim(),
      if (tesseractText != null && tesseractText.trim().isNotEmpty)
        tesseractText.trim(),
    ];
    if (parts.isNotEmpty) {
      return parts.join('\n');
    }
    return null;
  } on Object {
    return null;
  } finally {
    urlConstructor.callMethod<JSAny?>('revokeObjectURL'.toJS, url.toJS);
  }
}

Future<String?> _recognizeWithTextDetector(String imageUrl) async {
  if (!globalContext.has('TextDetector')) return null;

  final image = await _loadImage(imageUrl);
  final detectorConstructor = globalContext.getProperty<JSFunction>(
    'TextDetector'.toJS,
  );
  final detector = _TextDetector(
    detectorConstructor.callAsConstructor<JSObject>(),
  );
  final detected = await detector.detect(image).toDart;
  final lines = <String>[];
  for (var i = 0; i < detected.length; i++) {
    final text = detected[i].rawValue.trim();
    if (text.isNotEmpty) lines.add(text);
  }
  return lines.isEmpty ? null : lines.join('\n');
}

Future<String?> _recognizeWithTesseract(String imageUrl) async {
  if (!globalContext.has('Tesseract')) return null;

  final tesseract = globalContext.getProperty<JSObject>('Tesseract'.toJS);
  final result = await tesseract
      .callMethod<JSPromise<JSObject>>(
        'recognize'.toJS,
        imageUrl.toJS,
        'eng'.toJS,
        {'preserve_interword_spaces': '1', 'tessedit_pageseg_mode': '6'}.jsify()
            as JSObject,
      )
      .toDart;
  final data = result.getProperty<JSObject>('data'.toJS);
  final text = data.getProperty<JSString>('text'.toJS).toDart.trim();
  return text.isEmpty ? null : text;
}

Future<_ImageElement> _loadImage(String url) {
  final imageConstructor = globalContext.getProperty<JSFunction>('Image'.toJS);
  final image = _ImageElement(imageConstructor.callAsConstructor<JSObject>());
  final completer = Completer<void>();
  image.onload = (() {
    if (!completer.isCompleted) completer.complete();
  }).toJS;
  image.onerror = (() {
    if (!completer.isCompleted) completer.completeError(StateError('load'));
  }).toJS;
  image.src = url;
  return completer.future
      .timeout(const Duration(seconds: 8))
      .then((_) => image);
}
