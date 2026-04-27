function roundCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

class SplitStrategy {
  validate(_payload) {}

  calculate(_payload) {
    throw new Error('SplitStrategy.calculate must be implemented.');
  }
}

class EqualSplitStrategy extends SplitStrategy {
  calculate({ amount, members = [] }) {
    const memberIds = members.map((member) => member.id);
    const share = memberIds.length ? roundCurrency(amount / memberIds.length) : 0;
    return memberIds.map((userId, index) => ({
      userId,
      amount: index === memberIds.length - 1
        ? roundCurrency(amount - share * (memberIds.length - 1))
        : share
    }));
  }
}

class CustomSplitStrategy extends SplitStrategy {
  validate({ amount, splits = [] }) {
    const total = roundCurrency(splits.reduce((sum, split) => sum + Number(split.amount || 0), 0));
    if (Math.abs(total - roundCurrency(amount)) > 0.01) {
      throw buildValidationError('Custom split amounts must match the expense total.');
    }
  }

  calculate({ splits = [] }) {
    return splits.map((split) => ({
      userId: split.userId,
      amount: roundCurrency(split.amount)
    }));
  }
}

class PercentSplitStrategy extends SplitStrategy {
  validate({ splits = [] }) {
    const total = roundCurrency(splits.reduce((sum, split) => sum + Number(split.percent || 0), 0));
    if (Math.abs(total - 100) > 0.01) {
      throw buildValidationError('Percent split must add up to 100%.');
    }
  }

  calculate({ amount, splits = [] }) {
    return splits.map((split, index) => {
      const raw = roundCurrency((amount * Number(split.percent || 0)) / 100);
      const assignedSoFar = splits
        .slice(0, index)
        .reduce((sum, part) => sum + roundCurrency((amount * Number(part.percent || 0)) / 100), 0);
      return {
        userId: split.userId,
        amount: index === splits.length - 1 ? roundCurrency(amount - assignedSoFar) : raw
      };
    });
  }
}

const strategyRegistry = {
  equal: new EqualSplitStrategy(),
  percent: new PercentSplitStrategy(),
  custom: new CustomSplitStrategy()
};

export function getSplitStrategy(splitMethod = 'equal') {
  return strategyRegistry[splitMethod] || strategyRegistry.equal;
}
