package com.example.mobile_app

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "splitstack/receipt_ocr"
        ).setMethodCallHandler { call, result ->
            if (call.method != "recognizeReceiptText") {
                result.notImplemented()
                return@setMethodCallHandler
            }

            val path = call.argument<String>("path")
            if (path.isNullOrBlank()) {
                result.success(null)
                return@setMethodCallHandler
            }

            try {
                val image = InputImage.fromFilePath(this, Uri.fromFile(File(path)))
                val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                recognizer.process(image)
                    .addOnSuccessListener { recognizedText ->
                        val lines = recognizedText.textBlocks
                            .flatMap { block -> block.lines }
                            .sortedWith(
                                compareBy(
                                    { line -> line.boundingBox?.top ?: Int.MAX_VALUE },
                                    { line -> line.boundingBox?.left ?: Int.MAX_VALUE }
                                )
                            )
                            .map { line -> line.text.trim() }
                            .filter { text -> text.isNotEmpty() }
                        result.success(
                            if (lines.isNotEmpty()) lines.joinToString("\n")
                            else recognizedText.text.trim()
                        )
                    }
                    .addOnFailureListener { error ->
                        result.error("ocr_failed", error.localizedMessage, null)
                    }
                    .addOnCompleteListener {
                        recognizer.close()
                    }
            } catch (error: Exception) {
                result.error("ocr_failed", error.localizedMessage, null)
            }
        }
    }
}
