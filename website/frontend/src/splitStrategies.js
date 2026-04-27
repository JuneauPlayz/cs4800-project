function roundCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

class SplitStrategy {
  createInputs(_members, _amount) {
    return {};
  }

  validate(_context) {
    return '';
  }

  calculateShares(_context) {
    throw new Error('SplitStrategy.calculateShares must be implemented.');
  }
}

class EqualSplitStrategy extends SplitStrategy {
  calculateShares({ members = [], amount = 0 }) {
    const share = members.length ? roundCurrency(amount / members.length) : 0;
    return members.map((member, index) => ({
      ...member,
      amount: index === members.length - 1
        ? roundCurrency(amount - share * (members.length - 1))
        : share
    }));
  }
}

class PercentSplitStrategy extends SplitStrategy {
  createInputs(members = []) {
    const count = members.length || 1;
    const base = roundCurrency(100 / count);
    return Object.fromEntries(members.map((member, index) => [
      member.id,
      index === members.length - 1 ? roundCurrency(100 - base * (members.length - 1)) : base
    ]));
  }

  validate({ members = [], inputs = {} }) {
    const total = roundCurrency(members.reduce((sum, member) => sum + Number(inputs[member.id] || 0), 0));
    return Math.abs(total - 100) > 0.01 ? 'Percent split must add up to 100%.' : '';
  }

  calculateShares({ members = [], amount = 0, inputs = {} }) {
    return members.map((member, index) => {
      const percent = Number(inputs[member.id] || 0);
      const raw = roundCurrency((amount * percent) / 100);
      const assignedSoFar = members
        .slice(0, index)
        .reduce((sum, currentMember) => sum + roundCurrency((amount * Number(inputs[currentMember.id] || 0)) / 100), 0);
      return {
        ...member,
        percent,
        amount: index === members.length - 1 ? roundCurrency(amount - assignedSoFar) : raw
      };
    });
  }
}

class CustomSplitStrategy extends SplitStrategy {
  createInputs(members = [], amount = 0) {
    const base = members.length ? roundCurrency(amount / members.length) : 0;
    return Object.fromEntries(members.map((member, index) => [
      member.id,
      index === members.length - 1 ? roundCurrency(amount - base * (members.length - 1)) : base
    ]));
  }

  validate({ members = [], amount = 0, inputs = {} }) {
    const total = roundCurrency(members.reduce((sum, member) => sum + Number(inputs[member.id] || 0), 0));
    return Math.abs(total - roundCurrency(amount)) > 0.01 ? 'Custom split amounts must match the expense total.' : '';
  }

  calculateShares({ members = [], inputs = {} }) {
    return members.map((member) => ({ ...member, amount: roundCurrency(inputs[member.id] || 0) }));
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
