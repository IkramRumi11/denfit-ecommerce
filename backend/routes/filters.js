import express from 'express';

import { protect, authorize } from '../middleware/auth.js';
import {
  // Filter Groups
  getFilterGroups,
  createFilterGroup,
  updateFilterGroup,
  deleteFilterGroup,
  // Filter Options
  createFilterOption,
  updateFilterOption,
  deleteFilterOption,
  reorderFilterOptions,
  // Category Filter Config
  getCategoryFilterConfig,
  setCategoryFilterConfig,
  getAllCategoryFilterConfigs,
  // Faceted Search
  getFacets
} from '../controllers/filterController.js';

const router = express.Router();

// ─── PUBLIC ROUTES ───
// Faceted search — used by frontend filter sidebar
router.get('/facets', getFacets);

// Category filter config — used by frontend to know which filters to show
router.get('/config/:categorySlug', getCategoryFilterConfig);

// Filter groups — public read (needed for frontend filter rendering)
router.get('/groups', getFilterGroups);

// ─── ADMIN ROUTES ───
router.use(protect, authorize('admin'));

// Filter Group CRUD
router.post('/groups', createFilterGroup);
router.patch('/groups/:id', updateFilterGroup);
router.delete('/groups/:id', deleteFilterGroup);

// Filter Option CRUD
router.post('/groups/:groupId/options', createFilterOption);
router.post('/groups/:groupId/options/reorder', reorderFilterOptions);
router.patch('/options/:id', updateFilterOption);
router.delete('/options/:id', deleteFilterOption);

// Category Filter Config CRUD
router.get('/configs', getAllCategoryFilterConfigs);
router.put('/config/:categorySlug', setCategoryFilterConfig);

export default router;
