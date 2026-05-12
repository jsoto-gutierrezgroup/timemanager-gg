import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getApprovalList,
  getAsuntoTiemposApproval,
  bulkUpdateTiempoEstado,
} from '../controllers/approvalController';

const router = Router();

router.use(authenticate);

router.get('/', getApprovalList);
router.get('/:asuntoId/tiempos', getAsuntoTiemposApproval);
router.put('/tiempos/bulk', bulkUpdateTiempoEstado);

export default router;
