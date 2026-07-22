import { useState } from 'react';
import { XCircle, UserCheck, Database, Edit, Plus, Trash2 } from 'lucide-react';
import {
  usePipelineLeads, useBulkMove, useDeletePipelineLead, useIsAdmin, PipelineLead,
  PROJECTS, SortableTh, PaginationBar, ExportButtons,
  PipelineFilterBar, BulkActionBar, LeadHistoryModal, AddLeadModal, EditLeadModal,
  SITE_VISIT_STATUSES, LOAN_REQUIREMENTS
} from '../components/pipeline/pipelineCommon';

export const QualifiedLeads = () => {
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
  const deleteMutation = useDeletePipelineLead(() => setSelected(new Set()));
  const isAdmin = useIsAdmin();

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
          ...(isAdmin ? [{ label: 'Delete', icon: <Trash2 size={14} />, className: 'btn-secondary', onClick: () => { if (window.confirm(`Delete ${selected.size} selected lead(s)? This cannot be undone.`)) deleteMutation.mutate([...selected]); } }] : []),
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
                      <button className="btn btn-ghost" title="Edit lead" style={{ padding: '4px' }} onClick={() => setEditLead(lead)}><Edit size={14} /></button>
                      <button className="btn btn-ghost" title="Move to Leads Database" style={{ padding: '4px' }} onClick={() => bulkMove.mutate({ ids: [lead.id], target: 'database' })}><Database size={14} /></button>
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

      <PaginationBar data={data} page={page} setPage={setPage} noun="qualified leads" />

      {editLead && <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} />}
      {showAddModal && <AddLeadModal stage="qualified" onClose={() => setShowAddModal(false)} />}
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
    </div>
  );
};
