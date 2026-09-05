// frontend/src/pages/admin/AdminFinancials.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Gift,
  CreditCard,
  Download,
  RefreshCw,
  Info,
  Receipt,
} from 'lucide-react';
import { api } from '../../api';
import { FinancialAnalytics } from '../../types';
import { useToast } from '../../context/ToastContext';

const formatPKR = (value = 0) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);

const formatShort = (v = 0) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
};

export const AdminFinancials: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'all' | '30d' | '7d'>('all');
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);

  const fetchFinancials = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      if (timeframe === '30d') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        startDate = d.toISOString();
        endDate = now.toISOString();
      } else if (timeframe === '7d') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        startDate = d.toISOString();
        endDate = now.toISOString();
      }

      const res = await api.admin.getFinancialAnalytics({ startDate, endDate });
      const data = res?.data?.financialAnalytics || res?.data;
      if (data && data.kpis) {
        setAnalytics(data as FinancialAnalytics);
      }
    } catch (err: any) {
      console.error('Failed to fetch financial analytics:', err);
      showToast(err?.message || 'Failed to load financial records', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe, showToast]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  const handleExportSummary = () => {
    if (!analytics) return;
    const kpis = analytics.kpis;
    const rows = [
      ['Metric', 'Amount (PKR) / Count'],
      ['Gross Recognized Revenue (Delivered)', kpis.recognizedRevenue],
      ['Delivered & Recognized Orders Count', kpis.deliveredOrdersCount],
      ['Cash Refunds Deducted', kpis.totalCashRefunds],
      ['Store Credit Discounts Redeemed', kpis.totalStoreCreditsRedeemed],
      ['Net Recognized Revenue', kpis.netRecognizedRevenue],
      ['Pipeline / Deferred Revenue (Unfulfilled)', kpis.pipelineRevenue],
      ['Pipeline Orders Count', kpis.pipelineOrdersCount],
      ['Total Store Credit Liability (Unspent)', kpis.activeStoreCreditLiability],
      ['Total Store Credits Issued', kpis.totalStoreCreditsIssued],
      ['Cancelled Orders Total Value', kpis.cancelledOrderValue],
      ['Cancelled Orders Count', kpis.cancelledOrdersCount],
      ['Gross Merchandise Value (GMV)', kpis.grossOrderValue],
      ['Total Orders Placed (All statuses)', kpis.totalOrdersCount],
      ['Generated At', new Date().toISOString()],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DENFiT-Financial-Report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Financial summary exported successfully', 'success');
  };

  const kpis = analytics?.kpis || {
    recognizedRevenue: 0,
    deliveredOrdersCount: 0,
    pipelineRevenue: 0,
    pipelineOrdersCount: 0,
    cancelledOrderValue: 0,
    cancelledOrdersCount: 0,
    grossOrderValue: 0,
    totalOrdersCount: 0,
    totalCashRefunds: 0,
    totalStoreCreditsIssued: 0,
    totalStoreCreditsRedeemed: 0,
    activeStoreCreditLiability: 0,
    netRecognizedRevenue: 0,
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financials & Recognized Revenue
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Delivery-Accrual Accounting
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Strict GAAP compliant revenue recognition: Revenue is recognized exclusively upon customer delivery confirmation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Timeframe Filter */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeframe === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeframe === '30d'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeframe === '7d'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
          </div>

          <button
            onClick={() => fetchFinancials(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            title="Refresh Financial Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleExportSummary}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Accounting Notice Banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong className="font-semibold text-indigo-950 dark:text-indigo-200">Revenue Accounting Rule: </strong>
          Orders in <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-mono">pending</code>, <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-mono">processing</code>, or <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-mono">shipped</code> statuses are categorized as <em>Pipeline Revenue (Deferred Unearned Income)</em>. Revenue is materialized strictly once delivery is confirmed and payment is verified.
        </div>
      </div>

      {/* Primary 4-Card Executive KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Net Recognized Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Recognized Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '...' : formatPKR(kpis.netRecognizedRevenue)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{kpis.deliveredOrdersCount} Delivered & Settled Orders</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
            Gross Delivered ({formatShort(kpis.recognizedRevenue)}) minus refunds & credits
          </div>
        </motion.div>

        {/* 2. Pipeline / Deferred Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pipeline / In-Transit
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '...' : formatPKR(kpis.pipelineRevenue)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{kpis.pipelineOrdersCount} Active In-Flight Orders</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
            Placed / Shipped orders awaiting delivery confirmation
          </div>
        </motion.div>

        {/* 3. Outstanding Store Credit Liability */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Store Credit
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '...' : formatPKR(kpis.activeStoreCreditLiability)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-400 font-medium">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Issued: {formatShort(kpis.totalStoreCreditsIssued)} | Redeemed: {formatShort(kpis.totalStoreCreditsRedeemed)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
            Current balance of valid exchange credit vouchers
          </div>
        </motion.div>

        {/* 4. Total Cash Refunds */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cash Refunds
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? '...' : formatPKR(kpis.totalCashRefunds)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cancelled Value: {formatShort(kpis.cancelledOrderValue)} ({kpis.cancelledOrdersCount} orders)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
            Direct cash/bank refunds disbursed to customers
          </div>
        </motion.div>
      </div>

      {/* Two-Column Deep Reconcilation & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Financial Statement Reconciliation Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Revenue Recognition Ledger
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                DENFiT Ledger v2.0
              </span>
            </div>

            <div className="space-y-4">
              {/* Row 1: Gross Delivered Order Value */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Gross Delivered Order Revenue
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Total value of all confirmed delivered orders
                  </div>
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  + {formatPKR(kpis.recognizedRevenue)}
                </div>
              </div>

              {/* Row 2: Less Cash Refunds */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                    Less: Customer Cash Refunds
                  </div>
                  <div className="text-xs text-rose-600/80 dark:text-rose-400/80">
                    Direct monetary reimbursements processed
                  </div>
                </div>
                <div className="text-base font-bold text-rose-700 dark:text-rose-400">
                  - {formatPKR(kpis.totalCashRefunds)}
                </div>
              </div>

              {/* Row 3: Less Store Credit Discounts */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                    Less: Store Credit Discounts Redeemed
                  </div>
                  <div className="text-xs text-purple-600/80 dark:text-purple-400/80">
                    Voucher balance redeemed against orders
                  </div>
                </div>
                <div className="text-base font-bold text-purple-700 dark:text-purple-400">
                  - {formatPKR(kpis.totalStoreCreditsRedeemed)}
                </div>
              </div>

              {/* Row 4: Net Recognized Revenue Total */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="space-y-0.5">
                  <div className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    = Net Recognized Revenue (Final Realized Income)
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    Total recognized revenue recognized to date
                  </div>
                </div>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {formatPKR(kpis.netRecognizedRevenue)}
                </div>
              </div>
            </div>

            {/* Supplementary Metrics */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gross Merchandise Value</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {formatPKR(kpis.grossOrderValue)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{kpis.totalOrdersCount} Total Orders Placed</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Order Value (Delivered)</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {formatPKR(
                    kpis.deliveredOrdersCount > 0
                      ? Math.round(kpis.recognizedRevenue / kpis.deliveredOrdersCount)
                      : 0
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Per delivered order</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cancellation Loss Rate</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {kpis.grossOrderValue > 0
                    ? ((kpis.cancelledOrderValue / kpis.grossOrderValue) * 100).toFixed(1) + '%'
                    : '0.0%'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{kpis.cancelledOrdersCount} Cancelled Orders</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Payment Method Breakdown & Voucher Health */}
        <div className="space-y-6">
          {/* Payment Method Distribution */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Payment Channels
                </h3>
              </div>
              <span className="text-xs text-slate-500">Delivered</span>
            </div>

            <div className="space-y-4">
              {analytics?.breakdowns?.paymentMethodSplit && analytics.breakdowns.paymentMethodSplit.length > 0 ? (
                analytics.breakdowns.paymentMethodSplit.map((channel) => {
                  const label =
                    channel._id === 'cash_on_delivery'
                      ? 'Cash on Delivery (COD)'
                      : channel._id === 'credit_card'
                      ? 'Debit / Credit Card'
                      : channel._id === 'store_credit'
                      ? 'Store Credit Voucher'
                      : channel._id || 'Standard';

                  const percentage =
                    kpis.recognizedRevenue > 0
                      ? Math.round((channel.recognizedRevenue / kpis.recognizedRevenue) * 100)
                      : 0;

                  return (
                    <div key={channel._id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatPKR(channel.recognizedRevenue)} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 text-right">
                        {channel.ordersCount} delivered orders
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No payment data available for this timeframe.
                </div>
              )}
            </div>
          </div>

          {/* Store Credit Voucher Health Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Store Credit Health
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Issued Total:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatPKR(kpis.totalStoreCreditsIssued)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Redeemed Total:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(kpis.totalStoreCreditsRedeemed)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Current Liability:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{formatPKR(kpis.activeStoreCreditLiability)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-300 leading-normal">
              Store credits are issued for customer exchanges or returns and carry zero cash outflow until redeemed at checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFinancials;
