export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function splitEvenly(total, count) {
  if (!count) return []
  const cents = Math.max(0, Math.round(total * 100))
  const base = Math.floor(cents / count)
  const remainder = cents - base * count
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100)
}

export function parseAmount(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function roundCurrency(value) {
  return Math.round(value * 100) / 100
}

export function buildSplitDrafts(members, previousDrafts = {}) {
  return members.reduce((drafts, member) => {
    drafts[member.id] = previousDrafts[member.id] ?? ''
    return drafts
  }, {})
}

export function getPercentTotal(splitDrafts, members) {
  return members.reduce((sum, member) => sum + parseAmount(splitDrafts[member.id]), 0)
}

export function getCustomTotal(splitDrafts, members) {
  return roundCurrency(
    members.reduce((sum, member) => sum + parseAmount(splitDrafts[member.id]), 0)
  )
}

export function buildSplitPayload(splitMethod, splitDrafts, members) {
  if (splitMethod === 'Percent') {
    return members.map((member) => ({
      id: member.id,
      percent: parseAmount(splitDrafts[member.id]),
    }))
  }

  if (splitMethod === 'Custom') {
    return members.map((member) => ({
      id: member.id,
      amount: roundCurrency(parseAmount(splitDrafts[member.id])),
    }))
  }

  return undefined
}

export function getSplitPreview(splitMethod, totalAmount, members, splitDrafts) {
  if (!members.length) return []

  if (splitMethod === 'Percent') {
    return members.map((member) =>
      roundCurrency((totalAmount * parseAmount(splitDrafts[member.id])) / 100)
    )
  }

  if (splitMethod === 'Custom') {
    return members.map((member) => roundCurrency(parseAmount(splitDrafts[member.id])))
  }

  return splitEvenly(totalAmount, members.length)
}

export function buildScannerReceipt() {
  return {
    merchant: 'Kuro Ramen',
    date: 'Sep 28, 2024',
    amount: '5.00',
    items: [
      { id: 1, name: 'Shared appetizer', price: 2.5, included: true },
      { id: 2, name: 'Late night dessert', price: 2.5, included: true },
    ],
  }
}
