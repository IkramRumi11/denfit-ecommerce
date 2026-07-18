import Review from '../models/Review.js';

// List reviews with filters for admin
export const listReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.product) filter.product = req.query.product;
    if (req.query.user) filter.user = req.query.user;

    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email')
      .populate('product', 'name')
      .lean();

    res.json({ success: true, data: { reviews, pagination: { page, limit, total } } });
  } catch (err) {
    next(err);
  }
};

export const approveReview = async (req, res, next) => {
  try {
    const id = req.params.id;
    const review = await Review.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Not found' });
    await Review.updateProductRatings(review.product);
    res.json({ success: true, data: { review } });
  } catch (err) { next(err); }
};

export const rejectReview = async (req, res, next) => {
  try {
    const id = req.params.id;
    const review = await Review.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Not found' });
    await Review.updateProductRatings(review.product);
    res.json({ success: true, data: { review } });
  } catch (err) { next(err); }
};

export const featureReview = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { featured } = req.body;
    const review = await Review.findByIdAndUpdate(id, { featured: !!featured }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { review } });
  } catch (err) { next(err); }
};

export const deleteReview = async (req, res, next) => {
  try {
    const id = req.params.id;
    const review = await Review.findByIdAndDelete(id);
    if (!review) return res.status(404).json({ success: false, message: 'Not found' });
    await Review.updateProductRatings(review.product);
    res.json({ success: true });
  } catch (err) { next(err); }
};
