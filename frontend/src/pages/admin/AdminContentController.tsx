import React, { useEffect, useState } from 'react';
import { 
  Megaphone, 
  Image as ImageIcon, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  UploadCloud,
  Clock,
  Sparkles
} from 'lucide-react';
import { contentAPI, adminAPI } from '../../api';
import { useToast } from '../../context/ToastContext';

type AnnouncementConfig = {
  messages: string[];
  enabled: boolean;
  intervalSeconds: number;
};

type BannerConfig = {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  link?: string;
  buttonText?: string;
  isActive: boolean;
};

const BANNER_SECTIONS = [
  { key: 'home_top', label: 'Home Top Promo Banner', page: 'Home Page (Top)', defaultPlaceholder: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop' },
  { key: 'home_hero', label: 'Home Hero Main Banner', page: 'Home Page (Hero)', defaultPlaceholder: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1600&auto=format&fit=crop' },
  { key: 'men_hero', label: "Men's Collection Hero", page: 'Men Page', defaultPlaceholder: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=1600&auto=format&fit=crop' },
  { key: 'women_hero', label: "Women's Collection Hero", page: 'Women Page', defaultPlaceholder: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1600&auto=format&fit=crop' },
  { key: 'kids_hero', label: "Kids' Collection Hero", page: 'Kids Page', defaultPlaceholder: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?q=80&w=1600&auto=format&fit=crop' },
  { key: 'sale_hero', label: 'Private Sale Hero Banner', page: 'Sale Page', defaultPlaceholder: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop' },
  { key: 'accessories_hero', label: 'Accessories Hero Banner', page: 'Accessories Page', defaultPlaceholder: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1600&auto=format&fit=crop' },
];

export default function AdminContentController(): JSX.Element {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'announcements' | 'banners'>('announcements');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Announcement state
  const [announcements, setAnnouncements] = useState<AnnouncementConfig>({
    messages: ['Free shipping on orders over ₨5,000'],
    enabled: true,
    intervalSeconds: 4,
  });

  // Banners state
  const [banners, setBanners] = useState<Record<string, BannerConfig>>({});
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);

  // Live preview message index
  const [previewIndex, setPreviewIndex] = useState(0);

  // Load content
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await contentAPI.getAdminContent();
        const data = (res as any)?.data || res;
        if (data) {
          if (data.announcements) {
            setAnnouncements({
              messages: Array.isArray(data.announcements.messages) && data.announcements.messages.length > 0
                ? data.announcements.messages
                : ['Free shipping on orders over ₨5,000'],
              enabled: data.announcements.enabled !== false,
              intervalSeconds: Number(data.announcements.intervalSeconds) || 4,
            });
          }
          if (data.banners && typeof data.banners === 'object') {
            setBanners(data.banners);
          }
        }
      } catch (err) {
        console.error('Failed to load content settings', err);
        showToast('Failed to load content settings', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  // Preview cycle timer
  useEffect(() => {
    if (!announcements.enabled || announcements.messages.length <= 1) return;
    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % announcements.messages.length);
    }, announcements.intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [announcements]);

  // Announcement handlers
  const handleAddMessage = () => {
    if (announcements.messages.length >= 3) {
      showToast('Maximum of 3 announcement messages allowed', 'info');
      return;
    }
    setAnnouncements((prev) => ({
      ...prev,
      messages: [...prev.messages, ''],
    }));
  };

  const handleMessageChange = (index: number, text: string) => {
    setAnnouncements((prev) => {
      const updated = [...prev.messages];
      updated[index] = text;
      return { ...prev, messages: updated };
    });
  };

  const handleRemoveMessage = (index: number) => {
    if (announcements.messages.length <= 1) {
      showToast('At least 1 announcement message is required', 'warning');
      return;
    }
    setAnnouncements((prev) => ({
      ...prev,
      messages: prev.messages.filter((_, i) => i !== index),
    }));
  };

  const handleSaveAnnouncements = async () => {
    const validMessages = announcements.messages.map((m) => m.trim()).filter(Boolean);
    if (validMessages.length === 0) {
      showToast('Please enter at least one announcement message', 'error');
      return;
    }

    setSaving(true);
    try {
      await contentAPI.updateAnnouncements({
        messages: validMessages,
        enabled: announcements.enabled,
        intervalSeconds: announcements.intervalSeconds,
      });
      showToast('Announcement strip settings saved successfully', 'success');
    } catch (err) {
      console.error('Save announcements error', err);
      showToast('Failed to save announcement settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Banner handlers
  const handleBannerChange = (key: string, field: keyof BannerConfig, value: any) => {
    setBanners((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { imageUrl: '', isActive: false }),
        [field]: value,
      },
    }));
  };

  const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSection(key);
    try {
      const formData = new FormData();
      formData.append('files', file);

      const res = await adminAPI.uploadImages(formData);
      const data = (res as any)?.data || res;
      const uploadedUrl = data?.results?.[0]?.url || data?.urls?.[0] || data?.url;

      if (uploadedUrl) {
        handleBannerChange(key, 'imageUrl', uploadedUrl);
        handleBannerChange(key, 'isActive', true);
        showToast('Banner image uploaded successfully', 'success');
      } else {
        showToast('Upload succeeded but no image URL returned', 'warning');
      }
    } catch (err) {
      console.error('Upload error', err);
      showToast('Failed to upload banner image', 'error');
    } finally {
      setUploadingSection(null);
    }
  };

  const handleSaveBanners = async () => {
    setSaving(true);
    try {
      await contentAPI.updateBanners({ banners });
      showToast('Page banners saved successfully', 'success');
    } catch (err) {
      console.error('Save banners error', err);
      showToast('Failed to save banner settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-neutral-600 font-medium">
          <div className="h-5 w-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          Loading content controller...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-[0.1em] text-neutral-900 uppercase">
            Content Controller
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage live announcement marquee strip and dynamic promotional hero banners
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'announcements'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Announcement Strip (1–3 Messages)
          </button>
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'banners'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Page Banners ({BANNER_SECTIONS.length})
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Eye className="h-4 w-4 text-emerald-600" />
                Live Frontend Strip Preview
              </div>
              <span className="text-[11px] bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full">
                {announcements.enabled ? (announcements.messages.length > 1 ? `Rotating (${previewIndex + 1}/${announcements.messages.length})` : 'Static') : 'Disabled'}
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-inner border border-neutral-300/40">
              {announcements.enabled ? (
                <div className="bg-slate-500 text-white w-full h-7 flex items-center justify-center px-4 text-center transition-all">
                  <p className="text-[11px] sm:text-xs font-medium tracking-wide">
                    {announcements.messages[previewIndex % announcements.messages.length] || 'No message configured'}
                  </p>
                </div>
              ) : (
                <div className="bg-neutral-100 text-neutral-400 w-full h-7 flex items-center justify-center px-4 text-xs italic">
                  Strip is currently disabled and hidden from customers
                </div>
              )}
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">Announcement Messages (Up to 3)</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configure 1 single static message, or 2 to 3 rotating messages that cycle smoothly
                </p>
              </div>

              {/* Enabled toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="text-xs font-medium text-neutral-700">
                  {announcements.enabled ? 'Strip Active' : 'Strip Hidden'}
                </span>
                <input
                  type="checkbox"
                  checked={announcements.enabled}
                  onChange={(e) => setAnnouncements((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors relative ${announcements.enabled ? 'bg-emerald-600' : 'bg-neutral-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${announcements.enabled ? 'left-6' : 'left-1'}`} />
                </div>
              </label>
            </div>

            {/* Messages inputs */}
            <div className="space-y-4">
              {announcements.messages.map((msg, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 text-xs font-bold text-neutral-700 flex-shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={msg}
                    onChange={(e) => handleMessageChange(idx, e.target.value)}
                    placeholder={`Announcement Message #${idx + 1} (e.g. Free shipping on orders over ₨5,000)`}
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                  />
                  {announcements.messages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMessage(idx)}
                      className="p-3 text-neutral-400 hover:text-red-600 rounded-2xl hover:bg-red-50 transition"
                      title="Remove message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {announcements.messages.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddMessage}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-800 hover:text-black py-2.5 px-4 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-900 transition mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Announcement Message ({announcements.messages.length}/3)
                </button>
              )}
            </div>

            {/* Rotation interval slider */}
            {announcements.messages.length > 1 && (
              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    <Clock className="h-4 w-4 text-neutral-500" />
                    Rotation Interval (Pause at center)
                  </div>
                  <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-3 py-1 rounded-full">
                    {announcements.intervalSeconds} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={announcements.intervalSeconds}
                  onChange={(e) => setAnnouncements((prev) => ({ ...prev, intervalSeconds: Number(e.target.value) }))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Controls how long each message pauses in the center before smoothly transitioning to the next.
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAnnouncements}
                disabled={saving}
                className="flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] hover:bg-neutral-800 transition shadow-sm active:scale-[0.99] disabled:bg-neutral-300"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Announcement Strip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNERS TAB */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong>Admin-Controlled Page Banners:</strong> When active, the page will dynamically render your configured banner image, title, subtitle, and action link. When deactivated or empty, it will cleanly fall back to the website&apos;s standard default design.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {BANNER_SECTIONS.map((sec) => {
              const current = banners[sec.key] || { imageUrl: '', isActive: false };
              const isUploading = uploadingSection === sec.key;

              return (
                <div key={sec.key} className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                          {sec.page}
                        </span>
                        <h3 className="text-base font-semibold text-neutral-900">{sec.label}</h3>
                      </div>

                      {/* Active Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${current.isActive ? 'text-emerald-600' : 'text-neutral-400'}`}>
                          {current.isActive ? 'Active' : 'Disabled'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(current.isActive)}
                          onChange={(e) => handleBannerChange(sec.key, 'isActive', e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-9 h-5 rounded-full transition-colors relative ${current.isActive ? 'bg-emerald-600' : 'bg-neutral-300'}`}>
                          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${current.isActive ? 'left-5' : 'left-1'}`} />
                        </div>
                      </label>
                    </div>

                    {/* Preview Image */}
                    <div className="mt-4 relative aspect-[21/9] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 group">
                      <img
                        src={current.imageUrl || sec.defaultPlaceholder}
                        alt={sec.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                        <p className="text-sm font-bold tracking-wide uppercase">
                          {current.title || sec.label}
                        </p>
                        {current.subtitle && (
                          <p className="text-xs text-white/80 line-clamp-1">{current.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3 mt-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                          Banner Image URL / Upload
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={current.imageUrl || ''}
                            onChange={(e) => handleBannerChange(sec.key, 'imageUrl', e.target.value)}
                            placeholder="https://images.unsplash.com/... or upload"
                            className="flex-1 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                          <label className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                            <UploadCloud className="h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Upload'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(sec.key, e)}
                              className="sr-only"
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                            Heading / Title
                          </label>
                          <input
                            type="text"
                            value={current.title || ''}
                            onChange={(e) => handleBannerChange(sec.key, 'title', e.target.value)}
                            placeholder="e.g. SUMMER SALE"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                            Button Link / URL
                          </label>
                          <input
                            type="text"
                            value={current.link || ''}
                            onChange={(e) => handleBannerChange(sec.key, 'link', e.target.value)}
                            placeholder="e.g. /sale or /shop?gender=men"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                            Subtitle / Description
                          </label>
                          <input
                            type="text"
                            value={current.subtitle || ''}
                            onChange={(e) => handleBannerChange(sec.key, 'subtitle', e.target.value)}
                            placeholder="e.g. Up to 40% off new arrivals"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                            Button Text
                          </label>
                          <input
                            type="text"
                            value={current.buttonText || ''}
                            onChange={(e) => handleBannerChange(sec.key, 'buttonText', e.target.value)}
                            placeholder="e.g. Shop Collection"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Bar */}
          <div className="sticky bottom-6 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-neutral-200 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Changes will immediately reflect on customer-facing pages
            </div>
            <button
              type="button"
              onClick={handleSaveBanners}
              disabled={saving}
              className="flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] hover:bg-neutral-800 transition shadow-sm active:scale-[0.99] disabled:bg-neutral-300"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save All Page Banners'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
