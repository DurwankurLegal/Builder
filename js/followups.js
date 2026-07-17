/* js/followups.js */

window.CRM_PAGES = window.CRM_PAGES || {};

window.CRM_PAGES.renderFollowUps = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const followups = window.CRM_DATA.getFollowUps();

  if (!window.CRM_FOLLOW_TAB) {
    window.CRM_FOLLOW_TAB = 'list'; // 'list' | 'calendar' | 'timeline'
  }

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Follow-ups Manager</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Log, track, and reschedule customer touchpoints</p>
      </div>
      <div>
        <button class="btn btn-primary" id="schedule-followup-trigger">
          <i class="lucide-plus" data-lucide="plus"></i> Schedule Task
        </button>
      </div>
    </div>

    <!-- Toggle tab container -->
    <div class="tabs-container">
      <button class="tab-btn ${window.CRM_FOLLOW_TAB === 'list' ? 'active' : ''}" data-tab="list">List View</button>
      <button class="tab-btn ${window.CRM_FOLLOW_TAB === 'calendar' ? 'active' : ''}" data-tab="calendar">Calendar View</button>
      <button class="tab-btn ${window.CRM_FOLLOW_TAB === 'timeline' ? 'active' : ''}" data-tab="timeline">Timeline View</button>
    </div>

    <div class="followups-view-container" id="follow-view-box">
      <!-- Loaded dynamically below -->
    </div>
  `;

  // Render sub-tabs content
  renderTabContent();

  // Attach tab switcher listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.CRM_FOLLOW_TAB = btn.getAttribute('data-tab');
      renderTabContent();
    });
  });

  // Schedule task trigger
  const scheduleBtn = document.getElementById('schedule-followup-trigger');
  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', () => {
      openScheduleModal();
    });
  }

  if (window.lucide) window.lucide.createIcons();
};

function renderTabContent() {
  const container = document.getElementById('follow-view-box');
  if (!container) return;

  const followups = window.CRM_DATA.getFollowUps();
  const currentTab = window.CRM_FOLLOW_TAB;

  if (currentTab === 'list') {
    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date Scheduled</th>
              <th>Customer</th>
              <th>Touchpoint Type</th>
              <th>Assigned Exec</th>
              <th>Notes / Action Details</th>
              <th>Current Status</th>
            </tr>
          </thead>
          <tbody>
            ${followups.map(f => `
              <tr>
                <td style="font-weight: var(--font-weight-semibold);">${f.date}</td>
                <td style="font-weight: var(--font-weight-semibold);">${f.customer}</td>
                <td>
                  <span class="badge ${f.type === 'Call' ? 'badge-info' : f.type === 'Meeting' ? 'badge-warning' : 'badge-neutral'}">
                    ${f.type}
                  </span>
                </td>
                <td>${f.executive}</td>
                <td style="max-width: 300px; white-space: normal; font-size: var(--font-size-sm);">${f.notes}</td>
                <td>
                  <span class="badge ${f.status === 'Completed' ? 'badge-success' : 'badge-warning'}" style="cursor: pointer;" onclick="toggleFollowUpStatus('${f.id}')">
                    ${f.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (currentTab === 'calendar') {
    // Basic calendar rendering
    const today = new Date("2026-07-15"); // Reference calendar month: July 2026
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    let calendarHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2)">
        <h3 style="font-size: var(--font-size-md)">July 2026</h3>
      </div>
      <div class="calendar-grid">
        <div class="calendar-day-header">SUN</div>
        <div class="calendar-day-header">MON</div>
        <div class="calendar-day-header">TUE</div>
        <div class="calendar-day-header">WED</div>
        <div class="calendar-day-header">THU</div>
        <div class="calendar-day-header">FRI</div>
        <div class="calendar-day-header">SAT</div>
    `;

    // Empty spaces before 1st day of month
    for (let i = 0; i < firstDayIndex; i++) {
      calendarHTML += `<div class="calendar-day empty"></div>`;
    }

    // Days grid
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;
      const dayEvents = followups.filter(f => f.date === dateStr);
      const isToday = day === 15;

      calendarHTML += `
        <div class="calendar-day ${isToday ? 'today' : ''}">
          <span class="calendar-day-number">${day}</span>
          ${dayEvents.map(e => `
            <div class="calendar-event" style="background-color: ${
              e.type === 'Call' ? 'var(--color-info-bg)' : 'var(--color-warning-bg)'
            }; color: ${
              e.type === 'Call' ? 'var(--color-info)' : 'var(--color-warning)'
            }" onclick="openEventDetail('${e.id}')">
              ${e.type}: ${e.customer}
            </div>
          `).join('')}
        </div>
      `;
    }

    calendarHTML += `</div>`;
    container.innerHTML = calendarHTML;
  } else if (currentTab === 'timeline') {
    // Group follow-ups by date
    const grouped = {};
    followups.forEach(f => {
      if (!grouped[f.date]) grouped[f.date] = [];
      grouped[f.date].push(f);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; width: 100%;">
        <div class="timeline">
          ${sortedDates.map(date => `
            <div class="timeline-item">
              <div class="timeline-marker" style="width: auto; height: auto; padding: 4px 8px; border-radius: var(--radius-md); font-size: 11px; font-weight: bold; left: -42px;">
                ${date}
              </div>
              <div style="display: flex; flex-direction: column; gap: var(--spacing-4); margin-top: var(--spacing-6)">
                ${grouped[date].map(f => `
                  <div class="timeline-content" style="background-color: var(--bg-surface);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-2)">
                      <h4 style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">${f.customer}</h4>
                      <span class="badge ${f.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${f.status}</span>
                    </div>
                    <p style="font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: var(--spacing-2)">
                      Assigned: <b>${f.executive}</b> • Touchpoint: <b>${f.type}</b>
                    </p>
                    <p style="font-size: var(--font-size-sm); color: var(--text-main); font-style: italic;">"${f.notes}"</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// Update follow-up status toggle emulator
window.toggleFollowUpStatus = (id) => {
  const followups = window.CRM_DATA.getFollowUps();
  const f = followups.find(item => item.id === id);
  if (f) {
    f.status = f.status === 'Completed' ? 'Pending' : 'Completed';
    window.CRM_APP.showToast(`Task status toggled to ${f.status}.`, 'info');
    renderTabContent();
  }
};

window.openEventDetail = (id) => {
  const f = window.CRM_DATA.getFollowUps().find(item => item.id === id);
  if (f) {
    window.CRM_APP.showToast(`Touchpoint scheduled: ${f.notes}`, 'info');
  }
};

function openScheduleModal() {
  const dialog = document.getElementById('global-dialog');
  if (!dialog) return;

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3 class="dialog-title">Schedule Follow-up Task</h3>
      <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
    </div>
    <form id="schedule-follow-form">
      <div class="dialog-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Client / Customer</label>
            <input type="text" class="form-control" name="customer" required placeholder="Enter customer name">
          </div>
          <div class="form-group">
            <label class="form-label">Touchpoint Type</label>
            <select class="form-control" name="type" required>
              <option value="Call">Phone Call</option>
              <option value="Meeting">Direct Meeting</option>
              <option value="Site Visit">Site Visit</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Task Date</label>
            <input type="date" class="form-control" name="date" required value="2026-07-16">
          </div>
          <div class="form-group">
            <label class="form-label">Sales Executive</label>
            <select class="form-control" name="executive" required>
              ${window.CRM_DATA.getExecutives().map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Follow-up Notes / Agenda</label>
          <textarea class="form-control" name="notes" placeholder="Detailed follow-up agenda..." required style="min-height: 80px;"></textarea>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('global-dialog').close()">Cancel</button>
        <button type="submit" class="btn btn-primary">Schedule</button>
      </div>
    </form>
  `;

  if (window.lucide) window.lucide.createIcons();
  dialog.showModal();

  const form = document.getElementById('schedule-follow-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newFollow = {
      id: `F-${window.CRM_DATA.getFollowUps().length + 1}`,
      customer: form.customer.value,
      type: form.type.value,
      date: form.date.value,
      executive: form.executive.value,
      notes: form.notes.value,
      status: 'Pending',
      nextFollowUp: ''
    };

    window.CRM_DATA.getFollowUps().push(newFollow);
    dialog.close();
    window.CRM_APP.showToast('Follow-up scheduled successfully!', 'success');
    renderTabContent();
  });
}
