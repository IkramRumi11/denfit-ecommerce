import express from 'express';

import { getPublicStyleByYou } from '../controllers/publicStyleByYouController.js';

const router = express.Router();

router.get('/', getPublicStyleByYou);

export default router;
