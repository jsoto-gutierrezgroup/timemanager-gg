import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTiempos,
  getTiempoById,
  createTiempo,
  updateTiempo,
  deleteTiempo,
} from '../controllers/tiemposController';

const router = Router();

router.use(authenticate);

router.get('/', getTiempos);
router.get('/:id', getTiempoById);
router.post('/', createTiempo);
router.put('/:id', updateTiempo);
router.delete('/:id', deleteTiempo);

export default router;
