function toAmount(value) {
  const normalized = String(value || '').replace(/[^0-9.]/g, '');
  return Number(Number(normalized || 0).toFixed(2));
}

function normalizeLine(line = '') {
  return line.replace(/\s+/g, ' ').trim();
}

function normalizeDate(value = '') {
  return String(value).replace(/[.]/g, '/');
}

function findBestDate(text = '') {
  const matches = [...String(text).matchAll(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g)]
    .map((match) => normalizeDate(match[1]));
  return matches[0] || '';
}

function extractAmounts(line = '') {
  return [...String(line).matchAll(/(?:\$|USD)?\s*(\d{1,4}(?:[.,]\d{2}))/gi)].map((match) => toAmount(match[1]));
}

function pickTotal(lines = []) {
  const candidates = [];
  const totalPriority = [
    { pattern: /\bgrand total\b/i, score: 120 },
    { pattern: /\btotal due\b/i, score: 115 },
    { pattern: /\bamount due\b/i, score: 110 },
    { pattern: /\bbalance due\b/i, score: 108 },
    { pattern: /(^|[^a-z])total([^a-z]|$)/i, score: 100 },
    { pattern: /\bpayment\b/i, score: 85 }
  ];

  lines.forEach((line, index) => {
    const amounts = extractAmounts(line);
    if (!amounts.length) return;

    let score = 0;
    totalPriority.forEach((rule) => {
      if (rule.pattern.test(line)) score = Math.max(score, rule.score);
    });

    if (/\bsubtotal\b/i.test(line)) score -= 45;
    if (/\btax\b/i.test(line)) score -= 55;
    if (/\btip\b/i.test(line)) score -= 40;
    if (/\bchange\b/i.test(line)) score -= 60;
    if (/\bcash\b/i.test(line) && !/\btotal\b/i.test(line)) score -= 25;
    if (/\bitem\b/i.test(line)) score -= 20;

    const nextLine = lines[index + 1] || '';
    if (score >= 100 && !amounts.length) {
      extractAmounts(nextLine).forEach((amount) => candidates.push({ amount, score: score - 5 }));
    }

    amounts.forEach((amount, amountIndex) => {
      candidates.push({
        amount,
        score: score + (amountIndex === amounts.length - 1 ? 3 : 0) + Math.min(index, 20) * 0.2
      });
    });
  });

  if (candidates.length) {
    return candidates.sort((first, second) => second.score - first.score || second.amount - first.amount)[0].amount;
  }

  const fallbackAmounts = lines.flatMap((line) => extractAmounts(line));
  return fallbackAmounts.length ? fallbackAmounts[fallbackAmounts.length - 1] : 0;
}

function findMerchant(lines = []) {
  return lines.find((line, index) => (
    index < 4
    && /[a-z]/i.test(line)
    && !/\b(receipt|invoice|thank you|customer copy|order|table|server|subtotal|total|tax)\b/i.test(line)
    && !extractAmounts(line).length
  )) || lines.find((line) => /[a-z]/i.test(line) && !/\b(receipt|invoice|thank you|customer copy)\b/i.test(line)) || '';
}

export function extractReceiptDetails(text = '') {
  const lines = String(text)
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);
  const merchant = findMerchant(lines);
  const amount = pickTotal(lines);

  return {
    merchant,
    expenseDate: findBestDate(text),
    amount,
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
