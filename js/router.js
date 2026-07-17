/* js/router.js */

window.CRM_ROUTER = (() => {
  const routes = {};
  let currentActiveRoute = null;

  // Add route definition
  function add(path, renderFn) {
    routes[path] = renderFn;
  }

  // Parse path and extract parameters
  function parsePath(hash) {
    const cleanHash = hash.replace(/^#\/?/, '') || 'dashboard';
    const parts = cleanHash.split('/');
    
    // Find matching route pattern
    for (const routePattern in routes) {
      const patternParts = routePattern.split('/');
      if (patternParts.length !== parts.length) continue;

      const params = {};
      let matches = true;

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          const paramName = patternParts[i].slice(1);
          params[paramName] = parts[i];
        } else if (patternParts[i] !== parts[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return { handler: routes[routePattern], params, routeName: routePattern, rawPath: cleanHash };
      }
    }
    
    // Fallback: Dashboard
    return { handler: routes['dashboard'], params: {}, routeName: 'dashboard', rawPath: 'dashboard' };
  }

  // Handle route switching
  function navigate() {
    const route = parsePath(window.location.hash);
    if (!route || !route.handler) return;

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // View Transition support check
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        executeDOMUpdate(route, appContent);
      });
    } else {
      executeDOMUpdate(route, appContent);
    }
  }

  function executeDOMUpdate(route, container) {
    // 1. Run rendering function
    route.handler(route.params);

    // 2. Render Breadcrumbs
    renderBreadcrumbs(route.rawPath);

    // 3. Highlight sidebar nav item
    highlightSidebar(route.rawPath);

    // 4. Accessibility focus shift (Screen readers support)
    const headerElement = container.querySelector('h1, h2');
    if (headerElement) {
      headerElement.setAttribute('tabindex', '-1');
      headerElement.focus();
    }
    
    // Scroll to top
    container.scrollTop = 0;
  }

  // Breadcrumb rendering utility
  function renderBreadcrumbs(path) {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    if (!breadcrumbContainer) return;

    const parts = path.split('/');
    let html = `
      <a href="#dashboard" class="breadcrumb-item">Builder CRM</a>
      <span class="breadcrumb-separator"><i class="lucide-chevron-right" data-lucide="chevron-right"></i></span>
    `;

    let currentLink = '#';
    parts.forEach((part, index) => {
      currentLink += part;
      const label = formatLabel(part);
      const isActive = index === parts.length - 1;
      
      if (isActive) {
        html += `<span class="breadcrumb-item active">${label}</span>`;
      } else {
        html += `
          <a href="${currentLink}" class="breadcrumb-item">${label}</a>
          <span class="breadcrumb-separator"><i class="lucide-chevron-right" data-lucide="chevron-right"></i></span>
        `;
        currentLink += '/';
      }
    });

    breadcrumbContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  function formatLabel(str) {
    if (!str) return '';
    // If it's an ID like LD-1001
    if (str.includes('-')) return str.toUpperCase();
    
    // Capitalize and replace hyphens
    const replaced = str.replace(/-/g, ' ');
    return replaced.charAt(0).toUpperCase() + replaced.slice(1);
  }

  function highlightSidebar(path) {
    const items = document.querySelectorAll('.sidebar-item');
    const primarySection = path.split('/')[0];

    items.forEach(item => {
      const link = item.querySelector('a');
      if (link) {
        const hash = link.getAttribute('href');
        const section = hash.replace(/^#\/?/, '').split('/')[0];
        if (section === primarySection) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });
  }

  // Setup router listeners
  function init() {
    window.addEventListener('hashchange', navigate);
    // Initial navigation
    navigate();
  }

  return {
    add,
    init,
    navigate: (hash) => { window.location.hash = hash; }
  };
})();
