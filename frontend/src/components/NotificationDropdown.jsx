import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationDropdown({ onClose }) {
  const { notifications, load, markRead } = useNotifications();

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white border rounded shadow-lg z-50">
      <div className="p-2 border-b flex justify-between items-center">
        <strong>Notifications</strong>
        <button onClick={onClose} className="text-sm text-gray-500">Close</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((n) => (
          <div key={n._id} className={`p-3 border-b ${n.isRead ? 'bg-white' : 'bg-blue-50'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-sm text-gray-600">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</div>
              </div>
              {!n.isRead && (
                <button onClick={() => markRead(n._id)} className="ml-2 text-sm text-blue-600">Mark read</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t text-center">
        <a href="/notifications" className="text-sm text-blue-600">View all notifications</a>
      </div>
    </div>
  );
}
