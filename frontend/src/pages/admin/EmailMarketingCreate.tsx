import React, { useState, useRef, useEffect } from 'react';
import { adminAPI } from '../../api';
import { useToast } from '../../context/ToastContext';

const EmailMarketingCreate: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [content, setContent] = useState('<p>Hello,</p><p>We hope this email finds you well.</p>');
  const [recipientType, setRecipientType] = useState<'customers'|'newsletter'|'all'|'verified'|'active'>('newsletter');
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

  const onSendTest = async () => {
    if (!testEmail) return showToast('Enter recipient email', 'error');
    if (!subject) return showToast('Enter subject in the Subject textbox', 'error');
    setTestSending(true);
    try {
      await adminAPI.sendCampaignTest({ to: testEmail, subject, content });
      setConfirmAction(null);
      setConfirmMessage(`The email has been sent to ${testEmail} (Subject: ${subject})`);
      setConfirmOpen(true);
      // Auto-refresh after brief delay to reflect any server-side state changes
      setTimeout(() => { try { window.location.reload(); } catch (e) { /* ignore */ } }, 1200);
    } catch (e: any) {
      showToast(e?.message || 'Failed', 'error');
    } finally {
      setTestSending(false);
    }
  };

  const onSend = async () => {
    if (!subject || !content) {
      showToast('Subject and content required', 'error');
      return null;
    }
    setSending(true);
    try {
      const res = await adminAPI.createCampaign({ from: fromEmail || undefined, subject, content, recipientType });
      return res;
    } catch (e: any) {
      showToast(e?.message || 'Failed to send', 'error');
      return null;
    } finally {
      setSending(false);
    }
  };

  const handleSendClick = async () => {
    await updateRecipientCount();
    setConfirmMessage(`Send to ${recipientCount ?? 'unknown'} recipients?`);
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        const res = await onSend();
        // Show success in modal by replacing action with an OK-only modal
        setConfirmAction(null);
        setConfirmMessage('Campaign queued: ' + (res?.message || 'done'));
        // Auto-refresh the page after a short delay when send succeeded
        if (res && res.success !== false) {
          setTimeout(() => {
            try { window.location.reload(); } catch (e) { /* ignore */ }
          }, 1200);
        }
      } finally {
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  const updateRecipientCount = async () => {
    try {
      const params: any = { page: 1, limit: 1 };
      if (recipientType === 'customers') params.source = 'customer';
      else if (recipientType === 'newsletter') params.source = 'newsletter';
      else if (recipientType === 'verified') params.verified = true;
      else if (recipientType === 'active') params.status = 'active';
      const res: any = await adminAPI.getSubscribers(params);
      const total = res && res.data && typeof res.data.total === 'number' ? res.data.total : (res && res.total) || null;
      setRecipientCount(total);
    } catch (err) {
      setRecipientCount(null);
    }
  };

  const exec = (cmd: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, value);
    setContent(editorRef.current.innerHTML);
  };

  const openPreview = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
    setPreviewOpen(true);
  };

  // prevent background scroll when modal open
  useEffect(() => {
    if (previewOpen || confirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [previewOpen, confirmOpen]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Create Email Campaign</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">From Email</label>
        <input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="use system default if empty" className="w-full border px-3 py-2 rounded" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Subject <span className="text-red-500">*</span></label>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Please enter email subject" aria-required="true" className="w-full border px-3 py-2 rounded" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Content (Rich Text) <span className="text-red-500">*</span></label>
        <div className="border rounded">
          <div className="p-2 bg-gray-50 flex gap-2">
            <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('bold')}>Bold</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('italic')}>Italic</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('insertUnorderedList')}>UL</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => { const url = prompt('Image URL'); if (url) exec('insertImage', url); }}>Image</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => { const url = prompt('Link URL'); if (url) exec('createLink', url); }}>Link</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => exec('insertHTML', '<div style="padding:12px;background:#f3f4f6;border-radius:6px;">Banner</div>')}>Banner</button>
            <button type="button" className="ml-auto px-2 py-1 text-sm text-gray-700" onClick={openPreview}>Preview</button>
          </div>
          <div ref={editorRef} contentEditable className="p-3 min-h-[200px]" onInput={() => setContent(editorRef.current?.innerHTML || '')} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Recipients</label>
        <div className="flex gap-4 items-center">
          <select value={recipientType} onChange={e => { setRecipientType(e.target.value as any); }} className="border px-3 py-2 rounded">
            <option value="all">All</option>
            <option value="customers">Customers Only</option>
            <option value="newsletter">Newsletter Only</option>
            <option value="verified">Verified Only</option>
            <option value="active">Active Only</option>
          </select>
          <button type="button" onClick={updateRecipientCount} className="px-3 py-2 bg-gray-800 text-white rounded">Count Recipients</button>
          {recipientCount !== null && <div className="text-sm">Total recipients: <strong>{recipientCount}</strong></div>}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Specific Customer@gmail.com" className="border px-3 py-2 rounded w-64" />
          <button type="button" onClick={onSendTest} disabled={testSending} className="px-4 py-2 bg-gray-800 text-white rounded">{testSending ? 'Sending...' : 'Send Email Specifically'}</button>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={handleSendClick} disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded">{sending ? 'Sending...' : 'Send Campaign'}</button>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true" onClick={() => setPreviewOpen(false)} />
          <div className="relative z-50 w-full max-w-3xl p-0">
            <div className="bg-white rounded shadow-lg overflow-auto max-h-[90vh] transform transition-all duration-200 ease-out scale-95 opacity-0 animate-modal-in" role="dialog" aria-modal="true" aria-label="Email preview">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Preview</h3>
                <button className="px-3 py-1 border rounded" onClick={() => setPreviewOpen(false)}>Close</button>
              </div>
              <div className="p-4">
                <div className="border p-4" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true" onClick={() => { if (!confirmLoading) setConfirmOpen(false); }} />
          <div className="relative z-50 w-full max-w-xl p-4">
            <div className="bg-white rounded shadow-lg overflow-hidden transform transition-all duration-200 ease-out animate-modal-in">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Confirm send</h3>
              </div>
              <div className="p-4">
                <p className="mb-4">{confirmMessage}</p>
                        <div className="flex justify-end gap-2">
                          {confirmAction ? (
                            <>
                              <button className="px-3 py-2 border rounded" onClick={() => { if (!confirmLoading) setConfirmOpen(false); }} disabled={confirmLoading}>Cancel</button>
                              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async () => { if (!confirmAction) return; await confirmAction(); }} disabled={confirmLoading}>{confirmLoading ? 'Sending...' : 'Confirm'}</button>
                            </>
                          ) : (
                            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { if (!confirmLoading) setConfirmOpen(false); }}>OK</button>
                          )}
                        </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailMarketingCreate;
