import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
