/* js/reports.js */

window.CRM_PAGES = window.CRM_PAGES || {};

window.CRM_PAGES.renderReports = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Analytical Reports</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Real-time performance metrics and sales funnels graphs</p>
      </div>
    </div>

    <!-- Reports Dashboard Grid -->
    <div class="reports-grid">
      
      <!-- Card: Sales Report -->
      <div class="card interactive" onclick="openReportDetail('sales')">
        <h3 class="card-title" style="margin-bottom: var(--spacing-2)">Monthly Sales Report</h3>
        <p style="font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: var(--spacing-4)">Monthly billing value vs projection</p>
        <div style="height: 150px; position: relative;">
          <canvas id="repSalesChartMini"></canvas>
        </div>
      </div>

      <!-- Card: Lead Source Conversion -->
      <div class="card interactive" onclick="openReportDetail('source')">
        <h3 class="card-title" style="margin-bottom: var(--spacing-2)">Conversion by Channel</h3>
        <p style="font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: var(--spacing-4)">Lead source volume analysis</p>
        <div style="height: 150px; position: relative;">
          <canvas id="repSourceChartMini"></canvas>
        </div>
      </div>

      <!-- Card: Sales Executive Performance -->
      <div class="card interactive" onclick="openReportDetail('executives')">
        <h3 class="card-title" style="margin-bottom: var(--spacing-2)">Executive League Board</h3>
        <p style="font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: var(--spacing-4)">Assigned vs closed deals ratio</p>
        <div style="height: 150px; position: relative;">
          <canvas id="repExecChartMini"></canvas>
        </div>
      </div>

    </div>

    <!-- Detailed report container block -->
    <div class="card" id="report-detail-card" style="display: none;">
      <!-- Loaded dynamically via click -->
    </div>
  `;

  // Draw Mini Graphs
  setTimeout(() => {
    drawMiniGraphs();
  }, 50);
};

function drawMiniGraphs() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  // Sales Chart Mini
  const c1 = document.getElementById('repSalesChartMini');
  if (c1) {
    new Chart(c1.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          data: [610, 940, 1410, 1910],
          backgroundColor: '#4f46e5',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: labelColor } }, y: { display: false } }
      }
    });
  }

  // Source Chart Mini
  const c2 = document.getElementById('repSourceChartMini');
  if (c2) {
    new Chart(c2.getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Digital', 'Ref', 'Walk-in'],
        datasets: [{
          data: [67, 18, 15],
          backgroundColor: ['#4f46e5', '#10b981', '#f59e0b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Exec Chart Mini
  const c3 = document.getElementById('repExecChartMini');
  if (c3) {
    new Chart(c3.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Rajesh', 'Priya', 'Amit', 'Neha'],
        datasets: [{
          data: [12, 18, 8, 15],
          backgroundColor: '#10b981',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { ticks: { color: labelColor } } }
      }
    });
  }
}

// Open detailed Report view logic
window.openReportDetail = (type) => {
  const detailCard = document.getElementById('report-detail-card');
  if (!detailCard) return;

  detailCard.style.display = 'block';

  let title = '';
  let canvasId = '';

  if (type === 'sales') {
    title = 'Quarterly Sales Revenue Growth Report';
    canvasId = 'repSalesChartDetailed';
  } else if (type === 'source') {
    title = 'Inbound Lead Source Channel Performance';
    canvasId = 'repSourceChartDetailed';
  } else if (type === 'executives') {
    title = 'Assigned Leads vs Deals Won by Sales Executive';
    canvasId = 'repExecChartDetailed';
  }

  detailCard.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${title}</h3>
      <button class="btn btn-outline btn-icon" onclick="document.getElementById('report-detail-card').style.display='none'">
        <i class="lucide-x" data-lucide="x"></i>
      </button>
    </div>
    <div style="height: 350px; position: relative; margin-top: var(--spacing-4)">
      <canvas id="${canvasId}"></canvas>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Draw Detailed chart
  setTimeout(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (type === 'sales') {
      new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Sales Revenue (₹ Lakhs)',
              data: [180, 240, 290, 210, 310, 420, 390, 480, 540, 610, 590, 710],
              borderColor: '#4f46e5',
              borderWidth: 3,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { color: labelColor } }
          }
        }
      });
    } else if (type === 'source') {
      new Chart(canvas.getContext('2d'), {
        type: 'polarArea',
        data: {
          labels: ['Website Direct', '99acres', 'MagicBricks', 'Facebook Ads', 'Referrals', 'Walk-ins'],
          datasets: [{
            data: [35, 20, 15, 12, 10, 8],
            backgroundColor: ['#4f46e5', '#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: labelColor } } },
          scales: { r: { grid: { color: gridColor }, ticks: { color: labelColor } } }
        }
      });
    } else if (type === 'executives') {
      new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Rajesh Sharma', 'Priya Patel', 'Amit Verma', 'Neha Gupta', 'Vikram Singh', 'Sneha Reddy'],
          datasets: [
            {
              label: 'Leads Assigned',
              data: [45, 60, 35, 55, 30, 40],
              backgroundColor: '#cbd5e1',
              borderRadius: 4
            },
            {
              label: 'Deals Won',
              data: [12, 18, 8, 15, 6, 11],
              backgroundColor: '#10b981',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { color: labelColor } }
          }
        }
      });
    }
  }, 50);

  // Scroll to detail card
  detailCard.scrollIntoView({ behavior: 'smooth' });
};
