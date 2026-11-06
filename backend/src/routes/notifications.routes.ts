import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { listNotifications, readAllNotifications, readNotification, registerPushDevice, unregisterPushDevice } from '../controllers/notifications.controller';
import { validateRouteIds } from '../middleware/validation.middleware';
import { donorHealthAlert } from '../controllers/healthAlerts.controller';

const router = Router();
router.use(authenticate, requireRole('donor'));
router.get('/', listNotifications);
router.get('/:id/health-message', validateRouteIds, donorHealthAlert);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', validateRouteIds, readNotification);
router.post('/devices', registerPushDevice);
router.delete('/devices/:id', unregisterPushDevice);
export default router;
