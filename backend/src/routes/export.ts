import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  exportTiemposXls,
  exportTiemposPdf,
  exportUsersXls,
  exportApprovalXls,
  exportBillingXls,
} from '../controllers/exportController';

const router = Router();

router.use(authenticate);

router.get('/tiempos/xls', exportTiemposXls);
router.get('/tiempos/pdf', exportTiemposPdf);
router.get('/users/xls', exportUsersXls);
router.get('/approval/xls', exportApprovalXls);
router.get('/billing/xls', exportBillingXls);

export default router;
