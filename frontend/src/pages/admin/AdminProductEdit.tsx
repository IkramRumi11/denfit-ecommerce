import React, { useEffect, useState } from 'react';
import parseColor from '../../utils/color';
import { getColorName, resolveColorHex } from '../../utils/colorNames';
import { useParams, useNavigate } from 'react-router-dom';
import { getCategorySections, getSectionItems } from '../../data/megaMenuData';
import { api, filtersAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ArrowLeft, Save, X, Image as ImageIcon, Trash2, Plus, Package } from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { loadTemplates, saveTemplates, SizeGuideTemplate } from '../../data/sizeGuideTemplates';
import { CategorySelector } from '../../components/admin/CategorySelector';
import { Specifications } from '../../components/admin/Specifications';
import { SEOFields } from '../../components/admin/SEOFields';
import { StockMatrix } from '../../components/admin/StockMatrix';
import { VariantEditor } from '../../components/admin/VariantEditor';
import { useCategoryConfigs } from '../../hooks/useCategoryConfigs';

const AdminProductEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<any>({
    name: '',
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
    sizes: [],
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
    attributes: {},
  });

  // Variant files storage
  const [variantFiles, setVariantFiles] = useState<Record<string, { swatch?: File | null; images: File[] }>>({});
  const [existingVariantImages, setExistingVariantImages] = useState<Record<string, Array<any>>>({});

  const sanitizePreview = (html: string) => {
    if (!html) return '';
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  };

  const displayAvailableQuantity = (product: any) => {
    if (!product) return 0;
    if (typeof product.availableQuantity === 'number') return product.availableQuantity;
    if (typeof product.inventory === 'number') return product.inventory;
    if (Array.isArray(product.sizes)) return product.sizes.reduce((a: number, b: any) => a + (Number(b?.quantity) || 0), 0);
    if (Array.isArray(product.stock)) return product.stock.reduce((a: number, b: any) => a + (Number(b?.quantity) || 0), 0);
    return 0;
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

  // Related products input
  const [relatedInput, setRelatedInput] = useState('');
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(true);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [sizeGuideTemplates, setSizeGuideTemplates] = useState<SizeGuideTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  // Recommendation mappings (admin-managed cross-category rules)
  const [mappings, setMappings] = useState<any[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [mapTargetCategory, setMapTargetCategory] = useState<string>('');
  const [mapTargetSubcategory, setMapTargetSubcategory] = useState<string>('');

  // Load product data
  const loadProduct = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getProductById(id!);
      if (res?.data?.product) {
        const p = res.data.product;

        // Helper to defensively parse JSON-stringified fields from the API
        const safeParse = (v: any) => {
          if (v == null) return v;
          if (typeof v === 'string') {
            try { return JSON.parse(v); } catch (e) { return v; }
          }
          return v;
        };

        // Load filter config and attributes
        let resolvedGroups: any[] = [];
        let initAttrs: Record<string, string[]> = {};
        try {
          const configRes: any = await filtersAPI.getConfig(p.subcategory || '', p.category || p.gender || 'men');
          const configObj = configRes?.data || configRes;
          const groups = configObj?.filterGroups || configObj?.groups || [];
          resolvedGroups = groups.map((fg: any) => typeof fg.filterGroup === 'object' ? fg.filterGroup : fg).filter((g: any) => g && g.name);
          
          const existing = p.attributes || {};
          resolvedGroups.forEach((g: any) => {
            initAttrs[g.slug] = existing[g.slug] || [];
          });
        } catch (e) {
          console.error('Failed to pre-fetch filter config inside loadProduct:', e);
        }
        setDynamicFilterGroups(resolvedGroups);
        setDynamicAttributes(initAttrs);

        // Normalize product-level images
        let images: any[] = [];
        const parsedImages = safeParse(p.images);
        if (Array.isArray(parsedImages) && parsedImages.length) {
          images = parsedImages.map((img: any, idx: number) => 
            (typeof img === 'string' ? { 
              url: img, 
              isPrimary: idx === 0, 
              order: idx 
            } : { 
              ...img, 
              isPrimary: img.isPrimary || idx === 0,
              order: img.order || idx 
            })
          );
        } else if (p.image) {
          images = [{ url: p.image, isPrimary: true, order: 0 }];
        }

        // Normalize colors/variants
        let colors: any[] = [];
        const parsedVariants = safeParse(p.variants);
        const parsedColors = safeParse(p.colors);
        if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
          // Use variants if available
          colors = parsedVariants.map((v: any) => ({
              ...v,
              tempId: v.tempId || v._id || `color_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,
              name: v.name || '',
              value: v.hex || v.value || '',
              hex: v.hex || v.value || '',
              images: v.images || [],
              swatchImage: v.swatchImage || undefined,
            }));
        } else if (Array.isArray(parsedColors) && parsedColors.length > 0) {
          // Fallback to colors array
          colors = parsedColors.map((c: any) => ({
            ...c,
            tempId: c.tempId || `color_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,
            value: c.hex || c.value || '',
            hex: c.hex || c.value || '',
            images: c.images || [],
          }));
        }

        // Normalize sizes. Prefer full objects returned under `sizesObjects` (Product.toJSON transforms sizes into labels)
        const sizesSource = Array.isArray(p.sizesObjects) ? p.sizesObjects : safeParse(p.sizes);
        const parsedSizes = sizesSource;
        const sizes = Array.isArray(parsedSizes) ? parsedSizes.map((s: any, idx: number) => {
          if (typeof s === 'string') {
            return { 
              id: `size_legacy_${idx}`, 
              value: s, 
              inStock: true, 
              quantity: null, 
            };
          }
          return {
            id: s.id || `size_${idx}`,
            value: s.value || '',
            inStock: s.inStock ?? true,
            quantity: (s.quantity != null && !Number.isNaN(Number(s.quantity))) ? Number(s.quantity) : (s.qty != null && !Number.isNaN(Number(s.qty)) ? Number(s.qty) : null),
          };
        }) : [];

        // Map product.stock entries into UI-friendly stock entries that reference color tempIds and size ids
        const mapStockToUI = (rawStock: any[] = [], colorsArr: any[], sizesArr: any[]) => {
          const uiStock: any[] = [];
          const stockArr = (function normalizeRaw(raw:any){
            if (!raw) return [];
            if (typeof raw === 'string') {
              try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch(e){ return []; }
            }
            return Array.isArray(raw) ? raw : [];
          })(rawStock);
          const normalizeColor = (v: any) => (v == null ? '' : String(v).toLowerCase().trim().replace(/^#/, ''));
          stockArr.forEach((st: any) => {
            if (!st) return;
            // Determine colorTempId: prefer existing colorTempId, else map from colorId/_id
            let colorTempId = st.colorTempId || st.colorTemp || null;
            // If colorTempId exists but doesn't match any known tempId, try resolving it
            const resolveColorId = (rawId: any) => {
              if (!rawId) return null;
              // direct match by tempId/_id/id
              let f = colorsArr.find((c: any) => String(c.tempId) === String(rawId) || String(c._id) === String(rawId) || String(c.id) === String(rawId));
              if (f) return f.tempId;
              const norm = normalizeColor(rawId);
              // match by hex/value/name normalized
              f = colorsArr.find((c: any) => {
                const ch = normalizeColor(c.hex || c.value || c.name || c.tempId || '');
                return ch === norm || String(c.name || '').toLowerCase().trim() === String(rawId).toLowerCase().trim();
              });
              return f ? f.tempId : null;
            };
            if (!colorTempId && st.colorId) {
              const found = colorsArr.find((c: any) => String(c._id) === String(st.colorId) || String(c.id) === String(st.colorId));
              if (found) colorTempId = found.tempId || found._id || found.id;
            }
            // Try fallback: if colorTempId is present but not resolved to a tempId of colorsArr, attempt to resolve
            if (colorTempId) {
              const resolved = resolveColorId(colorTempId);
              if (resolved) colorTempId = resolved;
            } else if (st.colorHex || st.colorValue || st.colorName) {
              const targetHex = normalizeColor(st.colorHex || st.colorValue || st.colorName);
              const found = colorsArr.find((c: any) => {
                const ch = normalizeColor(c.hex || c.value || c.name || c.tempId || '');
                return ch === targetHex;
              });
              if (found) colorTempId = found.tempId;
            }

            // Determine sizeId: prefer st.sizeId, else match by value
            let sizeId = st.sizeId || st.size || null;
            if (!sizeId && st.sizeValue) {
              const foundSize = sizesArr.find((sz: any) => String(sz.value) === String(st.sizeValue) || String(sz.id) === String(st.sizeValue));
              if (foundSize) sizeId = foundSize.id;
            }

            // If we have at least a color and size mapping, include it
            const qty = st.quantity != null ? Number(st.quantity) : (st.qty != null ? Number(st.qty) : (st.qty === 0 ? 0 : null));
            if (colorTempId && sizeId && qty !== null && !Number.isNaN(qty)) {
              uiStock.push({ colorTempId, sizeId, quantity: qty });
            }
          });
          // deterministic ordering
          uiStock.sort((a: any, b: any) => {
            if (String(a.colorTempId) === String(b.colorTempId)) return String(a.sizeId).localeCompare(String(b.sizeId));
            return String(a.colorTempId).localeCompare(String(b.colorTempId));
          });
          return uiStock;
        };

        setForm({
          name: p.name || '',
          description: p.description || '',
          price: p.price ?? '',
          originalPrice: p.originalPrice ?? '',
          category: p.category || p.gender || 'men',
          subcategory: p.subcategory || '',
          inventory: p.inventory ?? '',
          availableQuantity: p.availableQuantity ?? (p.inventory ?? null),
          inStock: p.inStock ?? true,
          featured: p.featured ?? false,
          trending: p.trending ?? false,
          images: images,
          sizes: sizes,
          // initialize stock mapping from product if available and map to UI tempIds
          stock: mapStockToUI(p.stock || [], colors, sizes),
          colors: colors,
          tags: (function normalizeTags(input:any){
            if (!input) return [];
            if (Array.isArray(input)) return input.map(String).map(s=>s.trim()).filter(Boolean);
            if (typeof input === 'string') {
              try {
                // try repeated JSON parse
                let s = input;
                for (let i=0;i<5;i++) {
                  try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) { return parsed.flatMap((x:any)=> typeof x === 'string' ? x : String(x)).map(String).map(s=>s.trim()).filter(Boolean); } if (typeof parsed === 'string') { s = parsed; continue; } return [String(parsed)]; } catch(e) { break; }
                }
              } catch(e) {}
              // comma separated fallback
              if (input.includes(',')) return input.split(',').map(s=>s.trim()).filter(Boolean);
              return [input.replace(/^['`\"]+|['`\"]+$/g,'').trim()].filter(Boolean);
            }
            return [String(input)];
          })(p.tags),
          relatedProducts: p.relatedProducts || [],
          specifications: p.specifications || { 
            material: '', 
            care: '', 
            fit: '', 
            origin: '' 
          },
          seo: p.seo || { 
            title: '', 
            description: '', 
            slug: '' 
          },
          sku: p.sku || '',
          status: p.status || 'published',
          sizeGuide: p.sizeGuide || { 
            image: '', 
            description: '', 
            tableHtml: '' 
          },
          attributes: p.attributes || {},
        });

        // Set category group from subcategory
        if (p.subcategory) {
          const section = p.category || p.gender || 'men';
          const groups = getCategorySections(section);
          for (const group of groups) {
            const items = getSectionItems(section, group);
            if (items.includes(p.subcategory)) {
              setCategoryGroup(group);
              break;
            }
          }
        }

        // Initialize related products input
        if (p.relatedProducts && Array.isArray(p.relatedProducts)) {
          setRelatedInput(p.relatedProducts.join(', '));
        }

        // Populate existing variant images
        const existingImagesMap: Record<string, Array<any>> = {};
        colors.forEach((color: any) => {
          const tid = color.tempId;
          if (color.images && Array.isArray(color.images)) {
            existingImagesMap[tid] = color.images.map((img: any) => 
              typeof img === 'string' ? { url: img } : img
            );
          }
        });
        setExistingVariantImages(existingImagesMap);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to load product', 'error');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, navigate]);

  useEffect(() => {
    if (!id) return;
    loadProduct();
  }, [id, loadProduct]);

  useEffect(() => {
    try {
      const t = loadTemplates();
      setSizeGuideTemplates(t);
    } catch (e) {
      setSizeGuideTemplates([]);
    }
  }, []);

  // Fetch dynamic filter groups when subcategory changes
  useEffect(() => {
    let mounted = true;
    if (!form.subcategory) {
      setDynamicFilterGroups([]);
      setDynamicAttributes({});
      return;
    }
    const fetchFilterGroups = async () => {
      try {
        const res: any = await filtersAPI.getConfig(form.subcategory, form.category);
        const config = res?.data || res;
        const groups = config?.filterGroups || config?.groups || [];
        const resolved = groups.map((fg: any) => typeof fg.filterGroup === 'object' ? fg.filterGroup : fg).filter((g: any) => g && g.name);
        if (mounted) {
          setDynamicFilterGroups(resolved);
          setDynamicAttributes((prev) => {
            const init: Record<string, string[]> = {};
            resolved.forEach((g: any) => {
              init[g.slug] = prev[g.slug] || form.attributes?.[g.slug] || [];
            });
            return init;
          });
        }
      } catch (e) {
        console.error('Failed to load filter config:', e);
        if (mounted) {
          setDynamicFilterGroups([]);
          setDynamicAttributes({});
        }
      }
    };
    fetchFilterGroups();
    return () => { mounted = false; };
  }, [form.subcategory, form.category]);

  // Sync dynamic attributes back to form whenever they change
  useEffect(() => {
    const cleaned: Record<string, string[]> = {};
    Object.entries(dynamicAttributes).forEach(([k, v]) => {
      if (v && v.length > 0) cleaned[k] = v;
    });
    const currentSerialized = JSON.stringify(form.attributes || {});
    const nextSerialized = JSON.stringify(cleaned);
    if (currentSerialized !== nextSerialized) {
      setForm((s: any) => ({ ...s, attributes: cleaned }));
    }
  }, [dynamicAttributes]);

  // Toggle a single attribute value
  const toggleAttribute = (groupSlug: string, value: string) => {
    setDynamicAttributes((prev) => {
      const current = prev[groupSlug] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [groupSlug]: next };
    });
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
          subcategory: form.subcategory,
          tags: (form.tags || []).join(','),
          excludeId: id,
          limit: 30,
          price: form.price,
          material: form.specifications?.material,
          fit: form.specifications?.fit,
          origin: form.specifications?.origin,
        });
        if (!mounted) return;
        setSuggestedProducts(res?.data?.products || []);
      } catch (e: any) {
        console.error('suggest fetch failed', e);
      } finally {
        if (mounted) setLoadingSuggestions(false);
      }
    })();
    return () => { mounted = false; };
  }, [form.category, form.subcategory, JSON.stringify(form.tags || []), autoSuggestEnabled, id]);

  // Fetch existing mappings for this category/subcategory
  useEffect(() => {
    if (!form.category || !form.subcategory) return;
    let mounted = true;
    (async () => {
      setLoadingMappings(true);
      try {
        const res = await api.admin.getRecommendationMappings({ category: form.category, subcategory: form.subcategory });
        if (!mounted) return;
        setMappings(res?.data?.mappings || []);
      } catch (e) {
        console.error('mappings fetch failed', e);
      } finally {
        if (mounted) setLoadingMappings(false);
      }
    })();
    return () => { mounted = false; };
  }, [form.category, form.subcategory]);

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

  // Variant handlers (same as Create form)
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
        images: [...(v[tempId]?.images || []), ...arr].slice(0, 20)
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

  // Main product image management
  const removeImage = (idx: number) => {
    setForm((s: any) => {
      const images = [...(s.images || [])];
      images.splice(idx, 1);
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

  // Size management
  const addSize = () => {
    const id = `size_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    setForm((s: any) => ({
      ...s,
      sizes: [...(s.sizes || []), { id, value: '', inStock: true, quantity: null }],
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
      const cur = typeof sizes[idx] === 'string' ? { id: `size_legacy_${idx}`, value: sizes[idx], inStock: true, quantity: null } : { ...sizes[idx] };
      cur.quantity = quantity;
      sizes[idx] = cur;
      const next = { ...s, sizes };

      // Maintain per-color-size stock entries when colors are present
      if (Array.isArray(next.colors) && next.colors.length > 0) {
        const stock = [...(s.stock || [])];
        next.colors.forEach((c: any) => {
          const cid = c.tempId;
          const si = stock.findIndex((st: any) => st.colorTempId === cid && st.sizeId === cur.id);
          if (quantity === null || quantity === undefined) {
            if (si >= 0) stock.splice(si, 1);
          } else {
            if (si >= 0) stock[si].quantity = quantity;
            else stock.push({ colorTempId: cid, sizeId: cur.id, quantity });
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
      stock.sort((a: any, b: any) => {
        if (String(a.colorTempId) === String(b.colorTempId)) return String(a.sizeId).localeCompare(String(b.sizeId));
        return String(a.colorTempId).localeCompare(String(b.colorTempId));
      });
      return { ...s, stock };
    });
  };

  const removeSize = (idx: number) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      sizes.splice(idx, 1);
      return { ...s, sizes };
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
        images: []
      }],
    }));
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
          const resolved = resolveColorHex(normalized);
          if (resolved) {
            cur.value = resolved;
            cur.hex = resolved;
          }
        } catch (e) {}
      }

      if (field === 'value' || field === 'hex') {
        cur.value = value;
        try {
          const res = parseColor(normalized as string);
          if (res.valid && res.hex) cur.hex = res.hex;
        } catch (e) {
          // ignore parse errors
        }
        // Auto-fill friendly name if empty
        if (!cur.name) {
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
      const tempId = colors[idx].tempId;
      colors.splice(idx, 1);
      
      // Clean up variant files
      if (tempId) {
        setVariantFiles(v => {
          const copy = { ...v };
          delete copy[tempId];
          return copy;
        });
        
        setExistingVariantImages(ev => {
          const copy = { ...(ev || {}) };
          delete copy[tempId];
          return copy;
        });
      }
      
      return { ...s, colors };
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

  // Related products management
  const updateRelatedFromInput = () => {
    const normalizeEntry = (raw: string) => {
      if (!raw) return null;
      let s = raw.trim();
      try {
        const cleaned = s.replace(/`/g, '');
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length) return String(parsed[0]).trim();
        if (typeof parsed === 'string') return parsed.trim();
      } catch (e) {
        // ignore parse errors
      }
      s = s.replace(/^['`\"]+|['`\"]+$/g, '').trim();
      return s || null;
    };

    const vals = Array.from(new Set(relatedInput.split(',').map(s => normalizeEntry(s)).filter(Boolean)));
    setForm((s: any) => ({ ...s, relatedProducts: vals }));
    showToast('Related products updated', 'success');
  };

  // Form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.name || !form.description || !form.price) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Image validation
    const anyGeneral = (form.images && form.images.length > 0);
    const anyPerColor = (Object.keys(variantFiles || {}).length > 0 && Object.values(variantFiles).some((p: any) => (p.images || []).length > 0)) ||
                        (Object.keys(existingVariantImages || {}).length > 0 && Object.values(existingVariantImages).some((arr:any) => (arr || []).length > 0));
    if (!anyGeneral && !anyPerColor) {
      showToast('Please upload at least one product image (either general images or images under color variants)', 'error');
      return;
    }

    // Validate color variants
    if (form.colors && form.colors.length > 0) {
      const colorTempIds = new Set((form.colors || []).map((c: any) => c.tempId));
      for (const k of Object.keys(variantFiles)) {
        if (!colorTempIds.has(k)) {
          showToast('Found images assigned to an unknown/removed color. Please reassign or remove those images.', 'error');
          return;
        }
      }
      for (const k of Object.keys(existingVariantImages)) {
        if (!colorTempIds.has(k)) {
          showToast('Found existing variant images assigned to an unknown/removed color. Please reassign or remove those images.', 'error');
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Ensure at least one image is primary
      if (form.images.length > 0 && !form.images.some((img: any) => img.isPrimary)) {
        form.images[0].isPrimary = true;
      }

      // Prepare form data (same as Create form)
      const fd = new FormData();
      
      // Add all form fields except sizes
      Object.entries(form).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (k === 'sizes') return;
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

      // Build variants payload
      if (form.colors && form.colors.length > 0) {
        const variantsPayload = (form.colors || []).map((c: any) => {
          const tid = c.tempId;
          const existing = (existingVariantImages[tid] || []).map((im: any) => {
            return (im && (im.url || im)) || im;
          });
          const localFiles = (variantFiles[tid]?.images || []).map((f: File, idx: number) => {
            return `__file__variantImages_${tid}_${idx}`;
          });
          const swatchExisting = c.swatchImage?.url || c.swatchImage || undefined;
          const swatchLocal = variantFiles[tid]?.swatch ? `__file__variantSwatch_${tid}` : undefined;

          return {
            tempId: tid,
            name: c.name,
            hex: c.hex || c.value,
            images: [...existing, ...localFiles],
            swatchImage: swatchExisting || swatchLocal || undefined,
          };
        });

        fd.append('variants', JSON.stringify(variantsPayload));
      }

      // Add variant files
      Object.entries(variantFiles).forEach(([tempId, payload]) => {
        if (payload.swatch) {
          fd.append(`variantSwatch_${tempId}`, payload.swatch as File);
        }
        (payload.images || []).forEach((f, idx) => {
          fd.append(`variantImages_${tempId}_${idx}`, f);
        });
      });

      // Normalize sizes
      const sizesPayload = (form.sizes || []).map((s: any, idx: number) => {
        if (!s) return null;
        if (typeof s === 'string') {
          return { id: `size_legacy_${idx}`, value: s, inStock: true, quantity: null };
        }
        return {
          id: s.id || `size_${idx}`,
          value: s.value ?? '',
          inStock: typeof s.inStock === 'boolean' ? s.inStock : true,
          quantity: s.quantity ?? null,
        };
      }).filter(Boolean);
      fd.append('sizes', JSON.stringify(sizesPayload));

      // stock is part of `form` and will be appended by the generic loop

      // Include related products
      if (form.relatedProducts && form.relatedProducts.length > 0) {
        fd.append('relatedProducts', JSON.stringify(form.relatedProducts));
      }

      // Submit to API
      await api.admin.updateProduct(id!, fd);
      showToast('Product updated successfully', 'success');
      navigate('/admin/products');
      
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to update product', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 mt-1">Update product information</p>
          </div>
        </div>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
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
            </div>

            {/* Category & Classification */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Category & Classification</h2>
              <div className="space-y-4">
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
                  <div className="flex items-center gap-4">
                    {form.colors && form.colors.length > 0 ? (
                      <div className="space-y-1">
                        <input
                          id="inventory"
                          type="number"
                          name="inventory"
                          value={(form.stock || []).reduce((sum: number, st: any) => sum + (Number(st.quantity) || 0), 0)}
                          readOnly
                          className="w-48 px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed focus:outline-none"
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
                        className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                    <div className="text-sm text-gray-600">Available: {displayAvailableQuantity(form)} units</div>
                  </div>
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
                    <div className="mb-3 flex items-center gap-3">
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="px-3 py-2 border rounded w-2/3"
                      >
                        <option value="">Select size guide template</option>
                        {sizeGuideTemplates.filter(t => !t.category || t.category === form.category || t.category === 'any').map((t) => (
                          <option key={t.id} value={t.id}>{t.name} {t.category ? `(${t.category})` : ''}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        const tpl = sizeGuideTemplates.find(t => t.id === selectedTemplateId);
                        if (!tpl) return;
                        setForm((s: any) => ({ ...s, sizeGuide: { ...(s.sizeGuide || {}), image: tpl.image || s.sizeGuide?.image || '', description: tpl.description || s.sizeGuide?.description || '', tableHtml: tpl.tableHtml || s.sizeGuide?.tableHtml || '' } }));
                        showToast('Template applied to product', 'success');
                      }} className="px-3 py-2 bg-blue-600 text-white rounded">Apply Template</button>
                      <button type="button" onClick={() => {
                        const name = window.prompt('Template name (e.g. Clothing - My Template)', `Template ${Date.now()}`);
                        if (!name) return;
                        const id = `tpl_${Date.now().toString(36)}`;
                        const tpl: SizeGuideTemplate = { id, name, category: form.category || 'any', image: form.sizeGuide?.image || '', description: form.sizeGuide?.description || '', tableHtml: form.sizeGuide?.tableHtml || '' };
                        const next = [tpl, ...sizeGuideTemplates];
                        setSizeGuideTemplates(next);
                        saveTemplates(next);
                        setSelectedTemplateId(id);
                        showToast('Template saved', 'success');
                      }} className="px-3 py-2 bg-green-600 text-white rounded">Save as Template</button>
                    </div>
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

            {/* Related Products */}
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
                          excludeId: id,
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
                      // refresh mappings and suggestions
                      const res = await api.admin.getRecommendationMappings({ category: form.category, subcategory: form.subcategory });
                      setMappings(res?.data?.mappings || []);
                      // trigger suggestions refresh
                      const sres = await api.admin.suggestRelatedProducts({ section: form.category, subcategory: form.subcategory, tags: (form.tags||[]).join(','), excludeId: id, limit: 30, price: form.price });
                      setSuggestedProducts(sres?.data?.products || []);
                    } catch (e: any) {
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

              <p className="text-sm text-gray-500 mb-2">Select a Category and Subcategory to see intelligent suggestions. You can add suggestions or paste IDs/slugs manually.</p>

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
                        const already = (form.relatedProducts || []).some((r: any) => String(r) === String(p._id) || String(r) === String(p.sku));
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
                                      const cur = Array.isArray(s.relatedProducts) ? [...s.relatedProducts] : [];
                                      if (!already) cur.unshift(String(p._id));
                                      return { ...s, relatedProducts: Array.from(new Set(cur)).slice(0, 20) };
                                    });
                                  }}
                                  className={`px-3 py-1 text-sm rounded ${already ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'}`}
                                >{already ? 'Added' : 'Add'}</button>
                              </div>
                              {already && (
                                <button type="button" onClick={() => setForm((s: any) => ({ ...s, relatedProducts: (s.relatedProducts || []).filter((r:any) => String(r) !== String(p._id) && String(r) !== String(p.sku)) }))} className="text-xs text-red-600">Remove</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Preview panel for selected suggestion */}
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
                              <button type="button" onClick={() => { setForm((s:any) => ({ ...s, relatedProducts: Array.from(new Set([...(s.relatedProducts||[]), String(previewProduct._id)])) })); setPreviewProduct(null); }} className="px-3 py-1 bg-blue-600 text-white rounded">Add to Related</button>
                              <button type="button" onClick={() => setPreviewProduct(null)} className="px-3 py-1 bg-white border rounded">Close</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {form.relatedProducts && form.relatedProducts.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {form.relatedProducts.map((r: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-2">
                          <span>{r}</span>
                          <button type="button" onClick={() => setForm((s:any) => ({ ...s, relatedProducts: (s.relatedProducts || []).filter((x:any, idx:number) => idx !== i) }))} className="text-xs text-red-600">x</button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductEdit;