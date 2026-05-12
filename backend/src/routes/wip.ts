import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getWipClientes, getWipAsuntos } from '../controllers/wipController';

const router = Router();

router.use(authenticate);

router.get('/', getWipClientes);
router.get('/:clienteId/asuntos', getWipAsuntos);

export default router;
