import StyleByYou from '../models/StyleByYou.js';
import Product from '../models/Product.js';
import { computeAvailableQuantity, computeIsLowStock, computeIsOutOfStock } from '../utils/inventory.js';

export const listStyleByYou = async (req, res) => {
  try {
    const items = await StyleByYou.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error('listStyleByYou error', err);
    res.status(500).json({ success: false, message: 'Error fetching Style By You items' });
  }
};

export const createStyleByYou = async (req, res) => {
  try {
    const payload = req.body || {};
    // allow server-side uploaded files via req.files -> map into images array if present
    const images = payload.images || [];
    if (req.files && req.files.length) {
      for (const f of req.files) {
        images.push({ url: f.url || `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, order: images.length });
      }
    }
    const doc = await StyleByYou.create({ title: payload.title, description: payload.description, images, published: payload.published ?? true });
    res.status(201).json({ success: true, data: { item: doc } });
  } catch (err) {
    console.error('createStyleByYou error', err);
    res.status(500).json({ success: false, message: 'Error creating Style By You item' });
  }
};

export const updateStyleByYou = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const update = {};
    if (typeof payload.title !== 'undefined') update.title = payload.title;
    if (typeof payload.description !== 'undefined') update.description = payload.description;
    if (typeof payload.published !== 'undefined') update.published = payload.published;
    if (typeof payload.images !== 'undefined') update.images = payload.images;
    if (req.files && req.files.length) {
      update.images = update.images || [];
      for (const f of req.files) {
        update.images.push({ url: f.url || `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, order: update.images.length });
      }
    }

    const doc = await StyleByYou.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: { item: doc } });
  } catch (err) {
    console.error('updateStyleByYou error', err);
    res.status(500).json({ success: false, message: 'Error updating Style By You item' });
  }
};

export const deleteStyleByYou = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await StyleByYou.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: { deletedId: id } });
  } catch (err) {
    console.error('deleteStyleByYou error', err);
    res.status(500).json({ success: false, message: 'Error deleting Style By You item' });
  }
};

// Admin helper to search products by query for linking
export const searchProductsForLink = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.status(200).json({ success: true, data: { products: [] } });
    const products = await Product.find({ $or: [ { name: { $regex: q, $options: 'i' } }, { sku: { $regex: q, $options: 'i' } } ] }).limit(20).lean();

    // Attach canonical inventory fields when possible (admin helpers rely on these)
    const normalized = (products || []).map(p => (p && p._doc) ? p._doc : p);
    normalized.forEach((p) => {
      try {
        p.availableQuantity = computeAvailableQuantity(p);
        p.isOutOfStock = computeIsOutOfStock(p);
        // no threshold here; admin UI can interpret availableQuantity directly
      } catch (e) {}
    });

    res.status(200).json({ success: true, data: { products: normalized } });
  } catch (err) {
    console.error('searchProductsForLink error', err);
    res.status(500).json({ success: false, message: 'Error searching products' });
  }
};
