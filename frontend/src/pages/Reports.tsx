import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Maximize2, XCircle } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export const Reports = () => {
  const { showToast } = useUIStore();
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const monthlySalesData = [
    { month: 'Jan', sales: 42, target: 50 },
    { month: 'Feb', sales: 58, target: 55 },
    { month: 'Mar', sales: 74, target: 70 },
    { month: 'Apr', sales: 65, target: 68 },
    { month: 'May', sales: 91, target: 80 },
    { month: 'Jun', sales: 88, target: 85 },
  ];

  const sourceData = [
    { name: 'Google Ads', value: 40, color: '#4f46e5' },
    { name: 'Referral', value: 25, color: '#10b981' },
    { name: 'Direct Visit', value: 20, color: '#f59e0b' },
    { name: 'Newspaper', value: 15, color: '#ec4899' },
  ];

  const execPerformanceData = [
    { name: 'Priya Patel', deals: 14, pipeline: 22 },
    { name: 'Amit Singh', deals: 11, pipeline: 18 },
    { name: 'Sanjay Kumar', deals: 9, pipeline: 15 },
    { name: 'Anjali Desai', deals: 6, pipeline: 12 },
  ];

  const triggerExport = (format: string) => {
    showToast(`Compiled report downloaded successfully as ${format}!`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>Analytical Reports</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Workspace conversion matrices and executives logs</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <button className="btn btn-outline" onClick={() => triggerExport('PDF')}>Export PDF</button>
          <button className="btn btn-primary" onClick={() => triggerExport('CSV')}>Export CSV</button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Chart 1: Monthly Sales */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedChart('sales')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
            <h4 className="card-title">Monthly Sales Volumes</h4>
            <Maximize2 size={14} className="text-muted" />
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={10} />
                <Tooltip />
                <Bar dataKey="sales" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Lead conversions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedChart('sources')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
            <h4 className="card-title">Lead Channel Distribution</h4>
            <Maximize2 size={14} className="text-muted" />
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={60} innerRadius={40} dataKey="value">
                  {sourceData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Executive Sales */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedChart('executives')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
            <h4 className="card-title">Sales RM Conversions</h4>
            <Maximize2 size={14} className="text-muted" />
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={execPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} width={80} />
                <Tooltip />
                <Bar dataKey="deals" fill="var(--color-success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <dialog open className="dialog" style={{ maxWidth: '800px', width: '90%' }}>
          <div className="dialog-header">
            <h3 className="dialog-title">
              {expandedChart === 'sales' && 'Detailed Monthly Sales Performance'}
              {expandedChart === 'sources' && 'Lead Conversion Channels Analysis'}
              {expandedChart === 'executives' && 'Executive Performance Analysis'}
            </h3>
            <button className="dialog-close" onClick={() => setExpandedChart(null)}><XCircle size={16} /></button>
          </div>
          <div className="dialog-body" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {expandedChart === 'sales' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" name="Actual Sales" fill="var(--brand-primary)" />
                  <Bar dataKey="target" name="Target Quota" fill="var(--text-muted)" />
                </BarChart>
              </ResponsiveContainer>
            )}
            
            {expandedChart === 'sources' && (
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '300px', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={4} dataKey="value">
                        {sourceData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginLeft: 'var(--spacing-6)' }}>
                  {sourceData.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '3px', backgroundColor: s.color }} />
                      <span style={{ fontWeight: 'bold' }}>{s.name}: {s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedChart === 'executives' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deals" name="Closed Bookings" fill="var(--color-success)" />
                  <Bar dataKey="pipeline" name="Active Pipeline" fill="var(--brand-primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="dialog-footer">
            <button className="btn btn-outline" onClick={() => setExpandedChart(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => triggerExport(expandedChart)}>Download CSV Dataset</button>
          </div>
        </dialog>
      )}
    </div>
  );
};
export default Reports;
