import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTarifas, getTarifa, createTarifa, updateTarifa, deleteTarifa } from '../controllers/tarifasController';

const router = Router();

router.get('/', authenticate, getTarifas);
router.get('/:id', authenticate, getTarifa);
router.post('/', authenticate, createTarifa);
router.put('/:id', authenticate, updateTarifa);
router.delete('/:id', authenticate, deleteTarifa);

export default router;
