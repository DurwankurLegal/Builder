import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { exportToCsv } from '../utils/exportCsv';
import { Download } from 'lucide-react';

export const LostDeals = () => {
  const { showToast } = useUIStore();

  // Query leads with status "Lost"
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-lost'],
    queryFn: async () => {
      const res = await apiClient.get('/leads?status=Lost');
      return res.data;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>Lost Deals Registry</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Opportunities drop analysis and competitor tracking</p>
        </div>
        <button className="btn btn-outline" onClick={() => {
          const n = exportToCsv('lost_deals', [
            { key: 'id', label: 'Lead No' },
            { key: 'date', label: 'Date' },
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'project', label: 'Project' },
            { key: 'budget', label: 'Budget' },
            { key: 'source', label: 'Source' },
            { key: 'executive', label: 'Executive' },
            { key: 'status', label: 'Status' },
          ], leads);
          showToast(`Exported ${n} lost deal(s) to CSV.`, 'success');
        }} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Download size={16} /> Export Analysis
        </button>
      </div>

      {/* Grid Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Client Name</th>
                <th>Project RERA</th>
                <th>Budget range</th>
                <th>Lost Date</th>
                <th>Primary Lost Reason</th>
                <th>Competitor chosen</th>
                <th>Sales executive</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying lost registers...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>No records of lost leads. Good job!</td>
                </tr>
              ) : leads.map((l: any) => {
                // Reason/competitor come from the mark-lost history record; when
                // absent we show a dash rather than inventing values.
                const lostLog = (l.history || []).find((h: any) => (h.detail || '').includes('marked lost'));
                const reason = lostLog?.detail.match(/Reason:\s([^.]+)/)?.[1] || null;
                const competitor = lostLog?.detail.match(/Competitor:\s([^.]+)/)?.[1] || null;

                return (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{l.id}</td>
                    <td style={{ fontWeight: '600' }}>{l.name}</td>
                    <td>{l.project}</td>
                    <td>{l.budget}</td>
                    <td>{l.date}</td>
                    <td>
                      {reason ? <span className="badge badge-danger">{reason}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: '500' }}>{competitor || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{l.executive}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default LostDeals;
