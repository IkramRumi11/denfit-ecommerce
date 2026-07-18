import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';

type Section = {
  title?: string;
  type?: string;
  content?: string;
  order?: number;
  published?: boolean;
  flags?: { noExchange?: boolean; noReturns?: boolean; fragile?: boolean; sizeGuideRequired?: boolean };
  attachments?: Array<{ url: string; label?: string; mimeType?: string }>;
  links?: any;
};

const defaultSection = (): Section => ({ title: 'New Section', type: 'other', content: '<p></p>', order: 0, published: true, flags: {}, attachments: [], links: {} });

const Wysiwyg: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);

  const exec = (cmd: string, val?: string) => {
    try { document.execCommand(cmd, false, val || undefined); onChange(ref.current?.innerHTML || ''); } catch (e) {}
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => exec('bold')} className="px-2 py-1 border rounded">B</button>
        <button type="button" onClick={() => exec('italic')} className="px-2 py-1 border rounded">I</button>
        <button type="button" onClick={() => exec('underline')} className="px-2 py-1 border rounded">U</button>
        <button type="button" onClick={() => { const url = prompt('Enter URL'); if (url) exec('createLink', url); }} className="px-2 py-1 border rounded">Link</button>
      </div>
      <div ref={ref} contentEditable className="border p-3 min-h-[160px] rounded" onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)} />
    </div>
  );
};

const AdminDetailTemplates: React.FC = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [assignProductId, setAssignProductId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.admin.getDetailTemplates();
      setTemplates(res?.data?.templates || []);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load templates', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing(null); setName(''); setSections([defaultSection()]); };
  const startEdit = (t: any) => { setEditing(t); setName(t.name || ''); setSections((t.sections || []).map((s: any) => ({ ...s }))); };

  const addSection = () => setSections((s) => { const next = [...s, { ...defaultSection(), order: s.length }]; return next; });
  const updateSection = (idx: number, patch: Partial<Section>) => setSections((s) => s.map((sec, i) => i === idx ? { ...sec, ...patch } : sec));
  const removeSection = (idx: number) => setSections((s) => s.filter((_, i) => i !== idx).map((sec, i) => ({ ...sec, order: i })));
  const moveSection = (idx: number, dir: number) => setSections((s) => {
    const a = [...s]; const to = idx + dir; if (to < 0 || to >= a.length) return a; const [item] = a.splice(idx, 1); a.splice(to, 0, item); return a.map((sec, i) => ({ ...sec, order: i }));
  });

  const uploadAttachments = async (files: File[], idx: number) => {
    try {
      const res: any = await api.admin.uploadFiles(files as any);
      const uploaded = res?.data?.files || [];
      updateSection(idx, { attachments: [...(sections[idx]?.attachments || []), ...uploaded] });
      showToast('Uploaded', 'success');
    } catch (e: any) { showToast(e?.message || 'Upload failed', 'error'); }
  };

  const save = async () => {
    try {
      const payload = { name, sections };
      if (editing) {
        await api.admin.updateDetailTemplate(editing._id, payload);
        showToast('Template updated', 'success');
      } else {
        await api.admin.createDetailTemplate(payload);
        showToast('Template created', 'success');
      }
      load(); setEditing(null); setName(''); setSections([]);
    } catch (e: any) { showToast(e?.message || 'Save failed', 'error'); }
  };

  const remove = async (t: any) => { if (!confirm('Delete template?')) return; try { await api.admin.deleteDetailTemplate(t._id); showToast('Deleted', 'success'); load(); } catch (e: any) { showToast(e?.message || 'Delete failed', 'error'); } };

  const assignToProduct = async (templateId: string) => {
    if (!assignProductId) return showToast('Enter product ID', 'warning');
    try { await api.admin.updateProductDetailSections(assignProductId, { detailTemplate: templateId }); showToast('Assigned template to product', 'success'); } catch (e: any) { showToast(e?.message || 'Assign failed', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detail Templates</h1>
          <p className="text-gray-600 mt-1">Manage product detail templates for product pages (clothing, footwear, accessories, sale).</p>
        </div>
        <div>
          <button onClick={startCreate} className="px-3 py-2 bg-blue-600 text-white rounded">New Template</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow-sm">
          <h2 className="font-semibold mb-2">Templates</h2>
          {loading ? (<div>Loading...</div>) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t._id} className="border rounded p-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-gray-500">{(t.sections || []).length} sections</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-yellow-200" onClick={() => startEdit(t)}>Edit</button>
                    <button className="px-2 py-1 bg-red-200" onClick={() => remove(t)}>Delete</button>
                    <button className="px-2 py-1 bg-green-200" onClick={() => { const id = prompt('Enter product ID to assign this template to'); if (id) { setAssignProductId(id); assignToProduct(t._id); } }}>Assign</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded shadow-sm">
          <h2 className="font-semibold mb-2">{editing ? `Edit: ${editing.name}` : 'Create Template'}</h2>
          <div className="grid grid-cols-1 gap-3">
            <input className="border p-2" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Sections</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-gray-200 rounded" onClick={addSection}>Add Section</button>
                </div>
              </div>

              {sections.map((sec, idx) => (
                <div key={idx} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <input className="border p-1" value={sec.title || ''} onChange={(e) => updateSection(idx, { title: e.target.value })} />
                    <select value={sec.type} onChange={(e) => updateSection(idx, { type: e.target.value })} className="border p-1">
                      <option value="description">Description</option>
                      <option value="howto">How to Use</option>
                      <option value="care">Materials & Care</option>
                      <option value="size">Size & Fit</option>
                      <option value="delivery">Delivery</option>
                      <option value="returns">Returns</option>
                      <option value="warranty">Warranty</option>
                      <option value="disclaimer">Disclaimer</option>
                      <option value="other">Other</option>
                    </select>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!sec.published} onChange={(e) => updateSection(idx, { published: e.target.checked })} /> Published</label>
                    <div className="ml-auto flex gap-1">
                      <button className="px-2 py-1 border rounded" onClick={() => moveSection(idx, -1)}>↑</button>
                      <button className="px-2 py-1 border rounded" onClick={() => moveSection(idx, 1)}>↓</button>
                      <button className="px-2 py-1 bg-red-200 rounded" onClick={() => removeSection(idx)}>Remove</button>
                    </div>
                  </div>

                  <Wysiwyg value={sec.content || ''} onChange={(v) => updateSection(idx, { content: v })} />

                  <div className="mt-2">
                    <label className="text-sm font-medium">Flags</label>
                    <div className="flex gap-3 mt-1">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!sec.flags?.noExchange} onChange={(e) => updateSection(idx, { flags: { ...sec.flags, noExchange: e.target.checked } })} /> No Exchange</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!sec.flags?.noReturns} onChange={(e) => updateSection(idx, { flags: { ...sec.flags, noReturns: e.target.checked } })} /> No Returns</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!sec.flags?.fragile} onChange={(e) => updateSection(idx, { flags: { ...sec.flags, fragile: e.target.checked } })} /> Fragile</label>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-sm font-medium">Attachments</label>
                    <div className="mt-2 flex gap-2 items-center">
                      <input type="file" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) uploadAttachments(files, idx); e.currentTarget.value = ''; }} />
                    </div>
                    <div className="mt-2">
                      {(sec.attachments || []).map((a, i) => (
                        <div key={i} className="text-sm text-gray-700">- <a href={a.url} target="_blank" rel="noreferrer">{a.label || a.url}</a></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={save}>Save</button>
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => { setEditing(null); setName(''); setSections([]); }}>Cancel</button>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Quick Assign</h3>
              <div className="flex gap-2 mt-2">
                <input className="border p-2" placeholder="Product ID" value={assignProductId} onChange={(e) => setAssignProductId(e.target.value)} />
                <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={() => { if (!templates[0]) return showToast('No template available', 'warning'); assignToProduct(templates[0]._id); }}>Assign First Template</button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Use this to test assigning a template to a product quickly. Product ID can be found from admin products list.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDetailTemplates;
