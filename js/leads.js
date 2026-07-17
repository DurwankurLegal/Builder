/* js/leads.js */

window.CRM_PAGES = window.CRM_PAGES || {};

// Leads List rendering
window.CRM_PAGES.renderLeads = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const leads = window.CRM_DATA.getLeads();
  const executives = window.CRM_DATA.getExecutives();
  const projects = window.CRM_DATA.getProjects();
  const sources = window.CRM_DATA.getLeadSources();

  // Internal Filter State (Static/Persistent for session)
  if (!window.CRM_LEAD_FILTERS) {
    window.CRM_LEAD_FILTERS = {
      search: '',
      status: '',
      project: '',
      executive: '',
      page: 1,
      limit: 10,
      sortBy: 'date',
      sortDir: 'desc'
    };
  }

  const filters = window.CRM_LEAD_FILTERS;

  // Filter Logic
  let filtered = leads.filter(lead => {
    const searchMatch = !filters.search || 
      lead.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      lead.id.toLowerCase().includes(filters.search.toLowerCase()) ||
      lead.mobile.includes(filters.search);
    
    const statusMatch = !filters.status || lead.status === filters.status;
    const projectMatch = !filters.project || lead.project === filters.project;
    const execMatch = !filters.executive || lead.executive === filters.executive;

    return searchMatch && statusMatch && projectMatch && execMatch;
  });

  // Sort Logic
  filtered.sort((a, b) => {
    let valA = a[filters.sortBy];
    let valB = b[filters.sortBy];
    if (typeof valA === 'string') {
      return filters.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return filters.sortDir === 'asc' ? valA - valB : valB - valA;
  });

  // Pagination Logic
  const totalLeads = filtered.length;
  const totalPages = Math.ceil(totalLeads / filters.limit);
  const startIndex = (filters.page - 1) * filters.limit;
  const paginated = filtered.slice(startIndex, startIndex + filters.limit);

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Leads Database</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Manage and qualify property inquiry leads</p>
      </div>
      <div style="display: flex; gap: var(--spacing-3);">
        <button class="btn btn-outline" id="leads-export-btn">
          <i class="lucide-download" data-lucide="download"></i> Export Data
        </button>
        <button class="btn btn-primary" id="add-lead-trigger">
          <i class="lucide-plus" data-lucide="plus"></i> Add New Lead
        </button>
      </div>
    </div>

    <!-- Filter Control Bar -->
    <div class="filter-bar">
      <div class="search-wrapper">
        <i class="lucide-search" data-lucide="search"></i>
        <input type="text" class="form-control" id="lead-search" placeholder="Search by name, lead ID, mobile..." value="${filters.search}">
      </div>
      <div class="filter-selects">
        <!-- Status -->
        <select id="filter-status">
          <option value="">All Statuses</option>
          <option value="New" ${filters.status === 'New' ? 'selected' : ''}>New</option>
          <option value="Contacted" ${filters.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
          <option value="Qualified" ${filters.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
          <option value="Site Visit Done" ${filters.status === 'Site Visit Done' ? 'selected' : ''}>Site Visit Done</option>
          <option value="Negotiation" ${filters.status === 'Negotiation' ? 'selected' : ''}>Negotiation</option>
          <option value="Converted" ${filters.status === 'Converted' ? 'selected' : ''}>Converted</option>
          <option value="Lost" ${filters.status === 'Lost' ? 'selected' : ''}>Lost</option>
        </select>

        <!-- Project -->
        <select id="filter-project">
          <option value="">All Projects</option>
          ${projects.map(p => `<option value="${p.name}" ${filters.project === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>

        <!-- Sales Executive -->
        <select id="filter-executive">
          <option value="">All Executives</option>
          ${executives.map(e => `<option value="${e.name}" ${filters.executive === e.name ? 'selected' : ''}>${e.name}</option>`).join('')}
        </select>
        
        <button class="btn btn-ghost" id="clear-filters-btn" style="padding: var(--spacing-2)">
          <i class="lucide-rotate-ccw" data-lucide="rotate-ccw"></i> Reset
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th class="sortable" data-sort="id">Lead No <i class="lucide-chevrons-up-down" data-lucide="chevrons-up-down"></i></th>
            <th class="sortable" data-sort="date">Date <i class="lucide-chevrons-up-down" data-lucide="chevrons-up-down"></i></th>
            <th class="sortable" data-sort="name">Customer Name <i class="lucide-chevrons-up-down" data-lucide="chevrons-up-down"></i></th>
            <th>Mobile</th>
            <th>Project</th>
            <th>Budget</th>
            <th>Source</th>
            <th>Sales Exec</th>
            <th>Status</th>
            <th>Next Follow-up</th>
          </tr>
        </thead>
        <tbody>
          ${paginated.length === 0 ? `
            <tr>
              <td colspan="10" style="text-align: center; padding: var(--spacing-8); color: var(--text-muted)">
                No leads matched your search query.
              </td>
            </tr>
          ` : paginated.map(lead => `
            <tr class="clickable" onclick="window.location.hash='#leads/${lead.id}'">
              <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${lead.id}</td>
              <td>${lead.date}</td>
              <td style="font-weight: var(--font-weight-semibold);">${lead.name}</td>
              <td>${lead.mobile}</td>
              <td>${lead.project}</td>
              <td>${lead.budget}</td>
              <td>${lead.source}</td>
              <td>${lead.executive}</td>
              <td>
                <span class="badge ${
                  lead.status === 'New' ? 'badge-info' : 
                  lead.status === 'Site Visit Done' ? 'badge-success' : 
                  lead.status === 'Negotiation' ? 'badge-danger' : 
                  lead.status === 'Converted' ? 'badge-success' : 
                  lead.status === 'Lost' ? 'badge-neutral' : 'badge-warning'
                }">${lead.status}</span>
              </td>
              <td>
                <span style="font-weight: var(--font-weight-medium); color: var(--color-warning);">
                  ${lead.nextFollowUp || 'TBD'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    ${paginated.length > 0 ? `
      <div class="pagination-container">
        <div class="pagination-info">
          Showing <b>${startIndex + 1}</b> to <b>${Math.min(startIndex + filters.limit, totalLeads)}</b> of <b>${totalLeads}</b> leads
        </div>
        <div class="pagination-buttons">
          <button class="btn btn-outline" id="prev-page" ${filters.page === 1 ? 'disabled' : ''}>
            <i class="lucide-chevron-left" data-lucide="chevron-left"></i> Previous
          </button>
          <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); padding: 0 var(--spacing-2)">
            Page ${filters.page} of ${totalPages}
          </div>
          <button class="btn btn-outline" id="next-page" ${filters.page === totalPages ? 'disabled' : ''}>
            Next <i class="lucide-chevron-right" data-lucide="chevron-right"></i>
          </button>
        </div>
      </div>
    ` : ''}
  `;

  // Attach Event Handlers
  attachFilterHandlers();
};

function attachFilterHandlers() {
  const searchInput = document.getElementById('lead-search');
  const statusSelect = document.getElementById('filter-status');
  const projSelect = document.getElementById('filter-project');
  const execSelect = document.getElementById('filter-executive');
  const clearBtn = document.getElementById('clear-filters-btn');

  const updateFilters = () => {
    window.CRM_LEAD_FILTERS.search = searchInput.value;
    window.CRM_LEAD_FILTERS.status = statusSelect.value;
    window.CRM_LEAD_FILTERS.project = projSelect.value;
    window.CRM_LEAD_FILTERS.executive = execSelect.value;
    window.CRM_LEAD_FILTERS.page = 1; // reset page on filter
    window.CRM_PAGES.renderLeads();
  };

  if (searchInput) searchInput.addEventListener('input', debounce(updateFilters, 300));
  if (statusSelect) statusSelect.addEventListener('change', updateFilters);
  if (projSelect) projSelect.addEventListener('change', updateFilters);
  if (execSelect) execSelect.addEventListener('change', updateFilters);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.CRM_LEAD_FILTERS = {
        search: '',
        status: '',
        project: '',
        executive: '',
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortDir: 'desc'
      };
      window.CRM_PAGES.renderLeads();
    });
  }

  // Sort Headers click logic
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      const dir = window.CRM_LEAD_FILTERS.sortDir === 'asc' ? 'desc' : 'asc';
      window.CRM_LEAD_FILTERS.sortBy = col;
      window.CRM_LEAD_FILTERS.sortDir = dir;
      window.CRM_PAGES.renderLeads();
    });
  });

  // Pagination buttons
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (window.CRM_LEAD_FILTERS.page > 1) {
      window.CRM_LEAD_FILTERS.page--;
      window.CRM_PAGES.renderLeads();
    }
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    window.CRM_LEAD_FILTERS.page++;
    window.CRM_PAGES.renderLeads();
  });

  // Export Button Click Action
  const exportBtn = document.getElementById('leads-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('Lead database exported successfully as CSV file!', 'success');
    });
  }

  // Add Lead Modal trigger
  const addLeadBtn = document.getElementById('add-lead-trigger');
  if (addLeadBtn) {
    addLeadBtn.addEventListener('click', () => {
      openAddLeadModal();
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

// Render detailed Lead Profile page
window.CRM_PAGES.renderLeadProfile = (params) => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const lead = window.CRM_DATA.findLeadById(params.id);
  if (!lead) {
    container.innerHTML = `<div class="card"><p>Lead with ID ${params.id} not found.</p></div>`;
    return;
  }

  const followups = window.CRM_DATA.getFollowUps().filter(f => f.customer === lead.name);

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <div style="display: flex; align-items: center; gap: var(--spacing-3)">
          <button class="btn btn-outline btn-icon" onclick="window.location.hash='#leads'">
            <i class="lucide-arrow-left" data-lucide="arrow-left"></i>
          </button>
          <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">${lead.name}</h1>
          <span class="badge ${
            lead.status === 'New' ? 'badge-info' : 
            lead.status === 'Site Visit Done' ? 'badge-success' : 
            lead.status === 'Negotiation' ? 'badge-danger' : 
            lead.status === 'Converted' ? 'badge-success' : 'badge-neutral'
          }">${lead.status}</span>
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--spacing-2)">Lead No: <b>${lead.id}</b> • Registered on ${lead.date}</p>
      </div>
      <div style="display: flex; gap: var(--spacing-2); flex-wrap: wrap;">
        <button class="btn btn-outline" id="edit-lead-btn"><i class="lucide-edit" data-lucide="edit"></i> Edit</button>
        
        ${lead.status !== 'Converted' && lead.status !== 'Lost' ? `
          <button class="btn btn-secondary" id="lost-lead-btn"><i class="lucide-trash-2" data-lucide="trash-2"></i> Mark Lost</button>
          <button class="btn btn-success" id="convert-lead-btn"><i class="lucide-user-check" data-lucide="user-check"></i> Convert to Customer</button>
        ` : ''}
      </div>
    </div>

    <!-- Profile Split Grid layout -->
    <div class="profile-layout">
      <!-- Profile Left Card Details -->
      <div class="card profile-sidebar-card">
        <div class="profile-avatar-large" style="background-color: var(--brand-bg-light); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: var(--font-weight-bold)">
          ${lead.name.split(' ').map(n => n[0]).join('')}
        </div>
        <h3 style="font-size: var(--font-size-base);">${lead.name}</h3>
        <p style="font-size: var(--font-size-xs); color: var(--text-muted)">Lead Account</p>

        <ul class="profile-detail-list">
          <li class="profile-detail-item">
            <span class="profile-detail-label">Mobile</span>
            <span class="profile-detail-value">${lead.mobile}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Email</span>
            <span class="profile-detail-value" style="word-break: break-all;">${lead.email}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Interested Project</span>
            <span class="profile-detail-value">${lead.project}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Budget range</span>
            <span class="profile-detail-value">${lead.budget}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Lead Source</span>
            <span class="profile-detail-value">${lead.source}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Sales Executive</span>
            <span class="profile-detail-value">${lead.executive}</span>
          </li>
        </ul>
      </div>

      <!-- Profile Content Area -->
      <div style="display: flex; flex-direction: column; gap: var(--spacing-6)">
        
        <!-- Quick Timeline Flow indicator -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Lead Pipeline Stage</h3>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; position: relative;">
            <div style="position: absolute; top: 12px; left: 0; right: 0; height: 3px; background-color: var(--border-color); z-index: 1;"></div>
            
            ${['New', 'Contacted', 'Qualified', 'Site Visit Done', 'Negotiation'].map((stage, idx) => {
              const stages = ['New', 'Contacted', 'Qualified', 'Site Visit Done', 'Negotiation'];
              const currentIdx = stages.indexOf(lead.status);
              const isActive = stages.indexOf(stage) <= currentIdx && lead.status !== 'Lost';
              return `
                <div style="z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                  <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background-color: ${isActive ? 'var(--brand-primary)' : 'var(--bg-muted)'}; border: 3px solid var(--bg-surface); display: flex; align-items: center; justify-content: center; color: ${isActive ? 'var(--white)' : 'var(--text-muted)'}; font-size: 10px; font-weight: bold;">
                    ${idx + 1}
                  </div>
                  <span style="font-size: 11px; font-weight: var(--font-weight-medium); color: ${isActive ? 'var(--text-main)' : 'var(--text-muted)'}">${stage}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Timeline, Remarks, History Split Grid -->
        <div class="recent-grid">
          <!-- Activity log timeline -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Activity Timeline</h3>
              <button class="btn btn-outline" style="padding: 2px var(--spacing-2); font-size: var(--font-size-xs)" id="add-timeline-trigger">Log Call</button>
            </div>
            <div class="timeline">
              ${lead.history.map(hist => `
                <div class="timeline-item">
                  <div class="timeline-marker">
                    <i class="${hist.type === 'Created' ? 'lucide-sparkles' : 'lucide-phone'}" style="font-size: 11px;"></i>
                  </div>
                  <div class="timeline-content">
                    <span class="timeline-time">${hist.date}</span>
                    <h4 class="timeline-title">${hist.type}</h4>
                    <p class="timeline-desc">${hist.detail}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Remarks Section -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Interaction Notes</h3>
              <button class="btn btn-outline" style="padding: 2px var(--spacing-2); font-size: var(--font-size-xs)" id="add-remark-trigger">Add Note</button>
            </div>
            <div class="remarks-list">
              ${lead.remarks.length === 0 ? `
                <p style="font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; padding: var(--spacing-6)">No remarks logged yet.</p>
              ` : lead.remarks.map(rem => `
                <div class="remark-item">
                  <div class="remark-meta">
                    <span>${rem.user}</span>
                    <span>${rem.date}</span>
                  </div>
                  <p style="font-size: var(--font-size-sm); color: var(--text-main);">${rem.text}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Scheduled Follow-ups -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Scheduled Follow-ups</h3>
          ${followups.length === 0 ? `
            <p style="color: var(--text-muted); font-size: var(--font-size-sm)">No pending follow-ups scheduled.</p>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-4)">
              ${followups.map(f => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--spacing-4); background-color: var(--bg-surface-hover);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2)">
                    <span class="badge badge-warning">${f.type}</span>
                    <span style="font-size: var(--font-size-xs); color: var(--text-muted);">${f.date}</span>
                  </div>
                  <p style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);">${f.notes}</p>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>
    </div>
  `;

  attachLeadActions(lead);
};

function attachLeadActions(lead) {
  const convertBtn = document.getElementById('convert-lead-btn');
  const lostBtn = document.getElementById('lost-lead-btn');
  const editBtn = document.getElementById('edit-lead-btn');

  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      const cust = window.CRM_DATA.convertLeadToCustomer(lead.id);
      if (cust) {
        window.CRM_APP.showToast(`Converted successfully! ${lead.name} is now an active Customer.`, 'success');
        window.location.hash = `#customers/${cust.id}`;
      }
    });
  }

  if (lostBtn) {
    lostBtn.addEventListener('click', () => {
      openMarkLostModal(lead.id);
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      window.CRM_APP.showToast("Edit modal mockup loaded.", "info");
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Modal popups triggers
function openAddLeadModal() {
  const dialog = document.getElementById('global-dialog');
  if (!dialog) return;

  const projects = window.CRM_DATA.getProjects();
  const executives = window.CRM_DATA.getExecutives();
  const sources = window.CRM_DATA.getLeadSources();

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3 class="dialog-title">Capture New Lead</h3>
      <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
    </div>
    <form id="add-lead-form">
      <div class="dialog-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Customer Name</label>
            <input type="text" class="form-control" name="name" required placeholder="Enter full name">
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input type="text" class="form-control" name="mobile" required placeholder="+91 98XXX XXXXX">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-control" name="email" required placeholder="name@domain.com">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Interested Project</label>
            <select class="form-control" name="project" required>
              ${projects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Budget Scale</label>
            <input type="text" class="form-control" name="budget" placeholder="e.g. ₹85 Lakhs" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Lead Source</label>
            <select class="form-control" name="source" required>
              ${sources.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sales Executive</label>
            <select class="form-control" name="executive" required>
              ${executives.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('global-dialog').close()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Lead</button>
      </div>
    </form>
  `;

  if (window.lucide) window.lucide.createIcons();
  dialog.showModal();

  // Handle Form Submit
  const form = document.getElementById('add-lead-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const newLead = {
      name: formData.get('name'),
      mobile: formData.get('mobile'),
      email: formData.get('email'),
      project: formData.get('project'),
      budget: formData.get('budget'),
      source: formData.get('source'),
      executive: formData.get('executive'),
      status: 'New',
      nextFollowUp: '2026-07-16'
    };

    window.CRM_DATA.addLead(newLead);
    dialog.close();
    window.CRM_APP.showToast('New inbound lead added successfully!', 'success');
    window.CRM_PAGES.renderLeads();
  });
}

function openMarkLostModal(leadId) {
  const dialog = document.getElementById('global-dialog');
  if (!dialog) return;

  const reasons = window.CRM_DATA.getLostReasons();

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3 class="dialog-title">Mark Lead as Lost</h3>
      <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
    </div>
    <form id="lost-lead-form">
      <div class="dialog-body">
        <p style="font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: var(--spacing-4)">Identify why this customer request could not be fulfilled.</p>
        
        <div class="form-group">
          <label class="form-label">Primary Lost Reason</label>
          <select class="form-control" name="reason" required>
            ${reasons.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Competitor Name</label>
          <input type="text" class="form-control" name="competitor" placeholder="e.g. Prestige Group, LODHA">
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('global-dialog').close()">Cancel</button>
        <button type="submit" class="btn btn-danger">Confirm Lost</button>
      </div>
    </form>
  `;

  if (window.lucide) window.lucide.createIcons();
  dialog.showModal();

  const form = document.getElementById('lost-lead-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const reason = formData.get('reason');
    const competitor = formData.get('competitor');

    window.CRM_DATA.markLeadLost(leadId, reason, competitor);
    dialog.close();
    window.CRM_APP.showToast('Lead marked as lost opportunity.', 'warning');
    window.CRM_PAGES.renderLeadProfile({ id: leadId });
  });
}
