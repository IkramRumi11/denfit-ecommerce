import React, { useState, useEffect } from 'react';
import parseColor from '../../utils/color';
import { getColorName, resolveColorHex } from '../../utils/colorNames';
import { useNavigate } from 'react-router-dom';
import { api, filtersAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, Save, X, Upload, Image as ImageIcon, Trash2, Plus, Package } from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { CategorySelector } from '../../components/admin/CategorySelector';
import { BrandSelector } from '../../components/admin/BrandSelector';
import { Specifications } from '../../components/admin/Specifications';
import { SEOFields } from '../../components/admin/SEOFields';
import { StockMatrix } from '../../components/admin/StockMatrix';
import { VariantEditor } from '../../components/admin/VariantEditor';
import { useCategoryConfigs } from '../../hooks/useCategoryConfigs';

const AdminProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<any>({
    name: '',
    brand: 'DENFiT',
    description: '',
    price: '',
    originalPrice: '',
    category: 'men',
    subcategory: '',
    inventory: '',
    inStock: true,
    featured: false,
    trending: false,
    images: [],
    // sizes stored as objects: { id, value, inStock, quantity }
    sizes: [],
    // stock entries: { colorTempId, sizeId, quantity }
    stock: [],
    colors: [],
    tags: [],
    relatedProducts: [],
    specifications: {
      material: '',
      care: '',
      fit: '',
      origin: '',
    },
    
    seo: {
      title: '',
      description: '',
      slug: '',
    },
    sku: '',
    status: 'published',
    sizeGuide: { image: '', description: '', tableHtml: '' },
  });

  // Variant files storage: keyed by color tempId
  const [variantFiles, setVariantFiles] = useState<Record<string, { swatch?: File | null; images: File[] }>>({});
  const [existingVariantImages, setExistingVariantImages] = useState<Record<string, Array<any>>>({});

  const sanitizePreview = (html: string) => {
    if (!html) return '';
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  };
  // Defensive parse for values that may be JSON strings
  const safeParse = (v: any) => {
    if (v == null) return v;
    if (typeof v !== 'string') return v;
    let s = v.trim();
    for (let i = 0; i < 5; i++) {
      try {
        const parsed = JSON.parse(s);
        if (typeof parsed === 'string') { s = parsed; continue; }
        return parsed;
      } catch (e) {
        try {
          const cleaned = s.replace(/`/g, '').trim();
          if (/^[[{].*[\]}]$/.test(cleaned)) {
            const parsed = JSON.parse(cleaned.replace(/'/g, '"'));
            if (typeof parsed === 'string') { s = parsed; continue; }
            return parsed;
          }
        } catch (e2) {}
        break;
      }
    }
    return v;
  };
  
  // Dynamic categories and attributes driven by useCategoryConfigs hook
  const {
    availableSubcategories,
    dynamicFilterGroups,
    dynamicAttributes,
    setDynamicAttributes
  } = useCategoryConfigs(
    form.category,
    form.subcategory,
    form.attributes,
    (cleaned) => setForm((s: any) => ({ ...s, attributes: cleaned }))
  );

  const toggleAttribute = (groupSlug: string, value: string) => {
    setDynamicAttributes((prev) => {
      const current = prev[groupSlug] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [groupSlug]: next };
    });
  };

  // Form field change handler
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name.startsWith('specifications.')) {
      const field = name.split('.')[1];
      setForm((s: any) => ({
        ...s,
        specifications: { ...s.specifications, [field]: value },
      }));
    } else if (name.startsWith('seo.')) {
      const field = name.split('.')[1];
      setForm((s: any) => ({
        ...s,
        seo: { ...s.seo, [field]: value },
      }));
    } else {
      // For number inputs, allow clearing the field without producing NaN by keeping empty string
      if (type === 'number') {
        const parsed = value === '' ? '' : Number(value);
        setForm((s: any) => ({ ...s, [name]: parsed }));
      } else {
        setForm((s: any) => ({
          ...s,
          [name]: type === 'checkbox' ? checked : value,
        }));
      }
    }
  };

  // Main product image upload
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    if (form.colors && form.colors.length > 0) {
      showToast('This product has color variants. You can upload images per color or upload general product images.', 'info');
    }

    setSaving(true);
    try {
      const res = await api.admin.uploadFiles(files);
      if (res?.data?.files) {
        setForm((s: any) => ({
          ...s,
          images: [...(s.images || []), ...res.data.files.map((file: any, idx: number) => ({
            ...file,
            isPrimary: s.images.length === 0 && idx === 0,
            order: s.images.length + idx
          }))],
        }));
        showToast('Images uploaded successfully', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to upload images', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Size guide image upload
  const onSizeGuideImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    setSaving(true);
    try {
      const res = await api.admin.uploadFiles(files);
      if (res?.data?.files && res.data.files[0]) {
        const url = res.data.files[0].url;
        setForm((s: any) => ({ ...s, sizeGuide: { ...(s.sizeGuide || {}), image: url } }));
        showToast('Size guide image uploaded', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to upload size guide image', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Main product image management
  const removeImage = (idx: number) => {
    setForm((s: any) => {
      const images = [...(s.images || [])];
      images.splice(idx, 1);
      // Reorder and ensure one image is primary
      images.forEach((img: any, i: number) => {
        img.order = i;
        img.isPrimary = i === 0 && !images.some((im: any) => im.isPrimary);
      });
      return { ...s, images };
    });
  };

  const setPrimary = (idx: number) => {
    setForm((s: any) => {
      const images = [...(s.images || [])];
      images.forEach((img: any, i: number) => {
        img.isPrimary = i === idx;
      });
      return { ...s, images };
    });
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setForm((s: any) => {
      const images = [...(s.images || [])];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= images.length) return s;
      const tmp = images[newIdx];
      images[newIdx] = images[idx];
      images[idx] = tmp;
      images.forEach((img: any, i: number) => {
        img.order = i;
      });
      return { ...s, images };
    });
  };

  // Size management: sizes are objects to support stock and quantity
  const addSize = () => {
    const id = `size_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    setForm((s: any) => ({
      ...s,
      sizes: [...(s.sizes || []), { id, value: '', inStock: true, quantity: null, quantityManual: false }],
    }));
  };

  const updateSizeValue = (idx: number, value: string) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      const cur = typeof sizes[idx] === 'string' ? { id: `size_legacy_${idx}`, value: sizes[idx], inStock: true, quantity: null } : { ...sizes[idx] };
      cur.value = value;
      sizes[idx] = cur;
      return { ...s, sizes };
    });
  };

  const toggleSizeStock = (idx: number) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      const cur = typeof sizes[idx] === 'string' ? { id: `size_legacy_${idx}`, value: sizes[idx], inStock: true, quantity: null } : { ...sizes[idx] };
      cur.inStock = !cur.inStock;
      sizes[idx] = cur;
      return { ...s, sizes };
    });
  };

  const updateSizeQuantity = (idx: number, quantity: number | null) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      const cur = typeof sizes[idx] === 'string' ? { id: `size_legacy_${idx}`, value: sizes[idx], inStock: true, quantity: null, quantityManual: false } : { ...sizes[idx] };
      cur.quantity = quantity;
      // Mark as manually set when admin explicitly enters a value, clear manual flag when cleared
      cur.quantityManual = quantity !== null && quantity !== undefined;
      sizes[idx] = cur;
      const next = { ...s, sizes };

      // If colors exist, ensure stock entries exist for each color+size (but do NOT overwrite existing values)
      if (Array.isArray(next.colors) && next.colors.length > 0) {
        const stock = [...(s.stock || [])];
        next.colors.forEach((c: any) => {
          const cid = c.tempId;
          const si = stock.findIndex((st: any) => st.colorTempId === cid && st.sizeId === cur.id);
          if (quantity === null || quantity === undefined) {
            // Size total was cleared — remove stock entries for this size
            if (si >= 0) stock.splice(si, 1);
          } else {
            // Only create a zero-initialized entry if one doesn't exist yet
            if (si < 0) {
              stock.push({ colorTempId: cid, sizeId: cur.id, quantity: 0 });
            }
            // Do NOT overwrite existing per-color quantities — the manual total is a cap, not an assignment
          }
        });
        next.stock = stock;
      }

      return next;
    });
  };

  const setStockQuantity = (colorTempId: string, sizeId: string, quantity: number | null) => {
    setForm((s: any) => {
      const stock = Array.isArray(s.stock) ? [...s.stock] : [];
      const idx = stock.findIndex((st: any) => String(st.colorTempId) === String(colorTempId) && String(st.sizeId) === String(sizeId));
      if (quantity === null || quantity === undefined) {
        if (idx >= 0) stock.splice(idx, 1);
      } else {
        if (idx >= 0) stock[idx].quantity = quantity;
        else stock.push({ colorTempId, sizeId, quantity });
      }
      // deterministic ordering
      stock.sort((a: any, b: any) => {
        if (String(a.colorTempId) === String(b.colorTempId)) return String(a.sizeId).localeCompare(String(b.sizeId));
        return String(a.colorTempId).localeCompare(String(b.colorTempId));
      });

      // Auto-calculate size total from color quantities when the size total is NOT manually set
      const sizes = [...(s.sizes || [])];
      const sizeIdx = sizes.findIndex((sz: any) => {
        const szId = typeof sz === 'string' ? `size_legacy_${sizes.indexOf(sz)}` : sz.id;
        return String(szId) === String(sizeId);
      });
      if (sizeIdx >= 0) {
        const sz = typeof sizes[sizeIdx] === 'string'
          ? { id: `size_legacy_${sizeIdx}`, value: sizes[sizeIdx], inStock: true, quantity: null, quantityManual: false }
          : { ...sizes[sizeIdx] };
        if (!sz.quantityManual) {
          // Auto-calculate: sum all color quantities for this size
          const szId = sz.id;
          const colorSum = stock
            .filter((st: any) => String(st.sizeId) === String(szId))
            .reduce((sum: number, st: any) => sum + (Number(st.quantity) || 0), 0);
          sz.quantity = colorSum > 0 ? colorSum : null;
          sizes[sizeIdx] = sz;
        }
      }

      return { ...s, stock, sizes };
    });
  };

  const removeSize = (idx: number) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      const removedSize = sizes[idx];
      const removedId = removedSize?.id || (typeof removedSize === 'string' ? `size_legacy_${idx}` : null);
      sizes.splice(idx, 1);
      const stock = (s.stock || []).filter((st: any) => String(st.sizeId) !== String(removedId));
      return { ...s, sizes, stock };
    });
  };

  // Color variant management
  const addColor = () => {
    const tempId = `color_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    setForm((s: any) => ({
      ...s,
      colors: [...(s.colors || []), { 
        name: '', 
        value: '', 
        hex: '', 
        tempId,
        images: [] // Will be populated from variantFiles
      }],
    }));
  };

  const onVariantSwatchChange = (tempId: string, file?: File | null) => {
    setVariantFiles(v => ({ 
      ...v, 
      [tempId]: { 
        ...(v[tempId] || { images: [] }), 
        swatch: file || null 
      } 
    }));
  };

  const onVariantImagesChange = (tempId: string, files: FileList | null) => {
    const arr = files ? Array.from(files) : [];
    setVariantFiles(v => ({ 
      ...v, 
      [tempId]: { 
        ...(v[tempId] || { swatch: null }), 
        images: [...(v[tempId]?.images || []), ...arr].slice(0, 20) // Limit to 20 images
      } 
    }));
  };

  const removeVariantLocalImage = (tempId: string, imgIdx: number) => {
    setVariantFiles(v => {
      const copy = { ...(v[tempId] || { images: [] }) };
      copy.images = (copy.images || []).slice();
      copy.images.splice(imgIdx, 1);
      return { ...v, [tempId]: copy };
    });
  };

  const updateColor = (idx: number, field: string, value: string) => {
    setForm((s: any) => {
      const colors = [...(s.colors || [])];
      const cur = { ...colors[idx] };
      const normalized = typeof value === 'string' ? value.trim() : value;
      cur[field] = normalized;
      
      // Auto-fill hex if name is entered
      if (field === 'name') {
        try {
          if (normalized.startsWith('#')) {
            cur.name = getColorName(normalized);
            const resolved = resolveColorHex(cur.name) || normalized;
            cur.value = resolved;
            cur.hex = resolved;
          } else {
            const resolved = resolveColorHex(normalized);
            if (resolved) {
              cur.value = resolved;
              cur.hex = resolved;
            }
          }
        } catch (e) {}
      }

      // Update hex value when color value changes
      if (field === 'value' || field === 'hex') {
        cur.value = value;
        try {
          const res = parseColor(normalized as string);
          if (res.valid && res.hex) cur.hex = res.hex;
        } catch (e) {
          // ignore parse errors
        }
        // Only auto-fill friendly name if admin did not provide an explicit name or entered a hex code as name
        if (!cur.name || cur.name.startsWith('#')) {
          try {
            const friendly = getColorName(cur.hex || cur.value);
            if (friendly) cur.name = friendly;
          } catch (e) {}
        }
      }
      colors[idx] = cur;
      return { ...s, colors };
    });
  };

  const removeColor = (idx: number) => {
    setForm((s: any) => {
      const colors = [...(s.colors || [])];
      const tempId = colors[idx]?.tempId;
      colors.splice(idx, 1);
      
      // Also remove associated variant files
      if (tempId) {
        setVariantFiles(v => {
          const copy = { ...v };
          delete copy[tempId];
          return copy;
        });
        // Remove any existing uploaded variant images for this color
        setExistingVariantImages(ev => {
          const copy = { ...(ev || {}) };
          delete copy[tempId];
          return copy;
        });
      }
      
      const stock = (s.stock || []).filter((st: any) => String(st.colorTempId) !== String(tempId));
      return { ...s, colors, stock };
    });
  };

  // Tags management
  const addTag = () => {
    setForm((s: any) => ({
      ...s,
      tags: [...(s.tags || []), ''],
    }));
  };

  const updateTag = (idx: number, value: string) => {
    setForm((s: any) => {
      const tags = [...(s.tags || [])];
      tags[idx] = value;
      return { ...s, tags: tags.filter((t: string) => t.trim() !== '') };
    });
  };

  const removeTag = (idx: number) => {
    setForm((s: any) => {
      const tags = [...(s.tags || [])];
      tags.splice(idx, 1);
      return { ...s, tags };
    });
  };

  // Related products (admin can paste comma-separated product IDs or slugs)
  const [relatedInput, setRelatedInput] = useState('');
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  // Recommendation mappings (admin-managed cross-category rules)
  const [mappings, setMappings] = useState<any[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [mapTargetCategory, setMapTargetCategory] = useState<string>('');
  const [mapTargetSubcategory, setMapTargetSubcategory] = useState<string>('');
  const updateRelatedFromInput = () => {
    if (!relatedInput || !relatedInput.trim()) {
      setForm((s: any) => ({ ...s, relatedProducts: [] }));
      showToast('Related products cleared', 'info');
      return;
    }

    const tokens: string[] = [];
    const raw = relatedInput.trim();

    // 1. Check for 24-character hex ObjectIds anywhere in the input
    const hexMatches = raw.match(/[a-fA-F0-9]{24}/g);
    if (hexMatches && hexMatches.length > 0) {
      hexMatches.forEach(id => tokens.push(id));
    } else {
      // 2. Otherwise split by commas/newlines and clean tokens (for SKUs/slugs)
      raw.split(/[\n,]+/).forEach(part => {
        const cleaned = part.replace(/^[`'"\[\]{}]+|[`'"\[\]{}]+$/g, '').trim();
        if (cleaned) tokens.push(cleaned);
      });
    }

    const uniqueVals = Array.from(new Set(tokens)).slice(0, 20);
    setForm((s: any) => ({ ...s, relatedProducts: uniqueVals }));
    setRelatedInput(uniqueVals.join(', '));
    showToast(`Updated ${uniqueVals.length} related product(s)`, 'success');
  };

  // Auto-fetch suggestions when category/subcategory/tags change and autoSuggestEnabled
  useEffect(() => {
    const should = autoSuggestEnabled && form.category && form.subcategory;
    if (!should) return;
    let mounted = true;
    setLoadingSuggestions(true);
    (async () => {
      try {
        const res = await api.admin.suggestRelatedProducts({
          section: form.category,
          category: form.subcategory,
          tags: (form.tags || []).join(','),
          limit: 8
        });
        if (!mounted) return;
        setSuggestedProducts(res?.data?.suggestions || []);
      } catch (e) {
        // ignore suggestion errors
      } finally {
        if (mounted) setLoadingSuggestions(false);
      }
    })();
    return () => { mounted = false; };
  }, [form.category, form.subcategory, form.tags, autoSuggestEnabled]);

  // Load recommendation mappings for cross-category hints
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingMappings(true);
        const res = await api.admin.getRecommendationMappings();
        if (!mounted) return;
        setMappings(res?.data?.mappings || []);
      } catch (e) {
        console.error('mappings fetch failed', e);
      } finally {
        if (mounted) setLoadingMappings(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.name || !form.description || !form.price) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Require at least one image overall: either general product images or per-color variant images
    const anyGeneral = (form.images && form.images.length > 0);
    const anyPerColor = (Object.keys(variantFiles || {}).length > 0 && Object.values(variantFiles).some((p: any) => (p.images || []).length > 0)) ||
                        (Object.keys(existingVariantImages || {}).length > 0 && Object.values(existingVariantImages).some((arr:any) => (arr || []).length > 0));
    if (!anyGeneral && !anyPerColor) {
      showToast('Please upload at least one product image (either general images or images under color variants)', 'error');
      return;
    }

    // Clean up variantFiles and existingVariantImages for removed colors
    if (form.colors && form.colors.length > 0) {
      const colorTempIds = new Set((form.colors || []).map((c: any) => c.tempId));
      Object.keys(variantFiles).forEach(k => {
        if (!colorTempIds.has(k)) delete variantFiles[k];
      });
      Object.keys(existingVariantImages).forEach(k => {
        if (!colorTempIds.has(k)) delete existingVariantImages[k];
      });
    }

    setSaving(true);
    try {
      // Ensure at least one image is primary
      if (form.images.length > 0 && !form.images.some((img: any) => img.isPrimary)) {
        form.images[0].isPrimary = true;
      }

      // Compute total canonical inventory
      let totalInventory = 0;
      if (form.colors && form.colors.length > 0) {
        totalInventory = (form.stock || []).reduce((sum: number, st: any) => sum + (Number(st.quantity) || 0), 0);
      } else if (form.sizes && form.sizes.length > 0 && form.sizes.some((s: any) => s && s.quantity !== null && s.quantity !== undefined && !Number.isNaN(Number(s.quantity)))) {
        totalInventory = (form.sizes || []).reduce((sum: number, s: any) => sum + (Number(s?.quantity) || 0), 0);
      } else {
        totalInventory = Number(form.inventory) || 0;
      }

      // Prepare form data
      const fd = new FormData();
      
      // Add all form fields except sizes and inventory
      Object.entries(form).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (k === 'sizes') return; // handle below
        if (k === 'inventory') {
          fd.append('inventory', String(totalInventory));
          return;
        }
        if (k === 'attributes') {
          fd.append(k, JSON.stringify(v));
          return;
        }
        if (typeof v === 'object') {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, String(v));
        }
      });

      // Build variants payload for ALL colors so backend can map files -> variants consistently.
      // Each variant entry will list existing image URLs and placeholders for files that will be included in the FormData.
      if (form.colors && form.colors.length > 0) {
          const variantsPayload = (form.colors || []).map((c: any) => {
          const tid = c.tempId;
          const existing = (existingVariantImages[tid] || []).map((im: any) => {
            const parsed = safeParse(im);
            return (parsed && (parsed.url || parsed)) || parsed;
          });
          const localFiles = (variantFiles[tid]?.images || []).map((f: File, idx: number) => {
            // placeholder string that backend can recognize and map to the uploaded file keys
            return `__file__variantImages_${tid}_${idx}`;
          });
          const swatchExisting = c.swatchImage?.url || c.swatchImage || undefined;
          const swatchLocal = variantFiles[tid]?.swatch ? `__file__variantSwatch_${tid}` : undefined;

          return {
            tempId: tid,
            name: c.name,
            hex: c.hex || c.value || '',
            images: [...existing, ...localFiles],
            swatchImage: swatchExisting || swatchLocal || undefined,
          };
        });

        fd.append('variants', JSON.stringify(variantsPayload));
      }

      // Add variant files (local) - swatches and images
      Object.entries(variantFiles).forEach(([tempId, payload]) => {
        if (payload.swatch) {
          fd.append(`variantSwatch_${tempId}`, payload.swatch as File);
        }
        (payload.images || []).forEach((f, idx) => {
          fd.append(`variantImages_${tempId}_${idx}`, f);
        });
      });

      // Normalize sizes: support legacy string arrays and new object arrays
      // Strip UI-only quantityManual flag before sending to backend
      const sizesPayload = (form.sizes || []).map((s: any, idx: number) => {
        if (!s) return null;
        if (typeof s === 'string') {
          return { id: `size_legacy_${idx}`, value: s, inStock: true, quantity: null };
        }
        // ensure required fields exist, strip quantityManual (UI-only)
        return {
          id: s.id || `size_${idx}`,
          value: s.value ?? '',
          inStock: typeof s.inStock === 'boolean' ? s.inStock : true,
          quantity: (s.quantity != null && !Number.isNaN(Number(s.quantity))) ? Number(s.quantity) : (s.qty != null && !Number.isNaN(Number(s.qty)) ? Number(s.qty) : null),
        };
      }).filter(Boolean);
      fd.append('sizes', JSON.stringify(sizesPayload));
      // stock is part of `form` and will be appended by the generic loop

      // Include admin-managed related products if provided
      if (form.relatedProducts && form.relatedProducts.length > 0) {
        const cleanRelated = form.relatedProducts
          .map((r: any) => (typeof r === 'object' && r ? String(r._id || r.id || '') : String(r).trim()))
          .filter(Boolean);
        if (cleanRelated.length > 0) {
          fd.append('relatedProducts', JSON.stringify(cleanRelated));
        }
      }

      // Submit to API
      await api.admin.createProduct(fd);
      showToast('Product created successfully', 'success');
      navigate('/admin/products');
      
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to create product', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/products')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
            <p className="text-gray-600 mt-1">Add a new product to your catalog</p>
          </div>
        </div>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Creating...' : 'Create Product'}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                      Price (PKR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="price"
                      type="number"
                      name="price"
                      value={form.price ?? ''}
                      onChange={onChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price (PKR)
                    </label>
                    <input
                      id="originalPrice"
                      type="number"
                      name="originalPrice"
                      value={form.originalPrice ?? ''}
                      onChange={onChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                  <input
                    id="sku"
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={onChange}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {/* Mapping management UI */}
              <div className="mt-3 mb-3 p-3 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Cross-category mappings</div>
                  {loadingMappings && <div className="text-sm text-gray-500">Loading mappings...</div>}
                </div>
                <div className="flex gap-2 items-center mb-2">
                  <input value={mapTargetCategory} onChange={(e) => setMapTargetCategory(e.target.value)} placeholder="Target category (e.g., men)" className="px-3 py-1 border rounded w-1/3" />
                  <input value={mapTargetSubcategory} onChange={(e) => setMapTargetSubcategory(e.target.value)} placeholder="Target subcategory (e.g., Belts)" className="px-3 py-1 border rounded w-1/3" />
                  <button type="button" onClick={async () => {
                    if (!form.category || !form.subcategory || !mapTargetCategory || !mapTargetSubcategory) return showToast('Complete mapping fields', 'error');
                    try {
                      await api.admin.createRecommendationMapping({ from: { category: form.category, subcategory: form.subcategory }, to: [{ category: mapTargetCategory, subcategory: mapTargetSubcategory, weight: 1 }] });
                      showToast('Mapping created', 'success');
                      setMapTargetCategory(''); setMapTargetSubcategory('');
                      const res = await api.admin.getRecommendationMappings({ category: form.category, subcategory: form.subcategory });
                      setMappings(res?.data?.mappings || []);
                      const sres = await api.admin.suggestRelatedProducts({ section: form.category, subcategory: form.subcategory, tags: (form.tags||[]).join(','), limit: 30, price: form.price });
                      setSuggestedProducts(sres?.data?.products || []);
                    } catch (e:any) {
                      console.error('create mapping failed', e);
                      showToast(e?.message || 'Failed to create mapping', 'error');
                    }
                  }} className="px-3 py-1 bg-green-600 text-white rounded">Add Mapping</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(mappings || []).map((m: any) => (
                    <div key={m._id} className="px-3 py-1 bg-gray-50 rounded border flex items-center gap-2">
                      <div className="text-sm">→ {m.to.map((t:any)=> `${t.subcategory || ''} (${t.category||''})`).join(', ')}</div>
                      <button type="button" onClick={async () => {
                        try {
                          await api.admin.deleteRecommendationMapping(m._id);
                          setMappings(ms => ms.filter((x:any) => x._id !== m._id));
                          showToast('Mapping deleted', 'success');
                        } catch (e:any) {
                          showToast(e?.message || 'Failed to delete mapping', 'error');
                        }
                      }} className="text-xs text-red-600">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category & Classification */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Category & Classification</h2>
              <div className="space-y-4">
                <BrandSelector
                  value={form.brand || ''}
                  onChange={(val) => setForm((s: any) => ({ ...s, brand: val }))}
                />

                <CategorySelector
                  category={form.category}
                  subcategory={form.subcategory}
                  availableSubcategories={availableSubcategories}
                  dynamicFilterGroups={dynamicFilterGroups}
                  dynamicAttributes={dynamicAttributes}
                  onCategoryChange={(val) => setForm((s: any) => ({ ...s, category: val, subcategory: '' }))}
                  onSubcategoryChange={(val) => setForm((s: any) => ({ ...s, subcategory: val }))}
                  onToggleAttribute={toggleAttribute}
                />

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    id="status" 
                    name="status" 
                    value={form.status} 
                    onChange={onChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={form.featured}
                      onChange={onChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured Product</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="trending"
                      checked={form.trending}
                      onChange={onChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Trending Product</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Inventory & Stock */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory & Stock</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="inventory" className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  {form.colors && form.colors.length > 0 ? (
                    <div className="space-y-1">
                      <input
                        id="inventory"
                        type="number"
                        name="inventory"
                        value={(form.stock || []).reduce((sum: number, st: any) => sum + (Number(st.quantity) || 0), 0)}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 italic mt-1">
                        (Read Only) Automatically calculated from color variant stock matrix.
                      </p>
                    </div>
                  ) : (
                    <input
                      id="inventory"
                      type="number"
                      name="inventory"
                      value={form.inventory ?? ''}
                      onChange={onChange}
                      required
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={form.inStock}
                    onChange={onChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">In Stock</span>
                </label>
              </div>
            </div>

            {/* Size Guide */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Size Guide</h2>
              <div className="space-y-4">
                <div className="flex gap-6 items-start">
                  <div className="w-48">
                    {form.sizeGuide?.image ? (
                      <div className="border rounded overflow-hidden bg-gray-50">
                        <img src={form.sizeGuide.image} alt="Size guide" className="object-contain w-full h-48" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                        <div className="text-sm text-gray-400">No image uploaded</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <ImageUpload
                      onImageSelect={(url) => {
                        setForm((s: any) => ({
                          ...s,
                          sizeGuide: { ...(s.sizeGuide || {}), image: url },
                        }));
                      }}
                      currentImage={form.sizeGuide?.image}
                      onRemove={() => {
                        setForm((s: any) => ({
                          ...s,
                          sizeGuide: { ...(s.sizeGuide || {}), image: '' },
                        }));
                      }}
                      label="Upload Size Guide Image"
                    />
                    <div className="mt-4">
                      <label htmlFor="sizeGuideDescription" className="block text-sm font-medium text-gray-700 mb-2">Size Guide Description</label>
                      <textarea
                        name="sizeGuide.description"
                        id="sizeGuideDescription"
                        value={form.sizeGuide?.description || ''}
                        onChange={(e) => setForm((s: any) => ({ ...s, sizeGuide: { ...(s.sizeGuide || {}), description: e.target.value } }))}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="mt-4">
                      <label htmlFor="sizeGuideTableHtml" className="block text-sm font-medium text-gray-700 mb-2">Size Guide Table HTML (optional)</label>
                      <textarea
                        name="sizeGuide.tableHtml"
                        id="sizeGuideTableHtml"
                        value={form.sizeGuide?.tableHtml || ''}
                        onChange={(e) => setForm((s: any) => ({ ...s, sizeGuide: { ...(s.sizeGuide || {}), tableHtml: e.target.value } }))}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Paste an HTML table or plain text here"
                      />
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                          <div
                            className="border rounded p-3 bg-white"
                            style={{ minHeight: '80px' }}
                            dangerouslySetInnerHTML={{ __html: sanitizePreview(form.sizeGuide?.tableHtml || '') }}
                          />
                          <p className="text-xs text-gray-500 mt-2">Preview strips &lt;script&gt; tags for safety.</p>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <Specifications
              material={form.specifications.material}
              care={form.specifications.care}
              fit={form.specifications.fit}
              origin={form.specifications.origin}
              onChange={(field, val) => setForm((s: any) => ({ ...s, specifications: { ...s.specifications, [field]: val } }))}
            />

            {/* SEO */}
            <SEOFields
              title={form.seo.title}
              description={form.seo.description}
              slug={form.seo.slug}
              onChange={(field, val) => setForm((s: any) => ({ ...s, seo: { ...s.seo, [field]: val } }))}
            />
          </div>

          {/* Right Column - Images, Variants & Ratings */}
          <div className="space-y-6">
            {/* Main Product Images */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Images</h2>
              <div className="space-y-4">
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-2">
                    Add Images <span className="text-red-500">*</span>
                  </p>
                  {form.colors && form.colors.length > 0 ? (
                    <div className="p-4 border rounded-lg bg-gray-50 text-sm text-gray-600">
                      This product has color variants. Upload images per color under each variant section below. General product images are disabled to avoid orphaned images.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {form.images.map((img: any, idx: number) => (
                          <div key={idx} className="relative group">
                            <img
                              src={img.url || img}
                              alt={`Product ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                            />
                            {img.isPrimary && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                Primary
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPrimary(idx)}
                                className="p-2 bg-white rounded hover:bg-gray-100 transition-colors"
                                title="Set as primary"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(idx, -1)}
                                disabled={idx === 0}
                                className="p-2 bg-white rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                title="Move left"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(idx, 1)}
                                disabled={idx === form.images.length - 1}
                                className="p-2 bg-white rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                title="Move right"
                              >
                                →
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {form.images.length === 0 && (
                        <p className="text-sm text-gray-500 text-center mb-4">No images uploaded</p>
                      )}
                      <ImageUpload
                        onImageSelect={(url) => {
                          setForm((s: any) => ({
                            ...s,
                            images: [...(s.images || []), {
                              url,
                              isPrimary: s.images.length === 0,
                              order: s.images.length,
                            }],
                          }));
                        }}
                        label="Upload Images"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Color Variants */}
            <VariantEditor
              colors={form.colors}
              existingVariantImages={existingVariantImages}
              variantFiles={variantFiles}
              onAddColor={addColor}
              onRemoveColor={removeColor}
              onUpdateColor={updateColor}
              onExistingImageRemove={(tid, idx) => {
                setExistingVariantImages(m => {
                  const copy = { ...(m || {}) };
                  copy[tid] = (copy[tid] || []).slice();
                  copy[tid].splice(idx, 1);
                  return copy;
                });
                setForm((s: any) => ({ ...s, colors: (s.colors || []).map((cc: any) => cc.tempId === tid ? { ...cc, images: ((cc.images || []).slice()).filter((_, i) => i !== idx) } : cc) }));
              }}
              onExistingImageAdd={(tid, img) => {
                setExistingVariantImages(m => ({ ...(m || {}), [tid]: [...((m || {})[tid] || []), img] }));
                const imageEntry = img && (img.url || img.path || img) ? (img.url || img.path || img) : img;
                setForm((s: any) => ({ ...s, colors: (s.colors || []).map((cc: any) => cc.tempId === tid ? { ...cc, images: [...(cc.images || []), imageEntry] } : cc) }));
              }}
              onLocalImageRemove={(tid, idx) => removeVariantLocalImage(tid, idx)}
              onImagesAdded={(tid, files) => onVariantImagesChange(tid, files)}
              onSwatchAdded={(tid, file) => {
                onVariantSwatchChange(tid, file);
                if (!file) {
                  setForm((s: any) => ({ ...s, colors: (s.colors || []).map((cc: any) => cc.tempId === tid ? { ...cc, swatchImage: undefined } : cc) }));
                }
              }}
              onSwatchUrlAdd={(tid, url) => setForm((s: any) => ({ ...s, colors: (s.colors || []).map((cc: any) => cc.tempId === tid ? { ...cc, swatchImage: { url } } : cc) }))}
            />

            {/* Sizes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Sizes</h2>
                <button
                  type="button"
                  onClick={addSize}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Size
                </button>
              </div>
              <div className="space-y-2">
                {form.sizes.map((size: any, idx: number) => {
                  const s = typeof size === 'string' ? { id: `size_legacy_${idx}`, value: size, inStock: true, quantity: null } : size;
                  return (
                    <div key={s.id || idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.value || ''}
                        onChange={(e) => updateSizeValue(idx, e.target.value)}
                        placeholder="e.g., S, M, L, XL"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={!!s.inStock}
                            onChange={() => toggleSizeStock(idx)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs">In stock</span>
                        </label>
                        <input
                          type="number"
                          value={s.quantity ?? ''}
                          onChange={(e) => updateSizeQuantity(idx, e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="Qty"
                          min={0}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeSize(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {form.sizes.length === 0 && (
                  <p className="text-sm text-gray-500">No sizes added. Click "Add Size" to add one.</p>
                )}
              </div>
            </div>

            {/* Per-color size quantities */}
            <StockMatrix
              colors={form.colors}
              sizes={form.sizes}
              stock={form.stock}
              onChangeQuantity={setStockQuantity}
            />

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Tags</h2>
                <button
                  type="button"
                  onClick={addTag}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Tag
                </button>
              </div>
              <div className="space-y-2">
                {form.tags.map((tag: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => updateTag(idx, e.target.value)}
                      placeholder="e.g., summer, bestseller, new"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {form.tags.length === 0 && (
                  <p className="text-sm text-gray-500">No tags added. Click "Add Tag" to add one.</p>
                )}
              </div>
            </div>

            {/* Related Products (admin-managed recommendations) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Related Products</h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={autoSuggestEnabled} onChange={(e) => setAutoSuggestEnabled(e.target.checked)} className="rounded" />
                    <span>Auto-suggest</span>
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!form.category || !form.subcategory) return;
                      setLoadingSuggestions(true);
                      try {
                        const res = await api.admin.suggestRelatedProducts({
                          section: form.category,
                          subcategory: form.subcategory,
                          tags: (form.tags || []).join(','),
                          excludeId: undefined,
                          limit: 30,
                          price: form.price,
                          material: form.specifications?.material,
                          fit: form.specifications?.fit,
                          origin: form.specifications?.origin,
                        });
                        setSuggestedProducts(res?.data?.products || []);
                      } catch (e: any) {
                        showToast(e?.message || 'Failed to fetch suggestions', 'error');
                      } finally { setLoadingSuggestions(false); }
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-2">Select Category and Subcategory to see intelligent suggestions. You can add suggestions or paste IDs/slugs manually.</p>

              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={relatedInput}
                  onChange={(e) => setRelatedInput(e.target.value)}
                  placeholder="id1, id2, slug-3"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button type="button" onClick={updateRelatedFromInput} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
              </div>

              {!form.category || !form.subcategory ? (
                <div className="p-3 border rounded bg-yellow-50 text-sm text-yellow-800">Please select Category and Subcategory to enable suggestions.</div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-700">Suggestions (based on category, subcategory, tags)</div>
                      {loadingSuggestions && <div className="text-sm text-gray-500">Loading...</div>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(suggestedProducts || []).map((p: any) => {
                        const prodId = String(p._id);
                        const prodSku = String(p.sku || '');
                        const already = (form.relatedProducts || []).some((r: any) => {
                          const rid = typeof r === 'object' && r ? String(r._id || r.id) : String(r);
                          return rid === prodId || (prodSku && rid === prodSku);
                        });
                        const thumb = Array.isArray(p.images) && p.images.length ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].url) : '';
                        return (
                          <div key={p._id} className="flex items-center gap-3 p-2 border rounded">
                            <img src={thumb} alt={p.name} className="w-14 h-14 object-cover rounded" />
                            <div className="flex-1 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">Score: {p.score}</div>
                              </div>
                              <div className="text-xs text-gray-500">{p.subcategory} • {p.sku || ''}</div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProduct(p)}
                                  className="px-2 py-1 text-xs bg-white border rounded text-gray-700"
                                >Preview</button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm((s: any) => {
                                      const cur = Array.isArray(s.relatedProducts)
                                        ? s.relatedProducts.map((r: any) => typeof r === 'object' && r ? String(r._id || r.id) : String(r)).filter(Boolean)
                                        : [];
                                      if (!cur.includes(prodId)) cur.unshift(prodId);
                                      const next = Array.from(new Set(cur)).slice(0, 20);
                                      return { ...s, relatedProducts: next };
                                    });
                                    setRelatedInput(prev => {
                                      const parts = prev ? prev.split(',').map(x => x.trim()).filter(Boolean) : [];
                                      if (!parts.includes(prodId)) parts.unshift(prodId);
                                      return parts.join(', ');
                                    });
                                  }}
                                  className={`px-3 py-1 text-sm rounded ${already ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'}`}
                                >{already ? 'Added' : 'Add'}</button>
                              </div>
                              {already && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm((s: any) => ({
                                      ...s,
                                      relatedProducts: (s.relatedProducts || []).filter((r: any) => {
                                        const rid = typeof r === 'object' && r ? String(r._id || r.id) : String(r);
                                        return rid !== prodId && rid !== prodSku;
                                      })
                                    }));
                                    setRelatedInput(prev => {
                                      return prev.split(',').map(x => x.trim()).filter(x => x && x !== prodId && x !== prodSku).join(', ');
                                    });
                                  }}
                                  className="text-xs text-red-600"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {previewProduct && (
                    <div className="mt-4 p-4 border rounded bg-gray-50">
                      <div className="flex gap-4">
                        <div className="w-40">
                          <img src={(previewProduct.images && previewProduct.images[0] && (typeof previewProduct.images[0] === 'string' ? previewProduct.images[0] : previewProduct.images[0].url)) || ''} alt={previewProduct.name} className="w-full h-40 object-cover rounded" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{previewProduct.name}</h3>
                              <div className="text-sm text-gray-600">{previewProduct.subcategory} • {previewProduct.sku}</div>
                            </div>
                            <div className="text-lg font-medium">PKR {previewProduct.price}</div>
                          </div>
                          <p className="mt-2 text-sm text-gray-700 line-clamp-3">{previewProduct.description}</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const prodId = String(previewProduct._id);
                                setForm((s: any) => {
                                  const cur = Array.isArray(s.relatedProducts)
                                    ? s.relatedProducts.map((r: any) => typeof r === 'object' && r ? String(r._id || r.id) : String(r)).filter(Boolean)
                                    : [];
                                  if (!cur.includes(prodId)) cur.unshift(prodId);
                                  return { ...s, relatedProducts: Array.from(new Set(cur)).slice(0, 20) };
                                });
                                setRelatedInput(prev => {
                                  const parts = prev ? prev.split(',').map(x => x.trim()).filter(Boolean) : [];
                                  if (!parts.includes(prodId)) parts.unshift(prodId);
                                  return parts.join(', ');
                                });
                                setPreviewProduct(null);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              Add to Related
                            </button>
                            <button type="button" onClick={() => setPreviewProduct(null)} className="px-3 py-1 bg-white border rounded">Close</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {form.relatedProducts && form.relatedProducts.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {form.relatedProducts.map((r: any, i: number) => {
                        const rId = typeof r === 'object' && r ? String(r._id || r.id) : String(r);
                        const matched = (suggestedProducts || []).find((sp: any) => String(sp._id) === rId || String(sp.sku) === rId);
                        const label = matched ? `${matched.name} (${matched.sku || rId.slice(-6)})` : rId;
                        return (
                          <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-xs font-medium flex items-center gap-2">
                            <span>{label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setForm((s: any) => ({
                                  ...s,
                                  relatedProducts: (s.relatedProducts || []).filter((_: any, idx: number) => idx !== i)
                                }));
                                setRelatedInput(prev => {
                                  const parts = prev.split(',').map(x => x.trim()).filter(Boolean);
                                  return parts.filter(x => x !== rId).join(', ');
                                });
                              }}
                              className="text-blue-600 hover:text-red-600 font-bold ml-1 text-sm leading-none"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Ratings are derived from customer reviews; admins cannot set these manually. */}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductCreate;