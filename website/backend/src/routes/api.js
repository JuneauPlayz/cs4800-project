import express, { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as budgetController from '../controllers/budgetController.js';
import * as challengeController from '../controllers/challengeController.js';
import * as expenseController from '../controllers/expenseController.js';
import * as groupController from '../controllers/groupController.js';
import * as voteController from '../controllers/voteController.js';
import * as workspaceController from '../controllers/workspaceController.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const receiptUploadParser = express.raw({
  limit: process.env.RECEIPT_RAW_BODY_LIMIT || process.env.RECEIPT_UPLOAD_BODY_LIMIT || '20mb',
  type: [
    'application/octet-stream',
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
});

router.get('/health', workspaceController.health);
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);

router.use(auth);

router.get('/me', workspaceController.me);
router.put('/me', workspaceController.updateMe);
router.get('/dashboard', workspaceController.dashboard);

router.get('/groups', groupController.list);
router.post('/groups', groupController.create);
router.put('/groups/:id', groupController.update);
router.delete('/groups/:id', groupController.remove);
router.delete('/groups/:id/membership', groupController.leave);

router.get('/invites', groupController.invites);
router.post('/invites/:id/respond', groupController.respondInvite);

router.get('/expenses', expenseController.list);
router.post('/receipts', receiptUploadParser, expenseController.uploadReceipt);
router.post('/expenses', expenseController.create);
router.post('/expenses/:id/settlements', expenseController.settle);

router.get('/votes', voteController.list);
router.post('/votes/:id/respond', voteController.respond);
router.delete('/votes/:id/respond', voteController.undo);

router.get('/analytics', workspaceController.analytics);

router.get('/challenges', challengeController.list);
router.post('/challenges', challengeController.create);
router.post('/challenges/:id/contribute', challengeController.contribute);

router.get('/notifications', workspaceController.notifications);
router.post('/notifications/:id/read', workspaceController.markNotification);

router.get('/settings', workspaceController.settings);
router.put('/settings', workspaceController.updateSettings);

router.post('/ai/chat', workspaceController.chat);
router.post('/ai/actions/confirm', workspaceController.confirmAssistantAction);

router.get('/budget', budgetController.getBudget);
router.post('/budget', budgetController.saveBudget);

export default router;
