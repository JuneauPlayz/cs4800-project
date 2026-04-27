import { createSettlement, getSettlementHistory } from '../services/index.js';

export function list(req, res) {
  res.json({ settlements: getSettlementHistory(req.user.id) });
}

export function create(req, res, next) {
  try {
    const settlement = createSettlement({
      payerId: req.user.id,
      payeeId: req.body?.payeeId,
      amount: Number(req.body?.amount),
      method: req.body?.method,
      note: req.body?.note
    });
    res.status(201).json(settlement);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}
