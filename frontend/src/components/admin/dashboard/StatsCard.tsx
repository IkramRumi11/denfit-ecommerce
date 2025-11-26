import React from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
    title: string;
    value: string | number;
    change: number;
    icon: string;
    color: "blue" | "green" | "yellow" | "red" | "purple";
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon, color }) => {
    const colorConfig = {
        blue: { bg: "bg-blue-100", text: "text-blue-700", change: "text-blue-600" },
        green: { bg: "bg-green-100", text: "text-green-700", change: "text-green-600" },
        yellow: { bg: "bg-yellow-100", text: "text-yellow-700", change: "text-yellow-600" },
        red: { bg: "bg-red-100", text: "text-red-700", change: "text-red-600" },
        purple: { bg: "bg-purple-100", text: "text-purple-700", change: "text-purple-600" },
    }[color];

    return (
        <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
            <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${colorConfig.bg} ${colorConfig.text}`}>
                    <span className="text-2xl">{icon}</span>
                </div>
                <div className={`text-sm font-bold ${colorConfig.change} flex items-center gap-1`}>
                    {change > 0 ? "↗" : change < 0 ? "↘" : "→"}
                    {Math.abs(change)}%
                </div>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-600 mt-1">{title}</div>
            </div>
        </motion.div>
    );
};

export default StatsCard;
