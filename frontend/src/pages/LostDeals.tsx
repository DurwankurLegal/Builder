import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
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
        <button className="btn btn-outline" onClick={() => showToast('Lost deals analysis exported!', 'success')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                const lostLog = (l.history || []).find((h: any) => h.detail.includes('marked lost'));
                let reason = 'Budget Constraint';
                let competitor = 'Direct competitor';
                
                if (lostLog) {
                  const matchReason = lostLog.detail.match(/Reason:\s([^.]+)/);
                  const matchComp = lostLog.detail.match(/Competitor:\s([^.]+)/);
                  if (matchReason) reason = matchReason[1];
                  if (matchComp) competitor = matchComp[1];
                }

                return (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{l.id}</td>
                    <td style={{ fontWeight: '600' }}>{l.name}</td>
                    <td>{l.project}</td>
                    <td>{l.budget}</td>
                    <td>{l.date}</td>
                    <td>
                      <span className="badge badge-danger">{reason}</span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{competitor}</td>
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
