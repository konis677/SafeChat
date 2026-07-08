import { Router } from 'express';
import { createInvite, useInvite, getConversations } from '../controllers/inviteController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJWT); // All invite routes require authentication

router.post('/create', createInvite);
router.post('/use', useInvite);
router.get('/conversations', getConversations);

export default router;
