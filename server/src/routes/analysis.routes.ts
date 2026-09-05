import { Router } from 'express';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  analysisIdSchema,
  createAnalysis,
  createAnalysisSchema,
  deleteAnalysis,
  getAnalysis,
  listAnalyses,
  listAnalysesSchema,
} from '../controllers/analysis.controller';

const router = Router();

router.post('/', validate(createAnalysisSchema), asyncHandler(createAnalysis));
router.get('/', validate(listAnalysesSchema), asyncHandler(listAnalyses));
router.get('/:id', validate(analysisIdSchema), asyncHandler(getAnalysis));
router.delete('/:id', validate(analysisIdSchema), asyncHandler(deleteAnalysis));

export default router;
