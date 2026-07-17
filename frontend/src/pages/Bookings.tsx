import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { 
  ArrowLeft, Download
} from 'lucide-react';

export const Bookings = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const [activeBookingNo, setActiveBookingNo] = useState<string | null>(null);

  // Queries
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await apiClient.get('/bookings');
      return res.data;
    }
  });

  const { data: activeBooking } = useQuery({
    queryKey: ['booking', activeBookingNo],
    queryFn: async () => {
      if (!activeBookingNo) return null;
      const res = await apiClient.get(`/bookings/${activeBookingNo}`);
      return res.data;
    },
    enabled: !!activeBookingNo
  });

  // Mutation to toggle milestone paid/pending status
  const updateBookingMutation = useMutation({
    mutationFn: async ({ no, data }: { no: string; data: any }) => {
      const res = await apiClient.put(`/bookings/${no}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', activeBookingNo] });
      showToast('Milestone transaction status updated!', 'success');
    }
  });

  const toggleMilestone = (idx: number) => {
    if (!activeBooking) return;
    const milestones = [...(activeBooking.milestones || [])];
    const target = milestones[idx];
    if (target) {
      target.status = target.status === 'Paid' ? 'Pending' : 'Paid';
    }

    updateBookingMutation.mutate({
      no: activeBooking.bookingNo,
      data: { milestones }
    });
  };

  const updateLegalProgress = (field: 'agreement_status' | 'registration_status', current: string) => {
    if (!activeBooking) return;
    let updateVal = '';
    if (field === 'agreement_status') {
      updateVal = current === 'Executed' ? 'Pending' : 'Executed';
    } else {
      updateVal = current === 'Completed' ? 'Applied' : current === 'Applied' ? 'Completed' : 'Applied';
    }

    updateBookingMutation.mutate({
      no: activeBooking.bookingNo,
      data: { [field]: updateVal }
    });
  };

  if (activeBookingNo && activeBooking) {
    // DETAIL BOOKING SCHEDULER VIEW
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        {/* Detail Header */}
        <div className="page-header-actions" style={{ marginBottom: 0 }}>
          <div>
            <button className="btn btn-outline" onClick={() => setActiveBookingNo(null)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <ArrowLeft size={16} /> Back to Bookings list
            </button>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
              Booking No: <b>{activeBooking.bookingNo}</b> &bull; Managed Client
            </p>
          </div>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Status: ActiveClosed</span>
        </div>

        {/* Profile Split Grid */}
        <div className="profile-layout">
          {/* Profile Left Sidebar Card */}
          <div className="card profile-sidebar-card">
            <h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-4)' }}>Property parameters</h3>
            <ul className="profile-detail-list">
              <li className="profile-detail-item">
                <span className="profile-detail-label">Client Name</span>
                <span className="profile-detail-value">{activeBooking.customer_name}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Project</span>
                <span className="profile-detail-value">{activeBooking.project}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Flat No</span>
                <span className="profile-detail-value">{activeBooking.unit_no}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Slab Area</span>
                <span className="profile-detail-value">{activeBooking.slab_area}</span>
              </li>
            </ul>
          </div>

          {/* Right Side: Compliance Details & Installments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            {/* Legal Status Card */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Legal Compliance Progress</h3>
              <div className="grid-2" style={{ gap: 'var(--spacing-4)' }}>
                <div 
                  onClick={() => updateLegalProgress('agreement_status', activeBooking.agreement_status)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: '500', fontSize: 'var(--font-size-sm)' }}>Agreement Stamp Execution</span>
                  <span className={`badge ${activeBooking.agreement_status === 'Executed' ? 'badge-success' : 'badge-warning'}`}>
                    {activeBooking.agreement_status}
                  </span>
                </div>
                <div 
                  onClick={() => updateLegalProgress('registration_status', activeBooking.registration_status)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: '500', fontSize: 'var(--font-size-sm)' }}>Sub-Registrar Registry</span>
                  <span className={`badge ${activeBooking.registration_status === 'Completed' ? 'badge-success' : activeBooking.registration_status === 'Applied' ? 'badge-info' : 'badge-warning'}`}>
                    {activeBooking.registration_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Installments Table Card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--spacing-4)', borderBottom: '1px solid var(--border-color)' }}>
                <h4 className="card-title">Payment Milestone Installments Scheduling</h4>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Milestone description</th>
                      <th>Installment ratio</th>
                      <th>Value</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeBooking.milestones || []).map((m: any, idx: number) => (
                      <tr 
                        key={idx} 
                        className="clickable" 
                        onClick={() => toggleMilestone(idx)}
                      >
                        <td style={{ fontWeight: '600' }}>{m.milestone}</td>
                        <td>{m.ratio}</td>
                        <td style={{ fontWeight: 'bold' }}>{m.value}</td>
                        <td>{m.dueDate}</td>
                        <td>
                          <span className={`badge ${m.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT LIST GRID VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>Closed Bookings Database</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Agreement signatures and compliance workflows records</p>
        </div>
        <button className="btn btn-outline" onClick={() => showToast('Closed bookings exported!', 'success')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Download size={16} /> Export Registers
        </button>
      </div>

      {/* Grid Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking No</th>
                <th>Client name</th>
                <th>Project RERA</th>
                <th>Allocated flat</th>
                <th>Agreement billing</th>
                <th>Paid token</th>
                <th>Legal state</th>
                <th>Registry</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying booking records...</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>No closed deals bookings found.</td>
                </tr>
              ) : bookings.map((b: any) => (
                <tr key={b.bookingNo} className="clickable" onClick={() => setActiveBookingNo(b.bookingNo)}>
                  <td style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{b.bookingNo}</td>
                  <td style={{ fontWeight: '600' }}>{b.customer_name}</td>
                  <td>{b.project}</td>
                  <td>{b.unit_no}</td>
                  <td style={{ fontWeight: 'bold' }}>{b.booking_value}</td>
                  <td>{b.token_amount}</td>
                  <td>
                    <span className={`badge ${b.agreement_status === 'Executed' ? 'badge-success' : b.agreement_status === 'Executed' ? 'badge-success' : 'badge-warning'}`}>
                      {b.agreement_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${b.registration_status === 'Completed' ? 'badge-success' : b.registration_status === 'Applied' ? 'badge-info' : 'badge-warning'}`}>
                      {b.registration_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Bookings;
