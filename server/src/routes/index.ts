import { Router } from 'express';
import analysisRoutes from './analysis.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/analyses', analysisRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
