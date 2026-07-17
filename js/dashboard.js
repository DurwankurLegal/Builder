/* js/dashboard.js */

window.CRM_PAGES = window.CRM_PAGES || {};

window.CRM_PAGES.renderDashboard = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const leads = window.CRM_DATA.getLeads();
  const customers = window.CRM_DATA.getCustomers();
  const bookings = window.CRM_DATA.getClosedDeals();
  const lost = window.CRM_DATA.getLostDeals();
  const followups = window.CRM_DATA.getFollowUps();

  // Filter today's followups
  const today = "2026-07-15"; // Static date reference
  const todayFollowups = followups.filter(f => f.date === today && f.status === 'Pending');

  // Compute total sales metrics
  const totalSalesVal = bookings.reduce((sum, b) => sum + b.bookingValueNum, 0);
  const formattedTotalSales = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalSalesVal);

  container.innerHTML = `
    <!-- Top Stats Cards Grid -->
    <div class="dashboard-grid">
      <!-- Total Leads -->
      <div class="card stat-card interactive" onclick="window.location.hash='#leads'">
        <div class="stat-card-top">
          <div class="stat-card-label">Total Leads</div>
          <div class="stat-card-icon"><i class="lucide-users" data-lucide="users"></i></div>
        </div>
        <div class="stat-card-value">${leads.length}</div>
        <div class="stat-card-trend up">
          <i class="lucide-trending-up" data-lucide="trending-up"></i>
          <span>12.4%</span>
          <span class="stat-card-trend-text">vs last month</span>
        </div>
      </div>

      <!-- Qualified Customers -->
      <div class="card stat-card interactive" onclick="window.location.hash='#customers'">
        <div class="stat-card-top">
          <div class="stat-card-label">Active Customers</div>
          <div class="stat-card-icon"><i class="lucide-shield-check" data-lucide="shield-check"></i></div>
        </div>
        <div class="stat-card-value">${customers.length}</div>
        <div class="stat-card-trend up">
          <i class="lucide-trending-up" data-lucide="trending-up"></i>
          <span>8.2%</span>
          <span class="stat-card-trend-text">vs last month</span>
        </div>
      </div>

      <!-- Deals Closed -->
      <div class="card stat-card interactive" onclick="window.location.hash='#deal-closed'">
        <div class="stat-card-top">
          <div class="stat-card-label">Deals Closed</div>
          <div class="stat-card-icon"><i class="lucide-sparkles" data-lucide="sparkles"></i></div>
        </div>
        <div class="stat-card-value">${bookings.length}</div>
        <div class="stat-card-trend up">
          <i class="lucide-trending-up" data-lucide="trending-up"></i>
          <span>15.1%</span>
          <span class="stat-card-trend-text">vs last month</span>
        </div>
      </div>

      <!-- Deals Lost -->
      <div class="card stat-card interactive" onclick="window.location.hash='#deal-lost'">
        <div class="stat-card-top">
          <div class="stat-card-label">Deals Lost</div>
          <div class="stat-card-icon"><i class="lucide-frown" data-lucide="frown"></i></div>
        </div>
        <div class="stat-card-value">${lost.length}</div>
        <div class="stat-card-trend down">
          <i class="lucide-trending-down" data-lucide="trending-down"></i>
          <span>3.2%</span>
          <span class="stat-card-trend-text">vs last month</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Today's Follow-ups -->
      <div class="card stat-card interactive" onclick="window.location.hash='#followups'">
        <div class="stat-card-top">
          <div class="stat-card-label">Today's Follow-ups</div>
          <div class="stat-card-icon"><i class="lucide-calendar-days" data-lucide="calendar-days"></i></div>
        </div>
        <div class="stat-card-value">${todayFollowups.length}</div>
        <div class="stat-card-trend up">
          <span class="badge badge-warning">${todayFollowups.filter(f => f.type === 'Meeting').length} Meetings scheduled</span>
        </div>
      </div>

      <!-- Site Visits -->
      <div class="card stat-card interactive" onclick="window.location.hash='#followups'">
        <div class="stat-card-top">
          <div class="stat-card-label">Pending Site Visits</div>
          <div class="stat-card-icon"><i class="lucide-map-pin" data-lucide="map-pin"></i></div>
        </div>
        <div class="stat-card-value">14</div>
        <div class="stat-card-trend up">
          <i class="lucide-trending-up" data-lucide="trending-up"></i>
          <span>4 this week</span>
        </div>
      </div>

      <!-- Monthly Sales -->
      <div class="card stat-card">
        <div class="stat-card-top">
          <div class="stat-card-label">Monthly Sales Value</div>
          <div class="stat-card-icon"><i class="lucide-coins" data-lucide="coins"></i></div>
        </div>
        <div class="stat-card-value">₹2.45 Cr</div>
        <div class="stat-card-trend up">
          <i class="lucide-trending-up" data-lucide="trending-up"></i>
          <span>18.6%</span>
          <span class="stat-card-trend-text">vs target</span>
        </div>
      </div>

      <!-- Booking Value -->
      <div class="card stat-card interactive" onclick="window.location.hash='#deal-closed'">
        <div class="stat-card-top">
          <div class="stat-card-label">Total Booking Portfolio</div>
          <div class="stat-card-icon"><i class="lucide-wallet" data-lucide="wallet"></i></div>
        </div>
        <div class="stat-card-value" style="font-size: 1.55rem; line-height: 1.5;">${formattedTotalSales}</div>
        <div class="stat-card-trend up">
          <span class="stat-card-trend-text">Cumulative bookings metrics</span>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid">
      <!-- Sales Trend Line Chart -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Sales Trend & Projection</h2>
          <div class="badge badge-info">Monthly Breakdown</div>
        </div>
        <div class="chart-container">
          <canvas id="salesTrendChart"></canvas>
        </div>
      </div>

      <!-- Lead Sources Pie Chart -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Lead Sources Distribution</h2>
          <div class="badge badge-success">High Conversion</div>
        </div>
        <div class="chart-container">
          <canvas id="leadSourceChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Tables & Activity feeds -->
    <div class="recent-grid">
      <!-- Recent Leads -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Recent Inbound Leads</h2>
          <button class="btn btn-outline" onclick="window.location.hash='#leads'">View All</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--spacing-1)">
          ${leads.slice(0, 5).map(lead => `
            <div class="dashboard-list-item interactive" style="cursor: pointer;" onclick="window.location.hash='#leads/${lead.id}'">
              <div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">${lead.name}</div>
                <div style="font-size: var(--font-size-xs); color: var(--text-muted);">${lead.project} • ${lead.budget}</div>
              </div>
              <div style="text-align: right">
                <span class="badge ${lead.status === 'New' ? 'badge-info' : lead.status === 'Site Visit Done' ? 'badge-success' : 'badge-neutral'}">${lead.status}</span>
                <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px;">${lead.date}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Upcoming Followups -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Upcoming Tasks & Follow-ups</h2>
          <button class="btn btn-outline" onclick="window.location.hash='#followups'">Calendar View</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--spacing-1)">
          ${followups.slice(0, 5).map(follow => `
            <div class="dashboard-list-item">
              <div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">${follow.customer}</div>
                <div style="font-size: var(--font-size-xs); color: var(--text-muted);">${follow.notes}</div>
              </div>
              <div style="text-align: right">
                <span class="badge ${follow.type === 'Call' ? 'badge-info' : follow.type === 'Meeting' ? 'badge-warning' : 'badge-neutral'}">
                  <i class="${follow.type === 'Call' ? 'lucide-phone' : follow.type === 'Meeting' ? 'lucide-users' : 'lucide-mail'}" style="font-size: 10px;"></i>
                  ${follow.type}
                </span>
                <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px;">${follow.date}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Draw Charts asynchronously using Chart.js API
  setTimeout(() => {
    drawSalesChart();
    drawLeadSourceChart();
  }, 50);
};

// Sales Trend Line chart drawing function
function drawSalesChart() {
  const canvas = document.getElementById('salesTrendChart');
  if (!canvas) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'Sales Revenue (₹ Lakhs)',
          data: [180, 240, 290, 210, 310, 420, 390, 480, 540, 610, 590, 710],
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.05)',
          borderWidth: 3,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Target Goal',
          data: [200, 230, 270, 300, 320, 350, 380, 400, 450, 480, 520, 550],
          borderColor: '#10b981',
          borderDash: [5, 5],
          borderWidth: 2,
          fill: false,
          pointStyle: 'none',
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: labelColor, font: { family: 'Inter' } }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { family: 'Inter' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { family: 'Inter' } }
        }
      }
    }
  });
}

// Lead Source distribution pie chart
function drawLeadSourceChart() {
  const canvas = document.getElementById('leadSourceChart');
  if (!canvas) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Website', '99acres', 'MagicBricks', 'Facebook', 'Referral', 'Walk-in'],
      datasets: [{
        data: [35, 20, 15, 12, 10, 8],
        backgroundColor: [
          '#4f46e5', // Indigo
          '#0ea5e9', // Sky
          '#6366f1', // Light Indigo
          '#f59e0b', // Amber
          '#10b981', // Emerald
          '#f43f5e'  // Rose
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: labelColor, font: { family: 'Inter', size: 11 } }
        }
      },
      cutout: '65%'
    }
  });
}
