import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [desiredEmail, setDesiredEmail] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Do not allow email changes from the settings UI to preserve verification
      await updateUser({ name, phone });
      showToast('Profile updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desiredEmail) return;
    setRequesting(true);
    try {
      await authAPI.requestEmailChange(desiredEmail, requestReason);
      showToast('Email change request submitted', 'success');
      setShowRequestModal(false);
      setDesiredEmail('');
      setRequestReason('');
    } catch (err: any) {
      showToast(err?.message || 'Request failed', 'error');
    } finally {
      setRequesting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to access account settings</h2>
          <Link to="/auth" className="btn-primary">Login / Signup</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-sm text-gray-600">Manage your account details</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 p-3" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input value={email} readOnly disabled className="mt-1 block w-full rounded-lg border-gray-200 p-3 bg-gray-50 cursor-not-allowed" />
              <p className="text-sm text-gray-500 mt-1">Email cannot be changed here. Contact support to request an email change.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 p-3" />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button>
              <Link to="/profile" className="btn-secondary">Back to Profile</Link>
              <button type="button" onClick={() => setShowRequestModal(true)} className="btn-secondary">Request email change</button>
            </div>
          </form>
        </div>
      </div>
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-3">Request Email Change</h3>
              <form onSubmit={submitEmailChangeRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Desired Email</label>
                  <input value={desiredEmail} onChange={(e) => setDesiredEmail(e.target.value)} placeholder="new-email@example.com" className="mt-1 block w-full rounded-lg border-gray-200 p-3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
                  <textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 p-3" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={requesting} className="btn-primary">{requesting ? 'Sending...' : 'Submit request'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Settings;

