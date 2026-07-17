/* js/settings.js */

window.CRM_PAGES = window.CRM_PAGES || {};

window.CRM_PAGES.renderSettings = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  if (!window.CRM_SETTINGS_TAB) {
    window.CRM_SETTINGS_TAB = 'company'; // 'company' | 'projects' | 'executives' | 'sources' | 'property' | 'status'
  }

  const currentTab = window.CRM_SETTINGS_TAB;

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">System Settings</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Configure CRM properties, projects and lookup masters</p>
      </div>
    </div>

    <!-- Settings Layout grid -->
    <div class="settings-layout">
      <!-- Settings Left Sidebar Navigation -->
      <div class="settings-nav">
        <div class="settings-nav-item ${currentTab === 'company' ? 'active' : ''}" data-settings-tab="company">
          <i class="lucide-building" data-lucide="building"></i> Company Profile
        </div>
        <div class="settings-nav-item ${currentTab === 'projects' ? 'active' : ''}" data-settings-tab="projects">
          <i class="lucide-home" data-lucide="home"></i> Projects Directory
        </div>
        <div class="settings-nav-item ${currentTab === 'executives' ? 'active' : ''}" data-settings-tab="executives">
          <i class="lucide-users" data-lucide="users"></i> Sales Executives
        </div>
        <div class="settings-nav-item ${currentTab === 'sources' ? 'active' : ''}" data-settings-tab="sources">
          <i class="lucide-megaphone" data-lucide="megaphone"></i> Lead Channels
        </div>
        <div class="settings-nav-item ${currentTab === 'property' ? 'active' : ''}" data-settings-tab="property">
          <i class="lucide-layers" data-lucide="layers"></i> Property Types
        </div>
        <div class="settings-nav-item ${currentTab === 'status' ? 'active' : ''}" data-settings-tab="status">
          <i class="lucide-list-todo" data-lucide="list-todo"></i> Status Masters
        </div>
      </div>

      <!-- Settings Sub-tab Content Area -->
      <div class="card" id="settings-content-card">
        <!-- Loaded dynamically below -->
      </div>
    </div>
  `;

  // Render active settings tab
  renderActiveSettingsTab();

  // Attach navigation click listeners
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      window.CRM_SETTINGS_TAB = item.getAttribute('data-settings-tab');
      renderActiveSettingsTab();
    });
  });

  if (window.lucide) window.lucide.createIcons();
};

function renderActiveSettingsTab() {
  const container = document.getElementById('settings-content-card');
  if (!container) return;

  const currentTab = window.CRM_SETTINGS_TAB;

  if (currentTab === 'company') {
    container.innerHTML = `
      <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Company Profile Details</h3>
      <form id="company-profile-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Developer Group Name</label>
            <input type="text" class="form-control" value="Prestige Developers India" required>
          </div>
          <div class="form-group">
            <label class="form-label">Corporate Identification Number (CIN)</label>
            <input type="text" class="form-control" value="U45201KA2005PLC037894" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Official GSTIN</label>
            <input type="text" class="form-control" value="29AABCP1894C1Z5" required>
          </div>
          <div class="form-group">
            <label class="form-label">RERA Registration Authority Code</label>
            <input type="text" class="form-control" value="PRM/KA/RERA/1251/310/PR/180526" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Registered Office Address</label>
          <textarea class="form-control" rows="3" required>Prestige Falcon Towers, 19, Brunton Rd, Bangalore, Karnataka - 560025</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: var(--spacing-4)">
          <button type="submit" class="btn btn-primary">Save Company Settings</button>
        </div>
      </form>
    `;

    document.getElementById('company-profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      window.CRM_APP.showToast('Company configuration profile saved successfully!', 'success');
    });

  } else if (currentTab === 'projects') {
    const projects = window.CRM_DATA.getProjects();
    container.innerHTML = `
      <div class="card-header" style="padding: 0 0 var(--spacing-4) 0">
        <h3 class="card-title">Real Estate Projects</h3>
        <button class="btn btn-primary" id="add-project-btn"><i class="lucide-plus" data-lucide="plus"></i> Add Project</button>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Location Location</th>
              <th>Total Units</th>
              <th>Available Units</th>
              <th>Base Value Range</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map(p => `
              <tr>
                <td style="font-weight: var(--font-weight-semibold);">${p.name}</td>
                <td>${p.location}</td>
                <td>${p.totalUnits}</td>
                <td><span class="badge badge-success">${p.availableUnits} left</span></td>
                <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${p.priceRange}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-project-btn').addEventListener('click', () => {
      window.CRM_APP.showToast('Project database insertion mockup loaded.', 'info');
    });

  } else if (currentTab === 'executives') {
    const execs = window.CRM_DATA.getExecutives();
    container.innerHTML = `
      <div class="card-header" style="padding: 0 0 var(--spacing-4) 0">
        <h3 class="card-title">Sales Executives Database</h3>
        <button class="btn btn-primary" id="add-exec-btn"><i class="lucide-plus" data-lucide="plus"></i> Add Executive</button>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation Role</th>
              <th>Contact Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${execs.map(e => `
              <tr>
                <td style="font-weight: var(--font-weight-semibold);">${e.name}</td>
                <td>${e.designation}</td>
                <td>
                  <div>${e.phone}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${e.email}</div>
                </td>
                <td><span class="badge badge-success">${e.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('add-exec-btn').addEventListener('click', () => {
      window.CRM_APP.showToast('Executive account registration form mockup loaded.', 'info');
    });

  } else if (currentTab === 'sources') {
    const channels = window.CRM_DATA.getLeadSources();
    container.innerHTML = `
      <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Lead Acquisition Channels</h3>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-4)">
        ${channels.map(ch => `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-3)">
            <div>
              <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">${ch.name}</div>
              <div style="font-size: 11px; color: var(--text-muted)">Tracking parameters channel identifier: ${ch.id}</div>
            </div>
            <label class="checkbox-label">
              <input type="checkbox" class="checkbox-control" ${ch.active ? 'checked' : ''} onchange="window.CRM_APP.showToast('Channel settings toggled successfully', 'info')">
              Active
            </label>
          </div>
        `).join('')}
      </div>
    `;

  } else if (currentTab === 'property') {
    const types = window.CRM_DATA.getPropertyTypes();
    container.innerHTML = `
      <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Property Configurations Types</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Full Description Name</th>
              <th>Area Range (Slab)</th>
              <th>Avg Pricing Scale</th>
            </tr>
          </thead>
          <tbody>
            ${types.map(t => `
              <tr>
                <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${t.code}</td>
                <td>${t.name}</td>
                <td>${t.range}</td>
                <td style="font-weight: var(--font-weight-semibold);">${t.basePrice}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } else if (currentTab === 'status') {
    const statuses = window.CRM_DATA.getStatusMaster();
    container.innerHTML = `
      <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Sales Pipeline Status Master</h3>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-4)">
        ${statuses.map(st => `
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-3)">
            <div style="display: flex; align-items: center; gap: 8px">
              <span class="badge ${st.color}">${st.name}</span>
            </div>
            <span style="font-size: var(--font-size-xs); color: var(--text-muted); font-family: monospace;">${st.id}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (window.lucide) window.lucide.createIcons();
}
