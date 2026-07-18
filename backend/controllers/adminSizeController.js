import SizeProfile from '../models/SizeProfile.js';

// GET /api/v1/admin/size-profiles
export const getSizeProfiles = async (req, res) => {
  try {
    const { category = '', gender = '', type = '' } = req.query;
    const q = {};
    if (category) q.category = category;
    if (gender) q.gender = gender;
    if (type) q.type = type;

    const profiles = await SizeProfile.find(q).sort({ isDefault: -1, name: 1 });
    res.status(200).json({ success: true, data: { profiles } });
  } catch (err) {
    console.error('getSizeProfiles error:', err);
    res.status(500).json({ success: false, message: 'Error fetching size profiles' });
  }
};

// POST /api/v1/admin/size-profiles
export const createSizeProfile = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?._id };
    const profile = await SizeProfile.create(payload);
    res.status(201).json({ success: true, data: { profile } });
  } catch (err) {
    console.error('createSizeProfile error:', err);
    res.status(500).json({ success: false, message: 'Error creating size profile' });
  }
};

// PATCH /api/v1/admin/size-profiles/:id
export const updateSizeProfile = async (req, res) => {
  try {
    const profile = await SizeProfile.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!profile) return res.status(404).json({ success: false, message: 'Size profile not found' });
    res.status(200).json({ success: true, data: { profile } });
  } catch (err) {
    console.error('updateSizeProfile error:', err);
    res.status(500).json({ success: false, message: 'Error updating size profile' });
  }
};

// DELETE /api/v1/admin/size-profiles/:id
export const deleteSizeProfile = async (req, res) => {
  try {
    const profile = await SizeProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Size profile not found' });
    res.status(200).json({ success: true, message: 'Size profile deleted' });
  } catch (err) {
    console.error('deleteSizeProfile error:', err);
    res.status(500).json({ success: false, message: 'Error deleting size profile' });
  }
};

export default { getSizeProfiles, createSizeProfile, updateSizeProfile, deleteSizeProfile };
