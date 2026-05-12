import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import clientesRoutes from './routes/clientes';
import asuntosRoutes from './routes/asuntos';
import tiemposRoutes from './routes/tiempos';
import tareasRoutes from './routes/tareas';
import dashboardRoutes from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/asuntos', asuntosRoutes);
app.use('/api/tiempos', tiemposRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] Time Manager API running on http://localhost:${PORT}`);
});

export default app;
