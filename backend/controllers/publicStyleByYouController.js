import StyleByYou from '../models/StyleByYou.js';

export const getPublicStyleByYou = async (req, res) => {
  try {
    // Optionally filter by section/gender via query: ?gender=men
    const items = await StyleByYou.find({ published: true }).sort({ 'images.order': 1, createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error('getPublicStyleByYou error', err);
    res.status(500).json({ success: false, message: 'Error fetching Styled by You' });
  }
};
