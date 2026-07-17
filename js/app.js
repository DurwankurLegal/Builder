/* js/app.js */

window.CRM_APP = (() => {
  let theme = 'light';
  let sidebarCollapsed = false;

  // Global Toast function
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'danger') icon = 'alert-circle';

    toast.innerHTML = `
      <i class="lucide-${icon}" data-lucide="${icon}"></i>
      <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Auto-remove toast after 4s
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }

  // Toggle App Theme
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crm-theme', theme);
    
    // Rotate/Change theme switch icon state
    const icon = document.querySelector('#theme-toggle-btn i');
    if (icon) {
      icon.className = theme === 'light' ? 'lucide-moon' : 'lucide-sun';
      icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
      if (window.lucide) window.lucide.createIcons();
    }

    // Dispatch custom event to notify page scripts (re-renders charts)
    window.dispatchEvent(new CustomEvent('crm-theme-changed'));
    
    // Re-render currently active view
    window.CRM_ROUTER.navigate(window.location.hash);
    showToast(`Theme switched to ${theme === 'light' ? 'Light' : 'Dark'} mode!`, 'info');
  }

  // Handle Sidebar collapse
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const shell = document.querySelector('.app-shell');
    
    sidebarCollapsed = !sidebarCollapsed;
    
    if (sidebarCollapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  }

  // Toggle mobile sidebar overlay drawer
  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  }

  // Set up Global Search Modal Command Palette
  function setupGlobalSearch() {
    const searchTrigger = document.getElementById('search-trigger');
    const dialog = document.getElementById('global-dialog');
    
    if (!searchTrigger || !dialog) return;

    searchTrigger.addEventListener('click', openSearchModal);

    // Keyboard shortcut (Cmd+K / Ctrl+K)
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
    });
  }

  function openSearchModal() {
    const dialog = document.getElementById('global-dialog');
    if (!dialog) return;

    dialog.innerHTML = `
      <div class="dialog-header">
        <h3 class="dialog-title">Global Search Database</h3>
        <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
      </div>
      <div class="dialog-body" style="padding-top: var(--spacing-4)">
        <div class="search-wrapper" style="margin-bottom: var(--spacing-4)">
          <i class="lucide-search" data-lucide="search"></i>
          <input type="text" class="form-control" id="modal-global-search" placeholder="Type customer name, phone, project or budget..." autofocus>
        </div>
        <div id="global-search-results" style="display: flex; flex-direction: column; gap: var(--spacing-2); max-height: 250px; overflow-y: auto;">
          <p style="text-align: center; color: var(--text-muted); font-size: var(--font-size-sm)">Start typing to search across leads & customers...</p>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    dialog.showModal();

    const input = document.getElementById('modal-global-search');
    const resultsContainer = document.getElementById('global-search-results');

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: var(--font-size-sm)">Start typing to search...</p>`;
        return;
      }

      const leads = window.CRM_DATA.getLeads();
      const customers = window.CRM_DATA.getCustomers();

      const matchedLeads = leads.filter(l => l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) || l.mobile.includes(q));
      const matchedCust = customers.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.contact.includes(q));

      if (matchedLeads.length === 0 && matchedCust.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: var(--font-size-sm)">No records matched your search term.</p>`;
        return;
      }

      let html = '';
      
      matchedLeads.forEach(l => {
        html += `
          <div class="dropdown-item" onclick="window.location.hash='#leads/${l.id}'; document.getElementById('global-dialog').close();" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color); padding: 8px var(--spacing-4);">
            <div>
              <div style="font-weight: bold; font-size: 13px;">${l.name} <span class="badge badge-info" style="font-size: 9px; padding: 2px 4px">Lead</span></div>
              <div style="font-size: 11px; color: var(--text-muted)">${l.project} • ${l.mobile}</div>
            </div>
            <i class="lucide-chevron-right" data-lucide="chevron-right" style="font-size: 14px;"></i>
          </div>
        `;
      });

      matchedCust.forEach(c => {
        html += `
          <div class="dropdown-item" onclick="window.location.hash='#customers/${c.id}'; document.getElementById('global-dialog').close();" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color); padding: 8px var(--spacing-4);">
            <div>
              <div style="font-weight: bold; font-size: 13px;">${c.name} <span class="badge badge-success" style="font-size: 9px; padding: 2px 4px">Customer</span></div>
              <div style="font-size: 11px; color: var(--text-muted)">${c.project} • ${c.contact}</div>
            </div>
            <i class="lucide-chevron-right" data-lucide="chevron-right" style="font-size: 14px;"></i>
          </div>
        `;
      });

      resultsContainer.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // Setup Notification dropdown panel mockup
  function setupNotifications() {
    const notifyBtn = document.getElementById('notify-btn');
    const menu = document.getElementById('notify-dropdown');

    if (!notifyBtn || !menu) return;

    notifyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('active');
    });
  }

  // Setup Profile dropdown panel mockup
  function setupProfileMenu() {
    const trigger = document.getElementById('profile-trigger');
    const menu = document.getElementById('profile-dropdown');

    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('active');
    });
  }

  // App Initialization
  function init() {
    // Determine Saved Theme Mode (Light/Dark)
    const savedTheme = localStorage.getItem('crm-theme');
    if (savedTheme) {
      theme = savedTheme;
      document.documentElement.setAttribute('data-theme', theme);
      
      const icon = document.querySelector('#theme-toggle-btn i');
      if (icon) {
        icon.className = theme === 'light' ? 'lucide-moon' : 'lucide-sun';
      }
    }

    // Determine Saved Style Palette (Indigo/Emerald/Amber/Violet)
    const savedStyle = localStorage.getItem('crm-style') || 'indigo';
    document.documentElement.setAttribute('data-style', savedStyle);
    
    const styleSelector = document.getElementById('topbar-style-select');
    if (styleSelector) {
      styleSelector.value = savedStyle;
      styleSelector.addEventListener('change', (e) => {
        const val = e.target.value;
        document.documentElement.setAttribute('data-style', val);
        localStorage.setItem('crm-style', val);
        showToast(`Branding palette switched to ${val.charAt(0).toUpperCase() + val.slice(1)}!`, 'success');
        // Refresh router to redraw charts in new color schemas
        window.CRM_ROUTER.navigate(window.location.hash || '#dashboard');
      });
    }

    // Attach basic triggers
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const mobileMenuBtn = document.getElementById('mobile-menu-toggle-btn');
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileSidebar);

    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.addEventListener('click', toggleMobileSidebar);

    setupGlobalSearch();
    setupNotifications();
    setupProfileMenu();

    // Register routes to client SPA router
    window.CRM_ROUTER.add('dashboard', window.CRM_PAGES.renderDashboard);
    window.CRM_ROUTER.add('leads', window.CRM_PAGES.renderLeads);
    window.CRM_ROUTER.add('leads/:id', window.CRM_PAGES.renderLeadProfile);
    window.CRM_ROUTER.add('customers', window.CRM_PAGES.renderCustomers);
    window.CRM_ROUTER.add('customers/:id', window.CRM_PAGES.renderCustomerProfile);
    window.CRM_ROUTER.add('deal-closed', window.CRM_PAGES.renderDealClosed);
    window.CRM_ROUTER.add('deal-closed/:bookingNo', window.CRM_PAGES.renderBookingDetails);
    window.CRM_ROUTER.add('deal-lost', window.CRM_PAGES.renderDealLost);
    window.CRM_ROUTER.add('followups', window.CRM_PAGES.renderFollowUps);
    window.CRM_ROUTER.add('reports', window.CRM_PAGES.renderReports);
    window.CRM_ROUTER.add('settings', window.CRM_PAGES.renderSettings);
    window.CRM_ROUTER.add('admin', window.CRM_PAGES.renderAdminDashboard);
    window.CRM_ROUTER.add('admin/tenants', window.CRM_PAGES.renderTenantsList);
    window.CRM_ROUTER.add('admin/tenants/:id', window.CRM_PAGES.renderTenantProfile);
    window.CRM_ROUTER.add('admin/logs', window.CRM_PAGES.renderSystemLogs);
    window.CRM_ROUTER.add('admin/settings', window.CRM_PAGES.renderSystemSettings);

    // Setup Multi-Tenant Selector topbar triggers
    const tenantSelector = document.getElementById('topbar-tenant-select');
    if (tenantSelector) {
      // Set initial value based on active tenant
      const activeTenant = window.CRM_DATA.getActiveTenant();
      if (activeTenant) {
        tenantSelector.value = activeTenant.id;
      }

      tenantSelector.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const switched = window.CRM_DATA.setActiveTenant(selectedId);
        if (switched) {
          window.CRM_DATA.addAuditLog(`Switched active workspace context to ${switched.name}`, "Super Admin", switched.name);
          showToast(`Switched workspace context to ${switched.name}!`, 'success');
          // Re-navigate current route to refresh context
          window.CRM_ROUTER.navigate(window.location.hash || '#dashboard');
        }
      });
    }

    // Setup dialog backdrop click dismiss fallback (for browsers without closedby support)
    const dialog = document.getElementById('global-dialog');
    if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (isDialogContent) return;
        dialog.close();
      });
    }

    // Boot router
    window.CRM_ROUTER.init();
    
    // Hello prompt
    showToast("Welcome back! Builder CRM booted successfully.", "success");
  }

  return {
    init,
    showToast
  };
})();

// Document Ready trigger
document.addEventListener('DOMContentLoaded', () => {
  window.CRM_APP.init();
});
