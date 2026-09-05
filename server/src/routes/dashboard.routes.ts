import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { getDashboardStats } from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', asyncHandler(getDashboardStats));

export default router;
