import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';
import ImageUpload from '../../components/admin/ImageUpload';

export default function AdminStyleByYou(): JSX.Element {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.admin.getStyleByYou();
      const list = (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
      setItems(list || []);
    } catch (err) {
      console.error('Failed to load Style By You', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleNew = useCallback(() => setEditing({ title: 'Styled by You', images: [] }), []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    try {
      const form = new FormData();
      form.append('title', editing.title || 'Styled by You');
      form.append('description', editing.description || '');
      form.append('published', String(editing.published !== false));
      // normalize images to a simple array of objects with url and caption
      const imgs = (editing.images || []).map((img: any) => {
        if (!img) return null;
        if (typeof img === 'string') return { url: img };
        return { url: img.url || img, caption: img.caption || '' };
      }).filter(Boolean);
      form.append('images', JSON.stringify(imgs));
      if (editing._id) {
        await api.admin.updateStyleByYou(editing._id, form);
      } else {
        await api.admin.createStyleByYou(form);
      }
      setEditing(null);
      await fetchItems();
    } catch (err) {
      console.error('Save error', err);
      alert('Failed to save');
    }
  }, [editing, fetchItems]);

  const handleRemove = useCallback(async (id: string) => {
    if (!confirm('Delete this Style By You entry?')) return;
    try {
      await api.admin.deleteStyleByYou(id);
      await fetchItems();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  }, [fetchItems]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Style By You</h1>
        <div>
          <button onClick={handleNew} className="px-4 py-2 bg-black text-white rounded">New</button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div key={it._id || idx} className="p-4 border rounded flex items-center justify-between flex-wrap gap-4">
              <div className="min-w-0">
                <div className="font-semibold truncate">{it.title}</div>
                <div className="text-sm text-gray-600">{(it.images || []).length} images</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...it, images: (it.images || []).map((img: any, i: number) => (typeof img === 'string' ? { url: img, order: i } : { url: img?.url || img, caption: img?.caption || '', order: img?.order ?? i })) })} className="px-3 py-1 border rounded">Edit</button>
                <button onClick={() => handleRemove(it._id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded shadow p-6 max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4">{editing._id ? 'Edit' : 'Create'} Styled By You</h2>
            <div className="space-y-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">Title</div>
                <input className="w-full border px-3 py-2" value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </label>
              <label className="block">
                <div className="text-sm font-medium mb-1">Description</div>
                <textarea className="w-full border px-3 py-2" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </label>

              <div>
                <div className="text-sm font-medium mb-2">Images</div>
                <div className="space-y-2">
                  {(editing.images || []).map((img: any, idx: number) => {
                    const src = typeof img === 'string' ? img : img?.url || '';
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <img src={src} alt={`img-${idx}`} className="w-20 h-20 object-cover rounded border" />
                        <input className="flex-1 border px-2 py-1" value={(img && img.caption) || ''} onChange={(e) => {
                          const imgs = [...(editing.images || [])];
                          imgs[idx] = { ...(typeof imgs[idx] === 'string' ? { url: imgs[idx] } : imgs[idx]), caption: e.target.value };
                          setEditing({ ...editing, images: imgs });
                        }} />
                        <button onClick={() => {
                          const imgs = (editing.images || []).filter((_: any, i: number) => i !== idx);
                          setEditing({ ...editing, images: imgs });
                        }} className="px-2 py-1 border rounded">Remove</button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <ImageUpload onImageSelect={(url) => setEditing({ ...editing, images: [...(editing.images || []), { url, order: (editing.images || []).length }] })} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
