import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { XCircle, UserCheck, Database, Edit, Plus } from 'lucide-react';
import {
  usePipelineLeads, useBulkMove, PipelineLead,
  PROJECTS, SortableTh, PaginationBar, ExportButtons,
  PipelineFilterBar, BulkActionBar, LeadHistoryModal, AddLeadModal,
  SITE_VISIT_STATUSES, LOAN_REQUIREMENTS
} from '../components/pipeline/pipelineCommon';

export const QualifiedLeads = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const [search, setSearch] = useState('');
  const [siteVisitFilter, setSiteVisitFilter] = useState('');
  const [loanFilter, setLoanFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sort, setSort] = useState('next_followup_date');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editLead, setEditLead] = useState<PipelineLead | null>(null);
  const [historyLead, setHistoryLead] = useState<PipelineLead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isLoading } = usePipelineLeads({
    stage: 'qualified', search, project: projectFilter,
    sort, order, page, limit: 10
  });

  const bulkMove = useBulkMove(() => setSelected(new Set()));

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      (await apiClient.put(`/pipeline/leads/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('Qualified lead updated!', 'success');
      setEditLead(null);
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Update failed.', 'danger')
  });

  // client-side refinement for the two fields the server list endpoint doesn't filter
  const items = (data?.items || []).filter(l =>
    (!siteVisitFilter || l.site_visit_status === siteVisitFilter) &&
    (!loanFilter || l.loan_requirement === loanFilter)
  );
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
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Qualified Leads</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Genuinely interested prospects ready for sales follow-up and site visits
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <ExportButtons stage="qualified" />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Lead
          </button>
        </div>
      </div>

      <PipelineFilterBar
        moduleKey="qualified"
        search={search}
        setSearch={(v) => { setSearch(v); setPage(1); }}
        selects={[
          { id: 'siteVisit', value: siteVisitFilter, onChange: setSiteVisitFilter, allLabel: 'All Site Visit Statuses', options: SITE_VISIT_STATUSES },
          { id: 'loan', value: loanFilter, onChange: setLoanFilter, allLabel: 'All Loan Requirements', options: LOAN_REQUIREMENTS },
          { id: 'project', value: projectFilter, onChange: (v) => { setProjectFilter(v); setPage(1); }, allLabel: 'All Projects', options: PROJECTS },
        ]}
        onReset={() => { setSearch(''); setSiteVisitFilter(''); setLoanFilter(''); setProjectFilter(''); setPage(1); }}
        currentParams={{ search, siteVisit: siteVisitFilter, loan: loanFilter, project: projectFilter }}
        onApplySaved={(p) => {
          setSearch(p.search || ''); setSiteVisitFilter(p.siteVisit || '');
          setLoanFilter(p.loan || ''); setProjectFilter(p.project || ''); setPage(1);
        }}
      />

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: 'Move to Leads Database', icon: <Database size={14} />, onClick: () => bulkMove.mutate({ ids: [...selected], target: 'database' }) },
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
                <SortableTh field="contacted_by" label="Contacted By" sort={sort} order={order} onSort={onSort} />
                <th>Remarks</th>
                <SortableTh field="site_visit_status" label="Site Visit" sort={sort} order={order} onSort={onSort} />
                <th>Loan</th>
                <SortableTh field="next_followup_date" label="Next Follow-up" sort={sort} order={order} onSort={onSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying qualified leads...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>
                  No qualified leads yet — qualify promising leads from the Called Leads module.
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
                  <td>{lead.contacted_by || '—'}</td>
                  <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.remarks || ''}>
                    {lead.remarks || '—'}
                  </td>
                  <td>
                    <span className={`badge ${lead.site_visit_status === 'Completed' ? 'badge-success' : lead.site_visit_status === 'Scheduled' ? 'badge-info' : 'badge-neutral'}`}>
                      {lead.site_visit_status || 'Not Scheduled'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${lead.loan_requirement === 'Pre-Approved' ? 'badge-success' : lead.loan_requirement === 'Required' ? 'badge-warning' : 'badge-neutral'}`}>
                      {lead.loan_requirement || 'Pending Assessment'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{lead.next_followup_date || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost" title="Edit follow-up details" style={{ padding: '4px' }} onClick={() => setEditLead(lead)}><Edit size={14} /></button>
                      <button className="btn btn-ghost" title="Move to Leads Database" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'database' })}><Database size={14} /></button>
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

      <PaginationBar data={data} page={page} setPage={setPage} noun="qualified leads" />

      {/* Edit follow-up details modal */}
      {editLead && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Update Qualification — {editLead.id} ({editLead.name})</h3>
            <button className="dialog-close" onClick={() => setEditLead(null)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            updateMutation.mutate({
              id: editLead.id,
              payload: {
                contacted_by: (form.elements.namedItem('contactedBy') as HTMLInputElement).value,
                remarks: (form.elements.namedItem('remarks') as HTMLInputElement).value,
                site_visit_status: (form.elements.namedItem('siteVisit') as HTMLSelectElement).value,
                loan_requirement: (form.elements.namedItem('loan') as HTMLSelectElement).value,
                next_followup_date: (form.elements.namedItem('followupDate') as HTMLInputElement).value,
                budget: (form.elements.namedItem('budget') as HTMLInputElement).value || undefined,
              }
            });
          }}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Contacted By</label>
                  <input type="text" name="contactedBy" defaultValue={editLead.contacted_by || ''} className="form-control" style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Budget</label>
                  <input type="text" name="budget" defaultValue={editLead.budget || ''} className="form-control" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" name="remarks" defaultValue={editLead.remarks || ''} className="form-control" placeholder="e.g. Prefers east-facing 3BHK, revisiting Saturday" style={{ width: '100%' }} />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Site Visit Status</label>
                  <select name="siteVisit" defaultValue={editLead.site_visit_status || 'Not Scheduled'} className="form-control" style={{ width: '100%' }}>
                    {SITE_VISIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Loan Requirement</label>
                  <select name="loan" defaultValue={editLead.loan_requirement || 'Pending Assessment'} className="form-control" style={{ width: '100%' }}>
                    {LOAN_REQUIREMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Next Follow-up Date</label>
                  <input type="date" name="followupDate" defaultValue={editLead.next_followup_date || ''} className="form-control" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditLead(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>Save Details</button>
            </div>
          </form>
        </dialog>
      )}

      {showAddModal && <AddLeadModal stage="qualified" onClose={() => setShowAddModal(false)} />}
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
    </div>
  );
};
