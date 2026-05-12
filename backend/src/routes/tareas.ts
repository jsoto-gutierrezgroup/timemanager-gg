import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTareas,
  getTareaById,
  createTarea,
  updateTarea,
  deleteTarea,
} from '../controllers/tareasController';

const router = Router();

router.use(authenticate);

router.get('/', getTareas);
router.get('/:id', getTareaById);
router.post('/', createTarea);
router.put('/:id', updateTarea);
router.delete('/:id', deleteTarea);

export default router;
