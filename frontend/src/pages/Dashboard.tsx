import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Users, ShieldCheck, Sparkles, Frown, CalendarDays, Coins, Wallet, Phone, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

const TASK_ICONS: Record<string, JSX.Element> = {
  'Call': <Phone size={10} />,
  'Meeting': <Users size={10} />,
  'Site Visit': <CalendarDays size={10} />,
  'Document': <Mail size={10} />,
};

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

export const Dashboard = () => {
  const navigate = useNavigate();

  // Single aggregate payload computed server-side from live workspace data
  const { data: summary } = useQuery({
    queryKey: ['report-summary'],
    queryFn: async () => (await apiClient.get('/reports/summary')).data
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => (await apiClient.get('/leads')).data
  });

  const { data: followups = [] } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => (await apiClient.get('/followups')).data
  });

  const upcomingTasks = followups
    .filter((t: any) => t.status === 'Pending')
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const salesTrendData = summary?.monthly_sales || [];
  const sourceChartData = (summary?.lead_sources || []).map((s: any, i: number) => ({
    ...s, color: PIE_COLORS[i % PIE_COLORS.length]
  }));
  const totalSourceCount = sourceChartData.reduce((sum: number, s: any) => sum + s.value, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Top Stats Cards Grid */}
      <div className="dashboard-grid">
        {/* Total Leads */}
        <div className="card stat-card interactive" onClick={() => navigate('/leads')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Total Leads</div>
            <div className="stat-card-icon"><Users size={16} /></div>
          </div>
          <div className="stat-card-value">{summary?.total_leads ?? '—'}</div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Leads database records</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="card stat-card interactive" onClick={() => navigate('/customers')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Active Customers</div>
            <div className="stat-card-icon"><ShieldCheck size={16} /></div>
          </div>
          <div className="stat-card-value">{summary?.active_customers ?? '—'}</div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Converted &amp; registered buyers</span>
          </div>
        </div>

        {/* Deals Closed */}
        <div className="card stat-card interactive" onClick={() => navigate('/bookings')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Deals Closed</div>
            <div className="stat-card-icon"><Sparkles size={16} /></div>
          </div>
          <div className="stat-card-value">{summary?.deals_closed ?? '—'}</div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Agreement bookings</span>
          </div>
        </div>

        {/* Deals Lost */}
        <div className="card stat-card interactive" onClick={() => navigate('/lost')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Deals Lost</div>
            <div className="stat-card-icon"><Frown size={16} /></div>
          </div>
          <div className="stat-card-value">{summary?.deals_lost ?? '—'}</div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Marked lost in leads DB</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Today's Follow-ups */}
        <div className="card stat-card interactive" onClick={() => navigate('/followups')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Today's Follow-ups</div>
            <div className="stat-card-icon"><CalendarDays size={16} /></div>
          </div>
          <div className="stat-card-value">{summary?.followups_today ?? '—'}</div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Pending tasks due today</span>
          </div>
        </div>

        {/* Site Visits */}
        <div className="card stat-card interactive" onClick={() => navigate('/followups')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Pending Site Visits</div>
            <div className="stat-card-icon"><CalendarDays size={16} /></div>
          </div>
          <div className="stat-card-value">{summary?.pending_site_visits ?? '—'}</div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Scheduled &amp; awaiting visit</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="card stat-card">
          <div className="stat-card-top">
            <div className="stat-card-label">Monthly Sales Value</div>
            <div className="stat-card-icon"><Coins size={16} /></div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.55rem', lineHeight: '1.5' }}>
            {summary ? formatInr(summary.monthly_sales_value) : '—'}
          </div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Bookings closed this month</span>
          </div>
        </div>

        {/* Booking Portfolio */}
        <div className="card stat-card interactive" onClick={() => navigate('/bookings')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Total Booking Portfolio</div>
            <div className="stat-card-icon"><Wallet size={16} /></div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.55rem', lineHeight: '1.5' }}>
            {summary ? formatInr(summary.booking_portfolio_value) : '—'}
          </div>
          <div className="stat-card-trend">
            <span className="stat-card-trend-text">Cumulative bookings value</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Sales Trend Line Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sales Trend (₹ Cr, last 6 months)</h2>
            <div className="badge badge-info">Live Data</div>
          </div>
          <div className="chart-container" style={{ minHeight: '260px' }}>
            {salesTrendData.length === 0 ? (
              <div style={{ display: 'flex', height: '260px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No bookings recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value_cr" name="Sales (₹ Cr)" stroke="var(--brand-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="var(--color-success)" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Sources Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Lead Sources Distribution</h2>
            <div className="badge badge-success">Live Data</div>
          </div>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
            {sourceChartData.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>No leads captured yet.</span>
            ) : (
              <>
                <div style={{ width: '180px', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {sourceChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginLeft: 'var(--spacing-4)' }}>
                  {sourceChartData.map((s: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-xs)' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: s.color }} />
                      <span style={{ fontWeight: '500' }}>
                        {s.name}: {totalSourceCount ? Math.round((s.value / totalSourceCount) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tables & Activity feeds */}
      <div className="recent-grid">
        {/* Recent Leads */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Inbound Leads</h2>
            <button className="btn btn-outline" onClick={() => navigate('/leads')}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            {leads.length === 0 && (
              <div style={{ padding: 'var(--spacing-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No leads registered yet.
              </div>
            )}
            {leads.slice(0, 5).map((lead: any) => (
              <div
                key={lead.id}
                className="dashboard-list-item interactive"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/leads`)}
              >
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{lead.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{lead.project} • {lead.budget}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${
                    lead.status === 'New' ? 'badge-info' :
                    lead.status === 'Site Visit Done' ? 'badge-success' : 'badge-neutral'
                  }`}>{lead.status}</span>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>{lead.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Followups (live) */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Tasks & Follow-ups</h2>
            <button className="btn btn-outline" onClick={() => navigate('/followups')}>Calendar View</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            {upcomingTasks.length === 0 && (
              <div style={{ padding: 'var(--spacing-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No pending follow-ups — schedule one from the Follow-ups screen.
              </div>
            )}
            {upcomingTasks.map((t: any) => (
              <div key={t.id} className="dashboard-list-item interactive" style={{ cursor: 'pointer' }} onClick={() => navigate('/followups')}>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{t.client}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{t.activity}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${t.task_type === 'Meeting' ? 'badge-warning' : t.task_type === 'Site Visit' ? 'badge-success' : 'badge-info'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    {TASK_ICONS[t.task_type] || <Phone size={10} />} {t.task_type}
                  </span>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>{t.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
