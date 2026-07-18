import express from 'express';
import { subscribe, unsubscribe } from '../controllers/newsletterController.js';

const router = express.Router();

// Public: subscribe endpoint
router.post('/subscribe', subscribe);

// Public: unsubscribe via query param (e=<base64 email> or email)
router.get('/unsubscribe', unsubscribe);

export default router;
