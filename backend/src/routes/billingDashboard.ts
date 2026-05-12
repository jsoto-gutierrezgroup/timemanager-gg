import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBillingDashboardStats,
  getApprovalTable,
} from '../controllers/billingDashboardController';

const router = Router();

router.use(authenticate);

router.get('/stats', getBillingDashboardStats);
router.get('/approval-table', getApprovalTable);

export default router;
