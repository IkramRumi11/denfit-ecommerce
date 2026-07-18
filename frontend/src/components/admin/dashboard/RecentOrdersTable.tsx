import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface RecentOrder {
    id: string;
    orderNumber?: string;
    customer: string;
    email: string;
    items: number;
    total: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    date: string;
        createdAt?: string;
        confirmedAt?: string;
        processingAt?: string;
        shippedAt?: string;
        deliveredAt?: string;
        cancelledAt?: string;
        statusHistory?: Array<{ from?: string; to?: string; at?: string }>; 
    payment: "paid" | "pending" | "failed";
}

interface RecentOrdersTableProps {
    orders: RecentOrder[];
    onStatusChange: (order: RecentOrder, newStatus: string) => void;
}

const formatPKR = (value = 0) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

const statusStyles = (status: RecentOrder["status"]) => {
    const styles = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        processing: "bg-blue-100 text-blue-800 border-blue-300",
        shipped: "bg-purple-100 text-purple-800 border-purple-300",
        delivered: "bg-green-100 text-green-800 border-green-300",
        cancelled: "bg-red-100 text-red-800 border-red-300",
    };
    return styles[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

const paymentStyles = (status: RecentOrder["payment"]) => {
    const styles = {
        paid: "bg-green-100 text-green-800 border-green-300",
        pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        failed: "bg-red-100 text-red-800 border-red-300",
    };
    return styles[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ orders, onStatusChange }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="font-bold text-gray-900 text-lg">Recent Orders</div>
                    <div className="text-sm text-gray-600">Latest customer purchases and status</div>
                </div>
                <button
                    onClick={() => navigate("/admin/orders")}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
                >
                    View All Orders
                </button>
            </div>

            <div className="space-y-3">
                {orders.map((order) => (
                    <motion.div
                        key={order.id}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/admin/orders/${order.id}`);
                            }
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {/* Show a short badge from orderNumber when available, fall back to id */}
                                {(order.orderNumber || order.id).toString().split('-')[1] || (order.orderNumber || order.id).toString().slice(0,3).toUpperCase() || 'ORD'}
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                                    {order.orderNumber || order.id}
                                </div>
                                <div className="text-sm text-gray-600">{order.customer}</div>
                                {(() => {
                                    const first = (order as any).items && (order as any).items.length ? (order as any).items[0] : null;
                                    if (!first) return null;
                                    const colorLabel = first.color ? (first.color.name || first.color) : (first.colorName || '');
                                    const meta = `${first.size ? 'Size: ' + first.size : ''}${first.size && colorLabel ? ' • ' : ''}${colorLabel ? 'Color: ' + colorLabel : ''}`;
                                    return meta ? <div className="text-xs text-gray-500 mt-1">{meta}</div> : null;
                                })()}
                                <div className="text-xs text-gray-500">{order.email}</div>
                                {/* Placed time */}
                                <div className="text-xs text-gray-400 mt-1">Placed: {order.date ? new Date(order.date).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }) : (order.createdAt ? new Date(order.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }) : '')}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="font-bold text-gray-900">{formatPKR(order.total)}</div>
                                <div className="text-sm text-gray-600">{order.items} items</div>
                            </div>

                            <div className="flex flex-col gap-1 items-end">
                                {/* Quick change dropdown - only show allowed transitions */}
                                <select
                                    value=""
                                    onChange={(e) => { const v = e.target.value; if (v) onStatusChange(order, v); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 ${statusStyles(order.status)} cursor-pointer hover:shadow-sm transition-all`}
                                >
                                    <option value="">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</option>
                                    {(() => {
                                        const allowed: Record<string, string[]> = {
                                            pending: ['confirmed','cancelled'],
                                            confirmed: ['processing','cancelled'],
                                            processing: ['shipped','cancelled'],
                                            shipped: ['delivered'],
                                            delivered: [],
                                            cancelled: []
                                        };
                                        const options = allowed[order.status] || [];
                                        return options.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>);
                                    })()}
                                </select>

                                <div className={`px-2 py-1 rounded text-xs font-medium ${paymentStyles(order.payment)}`}>
                                    {order.payment}
                                </div>
                                {/* Last status update time */}
                                <div className="text-xs text-gray-400 mt-1">
                                                                        {(() => {
                                                                                const o: any = order as any;
                                                                                const candidates = [o.cancelledAt, o.deliveredAt, o.shippedAt, o.processingAt, o.confirmedAt, o.updatedAt, o.createdAt, o.date]
                                                                                    .filter(Boolean)
                                                                                    .map((t: any) => new Date(t).getTime())
                                                                                    .filter(Boolean);
                                                                                if (!candidates.length) return '';
                                                                                const max = Math.max(...candidates);
                                                                                return `Updated: ${new Date(max).toLocaleString()}`;
                                                                        })()}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default RecentOrdersTable;
