import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  getImpuestos,
  createImpuesto,
  updateImpuesto,
  deleteImpuesto,
  getGravamenes,
  createGravamen,
  updateGravamen,
  deleteGravamen,
  getTasasCambio,
  createTasaCambio,
  updateTasaCambio,
  deleteTasaCambio,
} from '../controllers/billingController';

const router = Router();

router.use(authenticate);

// Documents
router.get('/documents', getDocuments);
router.get('/documents/:id', getDocumentById);
router.post('/documents', createDocument);
router.put('/documents/:id', updateDocument);

// Impuestos
router.get('/impuestos', getImpuestos);
router.post('/impuestos', createImpuesto);
router.put('/impuestos/:id', updateImpuesto);
router.delete('/impuestos/:id', deleteImpuesto);

// Gravámenes
router.get('/gravamenes', getGravamenes);
router.post('/gravamenes', createGravamen);
router.put('/gravamenes/:id', updateGravamen);
router.delete('/gravamenes/:id', deleteGravamen);

// Tasas de cambio
router.get('/tasas-cambio', getTasasCambio);
router.post('/tasas-cambio', createTasaCambio);
router.put('/tasas-cambio/:id', updateTasaCambio);
router.delete('/tasas-cambio/:id', deleteTasaCambio);

export default router;
