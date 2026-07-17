/* js/admin.js */

window.CRM_PAGES = window.CRM_PAGES || {};

// Admin Dashboard render
window.CRM_PAGES.renderAdminDashboard = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const tenants = window.CRM_DATA.getTenants();
  const logs = window.CRM_DATA.getAuditLogs();

  const totalStorage = tenants.reduce((sum, t) => sum + t.storageUsed, 0).toFixed(1);
  const totalUsers = tenants.reduce((sum, t) => sum + t.activeUsers, 0);

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Super Admin Console</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Cross-tenant management, system usage audits, and global settings</p>
      </div>
    </div>

    <!-- Admin dashboard tab switcher -->
    <div class="tabs-container">
      <button class="tab-btn active" onclick="window.location.hash='#admin'">System Overview</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/tenants'">Tenant Management</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/logs'">Global System Logs</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/settings'">Global System Settings</button>
    </div>

    <!-- Admin Dashboard metrics cards -->
    <div class="dashboard-grid">
      <div class="card stat-card interactive" onclick="window.location.hash='#admin/tenants'">
        <div class="stat-card-top">
          <div class="stat-card-label">Active Tenants</div>
          <div class="stat-card-icon"><i class="lucide-building" data-lucide="building"></i></div>
        </div>
        <div class="stat-card-value">${tenants.length}</div>
        <div class="stat-card-trend up">
          <span class="stat-card-trend-text">All active workspace groups</span>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-card-top">
          <div class="stat-card-label">Total Users (Global)</div>
          <div class="stat-card-icon"><i class="lucide-users" data-lucide="users"></i></div>
        </div>
        <div class="stat-card-value">${totalUsers}</div>
        <div class="stat-card-trend up">
          <span class="stat-card-trend-text">Across all active workspaces</span>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-card-top">
          <div class="stat-card-label">Global Storage Used</div>
          <div class="stat-card-icon"><i class="lucide-database" data-lucide="database"></i></div>
        </div>
        <div class="stat-card-value">${totalStorage} GB</div>
        <div class="stat-card-trend up">
          <span class="stat-card-trend-text">Quota allocated: 230 GB max</span>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-card-top">
          <div class="stat-card-label">System Performance</div>
          <div class="stat-card-icon"><i class="lucide-activity" data-lucide="activity"></i></div>
        </div>
        <div class="stat-card-value">99.98%</div>
        <div class="stat-card-trend up" style="color: var(--color-success)">
          <i class="lucide-check" data-lucide="check"></i>
          <span>Operational</span>
        </div>
      </div>
    </div>

    <!-- Active Tenant Resource Usage chart & logs -->
    <div class="charts-grid" style="grid-template-columns: 1.5fr 1fr">
      
      <!-- Tenant Usage Chart -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Tenant Storage & Resource Breakdown</h2>
          <div class="badge badge-info">Storage Allocation (GB)</div>
        </div>
        <div class="chart-container">
          <canvas id="tenantResourceChart"></canvas>
        </div>
      </div>

      <!-- Recent Audit Log Feed -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Recent System Audits</h2>
          <button class="btn btn-outline" style="padding: var(--spacing-1) var(--spacing-2); font-size: var(--font-size-xs);" onclick="window.location.hash='#admin/logs'">View All</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--spacing-2)">
          ${logs.slice(0, 5).map(log => `
            <div class="dashboard-list-item" style="padding: var(--spacing-2) 0">
              <div style="max-width: 70%">
                <div style="font-weight: var(--font-weight-semibold); font-size: 12px; color: var(--text-main);">${log.action}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${log.tenant} • ${log.user}</div>
              </div>
              <div style="text-align: right">
                <span class="badge ${log.status === 'Success' ? 'badge-success' : 'badge-danger'}" style="font-size: 9px; padding: 2px 4px">${log.status}</span>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${log.date.split(' ')[1]}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Draw chart
  setTimeout(() => {
    drawTenantResourceChart(tenants);
  }, 50);
};

function drawTenantResourceChart(tenants) {
  const canvas = document.getElementById('tenantResourceChart');
  if (!canvas) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: tenants.map(t => t.name),
      datasets: [
        {
          label: 'Storage Used (GB)',
          data: tenants.map(t => t.storageUsed),
          backgroundColor: tenants.map(t => t.brandingColor || '#4f46e5'),
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: labelColor } },
        y: { grid: { color: gridColor }, ticks: { color: labelColor } }
      }
    }
  });
}

// Render tenants list
window.CRM_PAGES.renderTenantsList = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const tenants = window.CRM_DATA.getTenants();

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Super Admin Console</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Cross-tenant management, system usage audits, and global settings</p>
      </div>
      <div>
        <button class="btn btn-primary" id="add-tenant-btn"><i class="lucide-plus" data-lucide="plus"></i> Add New Tenant</button>
      </div>
    </div>

    <div class="tabs-container">
      <button class="tab-btn" onclick="window.location.hash='#admin'">System Overview</button>
      <button class="tab-btn active" onclick="window.location.hash='#admin/tenants'">Tenant Management</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/logs'">Global System Logs</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/settings'">Global System Settings</button>
    </div>

    <!-- Tenants table -->
    <div class="table-responsive" style="margin-top: var(--spacing-4)">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tenant ID</th>
            <th>Builder / Tenant Name</th>
            <th>Subscription Tier</th>
            <th>Active RERA Code</th>
            <th>Active Users Quota</th>
            <th>Database Usage</th>
            <th>Workspace Domain</th>
            <th>Account Status</th>
          </tr>
        </thead>
        <tbody>
          ${tenants.map(t => {
            const usagePercent = Math.min((t.storageUsed / t.storageMax) * 100, 100).toFixed(0);
            return `
              <tr class="clickable" onclick="window.location.hash='#admin/tenants/${t.id}'">
                <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${t.id}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: var(--radius-full); background-color: ${t.brandingColor || 'var(--brand-primary)'}"></span>
                    <span style="font-weight: var(--font-weight-semibold);">${t.name}</span>
                  </div>
                </td>
                <td><span class="badge ${t.tier === 'Enterprise' ? 'badge-success' : t.tier === 'Professional' ? 'badge-info' : 'badge-neutral'}">${t.tier}</span></td>
                <td><code>${t.rera}</code></td>
                <td>
                  <div style="font-weight: 500">${t.activeUsers} / ${t.maxUsers}</div>
                  <div style="font-size: 10px; color: var(--text-muted);">${((t.activeUsers/t.maxUsers)*100).toFixed(0)}% quota used</div>
                </td>
                <td>
                  <div style="font-weight: 500">${t.storageUsed} GB of ${t.storageMax} GB</div>
                  <div style="width: 100%; height: 6px; border-radius: var(--radius-full); background-color: var(--border-color); overflow: hidden; margin-top: 4px;">
                    <div style="width: ${usagePercent}%; height: 100%; background-color: ${parseFloat(usagePercent) > 85 ? 'var(--color-danger)' : 'var(--brand-primary)'}; border-radius: var(--radius-full);"></div>
                  </div>
                </td>
                <td><code>${t.domain}</code></td>
                <td><span class="badge badge-success">${t.status}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('add-tenant-btn').addEventListener('click', openAddTenantModal);
  if (window.lucide) window.lucide.createIcons();
};

function openAddTenantModal() {
  const dialog = document.getElementById('global-dialog');
  if (!dialog) return;

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3 class="dialog-title">Provision New Builder Tenant</h3>
      <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
    </div>
    <form id="add-tenant-form">
      <div class="dialog-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Builder Company Name</label>
            <input type="text" class="form-control" name="name" required placeholder="e.g. Prestige Developers">
          </div>
          <div class="form-group">
            <label class="form-label">Tenant Domain Code</label>
            <input type="text" class="form-control" name="code" required placeholder="e.g. prestige">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Subscription Tier</label>
            <select class="form-control" name="tier" required>
              <option value="Basic">Basic (10 Users, 5GB)</option>
              <option value="Professional">Professional (50 Users, 25GB)</option>
              <option value="Enterprise">Enterprise (200 Users, 100GB)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">RERA License Registration Number</label>
            <input type="text" class="form-control" name="rera" required placeholder="RERA-XX-XXXX">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Contact Person Name</label>
            <input type="text" class="form-control" name="contact" required placeholder="Super administrator name">
          </div>
          <div class="form-group">
            <label class="form-label">Contact Email Address</label>
            <input type="email" class="form-control" name="email" required placeholder="admin@domain.com">
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('global-dialog').close()">Cancel</button>
        <button type="submit" class="btn btn-primary">Provision Tenant</button>
      </div>
    </form>
  `;

  if (window.lucide) window.lucide.createIcons();
  dialog.showModal();

  const form = document.getElementById('add-tenant-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tier = form.tier.value;
    let maxUsers = 10, storageMax = 5;
    if (tier === 'Professional') { maxUsers = 50; storageMax = 25; }
    if (tier === 'Enterprise') { maxUsers = 200; storageMax = 100; }

    const newTenant = {
      name: form.name.value,
      code: form.code.value.toUpperCase(),
      tier: tier,
      rera: form.rera.value,
      maxUsers: maxUsers,
      storageMax: storageMax,
      domain: `${form.code.value.toLowerCase()}.buildercrm.io`,
      contactPerson: form.contact.value,
      contactEmail: form.email.value
    };

    window.CRM_DATA.addTenant(newTenant);
    window.CRM_DATA.addAuditLog(`Provisioned new tenant workspace ${newTenant.name}`, "Super Admin");
    dialog.close();
    window.CRM_APP.showToast(`Multi-tenant workspace ${newTenant.name} provisioned successfully!`, 'success');
    window.CRM_PAGES.renderTenantsList();
  });
}

// Render detailed Tenant profile
window.CRM_PAGES.renderTenantProfile = (params) => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const tenants = window.CRM_DATA.getTenants();
  const tenant = tenants.find(t => t.id === params.id);
  if (!tenant) {
    container.innerHTML = `<div class="card"><p>Tenant not found.</p></div>`;
    return;
  }

  const usagePercent = Math.min((tenant.storageUsed / tenant.storageMax) * 100, 100).toFixed(0);

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <div style="display: flex; align-items: center; gap: var(--spacing-3)">
          <button class="btn btn-outline btn-icon" onclick="window.location.hash='#admin/tenants'">
            <i class="lucide-arrow-left" data-lucide="arrow-left"></i>
          </button>
          <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">${tenant.name} Details</h1>
          <span class="badge badge-success">Tenant Account</span>
        </div>
      </div>
      <div style="display: flex; gap: var(--spacing-2)">
        <button class="btn btn-outline" onclick="window.CRM_APP.showToast('Billing report downloaded', 'info')"><i class="lucide-file-text" data-lucide="file-text"></i> Invoice Audit</button>
        <button class="btn btn-primary" id="save-tenant-custom">Save Configurations</button>
      </div>
    </div>

    <!-- Layout split grid -->
    <div class="profile-layout" style="grid-template-columns: 300px 1fr">
      
      <!-- Tenant metadata sidebar card -->
      <div class="card">
        <div style="width: 64px; height: 64px; border-radius: var(--radius-lg); background-color: ${tenant.brandingColor}; margin: 0 auto var(--spacing-4) auto; display: flex; align-items: center; justify-content: center; color: var(--white); font-weight: bold; font-size: 1.5rem">
          ${tenant.code}
        </div>
        <h3 style="text-align: center; margin-bottom: var(--spacing-4);">${tenant.name}</h3>
        
        <ul class="profile-detail-list">
          <li class="profile-detail-item">
            <span class="profile-detail-label">Subscription Tier</span>
            <span class="profile-detail-value">${tenant.tier}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">RERA Authority Code</span>
            <span class="profile-detail-value">${tenant.rera}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Primary administrator</span>
            <span class="profile-detail-value">${tenant.contactPerson}</span>
          </li>
          <li class="profile-detail-item">
            <span class="profile-detail-label">Admin Email</span>
            <span class="profile-detail-value" style="word-break: break-all;">${tenant.contactEmail}</span>
          </li>
        </ul>
      </div>

      <!-- Detail configurations panels -->
      <div style="display: flex; flex-direction: column; gap: var(--spacing-6)">
        
        <!-- Resource meter indicators -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Tenant Quota Utilization</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-6)">
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-2)">
                <span style="font-size: var(--font-size-sm); font-weight: 500;">Storage allocation</span>
                <span style="font-size: var(--font-size-xs); color: var(--text-muted);">${tenant.storageUsed} GB / ${tenant.storageMax} GB (${usagePercent}%)</span>
              </div>
              <div style="width: 100%; height: 8px; border-radius: var(--radius-full); background-color: var(--border-color); overflow: hidden;">
                <div style="width: ${usagePercent}%; height: 100%; background-color: ${tenant.brandingColor}; border-radius: var(--radius-full)"></div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-2)">
                <span style="font-size: var(--font-size-sm); font-weight: 500;">Active User Seats</span>
                <span style="font-size: var(--font-size-xs); color: var(--text-muted);">${tenant.activeUsers} / ${tenant.maxUsers} Users</span>
              </div>
              <div style="width: 100%; height: 8px; border-radius: var(--radius-full); background-color: var(--border-color); overflow: hidden;">
                <div style="width: ${((tenant.activeUsers / tenant.maxUsers)*100).toFixed(0)}%; height: 100%; background-color: var(--color-success); border-radius: var(--radius-full)"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="recent-grid">
          <!-- Branded theme preview editor -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Workspace Theme Configuration</h3>
            <div class="form-group">
              <label class="form-label">Active Branding Color</label>
              <div style="display: flex; gap: var(--spacing-3); align-items: center">
                <input type="color" id="tenant-color-picker" value="${tenant.brandingColor}" style="border: none; width: 42px; height: 42px; cursor: pointer; background: none;">
                <span style="font-size: var(--font-size-sm); font-family: monospace; font-weight: var(--font-weight-semibold);">${tenant.brandingColor}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Custom Domain Alias</label>
              <input type="text" class="form-control" id="tenant-domain-input" value="${tenant.domain}">
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Points custom domain CNAME aliases to our routing gateways.</p>
            </div>
          </div>

          <!-- Single-Sign-On settings -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Tenant SSO Authentications</h3>
            <div class="form-group">
              <label class="form-label">Identity SAML Provider</label>
              <select class="form-control" id="tenant-sso-provider">
                <option value="none">No Single Sign-On (Username & Password)</option>
                <option value="okta">Okta Identity Integration Provider</option>
                <option value="azure">Azure Microsoft Active Directory (SAML 2.0)</option>
                <option value="google">Google Workspaces Identity SSO</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: var(--spacing-2); margin-top: var(--spacing-2);">
              <label class="checkbox-label">
                <input type="checkbox" class="checkbox-control" checked>
                Enforce Multi-Factor Auths (MFA)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" class="checkbox-control">
                Allow guests external referrals accounts
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Color picker action
  const colorPicker = document.getElementById('tenant-color-picker');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      tenant.brandingColor = e.target.value;
      colorPicker.nextElementSibling.innerText = e.target.value;
    });
  }

  // Save configurations button
  document.getElementById('save-tenant-custom').addEventListener('click', () => {
    tenant.domain = document.getElementById('tenant-domain-input').value;
    window.CRM_DATA.addAuditLog(`Updated domain and branding color profiles for ${tenant.name}`, "Super Admin");
    window.CRM_APP.showToast('Tenant security and domain configurations updated!', 'success');
    window.CRM_PAGES.renderTenantProfile({ id: tenant.id });
  });
};

// Render Global System Audit Logs
window.CRM_PAGES.renderSystemLogs = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const logs = window.CRM_DATA.getAuditLogs();

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Super Admin Console</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Cross-tenant management, system usage audits, and global settings</p>
      </div>
      <div>
        <button class="btn btn-outline" id="logs-clear-btn"><i class="lucide-trash-2" data-lucide="trash-2"></i> Flush Console Logs</button>
      </div>
    </div>

    <div class="tabs-container">
      <button class="tab-btn" onclick="window.location.hash='#admin'">System Overview</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/tenants'">Tenant Management</button>
      <button class="tab-btn active" onclick="window.location.hash='#admin/logs'">Global System Logs</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/settings'">Global System Settings</button>
    </div>

    <div class="table-responsive" style="margin-top: var(--spacing-4)">
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Tenant Workspace</th>
            <th>Operating User</th>
            <th>Action Logged</th>
            <th>Terminal Client IP</th>
            <th>Result Status</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td style="font-family: monospace; font-size: 12px; color: var(--text-muted)">${log.date}</td>
              <td style="font-weight: var(--font-weight-semibold);">${log.tenant}</td>
              <td style="font-weight: var(--font-weight-semibold);">${log.user}</td>
              <td>${log.action}</td>
              <td><code>${log.ip}</code></td>
              <td><span class="badge ${log.status === 'Success' ? 'badge-success' : 'badge-danger'}">${log.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('logs-clear-btn').addEventListener('click', () => {
    logs.length = 0; // Clear array mock
    window.CRM_APP.showToast('Global audit events database flushed!', 'warning');
    window.CRM_PAGES.renderSystemLogs();
  });

  if (window.lucide) window.lucide.createIcons();
};

// Render Global System Settings
window.CRM_PAGES.renderSystemSettings = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Super Admin Console</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Cross-tenant management, system usage audits, and global settings</p>
      </div>
    </div>

    <div class="tabs-container">
      <button class="tab-btn" onclick="window.location.hash='#admin'">System Overview</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/tenants'">Tenant Management</button>
      <button class="tab-btn" onclick="window.location.hash='#admin/logs'">Global System Logs</button>
      <button class="tab-btn active" onclick="window.location.hash='#admin/settings'">Global System Settings</button>
    </div>

    <div class="recent-grid" style="margin-top: var(--spacing-4); align-items: start;">
      
      <!-- Global Single-Sign-On settings card -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Global Identity & SSO Gateway</h3>
        <form id="global-sso-form">
          <div class="form-group">
            <label class="form-label">Authentication Mode</label>
            <select class="form-control" name="authMode">
              <option value="hybrid">Hybrid Mode (Credentials & SSO Providers)</option>
              <option value="sso">Enforce SAML 2.0 Single Sign-On Only</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Federated SSO Provider URL</label>
            <input type="url" class="form-control" name="ssoUrl" value="https://sso.buildercrm.io/auth/realms/gateways" placeholder="SSO login endpoints link">
          </div>
          <div class="form-group">
            <label class="form-label">Encryption Private Certificate (PEM)</label>
            <textarea class="form-control" rows="3" name="cert" readonly style="font-family: monospace; font-size: 11px;">-----BEGIN PRIVATE CERTIFICATE-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDh4S2HjWlh105m\n-----END PRIVATE CERTIFICATE-----</textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%">Save SSO Configurations</button>
        </form>
      </div>

      <!-- Resource Allocation Settings Card -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Global Database & Backups limits</h3>
        <form id="global-limits-form">
          <div class="form-group">
            <label class="form-label">Automated System Backups Frequency</label>
            <select class="form-control" name="backupFreq">
              <option value="daily">Daily Incremental (Retain 30 Days)</option>
              <option value="weekly">Weekly snapshot (Retain 90 Days)</option>
              <option value="monthly">Monthly Snapshot (Archived Permanent)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Max File Upload Attachment Limits</label>
            <select class="form-control" name="maxUpload">
              <option value="10">10 MB Max per attachment</option>
              <option value="25" selected>25 MB Max per attachment</option>
              <option value="50">50 MB Max per attachment</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Default Tenant Storage Limit (New Registrations)</label>
            <input type="text" class="form-control" name="defStorage" value="5 GB Base storage space" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%">Save Systems Limits</button>
        </form>
      </div>

    </div>
  `;

  document.getElementById('global-sso-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.CRM_DATA.addAuditLog("Updated global federated SSO configurations settings", "Super Admin");
    window.CRM_APP.showToast('Global Single-Sign-On system properties updated!', 'success');
  });

  document.getElementById('global-limits-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.CRM_DATA.addAuditLog("Updated system limit properties and backup frequencies", "Super Admin");
    window.CRM_APP.showToast('Backup schedules and attachment limits properties saved!', 'success');
  });

  if (window.lucide) window.lucide.createIcons();
};
