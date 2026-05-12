import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBillableObjects,
  getBillableAsuntoTiempos,
  facturar,
} from '../controllers/billableObjectsController';

const router = Router();

router.use(authenticate);

router.get('/', getBillableObjects);
router.get('/:asuntoId/tiempos', getBillableAsuntoTiempos);
router.post('/facturar', facturar);

export default router;
