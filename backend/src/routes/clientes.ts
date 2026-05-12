import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../controllers/clientesController';

const router = Router();

router.use(authenticate);

router.get('/', getClientes);
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

export default router;
