import DetailTemplate from '../models/DetailTemplate.js';
import Product from '../models/Product.js';

// List templates (admin)
export const listDetailTemplates = async (req, res) => {
  try {
    const templates = await DetailTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { templates } });
  } catch (err) {
    console.error('listDetailTemplates error:', err);
    res.status(500).json({ success: false, message: 'Error listing detail templates' });
  }
};

export const getDetailTemplate = async (req, res) => {
  try {
    const t = await DetailTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, data: { template: t } });
  } catch (err) {
    console.error('getDetailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Error fetching template' });
  }
};

export const createDetailTemplate = async (req, res) => {
  try {
    const payload = req.body || {};
    const doc = await DetailTemplate.create({
      name: payload.name || 'Untitled Template',
      categorySlug: payload.categorySlug || '',
      sections: payload.sections || [],
      createdBy: req.user && req.user._id
    });
    res.status(201).json({ success: true, data: { template: doc } });
  } catch (err) {
    console.error('createDetailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Error creating template' });
  }
};

export const updateDetailTemplate = async (req, res) => {
  try {
    const payload = req.body || {};
    const t = await DetailTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Template not found' });
    t.name = payload.name || t.name;
    t.categorySlug = payload.categorySlug || t.categorySlug;
    if (Array.isArray(payload.sections)) t.sections = payload.sections;
    t.updatedBy = req.user && req.user._id;
    await t.save();
    res.status(200).json({ success: true, data: { template: t } });
  } catch (err) {
    console.error('updateDetailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Error updating template' });
  }
};

export const deleteDetailTemplate = async (req, res) => {
  try {
    const t = await DetailTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Template not found' });
    await t.remove();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteDetailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Error deleting template' });
  }
};

// Update a product's detailSections or assign a template
export const updateProductDetailSections = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (payload.detailTemplate) {
      product.detailTemplate = payload.detailTemplate || null;
    }
    if (Array.isArray(payload.detailSections)) {
      product.detailSections = payload.detailSections;
    }
    // Update cached policy flags if provided
    if (payload.policyFlags && typeof payload.policyFlags === 'object') {
      product.policyFlags = Object.assign({}, product.policyFlags || {}, payload.policyFlags);
    }

    await product.save();
    res.status(200).json({ success: true, data: { product } });
  } catch (err) {
    console.error('updateProductDetailSections error:', err);
    res.status(500).json({ success: false, message: 'Error updating product detail sections' });
  }
};
