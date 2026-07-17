import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { exportToCsv } from '../utils/exportCsv';
import {
  Plus, Search, Download, Trash2, ArrowLeft, XCircle, Clock,
  Edit, UserCheck, Sparkles, Phone, RotateCcw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string().min(3, 'Full name must have at least 3 letters'),
  email: z.string().email('Invalid email address format'),
  phone: z.string().regex(/^(?:\+91\s\d{5}\s\d{5}|\d{10})$/, 'Must match: +91 XXXXX XXXXX or 10-digit number'),
  project: z.string().min(1, 'Please select a RERA project'),
  budget: z.string().min(1, 'Please specify budget scale'),
  source: z.string().min(1, 'Please select lead channel'),
  executive: z.string().min(1, 'Please assign sales executive'),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export const Leads = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Search & Filters parameters
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query Leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', search, projectFilter, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/leads`, {
        params: { search, project: projectFilter, status: statusFilter }
      });
      return res.data;
    }
  });

  // Query single lead detail profile
  const { data: activeLead } = useQuery({
    queryKey: ['lead', activeLeadId],
    queryFn: async () => {
      if (!activeLeadId) return null;
      const res = await apiClient.get(`/leads/${activeLeadId}`);
      return res.data;
    },
    enabled: !!activeLeadId
  });

  // Mutators
  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormValues) => {
      const res = await apiClient.post('/leads', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast('Lead registered successfully!', 'success');
      setShowAddModal(false);
    },
    onError: () => {
      showToast('Lead creation failed.', 'danger');
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.put(`/leads/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', activeLeadId] });
      showToast('Lead details updated successfully!', 'success');
    }
  });

  const convertLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/leads/${id}/convert`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['lead', activeLeadId] });
      showToast('Lead converted to active customer context!', 'success');
      setActiveLeadId(null);
    }
  });

  const { register, handleSubmit, formState: { errors } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      project: 'Sunrise Heights',
      budget: '₹85 Lakhs',
      source: 'Google Ads',
      executive: 'Priya Patel'
    }
  });

  const onSubmitNewLead = (values: LeadFormValues) => {
    createLeadMutation.mutate(values);
  };

  const handleRemarkSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('remarkText') as HTMLInputElement;
    if (!input || !input.value || !activeLead) return;

    const newRemark = {
      user: 'Priya Patel',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      text: input.value
    };

    const remarks = [newRemark, ...(activeLead.remarks || [])];
    updateLeadMutation.mutate({
      id: activeLead.id,
      data: { remarks }
    });
    input.value = '';
    setShowRemarkModal(false);
  };

  const handleTimelineSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const type = (form.elements.namedItem('activityType') as HTMLSelectElement).value;
    const detail = (form.elements.namedItem('activityDetail') as HTMLInputElement).value;
    if (!detail || !activeLead) return;

    const newTimeline = {
      type,
      date: new Date().toISOString().split('T')[0],
      detail
    };

    const history = [newTimeline, ...(activeLead.history || [])];
    updateLeadMutation.mutate({
      id: activeLead.id,
      data: { history }
    });
    setShowTimelineModal(false);
  };

  const markLostLead = (reason: string, competitor: string) => {
    if (!activeLead) return;
    const history = [...(activeLead.history || [])];
    history.unshift({
      type: 'Status Change',
      date: new Date().toISOString().split('T')[0],
      detail: `Lead marked lost. Reason: ${reason}. Competitor: ${competitor || 'None'}`
    });

    updateLeadMutation.mutate({
      id: activeLead.id,
      data: { status: 'Lost', history }
    });
    setShowLostModal(false);
  };

  // Sorting
  const sortedLeads = [...leads].sort((a: any, b: any) => {
    const valA = a[sortField] || '';
    const valB = b[sortField] || '';
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  // Pagination
  const paginatedLeads = sortedLeads.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(sortedLeads.length / limit) || 1;

  if (activeLeadId && activeLead) {
    // LEAD DETAIL CONTAINER VIEW
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        {/* Detail Header Actions */}
        <div className="page-header-actions" style={{ marginBottom: 0 }}>
          <div>
            <button className="btn btn-outline" onClick={() => setActiveLeadId(null)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <ArrowLeft size={16} /> Back to Leads
            </button>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
              Lead No: <b>{activeLead.id}</b> &bull; Registered on {activeLead.date}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
              <Edit size={16} style={{ marginRight: '6px' }} /> Edit
            </button>
            {activeLead.status !== 'Converted' && activeLead.status !== 'Lost' && (
              <>
                <button className="btn btn-secondary" onClick={() => setShowLostModal(true)}>
                  <Trash2 size={16} style={{ marginRight: '6px' }} /> Mark Lost
                </button>
                <button className="btn btn-success" onClick={() => convertLeadMutation.mutate(activeLead.id)}>
                  <UserCheck size={16} style={{ marginRight: '6px' }} /> Convert to Customer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Split Grid */}
        <div className="profile-layout">
          {/* Profile Left Sidebar Card */}
          <div className="card profile-sidebar-card">
            <div className="profile-avatar-large" style={{ background: 'var(--brand-bg-light)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
              {activeLead.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <h3 style={{ fontSize: 'var(--font-size-base)' }}>{activeLead.name}</h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Lead Account</p>

            <ul className="profile-detail-list">
              <li className="profile-detail-item">
                <span className="profile-detail-label">Mobile</span>
                <span className="profile-detail-value">{activeLead.phone}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value" style={{ wordBreak: 'break-all' }}>{activeLead.email}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Interested Project</span>
                <span className="profile-detail-value">{activeLead.project}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Budget range</span>
                <span className="profile-detail-value">{activeLead.budget}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Lead Source</span>
                <span className="profile-detail-value">{activeLead.source}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Sales Executive</span>
                <span className="profile-detail-value">{activeLead.executive}</span>
              </li>
            </ul>
          </div>

          {/* Profile Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            {/* Quick Timeline Flow indicator */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Lead Pipeline Stage</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--border-color)', zIndex: 1 }} />
                {['New', 'Contacted', 'Qualified', 'Site Visit Done', 'Negotiation'].map((stage, idx) => {
                  const stages = ['New', 'Contacted', 'Qualified', 'Site Visit Done', 'Negotiation'];
                  const currentIdx = stages.indexOf(activeLead.status);
                  const isActive = stages.indexOf(stage) <= currentIdx && activeLead.status !== 'Lost';
                  return (
                    <div key={stage} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div 
                        onClick={() => {
                          if (activeLead.status !== 'Converted' && activeLead.status !== 'Lost') {
                            updateLeadMutation.mutate({ id: activeLead.id, data: { status: stage } });
                          }
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-muted)', border: '3px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 'var(--font-weight-medium)', color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timelines, Remarks Logs Split Grids */}
            <div className="recent-grid">
              {/* Activity log timeline */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Activity Timeline</h3>
                  <button className="btn btn-outline" style={{ padding: '2px var(--spacing-2)', fontSize: 'var(--font-size-xs)' }} onClick={() => setShowTimelineModal(true)}>Log Call</button>
                </div>
                <div className="timeline">
                  {(activeLead.history || []).map((hist: any, idx: number) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-marker">
                        {hist.type === 'Created' ? <Sparkles size={11} /> : hist.type === 'Call' ? <Phone size={11} /> : <Clock size={11} />}
                      </div>
                      <div className="timeline-content">
                        <span className="timeline-time">{hist.date}</span>
                        <h4 className="timeline-title">{hist.type}</h4>
                        <p className="timeline-desc">{hist.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks logs list */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Interaction Notes</h3>
                  <button className="btn btn-outline" style={{ padding: '2px var(--spacing-2)', fontSize: 'var(--font-size-xs)' }} onClick={() => setShowRemarkModal(true)}>Add Note</button>
                </div>
                <div className="remarks-list">
                  {(activeLead.remarks || []).length === 0 ? (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-6)' }}>No remarks logged yet.</p>
                  ) : (
                    (activeLead.remarks || []).map((rem: any, idx: number) => (
                      <div key={idx} className="remark-item">
                        <div className="remark-meta">
                          <span>{rem.user}</span>
                          <span>{rem.date}</span>
                        </div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-main)' }}>{rem.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Event Modal */}
        {showTimelineModal && (
          <dialog open className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Log Relationship Touchpoint</h3>
              <button className="dialog-close" onClick={() => setShowTimelineModal(false)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={handleTimelineSubmit}>
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div className="form-group">
                  <label className="form-label">Activity Type</label>
                  <select name="activityType" className="form-control" style={{ width: '100%' }}>
                    <option value="Call">Phone Call</option>
                    <option value="Meeting">Site Meeting</option>
                    <option value="Doc">Document Action</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Activity Details</label>
                  <input type="text" name="activityDetail" className="form-control" placeholder="Discussed payment structure and token details" style={{ width: '100%' }} required />
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTimelineModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Event</button>
              </div>
            </form>
          </dialog>
        )}

        {/* Remark Modal */}
        {showRemarkModal && (
          <dialog open className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Add Interaction Note</h3>
              <button className="dialog-close" onClick={() => setShowRemarkModal(false)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={handleRemarkSubmit}>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label">Note Content</label>
                  <input type="text" name="remarkText" className="form-control" placeholder="Client requested pricing quote for 3BHK flats" style={{ width: '100%' }} required />
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowRemarkModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Note</button>
              </div>
            </form>
          </dialog>
        )}

        {/* Lost Lead Modal */}
        {showLostModal && (
          <dialog open className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Mark Lead as Lost</h3>
              <button className="dialog-close" onClick={() => setShowLostModal(false)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const reason = (form.elements.namedItem('lostReason') as HTMLSelectElement).value;
              const competitor = (form.elements.namedItem('competitorName') as HTMLInputElement).value;
              markLostLead(reason, competitor);
            }}>
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div className="form-group">
                  <label className="form-label">Primary Drop Reason</label>
                  <select name="lostReason" className="form-control" style={{ width: '100%' }}>
                    <option value="Budget Constraint">Budget Constraint</option>
                    <option value="Bought competitor property">Bought competitor property</option>
                    <option value="Location mismatch">Location mismatch</option>
                    <option value="Delayed project timelines">Delayed project timelines</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Competitor Chosen</label>
                  <input type="text" name="competitorName" className="form-control" placeholder="e.g. Prestige Lavender" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowLostModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Lost</button>
              </div>
            </form>
          </dialog>
        )}

        {/* Edit Lead Modal */}
        {showEditModal && (
          <dialog open className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Edit Lead Profile — {activeLead.id}</h3>
              <button className="dialog-close" onClick={() => setShowEditModal(false)}><XCircle size={16} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              updateLeadMutation.mutate({
                id: activeLead.id,
                data: {
                  name: (form.elements.namedItem('editName') as HTMLInputElement).value,
                  email: (form.elements.namedItem('editEmail') as HTMLInputElement).value,
                  phone: (form.elements.namedItem('editPhone') as HTMLInputElement).value,
                  project: (form.elements.namedItem('editProject') as HTMLSelectElement).value,
                  budget: (form.elements.namedItem('editBudget') as HTMLInputElement).value,
                  executive: (form.elements.namedItem('editExecutive') as HTMLSelectElement).value,
                }
              });
              setShowEditModal(false);
            }}>
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div className="form-group">
                  <label className="form-label">Prospect Name</label>
                  <input type="text" name="editName" className="form-control" defaultValue={activeLead.name} style={{ width: '100%' }} required />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Email ID</label>
                    <input type="email" name="editEmail" className="form-control" defaultValue={activeLead.email} style={{ width: '100%' }} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Mobile Number</label>
                    <input type="text" name="editPhone" className="form-control" defaultValue={activeLead.phone} style={{ width: '100%' }} required />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Project</label>
                    <select name="editProject" className="form-control" defaultValue={activeLead.project} style={{ width: '100%' }}>
                      <option value="Sunrise Heights">Sunrise Heights</option>
                      <option value="Green Meadows">Green Meadows</option>
                      <option value="Royal Residency">Royal Residency</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Budget</label>
                    <input type="text" name="editBudget" className="form-control" defaultValue={activeLead.budget} style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Sales Executive</label>
                  <select name="editExecutive" className="form-control" defaultValue={activeLead.executive} style={{ width: '100%' }}>
                    <option value="Priya Patel">Priya Patel</option>
                    <option value="Amit Singh">Amit Singh</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </dialog>
        )}
      </div>
    );
  }

  // DEFAULT LIST GRID VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Page Header Actions */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Leads Database</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Manage and qualify property inquiry leads</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <button className="btn btn-outline" id="leads-export-btn" onClick={() => {
            const n = exportToCsv('leads_database', [
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
            ], sortedLeads);
            showToast(`Exported ${n} lead(s) to CSV.`, 'success');
          }}>
            <Download size={16} style={{ marginRight: '6px' }} /> Export Data
          </button>
          <button className="btn btn-primary" id="add-lead-trigger" onClick={() => setShowAddModal(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add New Lead
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            className="form-control" 
            id="lead-search" 
            placeholder="Search by name, lead ID, mobile..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-selects">
          <select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Site Visit Done">Site Visit Done</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>

          <select id="filter-project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            <option value="Sunrise Heights">Sunrise Heights</option>
            <option value="Green Meadows">Green Meadows</option>
            <option value="Royal Residency">Royal Residency</option>
          </select>

          <button className="btn btn-ghost" id="clear-filters-btn" onClick={() => { setSearch(''); setProjectFilter(''); setStatusFilter(''); }} style={{ padding: 'var(--spacing-2)' }}>
            <RotateCcw size={16} style={{ marginRight: '4px' }} /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => { setSortField('id'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>Lead No</th>
                <th onClick={() => { setSortField('date'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>Date</th>
                <th onClick={() => { setSortField('name'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>Customer Name</th>
                <th>Mobile</th>
                <th>Project</th>
                <th>Budget</th>
                <th>Source</th>
                <th>Sales Exec</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying leads database...</td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>No leads matched your search parameters.</td>
                </tr>
              ) : paginatedLeads.map((lead: any) => (
                <tr key={lead.id} className="clickable" onClick={() => setActiveLeadId(lead.id)}>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--brand-primary)' }}>{lead.id}</td>
                  <td>{lead.date}</td>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{lead.name}</td>
                  <td>{lead.phone}</td>
                  <td>{lead.project}</td>
                  <td>{lead.budget}</td>
                  <td>{lead.source}</td>
                  <td>{lead.executive}</td>
                  <td>
                    <span className={`badge ${
                      lead.status === 'New' ? 'badge-info' : 
                      lead.status === 'Site Visit Done' ? 'badge-success' : 
                      lead.status === 'Negotiation' ? 'badge-danger' : 
                      lead.status === 'Converted' ? 'badge-success' : 
                      lead.status === 'Lost' ? 'badge-neutral' : 'badge-warning'
                    }`}>{lead.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Grid */}
      {leads.length > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing <b>{((page - 1) * limit) + 1}</b> to <b>{Math.min(page * limit, leads.length)}</b> of <b>{leads.length}</b> leads
          </div>
          <div className="pagination-buttons">
            <button className="btn btn-outline" id="prev-page" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
              <ChevronLeft size={16} /> Previous
            </button>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', padding: '0 var(--spacing-2)' }}>
              Page {page} of {totalPages}
            </div>
            <button className="btn btn-outline" id="next-page" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Register Inbound Inquiry Lead</h3>
            <button className="dialog-close" onClick={() => setShowAddModal(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmitNewLead)}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">Prospect Name</label>
                <input type="text" className="form-control" placeholder="e.g. Divya Sen" style={{ width: '100%' }} {...register('name')} />
                {errors.name && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</span>}
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email ID</label>
                  <input type="email" className="form-control" placeholder="name@domain.com" style={{ width: '100%' }} {...register('email')} />
                  {errors.email && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.email.message}</span>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Mobile Number</label>
                  <input type="text" className="form-control" placeholder="+91 98765 43210" style={{ width: '100%' }} {...register('phone')} />
                  {errors.phone && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.phone.message}</span>}
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Allocated Project</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('project')}>
                    <option value="Sunrise Heights">Sunrise Heights</option>
                    <option value="Green Meadows">Green Meadows</option>
                    <option value="Royal Residency">Royal Residency</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Budget range</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('budget')}>
                    <option value="₹85 Lakhs">₹85 Lakhs</option>
                    <option value="₹1.20 Crore">₹1.20 Crore</option>
                    <option value="₹2.50 Crore">₹2.50 Crore</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Inbound Channel</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('source')}>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Referral">Referral</option>
                    <option value="Direct Visit">Direct Visit</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assigned sales RM</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('executive')}>
                    <option value="Priya Patel">Priya Patel</option>
                    <option value="Amit Singh">Amit Singh</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Lead</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
