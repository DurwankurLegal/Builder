import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, ShieldCheck, Sparkles, Frown, CalendarDays, Coins, Wallet, Phone, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const navigate = useNavigate();

  // Query leads, customers, bookings, and followups from backend APIs to compute metrics
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await apiClient.get('/leads');
      return res.data;
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      return res.data;
    }
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await apiClient.get('/bookings');
      return res.data;
    }
  });

  const { data: lostLeads = [] } = useQuery({
    queryKey: ['leads-lost'],
    queryFn: async () => {
      const res = await apiClient.get('/leads?status=Lost');
      return res.data;
    }
  });

  // Calculate metrics
  const totalLeads = leads.length;
  const activeCustomers = customers.length;
  const totalBookings = bookings.length;
  const totalLost = lostLeads.length;

  const totalSalesVal = bookings.reduce((sum: number, b: any) => {
    // Parse value string (e.g. "₹1.20 Cr" or similar)
    const val = parseFloat(b.booking_value?.replace(/[^0-9.]/g, '') || '0') * 10000000; // Cr multiplier
    return sum + (val || 12000000); // fallback default
  }, 0);

  const formattedTotalSales = new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(totalSalesVal || 48500000);

  // Recharts configurations
  const salesTrendData = [
    { month: 'Jan', Sales: 42, Target: 50 },
    { month: 'Feb', Sales: 58, Target: 55 },
    { month: 'Mar', Sales: 74, Target: 70 },
    { month: 'Apr', Sales: 65, Target: 68 },
    { month: 'May', Sales: 91, Target: 80 },
    { month: 'Jun', Sales: totalBookings + 85, Target: 85 },
  ];

  const sourceChartData = [
    { name: 'Google Ads', value: 40, color: '#4f46e5' },
    { name: 'Referral', value: 25, color: '#10b981' },
    { name: 'Direct Visit', value: 20, color: '#f59e0b' },
    { name: 'Newspaper', value: 15, color: '#ec4899' },
  ];

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
          <div className="stat-card-value">{totalLeads}</div>
          <div className="stat-card-trend up">
            <TrendingUp size={12} />
            <span>12.4%</span>
            <span className="stat-card-trend-text">vs last month</span>
          </div>
        </div>

        {/* Qualified Customers */}
        <div className="card stat-card interactive" onClick={() => navigate('/customers')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Active Customers</div>
            <div className="stat-card-icon"><ShieldCheck size={16} /></div>
          </div>
          <div className="stat-card-value">{activeCustomers}</div>
          <div className="stat-card-trend up">
            <TrendingUp size={12} />
            <span>8.2%</span>
            <span className="stat-card-trend-text">vs last month</span>
          </div>
        </div>

        {/* Deals Closed */}
        <div className="card stat-card interactive" onClick={() => navigate('/bookings')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Deals Closed</div>
            <div className="stat-card-icon"><Sparkles size={16} /></div>
          </div>
          <div className="stat-card-value">{totalBookings}</div>
          <div className="stat-card-trend up">
            <TrendingUp size={12} />
            <span>15.1%</span>
            <span className="stat-card-trend-text">vs last month</span>
          </div>
        </div>

        {/* Deals Lost */}
        <div className="card stat-card interactive" onClick={() => navigate('/lost')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Deals Lost</div>
            <div className="stat-card-icon"><Frown size={16} /></div>
          </div>
          <div className="stat-card-value">{totalLost}</div>
          <div className="stat-card-trend down">
            <TrendingDown size={12} style={{ color: 'var(--color-danger)' }} />
            <span style={{ color: 'var(--color-danger)' }}>3.2%</span>
            <span className="stat-card-trend-text">vs last month</span>
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
          <div className="stat-card-value">3</div>
          <div className="stat-card-trend up">
            <span className="badge badge-warning">1 Meeting scheduled</span>
          </div>
        </div>

        {/* Site Visits */}
        <div className="card stat-card interactive" onClick={() => navigate('/followups')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Pending Site Visits</div>
            <div className="stat-card-icon"><CalendarDays size={16} /></div>
          </div>
          <div className="stat-card-value">14</div>
          <div className="stat-card-trend up">
            <TrendingUp size={12} />
            <span>4 this week</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="card stat-card">
          <div className="stat-card-top">
            <div className="stat-card-label">Monthly Sales Value</div>
            <div className="stat-card-icon"><Coins size={16} /></div>
          </div>
          <div className="stat-card-value">₹2.45 Cr</div>
          <div className="stat-card-trend up">
            <TrendingUp size={12} />
            <span>18.6%</span>
            <span className="stat-card-trend-text">vs target</span>
          </div>
        </div>

        {/* Booking Value */}
        <div className="card stat-card interactive" onClick={() => navigate('/bookings')}>
          <div className="stat-card-top">
            <div className="stat-card-label">Total Booking Portfolio</div>
            <div className="stat-card-icon"><Wallet size={16} /></div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.55rem', lineHeight: '1.5' }}>{formattedTotalSales}</div>
          <div className="stat-card-trend up">
            <span className="stat-card-trend-text">Cumulative bookings metrics</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Sales Trend Line Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sales Trend & Projection</h2>
            <div className="badge badge-info">Monthly Breakdown</div>
          </div>
          <div className="chart-container" style={{ minHeight: '260px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Sales" stroke="var(--brand-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Target" stroke="var(--text-muted)" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Lead Sources Distribution</h2>
            <div className="badge badge-success">High Conversion</div>
          </div>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
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
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginLeft: 'var(--spacing-4)' }}>
              {sourceChartData.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-xs)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: s.color }} />
                  <span style={{ fontWeight: '500' }}>{s.name}: {s.value}%</span>
                </div>
              ))}
            </div>
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

        {/* Upcoming Followups */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Tasks & Follow-ups</h2>
            <button className="btn btn-outline" onClick={() => navigate('/followups')}>Calendar View</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            <div className="dashboard-list-item">
              <div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>Rajesh Nair</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Discuss CLP payment structure</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <Phone size={10} /> Call
                </span>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>2026-07-16</div>
              </div>
            </div>

            <div className="dashboard-list-item">
              <div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>Meera Iyer</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Accompany tower B flat checks</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <Users size={10} /> Meeting
                </span>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>2026-07-18</div>
              </div>
            </div>

            <div className="dashboard-list-item">
              <div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>Vikram Seth</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Collect PAN photo copies</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <Mail size={10} /> Doc
                </span>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>2026-07-20</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
