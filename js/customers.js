/* js/customers.js */

window.CRM_PAGES = window.CRM_PAGES || {};

// Customers list render
window.CRM_PAGES.renderCustomers = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const customers = window.CRM_DATA.getCustomers();
  const projects = window.CRM_DATA.getProjects();

  if (!window.CRM_CUST_FILTERS) {
    window.CRM_CUST_FILTERS = {
      search: '',
      project: '',
      status: '',
      page: 1,
      limit: 10
    };
  }

  const filters = window.CRM_CUST_FILTERS;

  // Filter
  const filtered = customers.filter(c => {
    const searchMatch = !filters.search || 
      c.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.id.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.contact.includes(filters.search);
    
    const projMatch = !filters.project || c.project === filters.project;
    const statusMatch = !filters.status || c.status === filters.status;

    return searchMatch && projMatch && statusMatch;
  });

  const total = filtered.length;
  const startIndex = (filters.page - 1) * filters.limit;
  const paginated = filtered.slice(startIndex, startIndex + filters.limit);

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Qualified Customers</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Verified owners and agreement-signed clients</p>
      </div>
      <div style="display: flex; gap: var(--spacing-3)">
        <button class="btn btn-outline" id="cust-export-btn">
          <i class="lucide-download" data-lucide="download"></i> Export Portfolio
        </button>
        <button class="btn btn-primary" id="add-cust-trigger">
          <i class="lucide-plus" data-lucide="plus"></i> Add Customer
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="search-wrapper">
        <i class="lucide-search" data-lucide="search"></i>
        <input type="text" class="form-control" id="cust-search" placeholder="Search by name, ID, contact..." value="${filters.search}">
      </div>
      <div class="filter-selects">
        <!-- Project -->
        <select id="cust-filter-project">
          <option value="">All Projects</option>
          ${projects.map(p => `<option value="${p.name}" ${filters.project === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>

        <!-- Status -->
        <select id="cust-filter-status">
          <option value="">All Stages</option>
          <option value="Agreement Pending" ${filters.status === 'Agreement Pending' ? 'selected' : ''}>Agreement Pending</option>
          <option value="Agreement Executed" ${filters.status === 'Agreement Executed' ? 'selected' : ''}>Agreement Executed</option>
          <option value="Registered" ${filters.status === 'Registered' ? 'selected' : ''}>Registered</option>
        </select>

        <button class="btn btn-ghost" id="cust-clear-btn" style="padding: var(--spacing-2)">
          <i class="lucide-rotate-ccw" data-lucide="rotate-ccw"></i> Reset
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Customer Name</th>
            <th>Contact Details</th>
            <th>Project Unit</th>
            <th>Property Budget</th>
            <th>Sales Exec</th>
            <th>Current Status</th>
          </tr>
        </thead>
        <tbody>
          ${paginated.length === 0 ? `
            <tr>
              <td colspan="7" style="text-align: center; padding: var(--spacing-8); color: var(--text-muted)">No customers matched your filter configurations.</td>
            </tr>
          ` : paginated.map(c => `
            <tr class="clickable" onclick="window.location.hash='#customers/${c.id}'">
              <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${c.id}</td>
              <td style="font-weight: var(--font-weight-semibold);">${c.name}</td>
              <td>
                <div>${c.contact}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${c.email}</div>
              </td>
              <td>
                <div><b>${c.project}</b></div>
                <div style="font-size: 11px; color: var(--text-muted);">${c.propInterest.flatNo || 'Flat unallocated'}</div>
              </td>
              <td>${c.budget}</td>
              <td>${c.executive}</td>
              <td>
                <span class="badge ${
                  c.status === 'Registered' ? 'badge-success' : 
                  c.status === 'Agreement Executed' ? 'badge-info' : 'badge-warning'
                }">${c.status}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach filters handlers
  attachCustHandlers();
};

function attachCustHandlers() {
  const searchInput = document.getElementById('cust-search');
  const projSelect = document.getElementById('cust-filter-project');
  const statusSelect = document.getElementById('cust-filter-status');
  const clearBtn = document.getElementById('cust-clear-btn');
  const exportBtn = document.getElementById('cust-export-btn');

  const updateFilters = () => {
    window.CRM_CUST_FILTERS.search = searchInput.value;
    window.CRM_CUST_FILTERS.project = projSelect.value;
    window.CRM_CUST_FILTERS.status = statusSelect.value;
    window.CRM_PAGES.renderCustomers();
  };

  if (searchInput) searchInput.addEventListener('input', debounce(updateFilters, 300));
  if (projSelect) projSelect.addEventListener('change', updateFilters);
  if (statusSelect) statusSelect.addEventListener('change', updateFilters);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.CRM_CUST_FILTERS = {
        search: '',
        project: '',
        status: '',
        page: 1,
        limit: 10
      };
      window.CRM_PAGES.renderCustomers();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('Active client portfolio exported successfully!', 'success');
    });
  }

  const addCustBtn = document.getElementById('add-cust-trigger');
  if (addCustBtn) {
    addCustBtn.addEventListener('click', openAddCustomerModal);
  }

  if (window.lucide) window.lucide.createIcons();
}

function openAddCustomerModal() {
  const dialog = document.getElementById('global-dialog');
  if (!dialog) return;

  const projects = window.CRM_DATA.getProjects();
  const executives = window.CRM_DATA.getExecutives();

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3 class="dialog-title">Register Active Customer</h3>
      <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
    </div>
    <form id="add-customer-form">
      <div class="dialog-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Customer Name</label>
            <input type="text" class="form-control" name="name" required placeholder="Enter full name">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Mobile</label>
            <input type="text" class="form-control" name="contact" required placeholder="+91 98XXX XXXXX">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" name="email" required placeholder="name@domain.com">
          </div>
          <div class="form-group">
            <label class="form-label">Home Address</label>
            <input type="text" class="form-control" name="address" required placeholder="City, State">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Assigned Project</label>
            <select class="form-control" name="project" required>
              ${projects.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight: 500;">Allocated Flat / Unit No</label>
            <input type="text" class="form-control" name="flatNo" placeholder="e.g. A-101" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Configuration type</label>
            <select class="form-control" name="config" required>
              <option value="1BHK">1BHK</option>
              <option value="2BHK">2BHK</option>
              <option value="3BHK">3BHK</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Villa">Villa</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Property Budget Value</label>
            <input type="text" class="form-control" name="budget" placeholder="e.g. ₹95 Lakhs" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Sales Executive</label>
            <select class="form-control" name="executive" required>
              ${executives.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Agreement Stage</label>
            <select class="form-control" name="status" required>
              <option value="Agreement Pending">Agreement Pending</option>
              <option value="Agreement Executed">Agreement Executed</option>
              <option value="Registered">Registered</option>
            </select>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('global-dialog').close()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Customer</button>
      </div>
    </form>
  `;

  if (window.lucide) window.lucide.createIcons();
  dialog.showModal();

  const form = document.getElementById('add-customer-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newCust = {
      name: form.name.value,
      contact: form.contact.value,
      email: form.email.value,
      address: form.address.value,
      project: form.project.value,
      budget: form.budget.value,
      executive: form.executive.value,
      status: form.status.value,
      propInterest: {
        flatNo: form.flatNo.value,
        config: form.config.value,
        area: "1200 sq ft",
        floor: "2nd Floor"
      }
    };

    window.CRM_DATA.addCustomer(newCust);
    window.CRM_DATA.addAuditLog(`Registered active customer ${newCust.name} manually`, "Super Admin");
    dialog.close();
    window.CRM_APP.showToast('Active customer profile registered successfully!', 'success');
    window.CRM_PAGES.renderCustomers();
  });
}

// Render detailed Customer Profile
window.CRM_PAGES.renderCustomerProfile = (params) => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const customer = window.CRM_DATA.findCustomerById(params.id);
  if (!customer) {
    container.innerHTML = `<div class="card"><p>Customer not found.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <div style="display: flex; align-items: center; gap: var(--spacing-3)">
          <button class="btn btn-outline btn-icon" onclick="window.location.hash='#customers'">
            <i class="lucide-arrow-left" data-lucide="arrow-left"></i>
          </button>
          <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">${customer.name}</h1>
          <span class="badge ${
            customer.status === 'Registered' ? 'badge-success' : 'badge-warning'
          }">${customer.status}</span>
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--spacing-2)">Customer ID: <b>${customer.id}</b></p>
      </div>
      <div style="display: flex; gap: var(--spacing-2)">
        <button class="btn btn-outline" id="edit-cust-btn"><i class="lucide-edit" data-lucide="edit"></i> Update Details</button>
        <button class="btn btn-primary" id="view-booking-btn"><i class="lucide-file-text" data-lucide="file-text"></i> View Agreement Booking</button>
      </div>
    </div>

    <div class="profile-layout">
      <!-- Sidebar -->
      <div class="card profile-sidebar-card">
        <div class="profile-avatar-large" style="background-color: var(--brand-bg-light); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: var(--font-weight-bold)">
          ${customer.name.split(' ').map(n => n[0]).join('')}
        </div>
        <h3 style="font-size: var(--font-size-base);">${customer.name}</h3>
        <p style="font-size: var(--font-size-xs); color: var(--text-muted)">Premium Client</p>

        <ul class="profile-detail-list">
          <li class="profile-detail-item">
            <span class="profile-detail-label">Contact</span>
            <span class="profile-detail-value">${customer.contact}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Email</span>
            <span class="profile-detail-value" style="word-break: break-all;">${customer.email}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Home Address</span>
            <span class="profile-detail-value" style="font-size: 12px; font-weight: normal; color: var(--text-muted)">${customer.address}</span>
          </li>
        </ul>
      </div>

      <!-- Main Profile panel details -->
      <div style="display: flex; flex-direction: column; gap: var(--spacing-6)">
        
        <!-- Property details -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Property Allocation Details</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--spacing-4)">
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Allocated Project</span>
              <p style="font-weight: var(--font-weight-semibold);">${customer.project}</p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Allocated Unit</span>
              <p style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${customer.propInterest.flatNo}</p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Specification</span>
              <p style="font-weight: var(--font-weight-semibold);">${customer.propInterest.config} (${customer.propInterest.area})</p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Level / Floor</span>
              <p style="font-weight: var(--font-weight-semibold);">${customer.propInterest.floor}</p>
            </div>
          </div>
        </div>

        <div class="recent-grid">
          <!-- Documents Checklist Mock -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Agreement Documents Checklist</h3>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-3)">
              ${['PAN Card KYC', 'Aadhaar Verification', 'Allotment Letter Signed', 'Tripartite Bank Loan Agreement', 'Demand Draft Token Receipts'].map(doc => {
                const isUploaded = customer.documents.some(d => doc.toLowerCase().includes(d.toLowerCase())) || doc.includes('Allotment') || doc.includes('Draft');
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-2)">
                    <div style="display: flex; align-items: center; gap: 8px">
                      <i class="lucide-file-text" data-lucide="file-text" style="font-size: 14px; color: var(--text-muted)"></i>
                      <span style="font-size: var(--font-size-sm);">${doc}</span>
                    </div>
                    <span class="badge ${isUploaded ? 'badge-success' : 'badge-warning'}">
                      ${isUploaded ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Notes box -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Relationship Manager Notes</h3>
            <textarea class="form-control" style="min-height: 100px; resize: none; font-size: var(--font-size-sm); line-height: 1.5; margin-bottom: var(--spacing-4);" readonly>${customer.notes}</textarea>
            <button class="btn btn-secondary btn-primary" id="save-RM-notes" style="width: 100%">Update RM Notes</button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach button listeners
  const viewBookingBtn = document.getElementById('view-booking-btn');
  if (viewBookingBtn) {
    viewBookingBtn.addEventListener('click', () => {
      // Find booking code for the customer
      const bookings = window.CRM_DATA.getClosedDeals();
      const booking = bookings.find(b => b.customer.toLowerCase().includes(customer.name.toLowerCase()));
      if (booking) {
        window.location.hash = `#deal-closed/${booking.bookingNo}`;
      } else {
        window.CRM_APP.showToast('No booking record generated for client profile yet.', 'warning');
      }
    });
  }

  const RMNotesBtn = document.getElementById('save-RM-notes');
  if (RMNotesBtn) {
    RMNotesBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('RM Client profile notes updated successfully!', 'success');
    });
  }

  if (window.lucide) window.lucide.createIcons();
};
