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
  Sparkles,
  Search
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

export type BannerSectionGroup = 'all' | 'heroes' | 'home' | 'collections' | 'menu';

export interface BannerSectionDef {
  key: string;
  label: string;
  page: string;
  group: 'heroes' | 'home' | 'collections' | 'menu';
  defaultPlaceholder: string;
  description?: string;
}

const BANNER_SECTIONS: BannerSectionDef[] = [
  // ─── 1. PAGE HERO BANNERS ───
  { key: 'men_hero', label: "Men's Collection Hero", page: 'Men Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=1800&auto=format&fit=crop', description: 'Hero banner displayed at top of Men catalog' },
  { key: 'women_hero', label: "Women's Collection Hero", page: 'Women Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1800&auto=format&fit=crop', description: 'Hero banner displayed at top of Women catalog' },
  { key: 'kids_hero', label: "Kids' Collection Hero", page: 'Kids Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1800&auto=format&fit=crop', description: 'Hero banner displayed at top of Kids catalog' },
  { key: 'accessories_hero', label: 'Accessories Hero Banner', page: 'Accessories Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1600&auto=format&fit=crop', description: 'Hero banner displayed at top of Accessories catalog' },
  { key: 'sale_hero', label: 'Seasonal Sale Hero Banner', page: 'Sale Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1800&auto=format&fit=crop', description: 'Hero banner displayed on the Public Seasonal Sale page' },
  { key: 'fragrances', label: 'Haute Fragrances Hero Banner', page: 'Fragrances Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=1600&auto=format&fit=crop', description: 'Hero banner displayed at top of Fragrances catalog' },
  { key: 'brands', label: 'Official Brands Hub Hero Banner', page: 'Brands Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop', description: 'Hero banner displayed at top of Official Brands Hub' },
  { key: 'private_sale_hero', label: 'Private Sale Exclusive Hero Banner', page: 'Private Sale Page', group: 'heroes', defaultPlaceholder: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1800&auto=format&fit=crop', description: 'Hero banner displayed on authenticated Private Sale page' },

  // ─── 2. HOME PAGE & SLIDES ───
  { key: 'home_top', label: 'Home Top Promo Banner', page: 'Home Page (Top)', group: 'home', defaultPlaceholder: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop', description: 'Top promo strip on the Home page' },
  { key: 'home_hero', label: 'Home Hero Spotlight Banner', page: 'Home Page (Hero)', group: 'home', defaultPlaceholder: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1600&auto=format&fit=crop', description: 'Main hero spotlight banner on Home' },
  { key: 'home_slide_1', label: 'Home Carousel — Slide 1', page: 'Home Page (Slide 1)', group: 'home', defaultPlaceholder: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=90', description: 'First slide in the rotating Home hero carousel (Maison Collection)' },
  { key: 'home_slide_2', label: 'Home Carousel — Slide 2', page: 'Home Page (Slide 2)', group: 'home', defaultPlaceholder: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=90', description: 'Second slide in the rotating Home hero carousel (Athletic Couture)' },
  { key: 'home_slide_3', label: 'Home Carousel — Slide 3', page: 'Home Page (Slide 3)', group: 'home', defaultPlaceholder: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=90', description: 'Third slide in the rotating Home hero carousel (Kids Edition)' },

  // ─── 3. SHOP BY CATEGORY TILES ───
  { key: 'category_men', label: 'Shop by Category — Men', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', description: 'Card image for Men Atelier in the Shop by Category section' },
  { key: 'category_women', label: 'Shop by Category — Women', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80', description: 'Card image for Women Couture in the Shop by Category section' },
  { key: 'category_kids', label: 'Shop by Category — Kids', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', description: 'Card image for Kids Studio in the Shop by Category section' },
  { key: 'category_accessories', label: 'Shop by Category — Accessories', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?w=800&q=80', description: 'Card image for Accessories Edit in the Shop by Category section' },
  { key: 'category_fragrances', label: 'Shop by Category — Haute Fragrances', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=800&auto=format&fit=crop', description: 'Card image for Haute Fragrances in the Shop by Category section' },
  { key: 'category_brands', label: 'Shop by Category — Official Brands', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop', description: 'Card image for Official Brands in the Shop by Category section' },
  { key: 'category_private_sale', label: 'Shop by Category — Private Sale', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80', description: 'Card image for Private Sale VIP in the Shop by Category section' },
  { key: 'category_sale', label: 'Shop by Category — Seasonal Sale', page: 'Home Page (Tile)', group: 'collections', defaultPlaceholder: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80', description: 'Card image for Seasonal Sale in the Shop by Category section' },

  // ─── 4. MEGA MENU FEATURED CARDS ───
  { key: 'menu_men', label: 'Mega Menu — Men Featured Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop', description: 'Featured spotlight image in Men mega menu dropdown' },
  { key: 'menu_women', label: 'Mega Menu — Women Featured Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop', description: 'Featured spotlight image in Women mega menu dropdown' },
  { key: 'menu_kids', label: 'Mega Menu — Kids Featured Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=500&fit=crop', description: 'Featured spotlight image in Kids mega menu dropdown' },
  { key: 'menu_accessories', label: 'Mega Menu — Accessories Featured Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop', description: 'Featured spotlight image in Accessories mega menu dropdown' },
  { key: 'menu_fragrances', label: 'Mega Menu — Fragrances Featured Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=400&h=500&fit=crop', description: 'Featured spotlight image in Fragrances mega menu dropdown' },
  { key: 'menu_brands', label: 'Mega Menu — Brands Hub Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop', description: 'Brands hub image in Brands mega menu dropdown' },
  { key: 'menu_sale', label: 'Mega Menu — Sale Featured Card', page: 'Header Mega Menu', group: 'menu', defaultPlaceholder: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=500&fit=crop', description: 'Featured spotlight image in Sale mega menu dropdown' },
];

export default function AdminContentController(): JSX.Element {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'announcements' | 'banners'>('announcements');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BannerSectionGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const [savingSection, setSavingSection] = useState<string | null>(null);

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
      const res: any = await contentAPI.updateAnnouncements({
        messages: validMessages,
        enabled: announcements.enabled,
        intervalSeconds: announcements.intervalSeconds,
      });
      const data = res?.data?.announcements || res?.announcements;
      if (data) {
        setAnnouncements({
          messages: Array.isArray(data.messages) && data.messages.length > 0 ? data.messages : validMessages,
          enabled: data.enabled !== false,
          intervalSeconds: Number(data.intervalSeconds) || announcements.intervalSeconds,
        });
      }
      showToast('Announcement strip settings saved successfully', 'success');
    } catch (err: any) {
      console.error('Save announcements error', err);
      showToast(err?.message || 'Failed to save announcement settings', 'error');
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
    } catch (err: any) {
      console.error('Upload error', err);
      showToast(err?.message || 'Failed to upload banner image', 'error');
    } finally {
      setUploadingSection(null);
    }
  };

  const handleSaveSingleBanner = async (key: string) => {
    setSavingSection(key);
    try {
      await contentAPI.updateBanners({ banners });
      const secLabel = BANNER_SECTIONS.find((s) => s.key === key)?.label || 'Banner';
      showToast(`${secLabel} saved successfully`, 'success');
    } catch (err: any) {
      console.error('Save banner error', err);
      showToast(err?.message || 'Failed to save banner', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveBanners = async () => {
    setSaving(true);
    try {
      await contentAPI.updateBanners({ banners });
      showToast('All page banners saved successfully', 'success');
    } catch (err: any) {
      console.error('Save banners error', err);
      showToast(err?.message || 'Failed to save banner settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredBannerSections = BANNER_SECTIONS.filter((sec) => {
    const matchesGroup = selectedGroup === 'all' || sec.group === selectedGroup;
    if (!matchesGroup) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.label.toLowerCase().includes(q) ||
      sec.page.toLowerCase().includes(q) ||
      sec.key.toLowerCase().includes(q) ||
      (sec.description && sec.description.toLowerCase().includes(q))
    );
  });

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
              <strong>Admin-Controlled Website Imagery & Banners:</strong> When active, customer-facing pages dynamically render your configured banner image, title, subtitle, and action link. When deactivated or empty, it will cleanly fall back to the website&apos;s standard default design.
            </div>
          </div>

          {/* Group Filter Tabs & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Assets', count: BANNER_SECTIONS.length },
                { id: 'heroes', label: 'Page Heroes', count: BANNER_SECTIONS.filter(s => s.group === 'heroes').length },
                { id: 'home', label: 'Home & Slides', count: BANNER_SECTIONS.filter(s => s.group === 'home').length },
                { id: 'collections', label: 'Shop by Category', count: BANNER_SECTIONS.filter(s => s.group === 'collections').length },
                { id: 'menu', label: 'Mega Menu', count: BANNER_SECTIONS.filter(s => s.group === 'menu').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedGroup(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                    selectedGroup === tab.id
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by page, title, or key..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {filteredBannerSections.length === 0 ? (
            <div className="text-center py-12 bg-white border border-neutral-200 rounded-3xl p-8">
              <p className="text-neutral-500 text-sm">No banner configurations found matching your filter criteria.</p>
              <button
                type="button"
                onClick={() => { setSelectedGroup('all'); setSearchQuery(''); }}
                className="mt-3 text-xs font-semibold text-neutral-900 underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredBannerSections.map((sec) => {
                const current = banners[sec.key] || { imageUrl: '', isActive: false };
                const isUploading = uploadingSection === sec.key;

                return (
                  <div key={sec.key} className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                              {sec.page}
                            </span>
                            <span className="text-[9px] font-mono bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                              {sec.key}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-neutral-900">{sec.label}</h3>
                          {sec.description && (
                            <p className="text-[11px] text-neutral-500 mt-0.5">{sec.description}</p>
                          )}
                        </div>

                      <div className="flex items-center gap-3">
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

                        {/* Direct Save Banner Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveSingleBanner(sec.key)}
                          disabled={savingSection === sec.key || saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wider transition disabled:opacity-50"
                          title="Save this banner immediately"
                        >
                          <Save className="h-3 w-3" />
                          {savingSection === sec.key ? 'Saving...' : 'Save'}
                        </button>
                      </div>
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
          )}

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
