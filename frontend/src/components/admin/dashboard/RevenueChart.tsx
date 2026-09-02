import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SalesData {
    date: string;
    sales: number;
    orders: number;
    visitors: number;
}

const formatPKR = (value = 0) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

const RevenueChartInner: React.FC<{ data?: SalesData[] }> = ({ data = [] }) => {
    // Always call hooks in the same order. Use useMemo to normalize input data.
    const chartData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

    const maxSales = useMemo(() => Math.max(...chartData.map((d) => d.sales), 1), [chartData]);
    const maxOrders = useMemo(() => Math.max(...chartData.map((d) => d.orders), 1), [chartData]);

    const widthUnit = 80;
    const height = 200;
    const w = Math.max(500, (chartData.length - 1) * widthUnit + 100);

    const salesPoints = chartData.map((d, i) => ({
        x: i * widthUnit + 50,
        y: height - (d.sales / maxSales) * (height - 40) - 20,
        d
    }));

    const ordersPoints = chartData.map((d, i) => ({
        x: i * widthUnit + 50,
        y: height - (d.orders / maxOrders) * (height - 40) - 20,
        d
    }));

    const salesPath = salesPoints.map(p => `${p.x},${p.y}`).join(" ");
    const ordersPath = ordersPoints.map(p => `${p.x},${p.y}`).join(" ");

    if (chartData.length === 0) {
        return (
            <div data-testid="revenue-chart" className="w-full rounded-xl bg-white p-6 shadow-sm border border-gray-200 text-center text-gray-600">
                <div className="font-medium mb-1">Revenue</div>
                <div className="text-sm">No sales data to display</div>
            </div>
        );
    }

    return (
        <div data-testid="revenue-chart" className="w-full overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Orders</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full h-48 min-w-[500px]">
                    <defs>
                        <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="ordersGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* Sales Area */}
                    <polygon
                        points={`50,${height} ${salesPoints.map(p => `${p.x},${p.y}`).join(" ")} ${salesPoints[salesPoints.length - 1].x},${height}`}
                        fill="url(#salesGradient)"
                    />

                    {/* Orders Area */}
                    <polygon
                        points={`50,${height} ${ordersPoints.map(p => `${p.x},${p.y}`).join(" ")} ${ordersPoints[ordersPoints.length - 1].x},${height}`}
                        fill="url(#ordersGradient)"
                    />

                    {/* Sales Line */}
                    <polyline fill="none" stroke="#3b82f6" strokeWidth={3} strokeLinecap="round" points={salesPath} />

                    {/* Orders Line */}
                    <polyline fill="none" stroke="#10b981" strokeWidth={3} strokeLinecap="round" points={ordersPath} />

                    {/* Data Points */}
                    {salesPoints.map((p, idx) => (
                        <g key={`sales-${idx}`}>
                            <motion.circle
                                cx={p.x}
                                cy={p.y}
                                r={4}
                                initial={{ r: 0 }}
                                animate={{ r: 4 }}
                                whileHover={{ r: 6, scale: 1.2 }}
                                className="fill-blue-500 cursor-pointer"
                            />
                            <title>{`${p.d.date}\nRevenue: ${formatPKR(p.d.sales)}\nOrders: ${p.d.orders}`}</title>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
};

export const RevenueChart = React.memo(RevenueChartInner);
RevenueChart.displayName = 'RevenueChart';

export default RevenueChart;
