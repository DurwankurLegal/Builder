/* js/deal-closed.js */

window.CRM_PAGES = window.CRM_PAGES || {};

// Bookings List Render
window.CRM_PAGES.renderDealClosed = () => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const deals = window.CRM_DATA.getClosedDeals();
  const projects = window.CRM_DATA.getProjects();

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Closed Deals & Bookings</h1>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted)">Tracking registered bookings, token receipts and payments milestones</p>
      </div>
      <div>
        <button class="btn btn-outline" id="bookings-export-btn">
          <i class="lucide-download" data-lucide="download"></i> Export Bookings List
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Booking No</th>
            <th>Customer</th>
            <th>Project</th>
            <th>Unit No</th>
            <th>Slab Area</th>
            <th>Booking Value</th>
            <th>Token Amount</th>
            <th>Payment Plan</th>
            <th>Agreement</th>
            <th>Registration</th>
          </tr>
        </thead>
        <tbody>
          ${deals.map(deal => `
            <tr class="clickable" onclick="window.location.hash='#deal-closed/${deal.bookingNo}'">
              <td style="font-weight: var(--font-weight-semibold); color: var(--brand-primary);">${deal.bookingNo}</td>
              <td style="font-weight: var(--font-weight-semibold);">${deal.customer}</td>
              <td>${deal.project}</td>
              <td style="font-weight: var(--font-weight-semibold);">${deal.unit}</td>
              <td>${deal.area}</td>
              <td style="font-weight: var(--font-weight-semibold);">${deal.bookingValue}</td>
              <td>${deal.bookingAmount}</td>
              <td style="font-size: 12px; color: var(--text-muted);">${deal.paymentPlan}</td>
              <td>
                <span class="badge ${deal.agreementStatus === 'Executed' ? 'badge-success' : 'badge-warning'}">
                  ${deal.agreementStatus}
                </span>
              </td>
              <td>
                <span class="badge ${
                  deal.registrationStatus === 'Completed' ? 'badge-success' : 
                  deal.registrationStatus === 'Applied' ? 'badge-info' : 'badge-warning'
                }">
                  ${deal.registrationStatus}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach button triggers
  const exportBtn = document.getElementById('bookings-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('Bookings audit record list exported successfully!', 'success');
    });
  }

  if (window.lucide) window.lucide.createIcons();
};

// Booking Details Page rendering
window.CRM_PAGES.renderBookingDetails = (params) => {
  const container = document.getElementById('app-content');
  if (!container) return;

  const deal = window.CRM_DATA.findClosedDealByNo(params.bookingNo);
  if (!deal) {
    container.innerHTML = `<div class="card"><p>Booking reference not found.</p></div>`;
    return;
  }

  // Calculate generic milestones if none defined
  const milestones = deal.paymentMilestones.length > 0 ? deal.paymentMilestones : [
    { milestone: "Token Booking Amount", percentage: "10%", amount: deal.bookingAmount, status: "Paid" },
    { milestone: "On Excavation Completion", percentage: "15%", amount: "Calculated at Milestone", status: "Paid" },
    { milestone: "On Plinth Slab", percentage: "15%", amount: "Calculated at Milestone", status: "Pending" },
    { milestone: "On Mid-Superstructure", percentage: "20%", amount: "Calculated at Milestone", status: "Pending" },
    { milestone: "On Possession Handover", percentage: "40%", amount: "Calculated at Milestone", status: "Pending" }
  ];

  container.innerHTML = `
    <div class="page-header-actions">
      <div>
        <div style="display: flex; align-items: center; gap: var(--spacing-3)">
          <button class="btn btn-outline btn-icon" onclick="window.location.hash='#deal-closed'">
            <i class="lucide-arrow-left" data-lucide="arrow-left"></i>
          </button>
          <h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold);">Booking Details</h1>
          <span class="badge badge-success">Closed Deal</span>
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--spacing-2)">Booking Reference No: <b>${deal.bookingNo}</b></p>
      </div>
      <div style="display: flex; gap: var(--spacing-2)">
        <button class="btn btn-outline" id="print-booking-btn"><i class="lucide-printer" data-lucide="printer"></i> Print Invoice</button>
        <button class="btn btn-primary" id="update-stage-btn"><i class="lucide-shield-alert" data-lucide="shield-alert"></i> Update Legal Stage</button>
      </div>
    </div>

    <!-- Booking Split Panels Grid -->
    <div class="recent-grid" style="grid-template-columns: 1.2fr 1fr; align-items: start;">
      
      <!-- Left side: Booking Specifications and Payment Milestones -->
      <div style="display: flex; flex-direction: column; gap: var(--spacing-6)">
        
        <!-- Summary card -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Property Details</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--spacing-4)">
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Allocated Apartment</span>
              <p style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-md); color: var(--brand-primary);">${deal.project} - ${deal.unit}</p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Slab Area</span>
              <p style="font-weight: var(--font-weight-semibold);">${deal.area}</p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Booking Value</span>
              <p style="font-weight: var(--font-weight-semibold);">${deal.bookingValue}</p>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Token Received</span>
              <p style="font-weight: var(--font-weight-semibold);">${deal.bookingAmount}</p>
            </div>
          </div>
        </div>

        <!-- Milestones table -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Payment Schedule Milestones</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: var(--spacing-4)">Selected Plan: <b>${deal.paymentPlan}</b></p>
          
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Milestone Stage</th>
                  <th>Ratio</th>
                  <th>Milestone Price</th>
                  <th>Receipt Status</th>
                </tr>
              </thead>
              <tbody>
                ${milestones.map(m => `
                  <tr>
                    <td style="font-weight: var(--font-weight-semibold);">${m.milestone}</td>
                    <td><span class="badge badge-neutral">${m.percentage}</span></td>
                    <td>${m.amount}</td>
                    <td>
                      <span class="badge ${
                        m.status === 'Paid' ? 'badge-success' : 
                        m.status === 'Overdue' ? 'badge-danger' : 'badge-warning'
                      }">${m.status}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right side: Legal Agreement Checkouts and Documentation -->
      <div style="display: flex; flex-direction: column; gap: var(--spacing-6)">
        
        <!-- Registration checklist card -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-4)">Registration & Legal Compliance</h3>
          
          <div style="display: flex; flex-direction: column; gap: var(--spacing-4)">
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-3)">
              <div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm)">Sale Agreement Signing</div>
                <div style="font-size: 11px; color: var(--text-muted)">Executed on stamp paper parameters</div>
              </div>
              <span class="badge ${deal.agreementStatus === 'Executed' ? 'badge-success' : 'badge-warning'}">
                ${deal.agreementStatus === 'Executed' ? 'Completed' : 'Pending'}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--spacing-3)">
              <div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm)">Registration Status</div>
                <div style="font-size: 11px; color: var(--text-muted)">Sub-registrar validation stamp</div>
              </div>
              <span class="badge ${
                deal.registrationStatus === 'Completed' ? 'badge-success' : 
                deal.registrationStatus === 'Applied' ? 'badge-info' : 'badge-warning'
              }">
                ${deal.registrationStatus}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--spacing-1)">
              <div>
                <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm)">Allotment Certificate</div>
                <div style="font-size: 11px; color: var(--text-muted)">Official builder stamped paper allocation</div>
              </div>
              <span class="badge badge-success">Issued</span>
            </div>
          </div>
        </div>

        <!-- RM Assigned details -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: var(--spacing-3)">RM Customer Support</h3>
          <div style="display: flex; align-items: center; gap: var(--spacing-4)">
            <div style="width: 48px; height: 48px; border-radius: var(--radius-full); background-color: var(--brand-bg-light); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem;">
              KM
            </div>
            <div>
              <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm);">${deal.customer}</div>
              <div style="font-size: var(--font-size-xs); color: var(--text-muted)">Agreement signed holder</div>
            </div>
          </div>
          <div style="margin-top: var(--spacing-4); border-top: 1px solid var(--border-color); padding-top: var(--spacing-3)">
            <button class="btn btn-outline" style="width: 100%" id="rm-notify-btn">Send Booking Status Update via Email</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach button triggers
  const printBtn = document.getElementById('print-booking-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('Generating booking receipt PDF to download...', 'success');
    });
  }

  const rmNotifyBtn = document.getElementById('rm-notify-btn');
  if (rmNotifyBtn) {
    rmNotifyBtn.addEventListener('click', () => {
      window.CRM_APP.showToast('Booking status notification dispatched successfully!', 'info');
    });
  }

  const updateStageBtn = document.getElementById('update-stage-btn');
  if (updateStageBtn) {
    updateStageBtn.addEventListener('click', () => {
      openUpdateStageModal(deal);
    });
  }

  if (window.lucide) window.lucide.createIcons();
};

function openUpdateStageModal(deal) {
  const dialog = document.getElementById('global-dialog');
  if (!dialog) return;

  dialog.innerHTML = `
    <div class="dialog-header">
      <h3 class="dialog-title">Update Agreement & Registration Stage</h3>
      <button class="dialog-close" onclick="document.getElementById('global-dialog').close()"><i class="lucide-x" data-lucide="x"></i></button>
    </div>
    <form id="update-stage-form">
      <div class="dialog-body">
        <div class="form-group">
          <label class="form-label">Agreement Status</label>
          <select class="form-control" name="agreement" required>
            <option value="Pending" ${deal.agreementStatus === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Executed" ${deal.agreementStatus === 'Executed' ? 'selected' : ''}>Executed</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Registration Status</label>
          <select class="form-control" name="registration" required>
            <option value="Pending" ${deal.registrationStatus === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Applied" ${deal.registrationStatus === 'Applied' ? 'selected' : ''}>Applied</option>
            <option value="Completed" ${deal.registrationStatus === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('global-dialog').close()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Status</button>
      </div>
    </form>
  `;

  if (window.lucide) window.lucide.createIcons();
  dialog.showModal();

  const form = document.getElementById('update-stage-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    deal.agreementStatus = form.agreement.value;
    deal.registrationStatus = form.registration.value;
    dialog.close();
    window.CRM_APP.showToast('Legal status updated successfully!', 'success');
    window.CRM_PAGES.renderBookingDetails({ bookingNo: deal.bookingNo });
  });
}
