(function () {
  const TARGET_WIDTH = 2200;

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load receipt image"));
      image.src = url;
    });
  }

  function clamp(value) {
    return Math.max(0, Math.min(255, value));
  }

  function receiptVariant(image, options) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.max(1, Math.min(2.4, TARGET_WIDTH / sourceWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);

    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    const contrast = options.contrast || 1;
    const brightness = options.brightness || 0;
    const threshold = options.threshold;

    for (let i = 0; i < data.length; i += 4) {
      let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      gray = (gray - 128) * contrast + 128 + brightness;
      if (threshold) gray = gray >= threshold ? 255 : 0;
      const value = clamp(gray);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png");
  }

  async function recognize(imageSource, pageSegmentationMode) {
    const result = await window.Tesseract.recognize(imageSource, "eng", {
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: pageSegmentationMode,
    });
    return (result && result.data && result.data.text) || "";
  }

  window.splitStackRecognizeReceipt = async function splitStackRecognizeReceipt(
    imageUrl,
  ) {
    if (!window.Tesseract) return "";

    const image = await loadImage(imageUrl);
    const contrastImage = receiptVariant(image, {
      contrast: 1.55,
      brightness: 8,
    });
    const thresholdImage = receiptVariant(image, {
      contrast: 1.25,
      threshold: 172,
    });

    const passes = [
      [imageUrl, "6"],
      [contrastImage, "6"],
      [contrastImage, "4"],
      [thresholdImage, "6"],
    ];
    const seen = new Set();
    const texts = [];

    for (const [source, mode] of passes) {
      try {
        const text = (await recognize(source, mode)).trim();
        if (text && !seen.has(text)) {
          seen.add(text);
          texts.push(text);
        }
      } catch (_) {
        // Keep the remaining OCR passes available if one preprocessed image fails.
      }
    }

    return texts.join("\n");
  };
})();
