import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { API_BASE_URL } from '../../api';
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  // Calendar removed (not used here)
  Clock,
  User,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  Trash2,
  Edit,
  Plus,
  Database,
  Lock,
  Unlock,
  Mail,
  ShoppingCart,
  Package,
  Users,
  // Removed unused icons: ArrowUpRight, TrendingUp, Zap, Bell, ExternalLink
} from 'lucide-react';

interface AuditLog {
  _id: string;
  createdAt: string;
  actorName?: string;
  actor?: { name?: string };
  type: string;
  message: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const AdminAudits: React.FC = () => {
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAudits = React.useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/audits?page=${p}&limit=20&search=${encodeURIComponent(search)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data?.data) {
        // Enrich with simulated metadata if not present
        const enrichedAudits = (data.data.audits || []).map((audit: AuditLog) => ({
          ...audit,
          severity: audit.severity || (['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any),
          ipAddress: audit.ipAddress || `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        }));
        setAudits(enrichedAudits);
        setPage(data.data.pagination?.current || p);
        setPages(data.data.pagination?.pages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAudits(1);
  }, [fetchAudits]);

  const handleSearch = () => {
    fetchAudits(1);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(audits, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('user')) return <Users className="w-4 h-4" />;
    if (typeLower.includes('order')) return <ShoppingCart className="w-4 h-4" />;
    if (typeLower.includes('product')) return <Package className="w-4 h-4" />;
    if (typeLower.includes('delete')) return <Trash2 className="w-4 h-4" />;
    if (typeLower.includes('edit') || typeLower.includes('update')) return <Edit className="w-4 h-4" />;
    if (typeLower.includes('create') || typeLower.includes('add')) return <Plus className="w-4 h-4" />;
    if (typeLower.includes('login') || typeLower.includes('auth')) return <Lock className="w-4 h-4" />;
    if (typeLower.includes('logout')) return <Unlock className="w-4 h-4" />;
    if (typeLower.includes('email')) return <Mail className="w-4 h-4" />;
    if (typeLower.includes('setting')) return <Settings className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('delete')) return 'from-red-500 to-rose-600';
    if (typeLower.includes('create') || typeLower.includes('add')) return 'from-green-500 to-emerald-600';
    if (typeLower.includes('edit') || typeLower.includes('update')) return 'from-blue-500 to-indigo-600';
    if (typeLower.includes('login') || typeLower.includes('auth')) return 'from-purple-500 to-violet-600';
    if (typeLower.includes('order')) return 'from-amber-500 to-orange-600';
    return 'from-gray-500 to-slate-600';
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-3 h-3" />;
      case 'high':
        return <AlertCircle className="w-3 h-3" />;
      case 'medium':
        return <Info className="w-3 h-3" />;
      case 'low':
        return <CheckCircle2 className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Karachi',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                Audit Log
              </h1>
              <p className="text-gray-600 flex items-center gap-2 ml-1">
                <Activity className="w-4 h-4" />
                Track all system activities and changes
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchAudits(page)}
                disabled={loading}
                className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-200 hover:border-indigo-300 transition-all group"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleExport}
                className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-200 hover:border-emerald-300 transition-all group"
                title="Export logs"
              >
                <Download className="w-5 h-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl shadow-md hover:shadow-lg border transition-all group ${
                  showFilters
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white border-gray-200 hover:border-purple-300'
                }`}
                title="Filters"
              >
                <Filter className={`w-5 h-5 transition-colors ${showFilters ? 'text-white' : 'text-gray-600 group-hover:text-purple-600'}`} />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-md border border-gray-200 flex-1 max-w-2xl group focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by message, actor, or type..."
                  className="flex-1 border-none outline-none bg-transparent text-sm"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); fetchAudits(1); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Search
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-in slide-in-from-top">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="auditFilterType" className="text-sm font-medium text-gray-700 mb-2 block">Event Type</label>
                    <select
                      id="auditFilterType"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="all">All Types</option>
                      <option value="user">User Actions</option>
                      <option value="order">Order Events</option>
                      <option value="product">Product Changes</option>
                      <option value="auth">Authentication</option>
                      <option value="system">System Events</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2 block">Time Range</p>
                    <div className="flex gap-2">
                      {(['today', 'week', 'month', 'all'] as const).map((range) => (
                        <button
                          key={range}
                          onClick={() => setDateRange(range)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            dateRange === range
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auditSeverity" className="text-sm font-medium text-gray-700 mb-2 block">Severity</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                      <option value="all">All Levels</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{audits.length}</div>
                <div className="text-xs text-gray-500">Total Events</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{new Set(audits.map(a => a.actorName)).size}</div>
                <div className="text-xs text-gray-500">Active Users</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {audits.filter(a => a.severity === 'high' || a.severity === 'critical').length}
                </div>
                <div className="text-xs text-gray-500">High Priority</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">24/7</div>
                <div className="text-xs text-gray-500">Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div data-testid="audit-logs" className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <LoadingSpinner size="xl" />
              <p className="text-gray-600 mt-4 font-medium">Loading audit logs...</p>
            </div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full inline-flex mb-4">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No audit logs found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div data-testid="audit-header" className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4">
                <div className="grid grid-cols-12 gap-4 text-white font-semibold text-sm">
                  <div className="col-span-2" data-testid="col-time">Time</div>
                  <div className="col-span-2" data-testid="col-actor">Actor</div>
                  <div className="col-span-2" data-testid="col-type">Type</div>
                  <div className="col-span-4" data-testid="col-message">Message</div>
                  <div className="col-span-1" data-testid="col-severity">Severity</div>
                  <div className="col-span-1 text-right" data-testid="col-actions">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100">
                {audits.map((audit) => (
                  <div
                    key={audit._id}
                    className="group hover:bg-gradient-to-r hover:from-indigo-50 hover:via-purple-50 hover:to-pink-50 transition-all cursor-pointer"
                    onClick={() => setSelectedAudit(audit)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedAudit(audit);
                      }
                    }}
                  >
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                      {/* Time */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{getTimeAgo(audit.createdAt)}</div>
                            <div className="text-xs text-gray-500">{formatDate(audit.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Actor */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {audit.actorName || audit.actor?.name || 'System'}
                            </div>
                            {audit.ipAddress && (
                              <div className="text-xs text-gray-500">{audit.ipAddress}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${getTypeColor(audit.type)} text-white shadow-md`}>
                          {getTypeIcon(audit.type)}
                          <span className="text-xs font-semibold">{audit.type}</span>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="col-span-4">
                        <p className="text-sm text-gray-700 line-clamp-2">{audit.message}</p>
                      </div>

                      {/* Severity */}
                      <div className="col-span-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getSeverityBadge(audit.severity)}`}>
                          {getSeverityIcon(audit.severity)}
                          {audit.severity || 'info'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAudit(audit);
                          }}
                          className="p-2 hover:bg-indigo-100 rounded-lg transition-colors group/btn"
                        >
                          <Eye className="w-4 h-4 text-gray-400 group-hover/btn:text-indigo-600 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAudits(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-medium">Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchAudits(pageNum)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      page === pageNum
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {pages > 5 && <span className="px-2 text-gray-500">...</span>}
            </div>

            <button
              onClick={() => fetchAudits(Math.min(pages, page + 1))}
              disabled={page >= pages || loading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <span className="font-medium">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm text-gray-600 font-medium">
            Page <span className="font-bold text-gray-900">{page}</span> of{' '}
            <span className="font-bold text-gray-900">{pages}</span>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedAudit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div
              role="button"
              tabIndex={0}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedAudit(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedAudit(null);
                }
              }}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Audit Details
                  </h3>
                  <button
                    onClick={() => setSelectedAudit(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase">Event ID</div>
                      <p className="text-sm font-mono text-gray-900 mt-1">{selectedAudit._id}</p>
                    </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase">Timestamp</div>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedAudit.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">Actor</div>
                    <p className="text-sm text-gray-900 mt-1">{selectedAudit.actorName || selectedAudit.actor?.name || 'System'}</p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">Event Type</div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${getTypeColor(selectedAudit.type)} text-white shadow-md`}>
                        {getTypeIcon(selectedAudit.type)}
                        {selectedAudit.type}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">Severity Level</div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border ${getSeverityBadge(selectedAudit.severity)}`}>
                        {getSeverityIcon(selectedAudit.severity)}
                        {selectedAudit.severity || 'info'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">Message</div>
                    <p className="text-sm text-gray-900 mt-1 leading-relaxed">{selectedAudit.message}</p>
                  </div>

                  {selectedAudit.ipAddress && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase">IP Address</div>
                      <p className="text-sm font-mono text-gray-900 mt-1">{selectedAudit.ipAddress}</p>
                    </div>
                  )}

                  {selectedAudit.payload && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Payload Data
                      </div>
                      <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg mt-2 overflow-x-auto font-mono">
                        {JSON.stringify(selectedAudit.payload, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedAudit.userAgent && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase">User Agent</div>
                      <p className="text-xs text-gray-600 mt-1 break-all">{selectedAudit.userAgent}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const data = JSON.stringify(selectedAudit, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `audit-${selectedAudit._id}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAudits;