import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ArrowLeft, Save, X, Upload, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

const AdminProductEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<any>(null);
  
  const [form, setForm] = useState<any>({
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    category: 'men',
    subcategory: '',
    inventory: 0,
    inStock: true,
    featured: false,
    trending: false,
    images: [],
    sizes: [],
    colors: [],
    tags: [],
    specifications: {
      material: '',
      care: '',
      fit: '',
      origin: '',
    },
    ratings: {
      average: 0,
      count: 0,
    },
    seo: {
      title: '',
      description: '',
      slug: '',
    },
  });

  const loadProduct = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getProductById(id!);
      if (res?.data?.product) {
        const p = res.data.product;
        setProduct(p);
        
        // Handle images - convert string array to object array if needed
        let images = [];
        if (Array.isArray(p.images)) {
          images = p.images.map((img: any, idx: number) => {
            if (typeof img === 'string') {
              return { url: img, isPrimary: idx === 0, order: idx };
            }
            return img;
          });
        } else if (p.image) {
          images = [{ url: p.image, isPrimary: true, order: 0 }];
        }
        
        setForm({
          name: p.name || '',
          description: p.description || '',
          price: p.price || 0,
          originalPrice: p.originalPrice || 0,
          category: p.category || 'men',
          subcategory: p.subcategory || '',
          inventory: p.inventory || 0,
          inStock: p.inStock ?? true,
          featured: p.featured ?? false,
          trending: p.trending ?? false,
          images: images,
          sizes: p.sizes || [],
          colors: p.colors || [],
          tags: p.tags || [],
          specifications: p.specifications || { material: '', care: '', fit: '', origin: '' },
          ratings: p.ratings || { average: 0, count: 0 },
          seo: p.seo || { title: '', description: '', slug: '' },
        });
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to load product', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (!id) return;
    loadProduct();
  }, [id, loadProduct]);

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
    } else if (name.startsWith('ratings.')) {
      const field = name.split('.')[1];
      setForm((s: any) => ({
        ...s,
        ratings: { ...s.ratings, [field]: type === 'number' ? parseFloat(value) : parseInt(value) },
      }));
    } else {
      setForm((s: any) => ({
        ...s,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    
    setSaving(true);
    try {
      const res = await api.admin.uploadFiles(files);
      if (res?.data?.files) {
        setForm((s: any) => ({
          ...s,
          images: [...(s.images || []), ...res.data.files],
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

  const addSize = () => {
    setForm((s: any) => ({
      ...s,
      sizes: [...(s.sizes || []), ''],
    }));
  };

  const updateSize = (idx: number, value: string) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      sizes[idx] = value;
      return { ...s, sizes: sizes.filter((s: string) => s.trim() !== '') };
    });
  };

  const removeSize = (idx: number) => {
    setForm((s: any) => {
      const sizes = [...(s.sizes || [])];
      sizes.splice(idx, 1);
      return { ...s, sizes };
    });
  };

  const addColor = () => {
    setForm((s: any) => ({
      ...s,
      colors: [...(s.colors || []), { name: '', hex: '#000000' }],
    }));
  };

  const updateColor = (idx: number, field: string, value: string) => {
    setForm((s: any) => {
      const colors = [...(s.colors || [])];
      colors[idx] = { ...colors[idx], [field]: value };
      return { ...s, colors };
    });
  };

  const removeColor = (idx: number) => {
    setForm((s: any) => {
      const colors = [...(s.colors || [])];
      colors.splice(idx, 1);
      return { ...s, colors };
    });
  };

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Ensure at least one image is primary
      if (form.images && form.images.length > 0 && !form.images.some((img: any) => img.isPrimary)) {
        form.images[0].isPrimary = true;
      }

      await api.admin.updateProduct(id!, form);
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
                      value={form.price}
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
                      value={form.originalPrice}
                      onChange={onChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category & Classification */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Category & Classification</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={onChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="kids">Kids</option>
                    <option value="sale">Sale</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                  <input
                    id="subcategory"
                    type="text"
                    name="subcategory"
                    value={form.subcategory}
                    onChange={onChange}
                    placeholder="e.g., T-Shirts, Jeans, Dresses"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                  <input
                    id="inventory"
                    type="number"
                    name="inventory"
                    value={form.inventory}
                    onChange={onChange}
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                {form.sizes.map((size: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={size}
                      onChange={(e) => updateSize(idx, e.target.value)}
                      placeholder="e.g., S, M, L, XL"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSize(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {form.sizes.length === 0 && (
                  <p className="text-sm text-gray-500">No sizes added. Click "Add Size" to add one.</p>
                )}
              </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Colors</h2>
                <button
                  type="button"
                  onClick={addColor}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Color
                </button>
              </div>
              <div className="space-y-2">
                {form.colors.map((color: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color.hex || '#000000'}
                      onChange={(e) => updateColor(idx, 'hex', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color.name || ''}
                      onChange={(e) => updateColor(idx, 'name', e.target.value)}
                      placeholder="Color name"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeColor(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {form.colors.length === 0 && (
                  <p className="text-sm text-gray-500">No colors added. Click "Add Color" to add one.</p>
                )}
              </div>
            </div>

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

            {/* Specifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="spec-material" className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                  <input
                    id="spec-material"
                    type="text"
                    name="specifications.material"
                    value={form.specifications.material}
                    onChange={onChange}
                    placeholder="e.g., Cotton, Polyester"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="spec-care" className="block text-sm font-medium text-gray-700 mb-2">Care Instructions</label>
                  <input
                    id="spec-care"
                    type="text"
                    name="specifications.care"
                    value={form.specifications.care}
                    onChange={onChange}
                    placeholder="e.g., Machine Wash"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="spec-fit" className="block text-sm font-medium text-gray-700 mb-2">Fit</label>
                  <input
                    id="spec-fit"
                    type="text"
                    name="specifications.fit"
                    value={form.specifications.fit}
                    onChange={onChange}
                    placeholder="e.g., Regular, Slim"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="spec-origin" className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                  <input
                    id="spec-origin"
                    type="text"
                    name="specifications.origin"
                    value={form.specifications.origin}
                    onChange={onChange}
                    placeholder="e.g., Pakistan"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">SEO Settings</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-2">SEO Title</label>
                  <input
                    id="seoTitle"
                    type="text"
                    name="seo.title"
                    value={form.seo.title}
                    onChange={onChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-2">SEO Description</label>
                  <textarea
                    id="seoDescription"
                    name="seo.description"
                    value={form.seo.description}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="seoSlug" className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    id="seoSlug"
                    type="text"
                    name="seo.slug"
                    value={form.seo.slug}
                    onChange={onChange}
                    placeholder="auto-generated from name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Images & Ratings */}
          <div className="space-y-6">
            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Images</h2>
              <div className="space-y-4">
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-2">Upload Images</p>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                    </div>
                    <input type="file" className="hidden" multiple accept="image/*" onChange={onFiles} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <p className="text-sm text-gray-500 text-center">No images uploaded</p>
                )}
              </div>
            </div>

            {/* Ratings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ratings</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="ratingsAverage" className="block text-sm font-medium text-gray-700 mb-2">
                    Average Rating (0-5)
                  </label>
                  <input
                    id="ratingsAverage"
                    type="number"
                    name="ratings.average"
                    value={form.ratings.average}
                    onChange={onChange}
                    min="0"
                    max="5"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="ratingsCount" className="block text-sm font-medium text-gray-700 mb-2">Review Count</label>
                  <input
                    id="ratingsCount"
                    type="number"
                    name="ratings.count"
                    value={form.ratings.count}
                    onChange={onChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductEdit;
