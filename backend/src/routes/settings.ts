import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRoles, createRole, updateRole, deleteRole,
  getCategories, createCategory, updateCategory, deleteCategory,
  getAreas, createArea, updateArea, deleteArea,
  getAusencias, createAusencia, updateAusencia, deleteAusencia,
} from '../controllers/settingsController';

const router = Router();

router.use(authenticate);

// Roles
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Areas
router.get('/areas', getAreas);
router.post('/areas', createArea);
router.put('/areas/:id', updateArea);
router.delete('/areas/:id', deleteArea);

// Ausencias
router.get('/ausencias', getAusencias);
router.post('/ausencias', createAusencia);
router.put('/ausencias/:id', updateAusencia);
router.delete('/ausencias/:id', deleteAusencia);

export default router;
