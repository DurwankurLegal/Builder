import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../config/api';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  Search, RotateCcw, ChevronLeft, ChevronRight, Download,
  FileSpreadsheet, Bookmark, XCircle
} from 'lucide-react';

// ========================================================
// TYPES
// ========================================================

export interface PipelineLead {
  id: string;
  date: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  project: string;
  budget?: string;
  stage: string;
  status: string;
  interest_status?: string;
  called_at?: string;
  call_duration?: string;
  ai_outcome?: string;
  ai_summary?: string;
  ai_confidence?: number;
  recording_available: boolean;
  call_attempts: number;
  last_call_attempt?: string;
  call_recording_url?: string;
  ai_notes?: string;
  disposition?: string;
  lead_temperature?: string;
  dispatch_correlation_id?: string;
  dispatched_at?: string;
  callback_received_at?: string;
  contacted_by?: string;
  remarks?: string;
  site_visit_status?: string;
  loan_requirement?: string;
  next_followup_date?: string;
  linked_record_id?: string;
  history: { date: string; action: string; user: string }[];
}

export interface PipelinePage {
  items: PipelineLead[];
  total: number;
  page: number;
  pages: number;
}

export const SOURCES = ['Google Ads', 'Facebook Ads', 'MagicBricks', '99acres', 'Housing.com', 'Website Form', 'Referral', 'Direct Visit', 'Bulk Import'];
export const PROJECTS = ['Sunrise Heights', 'Green Meadows', 'Royal Residency', 'Unassigned'];

export const ADMIN_ROLES = ['Super Admin', 'Tenant Admin'];

export const useIsAdmin = () => {
  const { userInfo } = useAuthStore();
  return ADMIN_ROLES.includes(userInfo?.role || '');
};

// ========================================================
// DATA HOOKS
// ========================================================

export interface ListParams {
  stage: string;
  search?: string;
  source?: string;
  project?: string;
  lead_status?: string;
  interest?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export const usePipelineLeads = (params: ListParams) => {
  return useQuery<PipelinePage>({
    queryKey: ['pipeline', params],
    queryFn: async () => {
      const res = await apiClient.get('/pipeline/leads', { params });
      return res.data;
    },
    refetchInterval: 10000, // keep pages live as the AI agent moves leads
    placeholderData: (prev) => prev
  });
};

export const useBulkMove = (onDone?: () => void) => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  return useMutation({
    mutationFn: async ({ ids, target }: { ids: string[]; target: string }) => {
      const res = await apiClient.post('/pipeline/leads/bulk-move', { ids, target });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast(data.detail, data.skipped > 0 ? 'info' : 'success');
      onDone?.();
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || 'Stage movement failed.', 'danger');
    }
  });
};

type ToastFn = (text: string, type?: 'success' | 'danger' | 'info' | 'warning') => void;

export const exportStage = async (stage: string, format: 'csv' | 'xlsx', showToast: ToastFn) => {
  try {
    const res = await apiClient.get('/pipeline/export', {
      params: { stage, format },
      responseType: 'blob'
    });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stage}_leads.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${stage.charAt(0).toUpperCase() + stage.slice(1)} leads exported as ${format.toUpperCase()}!`, 'success');
  } catch {
    showToast('Export failed.', 'danger');
  }
};

// ========================================================
// SAVED FILTERS (localStorage per module)
// ========================================================

export interface SavedFilter {
  name: string;
  params: Record<string, string>;
}

export const loadSavedFilters = (moduleKey: string): SavedFilter[] => {
  try {
    return JSON.parse(localStorage.getItem(`crm-saved-filters-${moduleKey}`) || '[]');
  } catch {
    return [];
  }
};

export const persistSavedFilters = (moduleKey: string, filters: SavedFilter[]) => {
  localStorage.setItem(`crm-saved-filters-${moduleKey}`, JSON.stringify(filters));
};

// ========================================================
// SHARED UI PIECES
// ========================================================

export const SortableTh = ({ field, label, sort, order, onSort }: {
  field: string; label: string; sort: string; order: string;
  onSort: (field: string) => void;
}) => (
  <th onClick={() => onSort(field)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
    {label}{sort === field ? (order === 'asc' ? ' ▲' : ' ▼') : ''}
  </th>
);

export const PaginationBar = ({ data, setPage, noun }: {
  data?: PipelinePage; page?: number; setPage: (fn: (p: number) => number) => void; noun: string;
}) => {
  if (!data || data.total === 0) return null;
  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing <b>{(data.page - 1) * 10 + 1}</b> to <b>{Math.min(data.page * 10, data.total)}</b> of <b>{data.total}</b> {noun}
      </div>
      <div className="pagination-buttons">
        <button className="btn btn-outline" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={data.page <= 1}>
          <ChevronLeft size={16} /> Previous
        </button>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', padding: '0 var(--spacing-2)' }}>
          Page {data.page} of {data.pages}
        </div>
        <button className="btn btn-outline" onClick={() => setPage(p => Math.min(p + 1, data.pages))} disabled={data.page >= data.pages}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export const ExportButtons = ({ stage }: { stage: string }) => {
  const { showToast } = useUIStore();
  return (
    <>
      <button className="btn btn-outline" onClick={() => exportStage(stage, 'csv', showToast)}>
        <Download size={16} style={{ marginRight: '6px' }} /> CSV
      </button>
      <button className="btn btn-outline" onClick={() => exportStage(stage, 'xlsx', showToast)}>
        <FileSpreadsheet size={16} style={{ marginRight: '6px' }} /> Excel
      </button>
    </>
  );
};

/** Filter bar with search + arbitrary select filters + saved-filter management. */
export const PipelineFilterBar = ({ moduleKey, search, setSearch, selects, onReset, currentParams, onApplySaved }: {
  moduleKey: string;
  search: string;
  setSearch: (v: string) => void;
  selects: { id: string; value: string; onChange: (v: string) => void; allLabel: string; options: string[] }[];
  onReset: () => void;
  currentParams: Record<string, string>;
  onApplySaved: (params: Record<string, string>) => void;
}) => {
  const { showToast } = useUIStore();
  const [saved, setSaved] = useState<SavedFilter[]>(() => loadSavedFilters(moduleKey));

  const saveCurrent = () => {
    const name = window.prompt('Name this filter set:');
    if (!name) return;
    const next = [...saved.filter(f => f.name !== name), { name, params: currentParams }];
    setSaved(next);
    persistSavedFilters(moduleKey, next);
    showToast(`Filter set "${name}" saved!`, 'success');
  };

  const removeSaved = (name: string) => {
    const next = saved.filter(f => f.name !== name);
    setSaved(next);
    persistSavedFilters(moduleKey, next);
  };

  return (
    <div className="filter-bar">
      <div className="search-wrapper">
        <Search size={16} />
        <input
          type="text"
          className="form-control"
          placeholder="Search name, ID, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filter-selects" style={{ flexWrap: 'wrap' }}>
        {selects.map(sel => (
          <select key={sel.id} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}>
            <option value="">{sel.allLabel}</option>
            {sel.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ))}
        <select
          value=""
          onChange={(e) => {
            const f = saved.find(s => s.name === e.target.value);
            if (f) { onApplySaved(f.params); showToast(`Applied filter set "${f.name}"`, 'info'); }
          }}
        >
          <option value="">Saved Filters{saved.length ? ` (${saved.length})` : ''}</option>
          {saved.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={saveCurrent} title="Save current filters" style={{ padding: 'var(--spacing-2)' }}>
          <Bookmark size={16} />
        </button>
        {saved.length > 0 && (
          <button className="btn btn-ghost" onClick={() => saved.forEach(f => removeSaved(f.name))} title="Clear saved filters" style={{ padding: 'var(--spacing-2)' }}>
            <XCircle size={16} />
          </button>
        )}
        <button className="btn btn-ghost" onClick={onReset} style={{ padding: 'var(--spacing-2)' }}>
          <RotateCcw size={16} style={{ marginRight: '4px' }} /> Reset
        </button>
      </div>
    </div>
  );
};

/** Bulk action bar shown while rows are checked. */
export const BulkActionBar = ({ count, actions, onClear }: {
  count: number;
  actions: { label: string; icon: React.ReactNode; className?: string; onClick: () => void }[];
  onClear: () => void;
}) => {
  if (count === 0) return null;
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--spacing-4)', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
        {count} lead{count > 1 ? 's' : ''} selected
      </span>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button key={a.label} className={`btn ${a.className || 'btn-outline'}`} style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px' }} onClick={a.onClick}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)' }} onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
};

// ========================================================
// SHARED ADD LEAD MODAL (Raw / Called / Qualified modules)
// ========================================================

export const SITE_VISIT_STATUSES = ['Not Scheduled', 'Scheduled', 'Completed'];
export const LOAN_REQUIREMENTS = ['Pending Assessment', 'Required', 'Not Required', 'Pre-Approved'];

const addLeadSchema = z.object({
  name: z.string().min(3, 'Full name must have at least 3 letters'),
  phone: z.string().regex(/^(?:\+91[\s-]?\d{5}[\s-]?\d{5}|0?\d{10})$/, 'Must be a 10-digit number or +91 XXXXX XXXXX'),
  email: z.string().email('Invalid email address format'),
  source: z.string().min(1, 'Please select a lead source'),
  project: z.string().min(1, 'Please select a project'),
  budget: z.string().optional(),
  interest_status: z.string().optional(),
  contacted_by: z.string().optional(),
  remarks: z.string().optional(),
  site_visit_status: z.string().optional(),
  loan_requirement: z.string().optional(),
  next_followup_date: z.string().optional(),
});

export type AddLeadFormValues = z.infer<typeof addLeadSchema>;

const STAGE_TITLES: Record<string, string> = {
  raw: 'Register Raw Lead',
  called: 'Register Called Lead',
  qualified: 'Register Qualified Lead',
};

/**
 * One Add Lead form for every pipeline module. The base fields and
 * validation are identical everywhere; Called and Qualified expose their
 * module-specific fields on top. The backend applies the same duplicate
 * detection and audit logging regardless of entry point.
 */
export const AddLeadModal = ({ stage, onClose }: { stage: 'raw' | 'called' | 'qualified'; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { userInfo } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<AddLeadFormValues>({
    resolver: zodResolver(addLeadSchema),
    defaultValues: {
      source: 'Website Form',
      project: 'Sunrise Heights',
      interest_status: 'Interested',
      contacted_by: userInfo?.username || '',
      site_visit_status: 'Not Scheduled',
      loan_requirement: 'Pending Assessment',
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: AddLeadFormValues) =>
      (await apiClient.post('/pipeline/leads', { ...values, stage })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      showToast(stage === 'raw'
        ? 'Raw lead registered - queued for AI calling!'
        : `Lead registered directly in ${stage === 'called' ? 'Called' : 'Qualified'} Leads!`, 'success');
      onClose();
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || 'Lead creation failed.', 'danger');
    }
  });

  return (
    <dialog open className="dialog">
      <div className="dialog-header">
        <h3 className="dialog-title">{STAGE_TITLES[stage]}</h3>
        <button className="dialog-close" onClick={onClose}><XCircle size={16} /></button>
      </div>
      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
        <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-control" placeholder="e.g. Divya Sen" style={{ width: '100%' }} {...register('name')} />
            {errors.name && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</span>}
          </div>
          <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Phone Number</label>
              <input type="text" className="form-control" placeholder="9876543210" style={{ width: '100%' }} {...register('phone')} />
              {errors.phone && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.phone.message}</span>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Email ID</label>
              <input type="email" className="form-control" placeholder="name@domain.com" style={{ width: '100%' }} {...register('email')} />
              {errors.email && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.email.message}</span>}
            </div>
          </div>
          <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Lead Source</label>
              <select className="form-control" style={{ width: '100%' }} {...register('source')}>
                {SOURCES.filter(s => s !== 'Bulk Import').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Project Name</label>
              <select className="form-control" style={{ width: '100%' }} {...register('project')}>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Budget {stage === 'raw' ? '(optional)' : ''}</label>
            <input type="text" className="form-control" placeholder="e.g. ₹95 Lakhs" style={{ width: '100%' }} {...register('budget')} />
          </div>

          {stage === 'called' && (
            <div className="form-group">
              <label className="form-label">Interest Status</label>
              <select className="form-control" style={{ width: '100%' }} {...register('interest_status')}>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
              </select>
              <span className="help-text">Called date &amp; time is stamped automatically on save.</span>
            </div>
          )}

          {stage === 'qualified' && (
            <>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Contacted By</label>
                  <input type="text" className="form-control" style={{ width: '100%' }} {...register('contacted_by')} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Next Follow-up Date</label>
                  <input type="date" className="form-control" style={{ width: '100%' }} {...register('next_followup_date')} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Site Visit Status</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('site_visit_status')}>
                    {SITE_VISIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Loan Requirement</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('loan_requirement')}>
                    {LOAN_REQUIREMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" className="form-control" placeholder="e.g. Walk-in prospect, very keen on 3BHK" style={{ width: '100%' }} {...register('remarks')} />
              </div>
            </>
          )}
        </div>
        <div className="dialog-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving...' : 'Register Lead'}
          </button>
        </div>
      </form>
    </dialog>
  );
};

/** History timeline modal shared by all pipeline modules. */
export const LeadHistoryModal = ({ lead, onClose }: { lead: PipelineLead; onClose: () => void }) => (
  <dialog open className="dialog" style={{ maxWidth: '560px' }}>
    <div className="dialog-header">
      <h3 className="dialog-title">Activity History — {lead.id} ({lead.name})</h3>
      <button className="dialog-close" onClick={onClose}><XCircle size={16} /></button>
    </div>
    <div className="dialog-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
      {lead.ai_summary && (
        <div className="card" style={{ marginBottom: 'var(--spacing-4)', background: 'var(--bg-muted)' }}>
          <h4 style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}>AI Conversation Summary</h4>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-main)' }}>{lead.ai_summary}</p>
          {lead.ai_confidence != null && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
              AI confidence score: <b>{Math.round(Number(lead.ai_confidence) * 100)}%</b>
            </p>
          )}
        </div>
      )}
      <div className="timeline">
        {(lead.history || []).map((h, idx) => (
          <div key={idx} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-content">
              <span className="timeline-time">{h.date} — {h.user}</span>
              <p className="timeline-desc">{h.action}</p>
            </div>
          </div>
        ))}
        {(!lead.history || lead.history.length === 0) && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>No activity recorded yet.</p>
        )}
      </div>
    </div>
    <div className="dialog-footer">
      <button className="btn btn-outline" onClick={onClose}>Close</button>
    </div>
  </dialog>
);
