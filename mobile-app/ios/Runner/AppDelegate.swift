import Flutter
import UIKit
import Vision

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var receiptOcrChannel: FlutterMethodChannel?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    receiptOcrChannel = FlutterMethodChannel(
      name: "splitstack/receipt_ocr",
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    receiptOcrChannel?.setMethodCallHandler(handleReceiptOcr)
  }

  private func handleReceiptOcr(call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard call.method == "recognizeReceiptText" else {
      result(FlutterMethodNotImplemented)
      return
    }
    guard
      let args = call.arguments as? [String: Any],
      let path = args["path"] as? String,
      !path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else {
      result(nil)
      return
    }

    let imageUrl = URL(fileURLWithPath: path)
    DispatchQueue.global(qos: .userInitiated).async {
      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          DispatchQueue.main.async {
            result(FlutterError(code: "ocr_failed", message: error.localizedDescription, details: nil))
          }
          return
        }

        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        let lines = observations
          .sorted { first, second in
            let firstTop = 1 - first.boundingBox.maxY
            let secondTop = 1 - second.boundingBox.maxY
            if abs(firstTop - secondTop) > 0.01 {
              return firstTop < secondTop
            }
            return first.boundingBox.minX < second.boundingBox.minX
          }
          .compactMap { observation in
            observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines)
          }
          .filter { !$0.isEmpty }

        DispatchQueue.main.async {
          result(lines.isEmpty ? nil : lines.joined(separator: "\n"))
        }
      }

      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      do {
        try VNImageRequestHandler(url: imageUrl, options: [:]).perform([request])
      } catch {
        DispatchQueue.main.async {
          result(FlutterError(code: "ocr_failed", message: error.localizedDescription, details: nil))
        }
      }
    }
  }
}
