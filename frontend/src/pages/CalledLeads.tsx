import { useEffect, useState } from 'react';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import {
  XCircle, Star, UserCheck, Database, Play, Download, Volume2
} from 'lucide-react';
import {
  usePipelineLeads, useBulkMove, useIsAdmin, PipelineLead,
  SOURCES, PROJECTS, SortableTh, PaginationBar, ExportButtons,
  PipelineFilterBar, BulkActionBar, LeadHistoryModal
} from '../components/pipeline/pipelineCommon';

/** Fetches the call recording as an authed blob and plays it inline. */
const RecordingModal = ({ lead, onClose }: { lead: PipelineLead; onClose: () => void }) => {
  const { showToast } = useUIStore();
  const isAdmin = useIsAdmin();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    (async () => {
      try {
        const res = await apiClient.get(`/pipeline/leads/${lead.id}/recording`, { responseType: 'blob' });
        objectUrl = URL.createObjectURL(res.data);
        setAudioUrl(objectUrl);
      } catch {
        setError('Could not load the call recording.');
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [lead.id]);

  const downloadRecording = async () => {
    try {
      const res = await apiClient.get(`/pipeline/leads/${lead.id}/recording`, {
        params: { download: true },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${lead.id}_recording.wav`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Recording downloaded.', 'success');
    } catch (err: any) {
      showToast(err?.response?.status === 403
        ? 'Downloading recordings requires an admin role.'
        : 'Recording download failed.', 'danger');
    }
  };

  return (
    <dialog open className="dialog" style={{ maxWidth: '520px' }}>
      <div className="dialog-header">
        <h3 className="dialog-title"><Volume2 size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />AI Call Recording — {lead.id}</h3>
        <button className="dialog-close" onClick={onClose}><XCircle size={16} /></button>
      </div>
      <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div style={{ fontSize: 'var(--font-size-sm)' }}>
          <b>{lead.name}</b> · {lead.phone} · {lead.called_at} · Duration {lead.call_duration}
        </div>
        {error ? (
          <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{error}</p>
        ) : audioUrl ? (
          <audio controls src={audioUrl} style={{ width: '100%' }} autoPlay />
        ) : (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Loading recording...</p>
        )}
        {lead.ai_summary && (
          <div className="card" style={{ background: 'var(--bg-muted)' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-2)' }}>AI Conversation Summary</h4>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>{lead.ai_summary}</p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
              Outcome: <b>{lead.ai_outcome}</b>
              {lead.ai_confidence != null && <> · Confidence: <b>{Math.round(Number(lead.ai_confidence) * 100)}%</b></>}
            </p>
          </div>
        )}
      </div>
      <div className="dialog-footer">
        {isAdmin && (
          <button className="btn btn-outline" onClick={downloadRecording}>
            <Download size={14} style={{ marginRight: '4px' }} /> Download
          </button>
        )}
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
};

export const CalledLeads = () => {
  const [search, setSearch] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sort, setSort] = useState('called_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playingLead, setPlayingLead] = useState<PipelineLead | null>(null);
  const [historyLead, setHistoryLead] = useState<PipelineLead | null>(null);

  const { data, isLoading } = usePipelineLeads({
    stage: 'called', search, interest: interestFilter, source: sourceFilter,
    project: projectFilter, sort, order, page, limit: 10
  });

  const bulkMove = useBulkMove(() => setSelected(new Set()));

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Called Leads</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Leads contacted by the AI Calling Agent — review conversations and route to the next stage
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <ExportButtons stage="called" />
        </div>
      </div>

      <PipelineFilterBar
        moduleKey="called"
        search={search}
        setSearch={(v) => { setSearch(v); setPage(1); }}
        selects={[
          { id: 'interest', value: interestFilter, onChange: (v) => { setInterestFilter(v); setPage(1); }, allLabel: 'All Interest Levels', options: ['Interested', 'Not Interested'] },
          { id: 'source', value: sourceFilter, onChange: (v) => { setSourceFilter(v); setPage(1); }, allLabel: 'All Sources', options: SOURCES },
          { id: 'project', value: projectFilter, onChange: (v) => { setProjectFilter(v); setPage(1); }, allLabel: 'All Projects', options: PROJECTS },
        ]}
        onReset={() => { setSearch(''); setInterestFilter(''); setSourceFilter(''); setProjectFilter(''); setPage(1); }}
        currentParams={{ search, interest: interestFilter, source: sourceFilter, project: projectFilter }}
        onApplySaved={(p) => {
          setSearch(p.search || ''); setInterestFilter(p.interest || '');
          setSourceFilter(p.source || ''); setProjectFilter(p.project || ''); setPage(1);
        }}
      />

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: 'Move to Contacted (Leads DB)', icon: <Database size={14} />, onClick: () => bulkMove.mutate({ ids: [...selected], target: 'database' }) },
          { label: 'Qualify', icon: <Star size={14} />, onClick: () => bulkMove.mutate({ ids: [...selected], target: 'qualified' }) },
          { label: 'Convert to Customer', icon: <UserCheck size={14} />, className: 'btn-success', onClick: () => bulkMove.mutate({ ids: [...selected], target: 'customer' }) },
          { label: 'Reject', icon: <XCircle size={14} />, className: 'btn-secondary', onClick: () => bulkMove.mutate({ ids: [...selected], target: 'rejected' }) },
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
                <SortableTh field="name" label="Name" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="phone" label="Phone" sort={sort} order={order} onSort={onSort} />
                <th>Email ID</th>
                <SortableTh field="source" label="Source" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="project" label="Project" sort={sort} order={order} onSort={onSort} />
                <th>Budget</th>
                <SortableTh field="interest_status" label="Interest" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="called_at" label="Called At" sort={sort} order={order} onSort={onSort} />
                <SortableTh field="call_duration" label="Duration" sort={sort} order={order} onSort={onSort} />
                <th>AI Outcome</th>
                <th>Recording</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying called leads...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>
                  No called leads yet — the AI Calling Agent moves leads here after successful calls.
                </td></tr>
              ) : items.map(lead => (
                <tr key={lead.id}>
                  <td><input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} aria-label={`Select ${lead.id}`} /></td>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--brand-primary)', cursor: 'pointer' }} onClick={() => setHistoryLead(lead)}>
                    {lead.name}
                  </td>
                  <td>{lead.phone}</td>
                  <td style={{ wordBreak: 'break-all' }}>{lead.email}</td>
                  <td>{lead.source}</td>
                  <td>{lead.project}</td>
                  <td>{lead.budget || '—'}</td>
                  <td>
                    <span className={`badge ${lead.interest_status === 'Interested' ? 'badge-success' : lead.interest_status === 'Not Interested' ? 'badge-danger' : 'badge-neutral'}`}>
                      {lead.interest_status || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{lead.called_at || '—'}</td>
                  <td>{lead.call_duration || '—'}</td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.ai_outcome || ''}>
                    {lead.ai_outcome || '—'}
                  </td>
                  <td>
                    {lead.recording_available ? (
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }} onClick={() => setPlayingLead(lead)}>
                        <Play size={12} style={{ marginRight: '4px' }} /> Play
                      </button>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost" title="Move to Contacted (Leads Database)" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'database' })}><Database size={14} /></button>
                      <button className="btn btn-ghost" title="Move to Qualified Leads" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'qualified' })}><Star size={14} /></button>
                      <button className="btn btn-ghost" title="Convert to Active Customer" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'customer' })}><UserCheck size={14} /></button>
                      <button className="btn btn-ghost" title="Reject Lead" style={{ padding: '4px', color: 'var(--color-danger)' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'rejected' })}><XCircle size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar data={data} page={page} setPage={setPage} noun="called leads" />

      {playingLead && <RecordingModal lead={playingLead} onClose={() => setPlayingLead(null)} />}
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
    </div>
  );
};
