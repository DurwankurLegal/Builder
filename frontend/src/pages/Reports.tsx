import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Maximize2, XCircle, Download } from 'lucide-react';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { exportToCsv } from '../utils/exportCsv';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

export const Reports = () => {
  const { showToast } = useUIStore();
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-summary'],
    queryFn: async () => (await apiClient.get('/reports/summary')).data
  });

  const monthlySalesData = summary?.monthly_sales || [];
  const sourceData = (summary?.lead_sources || []).map((s: any, i: number) => ({
    ...s, color: PIE_COLORS[i % PIE_COLORS.length]
  }));
  const execPerformanceData = summary?.executive_performance || [];

  const exportDataset = (which: string) => {
    let count = 0;
    if (which === 'sales' || which === 'CSV' || which === 'PDF') {
      count = exportToCsv('monthly_sales_report', [
        { key: 'month', label: 'Month' },
        { key: 'bookings', label: 'Bookings Closed' },
        { key: 'value_cr', label: 'Sales Value (Cr)' },
      ], monthlySalesData);
    } else if (which === 'sources') {
      count = exportToCsv('lead_sources_report', [
        { key: 'name', label: 'Channel' },
        { key: 'value', label: 'Lead Count' },
      ], sourceData);
    } else if (which === 'executives') {
      count = exportToCsv('executive_performance_report', [
        { key: 'name', label: 'Executive' },
        { key: 'deals', label: 'Customers Won' },
        { key: 'pipeline', label: 'Active Pipeline' },
      ], execPerformanceData);
    }
    showToast(count > 0 ? `Exported ${count} row(s) to CSV.` : 'No data available to export yet.', count > 0 ? 'success' : 'info');
  };

  const emptyState = (label: string) => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
      {isLoading ? 'Compiling analytics...' : label}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>Analytical Reports</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Workspace conversion matrices and executives logs — live data</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <button className="btn btn-outline" onClick={() => exportDataset('sources')}><Download size={14} style={{ marginRight: '4px' }} /> Channels CSV</button>
          <button className="btn btn-primary" onClick={() => exportDataset('sales')}><Download size={14} style={{ marginRight: '4px' }} /> Sales CSV</button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Chart 1: Monthly Sales */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedChart('sales')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
            <h4 className="card-title">Monthly Sales Volumes (₹ Cr)</h4>
            <Maximize2 size={14} className="text-muted" />
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            {monthlySalesData.length === 0 ? emptyState('No bookings recorded yet.') : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value_cr" name="Sales (₹ Cr)" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Lead conversions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedChart('sources')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
            <h4 className="card-title">Lead Channel Distribution</h4>
            <Maximize2 size={14} className="text-muted" />
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            {sourceData.length === 0 ? emptyState('No leads captured yet.') : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={60} innerRadius={40} dataKey="value">
                    {sourceData.map((e: any, i: number) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Executive Sales */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', cursor: 'pointer', position: 'relative' }} onClick={() => setExpandedChart('executives')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
            <h4 className="card-title">Sales RM Conversions</h4>
            <Maximize2 size={14} className="text-muted" />
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            {execPerformanceData.length === 0 ? emptyState('No executive activity yet.') : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} width={80} />
                  <Tooltip />
                  <Bar dataKey="deals" name="Customers Won" fill="var(--color-success)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                  <YAxis yAxisId="value" />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="value" dataKey="value_cr" name="Sales Value (₹ Cr)" fill="var(--brand-primary)" />
                  <Bar yAxisId="count" dataKey="bookings" name="Bookings Closed" fill="var(--color-success)" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {expandedChart === 'sources' && (
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '300px', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={4} dataKey="value">
                        {sourceData.map((e: any, i: number) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginLeft: 'var(--spacing-6)' }}>
                  {sourceData.map((s: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '3px', backgroundColor: s.color }} />
                      <span style={{ fontWeight: 'bold' }}>{s.name}: {s.value} lead(s)</span>
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
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deals" name="Customers Won" fill="var(--color-success)" />
                  <Bar dataKey="pipeline" name="Active Pipeline" fill="var(--brand-primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="dialog-footer">
            <button className="btn btn-outline" onClick={() => setExpandedChart(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => exportDataset(expandedChart)}>Download CSV Dataset</button>
          </div>
        </dialog>
      )}
    </div>
  );
};
export default Reports;
