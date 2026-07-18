import express from 'express';
import { protect } from '../middleware/auth.js';
import { createReview, getProductReviews, getProductReviewSummary, updateReview, deleteReview } from '../controllers/reviewController.js';

const router = express.Router();

// create review (verified customers only)
router.post('/', protect, createReview);

// list reviews for a product (public)
router.get('/product/:productId', getProductReviews);

// summary (average/count)
router.get('/summary/:productId', getProductReviewSummary);

// update a review (owner only, limited window)
router.patch('/:id', protect, updateReview);

// delete a review (owner only)
router.delete('/:id', protect, deleteReview);

export default router;
