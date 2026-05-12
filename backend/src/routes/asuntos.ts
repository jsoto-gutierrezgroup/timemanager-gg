import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAsuntos,
  getAsuntoById,
  createAsunto,
  updateAsunto,
} from '../controllers/asuntosController';

const router = Router();

router.use(authenticate);

router.get('/', getAsuntos);
router.get('/:id', getAsuntoById);
router.post('/', createAsunto);
router.put('/:id', updateAsunto);

export default router;
