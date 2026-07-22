import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import {
  Plus, Upload, History, XCircle, PhoneForwarded, Star, UserCheck,
  Trash2, Bot, Settings2, Zap, Download, FileSpreadsheet, ScrollText, PhoneOutgoing, Edit
} from 'lucide-react';
import {
  usePipelineLeads, useBulkMove, useIsAdmin, PipelineLead,
  SOURCES, PROJECTS, SortableTh, PaginationBar, ExportButtons,
  PipelineFilterBar, BulkActionBar, LeadHistoryModal, AddLeadModal, EditLeadModal
} from '../components/pipeline/pipelineCommon';

const RAW_STATUSES = [
  'Pending Call', 'Raw Lead', 'AI Call In Progress', 'Call Failed - Retry Scheduled',
  'Dispatch Failed - Retry Scheduled', 'Invalid Number - Halted',
  'Max Call Attempts Reached', 'Called (Manual)'
];

export const RawLeads = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const isAdmin = useIsAdmin();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportsModal, setShowImportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [historyLead, setHistoryLead] = useState<PipelineLead | null>(null);
  const [editLead, setEditLead] = useState<PipelineLead | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params = {
    stage: 'raw', search, source: sourceFilter, project: projectFilter,
    lead_status: statusFilter, sort, order, page, limit: 10
  };
  const { data, isLoading } = usePipelineLeads(params);

  const { data: settings } = useQuery({
    queryKey: ['pipeline-settings'],
    queryFn: async () => (await apiClient.get('/pipeline/settings')).data
  });

  const { data: imports = [] } = useQuery({
    queryKey: ['pipeline-imports'],
    queryFn: async () => (await apiClient.get('/pipeline/imports')).data,
    enabled: showImportsModal
  });

  const bulkMove = useBulkMove(() => setSelected(new Set()));

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/pipeline/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-imports'] });
      setUploadResult(result);
      showToast(`Import finished: ${result.imported} added, ${result.duplicates} duplicates blocked.`, 'success');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || 'Bulk import failed.', 'danger');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await apiClient.delete(`/pipeline/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      showToast('Selected leads deleted.', 'success');
      setSelected(new Set());
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Delete failed.', 'danger')
  });

  const settingsMutation = useMutation({
    mutationFn: async (payload: any) => (await apiClient.put('/pipeline/settings', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-settings'] });
      showToast('Pipeline settings updated!', 'success');
      setShowSettingsModal(false);
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Settings update failed.', 'danger')
  });

  const runCycleMutation = useMutation({
    mutationFn: async () => (await apiClient.post('/pipeline/ai/run-cycle')).data,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      if (res.blocked) { showToast(res.detail, 'warning'); return; }
      showToast(res.processed > 0
        ? `AI agent processed ${res.processed} lead(s) this cycle.`
        : 'No pending leads for the AI agent right now.', 'info');
    }
  });

  // Manual mode: start AI calling for the selected leads.
  const manualCallMutation = useMutation({
    mutationFn: async (ids: string[]) => (await apiClient.post('/pipeline/ai/manual-call', { ids })).data,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      showToast(res.detail, res.dispatched > 0 ? 'success' : 'warning');
      setSelected(new Set());
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Could not start AI calling.', 'danger')
  });

  // HireBuddha: immediate single-lead dispatch (admin testing / priority leads)
  const dispatchMutation = useMutation({
    mutationFn: async (id: string) => (await apiClient.post(`/integrations/hirebuddha/dispatch/${id}`)).data,
    onSuccess: (lead: PipelineLead) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      showToast(`${lead.id} handed to the HireBuddha voice agent.`, 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Dispatch to HireBuddha failed.', 'danger')
  });

  // HireBuddha integration exchange log (admin troubleshooting/audit view)
  const { data: hbLogs = [] } = useQuery({
    queryKey: ['hirebuddha-logs'],
    queryFn: async () => (await apiClient.get('/integrations/hirebuddha/logs', { params: { limit: 50 } })).data,
    enabled: showLogsModal
  });

  const usingHireBuddha = settings?.ai_provider === 'hirebuddha';

  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every(l => selected.has(l.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) items.forEach(l => next.delete(l.id));
    else items.forEach(l => next.add(l.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const onSort = (field: string) => {
    if (sort === field) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setOrder('asc'); }
  };

  const resetFilters = () => { setSearch(''); setSourceFilter(''); setProjectFilter(''); setStatusFilter(''); setPage(1); };

  const applySaved = (p: Record<string, string>) => {
    setSearch(p.search || ''); setSourceFilter(p.source || '');
    setProjectFilter(p.project || ''); setStatusFilter(p.lead_status || ''); setPage(1);
  };

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await apiClient.get('/pipeline/import-template', {
        params: { format },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raw_leads_template.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`${format === 'xlsx' ? 'Excel' : 'CSV'} template downloaded.`, 'success');
    } catch {
      showToast('Template download failed.', 'danger');
    }
  };

  const statusBadge = (lead: PipelineLead) => {
    const cls = (lead.status === 'Pending Call' || lead.status === 'Raw Lead' || lead.status === 'AI Call In Progress') ? 'badge-info'
      : (lead.status === 'Call Failed - Retry Scheduled' || lead.status === 'Dispatch Failed - Retry Scheduled') ? 'badge-warning'
      : (lead.status === 'Max Call Attempts Reached' || lead.status === 'Invalid Number - Halted') ? 'badge-danger'
      : 'badge-neutral';
    const tooltip = lead.status === 'AI Call In Progress' && lead.dispatched_at
      ? `Handed to the voice agent at ${lead.dispatched_at}`
      : lead.last_call_attempt ? `Last attempt: ${lead.last_call_attempt}` : undefined;
    return (
      <span className={`badge ${cls}`} title={tooltip}>
        {lead.status}{lead.call_attempts > 0 ? ` (${lead.call_attempts})` : ''}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Raw Leads</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Repository of newly acquired leads awaiting first contact by the AI Calling Agent
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setShowImportsModal(true)}>
            <History size={16} style={{ marginRight: '6px' }} /> Import History
          </button>
          <ExportButtons stage="raw" />
          <button className="btn btn-secondary" onClick={() => { setUploadResult(null); setShowUploadModal(true); }}>
            <Upload size={16} style={{ marginRight: '6px' }} /> Bulk Upload
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Lead
          </button>
        </div>
      </div>

      {/* AI Calling Agent status strip */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--spacing-4)', flexWrap: 'wrap' }}>
        <Bot size={20} style={{ color: 'var(--brand-primary)' }} />
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
            AI Calling Agent: {settings?.ai_calling_enabled ? 'Enabled' : 'Disabled'}
            {settings?.ai_calling_enabled && (
              <>
                <span className={`badge ${settings?.ai_provider === 'hirebuddha' ? 'badge-success' : 'badge-neutral'}`} style={{ marginLeft: '8px' }}>
                  {settings?.ai_provider === 'hirebuddha' ? 'HireBuddha Voice Agent (Priya)' : 'Built-in Simulation'}
                </span>
                <span className="badge badge-info" style={{ marginLeft: '6px', textTransform: 'capitalize' }}>
                  {settings?.calling_mode || 'automatic'} mode
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {!settings?.ai_calling_enabled
              ? 'AI calling is disabled - enable it in Configure to start dialing leads.'
              : (settings?.calling_mode === 'manual')
                ? `Manual mode · select leads below and click "Start AI Calling" · window ${settings?.call_window_start}–${settings?.call_window_end} IST · max call ${Math.round((settings?.max_call_duration_seconds || 300) / 60)} min`
                : `Automatic · up to ${settings?.ai_batch_size} leads / cycle every ${settings?.ai_call_interval_seconds}s · window ${settings?.call_window_start}–${settings?.call_window_end} IST · max call ${Math.round((settings?.max_call_duration_seconds || 300) / 60)} min · retry ${settings?.ai_retry_limit}`}
          </div>
        </div>
        {settings?.calling_mode !== 'manual' && (
          <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }} onClick={() => runCycleMutation.mutate()}>
            <Zap size={14} style={{ marginRight: '4px' }} /> Run Cycle Now
          </button>
        )}
        {isAdmin && (
          <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }} onClick={() => setShowLogsModal(true)}>
            <ScrollText size={14} style={{ marginRight: '4px' }} /> AI Logs
          </button>
        )}
        {isAdmin && (
          <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }} onClick={() => setShowSettingsModal(true)}>
            <Settings2 size={14} style={{ marginRight: '4px' }} /> Configure
          </button>
        )}
      </div>

      <PipelineFilterBar
        moduleKey="raw"
        search={search}
        setSearch={(v) => { setSearch(v); setPage(1); }}
        selects={[
          { id: 'source', value: sourceFilter, onChange: (v) => { setSourceFilter(v); setPage(1); }, allLabel: 'All Sources', options: SOURCES },
          { id: 'project', value: projectFilter, onChange: (v) => { setProjectFilter(v); setPage(1); }, allLabel: 'All Projects', options: PROJECTS },
          { id: 'status', value: statusFilter, onChange: (v) => { setStatusFilter(v); setPage(1); }, allLabel: 'All Statuses', options: RAW_STATUSES },
        ]}
        onReset={resetFilters}
        currentParams={{ search, source: sourceFilter, project: projectFilter, lead_status: statusFilter }}
        onApplySaved={applySaved}
      />

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          ...(settings?.calling_mode === 'manual'
            ? [{ label: manualCallMutation.isPending ? 'Starting…' : 'Start AI Calling', icon: <PhoneOutgoing size={14} />, className: 'btn-primary', onClick: () => manualCallMutation.mutate([...selected]) }]
            : []),
          { label: 'Move to Called', icon: <PhoneForwarded size={14} />, onClick: () => bulkMove.mutate({ ids: [...selected], target: 'called' }) },
          { label: 'Qualify', icon: <Star size={14} />, onClick: () => bulkMove.mutate({ ids: [...selected], target: 'qualified' }) },
          { label: 'Convert to Customer', icon: <UserCheck size={14} />, className: 'btn-success', onClick: () => bulkMove.mutate({ ids: [...selected], target: 'customer' }) },
          { label: 'Reject', icon: <XCircle size={14} />, className: 'btn-secondary', onClick: () => bulkMove.mutate({ ids: [...selected], target: 'rejected' }) },
          ...(isAdmin ? [{ label: 'Delete', icon: <Trash2 size={14} />, className: 'btn-secondary', onClick: () => deleteMutation.mutate([...selected]) }] : []),
        ]}
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all rows" />
                </th>
                <SortableTh field="id" label="Lead No" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="date" label="Date" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="name" label="Name" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="phone" label="Phone" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="email" label="Email ID" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="source" label="Source" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="project" label="Project" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="status" label="Status" sort={sort} order={order} onSort={onSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying raw leads...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>No raw leads matched your parameters.</td></tr>
              ) : items.map(lead => (
                <tr key={lead.id}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} aria-label={`Select ${lead.id}`} />
                  </td>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--brand-primary)', cursor: 'pointer' }} onClick={() => setHistoryLead(lead)}>
                    {lead.id}
                  </td>
                  <td>{lead.date}</td>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{lead.name}</td>
                  <td>{lead.phone}</td>
                  <td style={{ wordBreak: 'break-all' }}>{lead.email}</td>
                  <td>{lead.source}</td>
                  <td>{lead.project}</td>
                  <td>{statusBadge(lead)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost" title="Edit lead" style={{ padding: '4px' }} onClick={() => setEditLead(lead)}><Edit size={14} /></button>
                      {isAdmin && usingHireBuddha && lead.status !== 'AI Call In Progress' && (
                        <button className="btn btn-ghost" title="Send to HireBuddha AI agent now" style={{ padding: '4px', color: 'var(--brand-primary)' }}
                          disabled={dispatchMutation.isPending}
                          onClick={() => dispatchMutation.mutate(lead.id)}>
                          <PhoneOutgoing size={14} />
                        </button>
                      )}
                      <button className="btn btn-ghost" title="Move to Called Leads" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'called' })}><PhoneForwarded size={14} /></button>
                      <button className="btn btn-ghost" title="Move to Qualified Leads" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'qualified' })}><Star size={14} /></button>
                      <button className="btn btn-ghost" title="Convert to Active Customer" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'customer' })}><UserCheck size={14} /></button>
                      <button className="btn btn-ghost" title="Reject Lead" style={{ padding: '4px', color: 'var(--color-danger)' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'rejected' })}><XCircle size={14} /></button>
                      {isAdmin && (
                        <button className="btn btn-ghost" title="Delete lead permanently" style={{ padding: '4px', color: 'var(--color-danger)' }}
                          onClick={() => { if (window.confirm(`Delete lead ${lead.id} (${lead.name})? This cannot be undone.`)) deleteMutation.mutate([lead.id]); }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar data={data} page={page} setPage={setPage} noun="raw leads" />

      {/* Add Individual Lead Modal (shared across pipeline modules) */}
      {showAddModal && <AddLeadModal stage="raw" onClose={() => setShowAddModal(false)} />}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Bulk Upload Leads (Excel / CSV)</h3>
            <button className="dialog-close" onClick={() => setShowUploadModal(false)}><XCircle size={16} /></button>
          </div>
          <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              Upload a .csv or .xlsx file with columns: <b>name, phone, email, source, project, budget</b>.
              Only <b>Mobile Number (phone)</b> is required — every other field is optional and can be
              filled in later. Rows without a valid mobile number are rejected and listed below.
              Duplicates are blocked automatically per the workspace duplicate policy.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="form-control"
              style={{ width: '100%', padding: 'var(--spacing-3)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }} onClick={() => downloadTemplate('csv')}>
                <Download size={13} style={{ marginRight: '4px' }} /> Download CSV Template
              </button>
              <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }} onClick={() => downloadTemplate('xlsx')}>
                <FileSpreadsheet size={13} style={{ marginRight: '4px' }} /> Download Excel Template
              </button>
            </div>
            {uploadResult && (
              <div className="card" style={{ background: 'var(--bg-muted)', maxHeight: '220px', overflowY: 'auto' }}>
                <p style={{ fontSize: 'var(--font-size-sm)' }}>
                  <b>{uploadResult.filename}</b>: {uploadResult.total_rows} rows —{' '}
                  <span style={{ color: 'var(--color-success)' }}>{uploadResult.imported} imported</span>,{' '}
                  <span style={{ color: 'var(--color-warning)' }}>{uploadResult.duplicates} duplicates blocked</span>,{' '}
                  <span style={{ color: 'var(--color-danger)' }}>{uploadResult.errors} errors</span>
                </p>
                {uploadResult.error_details?.length > 0 && (
                  <>
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-danger)', marginTop: 'var(--spacing-2)' }}>Validation errors</p>
                    <ul style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', paddingLeft: 'var(--spacing-4)' }}>
                      {uploadResult.error_details.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  </>
                )}
                {uploadResult.duplicate_details?.length > 0 && (
                  <>
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-warning)', marginTop: 'var(--spacing-2)' }}>Duplicates blocked</p>
                    <ul style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', paddingLeft: 'var(--spacing-4)' }}>
                      {uploadResult.duplicate_details.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="dialog-footer">
            <button className="btn btn-outline" onClick={() => setShowUploadModal(false)}>Close</button>
            <button
              className="btn btn-primary"
              disabled={uploadMutation.isPending}
              onClick={() => {
                const file = fileInputRef.current?.files?.[0];
                if (!file) { showToast('Choose a file to upload first.', 'info'); return; }
                uploadMutation.mutate(file);
              }}
            >
              {uploadMutation.isPending ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </dialog>
      )}

      {/* Import History Modal */}
      {showImportsModal && (
        <dialog open className="dialog" style={{ maxWidth: '640px' }}>
          <div className="dialog-header">
            <h3 className="dialog-title">Bulk Import History</h3>
            <button className="dialog-close" onClick={() => setShowImportsModal(false)}><XCircle size={16} /></button>
          </div>
          <div className="dialog-body" style={{ maxHeight: '400px', overflowY: 'auto', padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>File</th><th>Rows</th><th>Imported</th><th>Duplicates</th><th>Errors</th><th>By</th></tr>
              </thead>
              <tbody>
                {imports.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--text-muted)' }}>No imports recorded yet.</td></tr>
                ) : imports.map((b: any) => (
                  <tr key={b.id}>
                    <td>{new Date(b.date).toLocaleString()}</td>
                    <td>{b.filename}</td>
                    <td>{b.total_rows}</td>
                    <td style={{ color: 'var(--color-success)' }}>{b.imported}</td>
                    <td style={{ color: 'var(--color-warning)' }}>{b.duplicates}</td>
                    <td style={{ color: 'var(--color-danger)' }}>{b.errors}</td>
                    <td>{b.uploaded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dialog-footer">
            <button className="btn btn-outline" onClick={() => setShowImportsModal(false)}>Close</button>
          </div>
        </dialog>
      )}

      {/* AI + Duplicate Policy Settings Modal (admin only) */}
      {showSettingsModal && settings && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Pipeline & AI Calling Configuration</h3>
            <button className="dialog-close" onClick={() => setShowSettingsModal(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const startT = (form.elements.namedItem('windowStart') as HTMLInputElement).value;
            const endT = (form.elements.namedItem('windowEnd') as HTMLInputElement).value;
            settingsMutation.mutate({
              ai_calling_enabled: (form.elements.namedItem('aiEnabled') as HTMLInputElement).checked,
              calling_mode: (form.elements.namedItem('callingMode') as HTMLSelectElement).value,
              ai_provider: (form.elements.namedItem('aiProvider') as HTMLSelectElement).value,
              hb_client_id: (form.elements.namedItem('hbClientId') as HTMLInputElement).value.trim() || null,
              hb_entity_id: (form.elements.namedItem('hbEntityId') as HTMLInputElement).value.trim() || null,
              ai_call_interval_seconds: parseInt((form.elements.namedItem('aiInterval') as HTMLInputElement).value, 10),
              ai_retry_limit: parseInt((form.elements.namedItem('aiRetry') as HTMLInputElement).value, 10),
              ai_batch_size: parseInt((form.elements.namedItem('aiBatch') as HTMLInputElement).value, 10),
              max_call_duration_seconds: Math.round(parseFloat((form.elements.namedItem('maxDurationMin') as HTMLInputElement).value) * 60),
              call_window_start: startT || '09:00',
              call_window_end: endT || '19:00',
              dup_check_phone: (form.elements.namedItem('dupPhone') as HTMLInputElement).checked,
              dup_check_email: (form.elements.namedItem('dupEmail') as HTMLInputElement).checked,
            });
          }}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', maxHeight: '64vh', overflowY: 'auto' }}>
              <h4 style={{ fontSize: 'var(--font-size-sm)' }}>AI Calling</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="aiEnabled" defaultChecked={settings.ai_calling_enabled} /> Enable AI Calling
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>(off by default — no lead is dialled until this is on)</span>
              </label>

              <div className="form-group">
                <label className="form-label">Calling Mode</label>
                <select name="callingMode" defaultValue={settings.calling_mode || 'automatic'} className="form-control" style={{ width: '100%' }}>
                  <option value="automatic">Automatic — the system initiates calls on its own</option>
                  <option value="manual">Manual — you select leads and start calling</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Voice provider</label>
                <select name="aiProvider" defaultValue={settings.ai_provider || 'hirebuddha'} className="form-control" style={{ width: '100%' }}>
                  <option value="hirebuddha">HireBuddha AI Voice Agent (real outbound calls) — default</option>
                  <option value="simulation">Built-in Simulation (demo, no real calls)</option>
                </select>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                  HireBuddha (default) places real phone calls to your leads and posts the results back into this CRM.
                  Switch to Simulation only for demos/testing — it fabricates outcomes and never dials.
                </p>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">HireBuddha Company ID (optional override)</label>
                  <input type="text" name="hbClientId" defaultValue={settings.hb_client_id || ''} placeholder="Uses the global default when blank" className="form-control" style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">HireBuddha Agent ID (optional override)</label>
                  <input type="text" name="hbEntityId" defaultValue={settings.hb_entity_id || ''} placeholder="Uses the global default when blank" className="form-control" style={{ width: '100%' }} />
                </div>
              </div>

              <h4 style={{ fontSize: 'var(--font-size-sm)' }}>Automatic Campaign</h4>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Leads per Cycle</label>
                  <input type="number" name="aiBatch" min={1} max={100} defaultValue={settings.ai_batch_size} className="form-control" style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Cycle interval (seconds)</label>
                  <input type="number" name="aiInterval" min={15} max={3600} defaultValue={settings.ai_call_interval_seconds} className="form-control" style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Retry limit</label>
                  <input type="number" name="aiRetry" min={1} max={10} defaultValue={settings.ai_retry_limit} className="form-control" style={{ width: '100%' }} />
                </div>
              </div>

              <h4 style={{ fontSize: 'var(--font-size-sm)' }}>Call Limits &amp; Schedule (IST)</h4>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Max call duration (minutes)</label>
                  <input type="number" name="maxDurationMin" min={0.5} max={60} step={0.5}
                    defaultValue={((settings.max_call_duration_seconds || 300) / 60).toString()}
                    className="form-control" style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Calling window — Start</label>
                  <input type="time" name="windowStart" defaultValue={settings.call_window_start || '09:00'} className="form-control" style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Calling window — End</label>
                  <input type="time" name="windowEnd" defaultValue={settings.call_window_end || '19:00'} className="form-control" style={{ width: '100%' }} />
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '-6px' }}>
                AI calls are only initiated between Start and End (India Standard Time). Set both to 00:00 for no time restriction.
              </p>

              <h4 style={{ fontSize: 'var(--font-size-sm)' }}>Duplicate Detection Policy</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="dupPhone" defaultChecked={settings.dup_check_phone} /> Block duplicate phone numbers
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="dupEmail" defaultChecked={settings.dup_check_email} /> Block duplicate email IDs
              </label>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowSettingsModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={settingsMutation.isPending}>Save Configuration</button>
            </div>
          </form>
        </dialog>
      )}

      {/* HireBuddha Integration Logs Modal (admin) */}
      {showLogsModal && (
        <dialog open className="dialog" style={{ maxWidth: '760px', width: '95%' }}>
          <div className="dialog-header">
            <h3 className="dialog-title"><ScrollText size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />AI Integration Logs (HireBuddha)</h3>
            <button className="dialog-close" onClick={() => setShowLogsModal(false)}><XCircle size={16} /></button>
          </div>
          <div className="dialog-body" style={{ maxHeight: '440px', overflowY: 'auto', padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>Direction</th><th>Lead</th><th>Outcome</th><th>HTTP</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {hbLogs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--text-muted)' }}>
                    No integration exchanges recorded yet for this workspace.
                  </td></tr>
                ) : hbLogs.map((l: any) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)' }}>{new Date(l.date).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${l.direction === 'outbound' ? 'badge-info' : 'badge-neutral'}`}>
                        {l.direction === 'outbound' ? 'CRM → HB' : 'HB → CRM'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{l.lead_id || '—'}</td>
                    <td>
                      <span className={`badge ${l.outcome === 'Success' ? 'badge-success' : 'badge-danger'}`}>{l.outcome}</span>
                    </td>
                    <td>{l.status_code ?? '—'}</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)' }}
                        title={l.error || JSON.stringify(l.response_payload)}>
                      {l.error || JSON.stringify(l.response_payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dialog-footer">
            <button className="btn btn-primary" onClick={() => setShowLogsModal(false)}>Close</button>
          </div>
        </dialog>
      )}

      {editLead && <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} />}
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
    </div>
  );
};
