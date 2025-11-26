import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    type: "info" | "success" | "warning" | "error";
    read: boolean;
}

interface DashboardNotificationsProps {
    notifications: Notification[];
    onMarkRead: (id: string) => void;
}

const DashboardNotifications: React.FC<DashboardNotificationsProps> = ({ notifications, onMarkRead }) => {
    const navigate = useNavigate();
    const unreadNotifications = notifications.filter(n => !n.read);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-gray-900 text-lg">Notifications</div>
                {unreadNotifications.length > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        {unreadNotifications.length} new
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {notifications.slice(0, 3).map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${notification.read
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-blue-50 border-blue-200'
                            }`}
                        onClick={() => onMarkRead(notification.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onMarkRead(notification.id);
                            }
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="font-medium text-gray-900 text-sm">
                                {notification.title}
                            </div>
                            {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                            {notification.message}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                            {notification.time}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => navigate("/admin/audits")}
                className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
                View All Notifications
            </button>
        </div>
    );
};

export default DashboardNotifications;
