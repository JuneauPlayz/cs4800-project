function buildValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

class SettlementStrategy {
  validate(_context) {}

  buildDetails({ payeeProfile, note = '' }) {
    return note.trim() || '';
  }
}

class ZelleSettlementStrategy extends SettlementStrategy {
  validate({ payeeProfile }) {
    if (!payeeProfile?.zelleHandle?.trim()) {
      throw buildValidationError('This person has not added a Zelle handle yet.');
    }
  }

  buildDetails({ payeeProfile, note = '' }) {
    const base = `Send by Zelle to ${payeeProfile.zelleHandle.trim()}`;
    return note.trim() ? `${base}. ${note.trim()}` : base;
  }
}

class VenmoSettlementStrategy extends SettlementStrategy {
  validate({ payeeProfile }) {
    if (!payeeProfile?.venmoHandle?.trim()) {
      throw buildValidationError('This person has not added a Venmo handle yet.');
    }
  }

  buildDetails({ payeeProfile, note = '' }) {
    const base = `Send by Venmo to ${payeeProfile.venmoHandle.trim()}`;
    return note.trim() ? `${base}. ${note.trim()}` : base;
  }
}

class CashSettlementStrategy extends SettlementStrategy {
  buildDetails({ payeeProfile, note = '' }) {
    const payeeNote = payeeProfile?.cashNote?.trim();
    if (note.trim() && payeeNote) return `${note.trim()} ${payeeNote}`;
    return note.trim() || payeeNote || 'Marked as settled offline.';
  }
}

const strategyRegistry = {
  zelle: new ZelleSettlementStrategy(),
  venmo: new VenmoSettlementStrategy(),
  cash: new CashSettlementStrategy()
};

export function getSettlementStrategy(method = 'cash') {
  return strategyRegistry[method] || strategyRegistry.cash;
}

export function getSupportedSettlementMethods() {
  return Object.keys(strategyRegistry);
}
