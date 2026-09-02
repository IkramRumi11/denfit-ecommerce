import FilterGroup from '../models/FilterGroup.js';
import FilterOption from '../models/FilterOption.js';
import CategoryFilterConfig from '../models/CategoryFilterConfig.js';
import Product from '../models/Product.js';
import { isReservedFilterSlug } from '../constants/reservedFilterSlugs.js';

const makeSlug = (v) => String(v || '')
  .toLowerCase()
  .replace(/[^a-z0-9 -]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

// ============================================================
// FILTER GROUP CRUD
// ============================================================

/** GET /api/v1/filters/groups — List all filter groups with their options */
export const getFilterGroups = async (req, res) => {
  try {
    const { enabled } = req.query;
    const query = {};
    if (enabled === 'true') query.isEnabled = true;

    const groups = await FilterGroup.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Populate options for each group
    const groupIds = groups.map(g => g._id);
    const allOptions = await FilterOption.find({
      filterGroup: { $in: groupIds },
      ...(enabled === 'true' ? { isEnabled: true } : {})
    })
      .sort({ displayOrder: 1 })
      .lean();

    // Attach options to their groups
    const optionsByGroup = {};
    for (const opt of allOptions) {
      const key = String(opt.filterGroup);
      if (!optionsByGroup[key]) optionsByGroup[key] = [];
      optionsByGroup[key].push(opt);
    }

    const result = groups.map(g => ({
      ...g,
      options: optionsByGroup[String(g._id)] || []
    }));

    return res.json({ success: true, data: result });
  } catch (e) {
    console.error('getFilterGroups error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load filter groups' });
  }
};

/** POST /api/v1/filters/groups — Create a new filter group */
export const createFilterGroup = async (req, res) => {
  try {
    const { name, type, displayOrder, isGlobal, icon, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const slug = makeSlug(name);
    if (isReservedFilterSlug(slug)) {
      return res.status(400).json({ success: false, message: `Filter group slug "${slug}" is reserved and cannot be used.` });
    }

    const existing = await FilterGroup.findOne({ slug });
    if (existing) return res.status(409).json({ success: false, message: `Filter group "${name}" already exists` });

    const group = await FilterGroup.create({
      name,
      slug,
      type: type || 'multi-select',
      displayOrder: displayOrder ?? 0,
      isGlobal: isGlobal ?? false,
      icon: icon || '',
      description: description || '',
      createdBy: req.user?._id
    });

    return res.status(201).json({ success: true, data: group });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: 'Filter group already exists' });
    }
    console.error('createFilterGroup error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create filter group' });
  }
};

/** PATCH /api/v1/filters/groups/:id — Update a filter group */
export const updateFilterGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['name', 'type', 'displayOrder', 'isEnabled', 'isGlobal', 'icon', 'description'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.name) {
      updates.slug = makeSlug(updates.name);
      if (isReservedFilterSlug(updates.slug)) {
        return res.status(400).json({ success: false, message: `Filter group slug "${updates.slug}" is reserved and cannot be used.` });
      }
      const existing = await FilterGroup.findOne({ slug: updates.slug, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A filter group with this slug already exists' });
      }
    }

    const group = await FilterGroup.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!group) return res.status(404).json({ success: false, message: 'Filter group not found' });

    return res.json({ success: true, data: group });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: 'A filter group with this slug already exists' });
    }
    console.error('updateFilterGroup error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update filter group' });
  }
};

/** DELETE /api/v1/filters/groups/:id — Delete a filter group and its options */
export const deleteFilterGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = String(req.query.force || '').toLowerCase() === 'true';

    const referencedConfigs = await CategoryFilterConfig.find({
      'filterGroups.filterGroup': id,
      isEnabled: true
    }).lean();

    if (referencedConfigs.length > 0 && !forceDelete) {
      return res.status(409).json({
        success: false,
        message: 'This filter group is assigned to one or more category configurations.',
        configs: referencedConfigs.map(cfg => cfg.categorySlug)
      });
    }

    const group = await FilterGroup.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Filter group not found' });

    await FilterGroup.findByIdAndDelete(id);
    await FilterOption.deleteMany({ filterGroup: id });

    if (forceDelete) {
      await CategoryFilterConfig.updateMany(
        { 'filterGroups.filterGroup': id },
        { $pull: { filterGroups: { filterGroup: id } } }
      );
    }

    return res.json({ success: true, message: 'Filter group deleted' });
  } catch (e) {
    console.error('deleteFilterGroup error:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete filter group' });
  }
};

// ============================================================
// FILTER OPTION CRUD
// ============================================================

/** POST /api/v1/filters/groups/:groupId/options — Add option to group */
export const createFilterOption = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await FilterGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Filter group not found' });

    const { value, label, meta, displayOrder } = req.body;
    if (!value) return res.status(400).json({ success: false, message: 'Value is required' });

    const slug = makeSlug(value);
    const option = await FilterOption.create({
      filterGroup: groupId,
      value,
      slug,
      label: label || value,
      meta: meta || {},
      displayOrder: displayOrder ?? 0,
      isEnabled: true
    });

    return res.status(201).json({ success: true, data: option });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'Option already exists in this group' });
    console.error('createFilterOption error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create option' });
  }
};

/** PATCH /api/v1/filters/options/:id — Update an option */
export const updateFilterOption = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['value', 'label', 'meta', 'displayOrder', 'isEnabled'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.value) updates.slug = makeSlug(updates.value);

    const option = await FilterOption.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });

    return res.json({ success: true, data: option });
  } catch (e) {
    console.error('updateFilterOption error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update option' });
  }
};

/** DELETE /api/v1/filters/options/:id — Delete an option */
export const deleteFilterOption = async (req, res) => {
  try {
    const { id } = req.params;
    const option = await FilterOption.findByIdAndDelete(id);
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });
    return res.json({ success: true, message: 'Option deleted' });
  } catch (e) {
    console.error('deleteFilterOption error:', e);
    return res.status(500).json({ success: false, message: 'Failed to delete option' });
  }
};

/** POST /api/v1/filters/groups/:groupId/options/reorder — Reorder options */
export const reorderFilterOptions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { order } = req.body; // Array of { id, displayOrder }
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'order array required' });

    const ops = order.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id, filterGroup: groupId },
        update: { $set: { displayOrder } }
      }
    }));
    await FilterOption.bulkWrite(ops);

    return res.json({ success: true, message: 'Reordered' });
  } catch (e) {
    console.error('reorderFilterOptions error:', e);
    return res.status(500).json({ success: false, message: 'Failed to reorder' });
  }
};

// ============================================================
// CATEGORY FILTER CONFIG
// ============================================================

/** GET /api/v1/filters/config/:categorySlug — Get filter config for a category */
export const getCategoryFilterConfig = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { gender } = req.query;

    // Try gender-specific first, then fall back to gender-agnostic
    let config = null;
    if (gender) {
      config = await CategoryFilterConfig.findOne({
        categorySlug: categorySlug.toLowerCase(),
        gender: gender.toLowerCase(),
        isEnabled: true
      }).populate({
        path: 'filterGroups.filterGroup',
        match: { isEnabled: true }
      }).lean();
    }
    if (!config) {
      config = await CategoryFilterConfig.findOne({
        categorySlug: categorySlug.toLowerCase(),
        gender: '',
        isEnabled: true
      }).populate({
        path: 'filterGroups.filterGroup',
        match: { isEnabled: true }
      }).lean();
    }

    // Also load global filters
    const globalFilters = await FilterGroup.find({ isGlobal: true, isEnabled: true })
      .sort({ displayOrder: 1 })
      .lean();

    // Merge: category-specific filters + global filters
    const categoryGroups = config?.filterGroups
      ?.filter(fg => fg.filterGroup) // remove nulls from unmatched populate
      ?.map(fg => ({ ...fg.filterGroup, displayOrder: fg.displayOrder, isRequired: fg.isRequired }))
      || [];

    const allGroups = [...categoryGroups, ...globalFilters];

    // Deduplicate by slug (category-specific takes priority)
    const seen = new Set();
    const deduped = [];
    for (const g of allGroups) {
      if (seen.has(g.slug)) continue;
      seen.add(g.slug);
      deduped.push(g);
    }

    // Load options for all groups
    const groupIds = deduped.map(g => g._id);
    const options = await FilterOption.find({
      filterGroup: { $in: groupIds },
      isEnabled: true
    }).sort({ displayOrder: 1 }).lean();

    const optionsByGroup = {};
    for (const opt of options) {
      const key = String(opt.filterGroup);
      if (!optionsByGroup[key]) optionsByGroup[key] = [];
      optionsByGroup[key].push(opt);
    }

    const groups = deduped.map(g => ({
      ...g,
      options: optionsByGroup[String(g._id)] || []
    }));

    return res.json({
      success: true,
      data: {
        categorySlug,
        productType: config?.productType || 'clothing',
        groups
      }
    });
  } catch (e) {
    console.error('getCategoryFilterConfig error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load filter config' });
  }
};

/** GET /api/v1/product-templates/:subcategory — Expose template config for AI and creators */
export const getProductTemplate = async (req, res) => {
  try {
    const { subcategory } = req.params;
    const { gender } = req.query;

    let config = null;
    if (gender) {
      config = await CategoryFilterConfig.findOne({
        categorySlug: subcategory.toLowerCase(),
        gender: gender.toLowerCase(),
        isEnabled: true
      }).populate({
        path: 'filterGroups.filterGroup',
        match: { isEnabled: true }
      }).lean();
    }
    if (!config) {
      config = await CategoryFilterConfig.findOne({
        categorySlug: subcategory.toLowerCase(),
        gender: '',
        isEnabled: true
      }).populate({
        path: 'filterGroups.filterGroup',
        match: { isEnabled: true }
      }).lean();
    }

    if (!config) {
      return res.status(404).json({ success: false, message: `No template found for subcategory "${subcategory}"` });
    }

    // Load global filters
    const globalFilters = await FilterGroup.find({ isGlobal: true, isEnabled: true })
      .sort({ displayOrder: 1 })
      .lean();

    const categoryGroups = config?.filterGroups
      ?.filter(fg => fg.filterGroup)
      ?.map(fg => ({ ...fg.filterGroup, isRequired: fg.isRequired }))
      || [];

    const allGroups = [...categoryGroups, ...globalFilters];

    const seen = new Set();
    const deduped = [];
    for (const g of allGroups) {
      if (seen.has(g.slug)) continue;
      seen.add(g.slug);
      deduped.push(g);
    }

    const groupIds = deduped.map(g => g._id);
    const options = await FilterOption.find({
      filterGroup: { $in: groupIds },
      isEnabled: true
    }).sort({ displayOrder: 1 }).lean();

    const optionsByGroup = {};
    for (const opt of options) {
      const key = String(opt.filterGroup);
      if (!optionsByGroup[key]) optionsByGroup[key] = [];
      optionsByGroup[key].push(opt);
    }

    // Map to clean schema abstraction
    const attributes = deduped.map(g => ({
      name: g.name,
      slug: g.slug,
      type: g.type || 'multi-select',
      isRequired: g.isRequired || false,
      options: (optionsByGroup[String(g._id)] || []).map(o => o.value)
    }));

    return res.json({
      success: true,
      data: {
        subcategory,
        productType: config.productType || 'clothing',
        version: config.version || 1,
        attributes
      }
    });
  } catch (e) {
    console.error('getProductTemplate error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load template' });
  }
};

/** PUT /api/v1/filters/config/:categorySlug — Set/update filter config for a category */
export const setCategoryFilterConfig = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { gender, productType, filterGroups, sizeProfile } = req.body;

    const config = await CategoryFilterConfig.findOneAndUpdate(
      { categorySlug: categorySlug.toLowerCase(), gender: gender || '' },
      {
        $set: {
          categorySlug: categorySlug.toLowerCase(),
          gender: gender || '',
          productType: productType || 'clothing',
          filterGroups: filterGroups || [],
          sizeProfile: sizeProfile || undefined,
          isEnabled: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: config });
  } catch (e) {
    console.error('setCategoryFilterConfig error:', e);
    return res.status(500).json({ success: false, message: 'Failed to save filter config' });
  }
};

/** GET /api/v1/filters/configs — List all category filter configs */
export const getAllCategoryFilterConfigs = async (req, res) => {
  try {
    const configs = await CategoryFilterConfig.find({ isEnabled: true })
      .populate('filterGroups.filterGroup', 'name slug type')
      .sort({ categorySlug: 1 })
      .lean();

    return res.json({ success: true, data: configs });
  } catch (e) {
    console.error('getAllCategoryFilterConfigs error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load configs' });
  }
};

// ============================================================
// FACETED SEARCH — The core of the filtering system
// ============================================================

/**
 * GET /api/v1/products/facets
 *
 * Returns faceted counts for all relevant filters based on the current query context.
 * This powers the filter sidebar — showing how many products match each filter value.
 *
 * Query params: gender, categorySlug, search, brand, minPrice, maxPrice, ...
 */
export const getFacets = async (req, res) => {
  try {
    const { gender, categorySlug, search } = req.query;

    // Build base match for scoping
    const baseMatch = { status: { $ne: 'archived' } };
    if (gender && gender !== 'all') baseMatch.gender = gender;
    if (categorySlug) baseMatch.categorySlug = categorySlug.toLowerCase();
    if (search && String(search).trim()) {
      const q = String(search).trim();
      baseMatch.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    // Run aggregation pipeline for all facets in parallel
    const [
      colorFacets,
      brandFacets,
      availabilityFacets,
      ratingFacets,
      sizeFacets,
      priceBounds,
      attributeFacets,
      totalCount,
      discountFacets
    ] = await Promise.all([
      // Colors — aggregate from variants.name and colors.name
      Product.aggregate([
        { $match: baseMatch },
        { $project: { allColors: { $concatArrays: [
          { $ifNull: ['$colors', []] },
          { $ifNull: ['$variants', []] }
        ] } } },
        { $unwind: '$allColors' },
        { $group: {
          _id: { $toLower: { $ifNull: ['$allColors.name', { $ifNull: ['$allColors.value', '$allColors.hex'] }] } },
          hex: { $first: { $ifNull: ['$allColors.hex', { $ifNull: ['$allColors.normalizedHex', '$allColors.value'] }] } },
          count: { $sum: 1 }
        } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),

      // Brands
      Product.aggregate([
        { $match: { ...baseMatch, brand: { $exists: true, $ne: '' } } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),

      // Availability
      Product.aggregate([
        { $match: baseMatch },
        { $group: { _id: { $ifNull: ['$availability', 'in-stock'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Ratings (4+, 3+, 2+, 1+)
      Product.aggregate([
        { $match: baseMatch },
        { $facet: {
          '4': [{ $match: { 'ratings.average': { $gte: 4 } } }, { $count: 'c' }],
          '3': [{ $match: { 'ratings.average': { $gte: 3 } } }, { $count: 'c' }],
          '2': [{ $match: { 'ratings.average': { $gte: 2 } } }, { $count: 'c' }],
          '1': [{ $match: { 'ratings.average': { $gte: 1 } } }, { $count: 'c' }],
        } }
      ]),

      // Sizes — combine availableSizes, sizes.value, variants.availableSizes
      Product.aggregate([
        { $match: baseMatch },
        { $project: { allSizes: { $concatArrays: [
          { $ifNull: ['$availableSizes', []] },
          { $map: { input: { $ifNull: ['$sizes', []] }, as: 's', in: { $ifNull: ['$$s.value', '$$s'] } } }
        ] } } },
        { $unwind: '$allSizes' },
        { $group: { _id: '$allSizes', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { _id: 1 } }
      ]),

      // Price bounds
      Product.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
      ]),

      // Dynamic attributes — get distinct values for each attribute key
      Product.aggregate([
        { $match: { ...baseMatch, attributes: { $exists: true } } },
        { $project: { attrs: { $objectToArray: { $ifNull: ['$attributes', {}] } } } },
        { $unwind: '$attrs' },
        { $unwind: '$attrs.v' },
        { $group: { _id: { key: '$attrs.k', value: '$attrs.v' }, count: { $sum: 1 } } },
        { $group: { _id: '$_id.key', values: { $push: { value: '$_id.value', count: '$count' } } } },
        { $sort: { _id: 1 } }
      ]),

      // Total product count
      Product.countDocuments(baseMatch),

      // Discount distribution
      Product.aggregate([
        { $match: { ...baseMatch, originalPrice: { $exists: true, $gt: 0 } } },
        { $project: { discPct: { $multiply: [{ $divide: [{ $subtract: ['$originalPrice', '$price'] }, '$originalPrice'] }, 100] } } },
        { $match: { discPct: { $gt: 0 } } },
        { $facet: {
          '10': [{ $match: { discPct: { $gte: 10 } } }, { $count: 'c' }],
          '20': [{ $match: { discPct: { $gte: 20 } } }, { $count: 'c' }],
          '30': [{ $match: { discPct: { $gte: 30 } } }, { $count: 'c' }],
          '40': [{ $match: { discPct: { $gte: 40 } } }, { $count: 'c' }],
          '50': [{ $match: { discPct: { $gte: 50 } } }, { $count: 'c' }],
          '60': [{ $match: { discPct: { $gte: 60 } } }, { $count: 'c' }],
        } }
      ])
    ]);

    // Format rating facets
    const ratingData = ratingFacets[0] || {};
    const ratings = {};
    for (const [key, arr] of Object.entries(ratingData)) {
      ratings[key] = arr[0]?.c || 0;
    }

    // Format discount facets
    const discountData = discountFacets[0] || {};
    const discounts = {};
    for (const [key, arr] of Object.entries(discountData)) {
      discounts[key] = arr[0]?.c || 0;
    }

    // Format attribute facets
    const attributes = {};
    for (const attrGroup of attributeFacets) {
      attributes[attrGroup._id] = attrGroup.values.sort((a, b) => b.count - a.count);
    }

    return res.json({
      success: true,
      data: {
        facets: {
          color: colorFacets.map(c => ({ value: c._id, hex: c.hex || '', count: c.count })),
          brand: brandFacets.map(b => ({ value: b._id, count: b.count })),
          availability: availabilityFacets.map(a => ({ value: a._id, count: a.count })),
          rating: ratings,
          size: sizeFacets.map(s => ({ value: s._id, count: s.count })),
          discount: discounts,
          ...attributes
        },
        priceRange: priceBounds[0] ? { min: priceBounds[0].min || 0, max: priceBounds[0].max || 0 } : { min: 0, max: 0 },
        totalProducts: totalCount
      }
    });
  } catch (e) {
    console.error('getFacets error:', e);
    return res.status(500).json({ success: false, message: 'Failed to compute facets' });
  }
};
