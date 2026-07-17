/* js/deal-lost.js */

window.CRM_PAGES = window.CRM_PAGES || {};

window.CRM_PAGES.renderDealLost = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const lostDeals = window.CRM_DATA.getLostDeals();
  const lostReasons = window.CRM_DATA.getLostReasons();

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Lost Opportunities</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">De-brief and audit details of lost deals and competitors</p>
      </div>
      <div>
        <button class="btn btn-outline" id="lost-export-btn">
          <i class="lucide-download" data-lucide="download"></i> Export Lost Audit
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Lead No</th>
            <th>Customer Name</th>
            <th>Project Area</th>
            <th>Lost Date</th>
            <th>Primary Lost Reason</th>
            <th>Competitor Chosen</th>
            <th>Sales Exec Assigned</th>
          </tr>
        </thead>
        <tbody>
          ${lostDeals.map(deal => {
            const reasonObj = lostReasons.find(r => r.name === deal.lostReason) || { color: "badge-neutral" };
            return `
              <tr class="clickable" onclick="window.location.hash='#leads/${deal.leadNo}'">
                <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${deal.leadNo}</td>
                <td style="font-weight: var(--font-weight-semibold);">${deal.customer}</td>
                <td>${deal.project}</td>
                <td>${deal.lostDate}</td>
                <td>
                  <span class="badge ${reasonObj.color}">
                    ${deal.lostReason}
                  </span>
                </td>
                <td style="font-weight: var(--font-weight-medium);">${deal.competitor}</td>
                <td>${deal.executive}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Export event
  const exportBtn = document.getElementById('lost-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('Lost deals report exported successfully!', 'success');
    });
  }

  if (window.lucide) window.lucide.createIcons();
};
