function toAmount(value) {
  const normalized = String(value || '').replace(/[^0-9.]/g, '');
  return Number(Number(normalized || 0).toFixed(2));
}

function normalizeLine(line = '') {
  return line.replace(/\s+/g, ' ').trim();
}

export function extractReceiptDetails(text = '') {
  const lines = String(text)
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);

  const dateMatch = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
  const totalLine = [...lines]
    .reverse()
    .find((line) => /total|amount due|grand total|balance due/i.test(line) && /\$?\d/.test(line));
  const amountMatch = totalLine?.match(/(\$?\s?\d+[.,]?\d{0,2})/g)?.pop()
    || text.match(/total[^\d]*(\$?\s?\d+[.,]?\d{0,2})/i)?.[1]
    || [...text.matchAll(/(\$?\s?\d+[.,]?\d{2})/g)].pop()?.[1]
    || '';

  const merchant = lines.find((line) => /[a-z]/i.test(line) && !/receipt|invoice|thank you|customer copy/i.test(line)) || '';
  const description = merchant ? `${merchant} receipt` : 'Scanned receipt';

  return {
    merchant,
    description,
    expenseDate: dateMatch ? dateMatch[1].replace(/\./g, '/') : '',
    amount: amountMatch ? toAmount(amountMatch) : 0,
    rawText: text.trim()
  };
}

export async function scanReceiptImage(file, onProgress = () => {}) {
  const { recognize } = await import('tesseract.js');
  const result = await recognize(file, 'eng', {
    logger(message) {
      if (message?.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress(message.progress);
      }
    }
  });

  return extractReceiptDetails(result?.data?.text || '');
}
