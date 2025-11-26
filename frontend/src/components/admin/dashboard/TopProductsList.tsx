import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface TopProduct {
    id: string;
    name: string;
    category: string;
    sales: number;
    revenue: number;
    image?: string;
    stock: number;
    trend: "up" | "down" | "stable";
    rating: number;
}

const formatPKR = (value = 0) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

const formatShort = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
};

const TopProductsList: React.FC<{ products: TopProduct[] }> = ({ products }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-gray-900 text-lg">Top Products</div>
                <button
                    onClick={() => navigate("/admin/products")}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {products.map((product) => (
                    <motion.div
                        key={product.id}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer group"
                        onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                            {product.image}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-purple-700">
                                {product.name}
                            </div>
                            <div className="text-xs text-gray-600">{product.category}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-gray-900">{formatShort(product.sales)}</div>
                            <div className="text-xs text-gray-600">{formatPKR(product.revenue)}</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default TopProductsList;
