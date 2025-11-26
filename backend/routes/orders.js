import express from 'express';
const router = express.Router();

// GET /api/orders - Get all orders
router.get('/', (req, res) => {
  res.json({ message: 'Get all orders route' });
});

export default router;
