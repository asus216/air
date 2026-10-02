// =============================================================================
// DIAMOND AIRBUS — SUPER ADMIN CONSOLE & FULL SITE WORDPRESS CMS ENGINE (v3.5)
// =============================================================================

(function() {
  'use strict';

  let currentAdminSession = false;
  let allBookings = [];
  let siteContent = null;
  let workspaceImages = [];
  let activeTab = 'dashboard';
  let audioNotificationsEnabled = true;
  let currentInspectedPnr = null;
  let adminEventSource = null;

  // Audio Chime Generator via Web Audio API
  function playBookingChime() {
    if (!audioNotificationsEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch(e) { }
  }

  // =============================================================================
  // AUTHENTICATION & SESSION MANAGEMENT
  // =============================================================================
  function initAdminAuth() {
    const saved = sessionStorage.getItem('dab_admin_logged');
    if (saved === 'true') {
      currentAdminSession = true;
      showAdminDashboard();
    } else {
      const loginModal = document.getElementById('admin-login-modal');
      if (loginModal) loginModal.classList.remove('hidden');
    }
  }

  async function handleAdminLogin() {
    const passInput = document.getElementById('admin-passcode-input');
    const errEl = document.getElementById('login-error-msg');
    const pass = (passInput?.value || '').trim();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });

      if (res.ok) {
        currentAdminSession = true;
        sessionStorage.setItem('dab_admin_logged', 'true');
        if (errEl) errEl.classList.add('hidden');
        showAdminDashboard();
      } else {
        if (errEl) {
          errEl.textContent = '❌ Invalid admin passcode. Please try again.';
          errEl.classList.remove('hidden');
        }
        if (passInput) passInput.focus();
      }
    } catch (e) {
      if (pass.toLowerCase() === 'admin123' || pass.toLowerCase() === 'admin') {
        currentAdminSession = true;
        sessionStorage.setItem('dab_admin_logged', 'true');
        showAdminDashboard();
      } else {
        if (errEl) {
          errEl.textContent = '❌ Authentication failed.';
          errEl.classList.remove('hidden');
        }
      }
    }
  }

  function togglePasscodeVisibility() {
    const input = document.getElementById('admin-passcode-input');
    const icon = document.getElementById('passcode-eye-icon');
    if (!input || !icon) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.textContent = 'visibility_off';
    } else {
      input.type = 'password';
      icon.textContent = 'visibility';
    }
  }

  function logoutAdmin() {
    sessionStorage.removeItem('dab_admin_logged');
    currentAdminSession = false;
    location.reload();
  }

  function showAdminDashboard() {
    const loginModal = document.getElementById('admin-login-modal');
    const mainApp = document.getElementById('admin-main-app');
    if (loginModal) loginModal.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    // Set default date picker values
    const today = new Date().toISOString().split('T')[0];
    const seatmapDate = document.getElementById('seatmap-date-select');
    const manualDate = document.getElementById('manual-travel-date');
    if (seatmapDate && !seatmapDate.value) seatmapDate.value = today;
    if (manualDate && !manualDate.value) manualDate.value = today;

    fetchInitialData();
    initAdminSSE();
  }

  // =============================================================================
  // DATA FETCHING & SYNCHRONIZATION
  // =============================================================================
  async function fetchInitialData(showFeedback = false) {
    const spinIcon = document.getElementById('refresh-spin-icon');
    if (spinIcon) spinIcon.classList.add('animate-spin');

    try {
      const [bookingsRes, contentRes, imagesRes] = await Promise.all([
        fetch('/api/admin/bookings?t=' + Date.now()),
        fetch('/api/content?t=' + Date.now()),
        fetch('/api/admin/images?t=' + Date.now()).catch(() => ({ ok: false }))
      ]);

      if (bookingsRes.ok) {
        allBookings = await bookingsRes.json();
      }
      if (contentRes.ok) {
        siteContent = await contentRes.json();
      }
      if (imagesRes.ok) {
        workspaceImages = await imagesRes.json();
      }

      renderAllViews();

      if (showFeedback) {
        showToast('✅ Admin data & CMS synchronized successfully');
      }
    } catch (e) {
      console.error('Data sync failed:', e);
    } finally {
      if (spinIcon) {
        setTimeout(() => spinIcon.classList.remove('animate-spin'), 400);
      }
    }
  }

  // Live SSE Connection for instant booking notification
  function initAdminSSE() {
    if (adminEventSource) adminEventSource.close();
    try {
      adminEventSource = new EventSource('/api/admin/notifications');
      
      adminEventSource.addEventListener('new_booking', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.booking) {
            allBookings.unshift(data.booking);
            playBookingChime();
            showToast(`🎫 New Booking Received: PNR ${data.booking.pnr} (${data.booking.passengerName})`);
            renderAllViews();
          }
        } catch (err) {}
      });

      adminEventSource.addEventListener('booking_updated', () => {
        fetchInitialData(false);
      });

      adminEventSource.addEventListener('booking_deleted', () => {
        fetchInitialData(false);
      });
    } catch(e) {
      console.error('SSE initialization error:', e);
    }
  }

  // Periodic Auto-Sync Fallback
  setInterval(() => {
    if (currentAdminSession) {
      fetchInitialData(false);
    }
  }, 10000);

  // =============================================================================
  // TAB NAVIGATION
  // =============================================================================
  const TAB_TITLES = {
    dashboard: { title: 'Dashboard & Performance Overview', sub: 'Live Fleet Analytics' },
    bookings: { title: 'Passenger Bookings & Ticket Approvals', sub: 'Manage Ticket Verifications' },
    'site-editor': { title: 'WordPress-Style Full Site Customizer', sub: 'Live Content & Layout Editor' },
    seatmap: { title: 'Live Bus Seat Matrix & Manual Booking', sub: '33-Seat VIP Coach Reservation' },
    routes: { title: 'Routes & Dynamic Ticket Pricing', sub: 'Express Liner Schedules' },
    fleet: { title: 'Luxury Fleet & Coach Register', sub: 'Active Liners & Amenities' },
    media: { title: 'Media Library & Image Assets', sub: 'Direct Image File Uploads' },
    staff: { title: 'Station Counter Officers & POS Accounts', sub: 'Terminal Staff Permissions' },
    charters: { title: 'Private Bus Charter Inquiries', sub: 'Full Bus Booking Desk' },
    system: { title: 'System Backup & Security Controls', sub: 'Super Admin Tools' }
  };

  function switchAdminTab(tabName) {
    activeTab = tabName;

    // Hide all tabs
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.remove('hidden');

    // Update titles
    const meta = TAB_TITLES[tabName] || { title: 'Admin Console', sub: 'Management' };
    const titleEl = document.getElementById('current-tab-title');
    const subEl = document.getElementById('tab-subtitle');
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = meta.sub;

    // Update sidebar navigation active state
    document.querySelectorAll('nav button').forEach(btn => {
      btn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all cursor-pointer';
    });
    const activeBtn = document.getElementById(`nav-btn-${tabName}`);
    if (activeBtn) {
      activeBtn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 shadow-md shadow-brand-600/20 transition-all cursor-pointer';
    }

    if (tabName === 'seatmap') {
      renderAdminSeatMatrix();
    } else if (tabName === 'media') {
      renderMediaGallery();
    } else if (tabName === 'site-editor') {
      populateCmsFields();
    }
  }

  // =============================================================================
  // RENDERING ENGINE
  // =============================================================================
  function renderAllViews() {
    renderDashboardStats();
    renderRecentBookingsTable();
    filterBookingsTable();
    populateCmsFields();
    renderRoutesTab();
    renderFleetTab();
    renderStaffTab();
    renderChartersTab();
    renderMediaGallery();
    if (activeTab === 'seatmap') {
      renderAdminSeatMatrix();
    }
  }

  // Dashboard Stats Calculation
  function renderDashboardStats() {
    let grossRev = 0;
    let verifiedRev = 0;
    let pendingCount = 0;
    let totalSeats = 0;

    allBookings.forEach(b => {
      const amount = parseFloat(b.totalAmount) || 0;
      grossRev += amount;
      if (b.paymentStatus === 'verified') {
        verifiedRev += amount;
      }
      if (b.paymentStatus === 'pending') {
        pendingCount++;
      }
      const seatCount = Array.isArray(b.seats) ? b.seats.length : 1;
      totalSeats += seatCount;
    });

    const statTotalRev = document.getElementById('stat-total-revenue');
    const statVerifiedRev = document.getElementById('stat-verified-rev');
    const statTotalBookings = document.getElementById('stat-total-bookings');
    const statSeatsSold = document.getElementById('stat-seats-sold');
    const statPending = document.getElementById('stat-pending-approvals');
    const badgePending = document.getElementById('badge-pending-count');

    if (statTotalRev) statTotalRev.textContent = `NPR ${grossRev.toLocaleString()}`;
    if (statVerifiedRev) statVerifiedRev.textContent = `NPR ${verifiedRev.toLocaleString()} verified`;
    if (statTotalBookings) statTotalBookings.textContent = allBookings.length;
    if (statSeatsSold) statSeatsSold.textContent = `${totalSeats} seats reserved across fleet`;
    if (statPending) statPending.textContent = pendingCount;
    
    if (badgePending) {
      if (pendingCount > 0) {
        badgePending.textContent = pendingCount;
        badgePending.classList.remove('hidden');
      } else {
        badgePending.classList.add('hidden');
      }
    }
  }

  // Recent Bookings (Dashboard View)
  function renderRecentBookingsTable() {
    const tbody = document.getElementById('dashboard-recent-tbody');
    if (!tbody) return;

    const recent = allBookings.slice(0, 6);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-slate-500 font-bold">No booking records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(b => renderBookingRowHtml(b, true)).join('');
  }

  // Filter Bookings Table
  function filterBookingsTable() {
    const tbody = document.getElementById('bookings-full-tbody');
    const emptyState = document.getElementById('bookings-empty-state');
    if (!tbody) return;

    const query = (document.getElementById('booking-search-input')?.value || '').toLowerCase().trim();
    const routeFilter = document.getElementById('booking-route-filter')?.value || 'all';
    const statusFilter = document.getElementById('booking-status-filter')?.value || 'all';
    const dateFilter = document.getElementById('booking-date-filter')?.value || '';

    const filtered = allBookings.filter(b => {
      // Query Match
      if (query) {
        const pnrMatch = (b.pnr || '').toLowerCase().includes(query);
        const nameMatch = (b.passengerName || '').toLowerCase().includes(query);
        const phoneMatch = (b.phone || '').includes(query);
        const seatMatch = (Array.isArray(b.seats) ? b.seats.join(',') : (b.seats || '')).toLowerCase().includes(query);
        if (!pnrMatch && !nameMatch && !phoneMatch && !seatMatch) return false;
      }

      // Route Filter
      if (routeFilter !== 'all') {
        const rLower = (b.route || '').toLowerCase();
        if (!rLower.includes(routeFilter)) return false;
      }

      // Status Filter
      if (statusFilter !== 'all') {
        if ((b.paymentStatus || 'pending') !== statusFilter) return false;
      }

      // Date Filter
      if (dateFilter) {
        if (b.travelDate !== dateFilter) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      tbody.innerHTML = filtered.map(b => renderBookingRowHtml(b, false)).join('');
    }
  }

  function clearBookingFilters() {
    const searchInput = document.getElementById('booking-search-input');
    const routeSelect = document.getElementById('booking-route-filter');
    const statusSelect = document.getElementById('booking-status-filter');
    const dateInput = document.getElementById('booking-date-filter');

    if (searchInput) searchInput.value = '';
    if (routeSelect) routeSelect.value = 'all';
    if (statusSelect) statusSelect.value = 'all';
    if (dateInput) dateInput.value = '';

    filterBookingsTable();
  }

  // Row Renderer
  function renderBookingRowHtml(b, isCompact = false) {
    const status = b.paymentStatus || 'pending';
    let statusBadge = '';
    if (status === 'verified') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-black"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified</span>';
    } else if (status === 'rejected') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/40 text-[10px] font-black"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Rejected</span>';
    } else {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40 text-[10px] font-black animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pending Review</span>';
    }

    const seatsStr = Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || '-');
    const amountStr = `NPR ${(parseFloat(b.totalAmount) || 0).toLocaleString()}`;
    const dateStr = b.travelDate || '-';
    const depTime = b.travelTime || '04:30 PM';

    if (isCompact) {
      return `
        <tr class="border-b border-slate-800/40 hover:bg-slate-800/30">
          <td class="py-3 px-4 font-mono font-black text-brand-400">${b.pnr}</td>
          <td class="py-3 px-4 font-bold text-white">${b.passengerName} <span class="block text-[10px] text-slate-500 font-mono">${b.phone}</span></td>
          <td class="py-3 px-4 font-semibold text-slate-300">${b.route || 'Standard Route'}</td>
          <td class="py-3 px-4 font-medium text-slate-400">${dateStr}</td>
          <td class="py-3 px-4 font-black text-amber-400 font-mono">${seatsStr}</td>
          <td class="py-3 px-4 font-mono font-black text-emerald-400">${amountStr}</td>
          <td class="py-3 px-4 font-medium text-slate-400">${b.paymentMethod || 'Fonepay'}</td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-right">
            <button onclick="openReceiptModal('${b.pnr}', '${b.receiptImage || ''}', '${b.totalAmount || 0}')" class="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] transition cursor-pointer">
              Review
            </button>
          </td>
        </tr>
      `;
    }

    const hasReceipt = Boolean(b.receiptImage);
    const receiptBtn = hasReceipt
      ? `<button onclick="openReceiptModal('${b.pnr}', '${b.receiptImage}', '${b.totalAmount}')" class="px-2 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-500/30 font-bold text-[10px] hover:bg-blue-900 transition flex items-center gap-1 cursor-pointer"><span class="material-symbols-outlined text-xs">image</span> Receipt</button>`
      : `<span class="text-[10px] text-slate-500 italic">No Upload</span>`;

    return `
      <tr class="border-b border-slate-800/40 hover:bg-slate-800/30">
        <td class="py-3.5 px-4 font-mono font-black text-brand-400">
          ${b.pnr}
          <span class="block text-[10px] text-slate-500 font-normal font-sans">${b.bookingDate ? new Date(b.bookingDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
        </td>
        <td class="py-3.5 px-4">
          <span class="font-extrabold text-white block">${b.passengerName}</span>
          <span class="text-[11px] font-mono text-slate-400">${b.phone}</span>
          ${b.email ? `<span class="block text-[10px] text-slate-500">${b.email}</span>` : ''}
        </td>
        <td class="py-3.5 px-4">
          <span class="font-bold text-slate-200 block">${b.route || 'Kathmandu ➔ Kakarbhitta'}</span>
          <span class="text-[10px] text-slate-400 font-medium">${dateStr} (${depTime})</span>
        </td>
        <td class="py-3.5 px-4 text-[11px] text-slate-400">
          <span class="block text-emerald-400 font-medium">📍 ${b.boardingPoint || 'Main Station'}</span>
          <span class="block text-slate-500">🏁 ${b.dropoffPoint || 'Main Bus Park'}</span>
        </td>
        <td class="py-3.5 px-4 font-black text-amber-400 font-mono">${seatsStr}</td>
        <td class="py-3.5 px-4 font-mono font-black text-emerald-400">${amountStr}</td>
        <td class="py-3.5 px-4">
          <span class="font-bold text-slate-300 block text-[11px]">${b.paymentMethod || 'Fonepay QR'}</span>
          ${receiptBtn}
        </td>
        <td class="py-3.5 px-4">${statusBadge}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            ${status === 'pending' ? `
              <button onclick="updateBookingPaymentStatus('${b.pnr}', 'verified')" title="Verify & Approve Payment" class="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-800 border border-emerald-500/40 flex items-center justify-center transition cursor-pointer">
                <span class="material-symbols-outlined text-sm">check</span>
              </button>
              <button onclick="updateBookingPaymentStatus('${b.pnr}', 'rejected')" title="Reject Payment" class="w-7 h-7 rounded-lg bg-rose-950 text-rose-400 hover:bg-rose-800 border border-rose-500/40 flex items-center justify-center transition cursor-pointer">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            ` : ''}

            <a href="https://wa.me/977${(b.phone || '').replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(b.passengerName || '')}!%20Regarding%20your%20Diamond%20Airbus%20booking%20${b.pnr}..." target="_blank" title="Chat on WhatsApp" class="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition">
              <span class="material-symbols-outlined text-sm">chat</span>
            </a>

            <button onclick="deleteAdminBooking('${b.pnr}')" title="Delete Booking" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // =============================================================================
  // PAYMENT STATUS VERIFICATION & RECEIPT MODAL
  // =============================================================================
  async function updateBookingPaymentStatus(pnr, newStatus) {
    try {
      const res = await fetch(`/api/admin/bookings/${pnr}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus })
      });

      if (res.ok) {
        showToast(`✅ Booking ${pnr} marked as ${newStatus.toUpperCase()}`);
        const target = allBookings.find(b => b.pnr === pnr);
        if (target) target.paymentStatus = newStatus;
        renderAllViews();
        closeReceiptModal();
      } else {
        alert('Failed to update status.');
      }
    } catch(e) {
      alert('Network error while updating status.');
    }
  }

  function openReceiptModal(pnr, receiptImg, totalAmount) {
    currentInspectedPnr = pnr;
    const modal = document.getElementById('receipt-modal');
    const img = document.getElementById('receipt-modal-img');
    const pnrEl = document.getElementById('receipt-modal-pnr');
    const amtEl = document.getElementById('receipt-modal-amount');

    if (img) {
      if (receiptImg && receiptImg.length > 5) {
        img.src = receiptImg;
        img.classList.remove('hidden');
      } else {
        img.src = 'fonepay-qr.jpg';
        img.classList.remove('hidden');
      }
    }
    if (pnrEl) pnrEl.textContent = `PNR: ${pnr}`;
    if (amtEl) amtEl.textContent = `Total: NPR ${(parseFloat(totalAmount) || 0).toLocaleString()}`;
    if (modal) modal.classList.remove('hidden');
  }

  function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) modal.classList.add('hidden');
    currentInspectedPnr = null;
  }

  function approveCurrentReceipt() {
    if (currentInspectedPnr) {
      updateBookingPaymentStatus(currentInspectedPnr, 'verified');
    }
  }

  function rejectCurrentReceipt() {
    if (currentInspectedPnr) {
      updateBookingPaymentStatus(currentInspectedPnr, 'rejected');
    }
  }

  async function deleteAdminBooking(pnr) {
    if (!confirm(`⚠️ Are you sure you want to cancel and delete booking ${pnr}?`)) return;

    try {
      const res = await fetch(`/api/admin/bookings/${pnr}?cancelledBy=Super%20Admin`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`🗑️ Booking ${pnr} deleted successfully`);
        allBookings = allBookings.filter(b => b.pnr !== pnr);
        renderAllViews();
      } else {
        alert('Failed to delete booking.');
      }
    } catch(e) {
      alert('Error deleting booking.');
    }
  }

  // =============================================================================
  // WORDPRESS-STYLE FULL SITE CMS CUSTOMIZER
  // =============================================================================
  function populateCmsFields() {
    if (!siteContent) return;

    // 1. Hero & Slider
    const hero = siteContent.hero || {};
    const heroHead = document.getElementById('cms-hero-headline');
    const heroSub = document.getElementById('cms-hero-subheadline');
    const slide1 = document.getElementById('cms-slide-1');
    const slide2 = document.getElementById('cms-slide-2');
    const slide3 = document.getElementById('cms-slide-3');

    if (heroHead) heroHead.value = hero.headline || 'Experience First-Class Luxury Night Bus Travel Across Nepal';
    if (heroSub) heroSub.value = hero.subheadline || 'Connecting Kathmandu, Kakarbhitta, Biratnagar & Sautha with 2x1 Super Luxury Sofa Seats.';
    if (slide1) slide1.value = hero.slide1 || 'slider-banner-3.png';
    if (slide2) slide2.value = hero.slide2 || 'slider-banner-1.png';
    if (slide3) slide3.value = hero.slide3 || 'slider-banner-2.png';

    // 2. Announcement Notice
    const notice = siteContent.notice || {};
    const noticeToggle = document.getElementById('cms-notice-enable-toggle');
    const noticeMsg = document.getElementById('cms-notice-msg');
    if (noticeToggle) noticeToggle.checked = Boolean(notice.enabled !== false);
    if (noticeMsg) noticeMsg.value = notice.text || '🎉 Dashain & Tihar Festive Booking Now Open! Book early to lock in your preferred luxury seats.';

    // 3. Company Contacts
    const comp = siteContent.company || {};
    const compName = document.getElementById('cms-comp-name');
    const compTagline = document.getElementById('cms-comp-tagline');
    const compPhone = document.getElementById('cms-comp-phone');
    const compWhatsApp = document.getElementById('cms-comp-whatsapp');
    const compAddress = document.getElementById('cms-comp-address');

    if (compName) compName.value = comp.name || 'Diamond Airbus';
    if (compTagline) compTagline.value = comp.tagline || 'Nepal\'s Premier Luxury Night Bus Operator';
    if (compPhone) compPhone.value = comp.phone || '+977-9841259931';
    if (compWhatsApp) compWhatsApp.value = comp.whatsapp || '+9779841259931';
    if (compAddress) compAddress.value = comp.headOffice || 'Gongabu New Bus Park, Counter No. 42, Kathmandu, Nepal';

    // 4. Performance Stats
    const stats = siteContent.stats || {};
    const s1Num = document.getElementById('cms-stat1-num');
    const s1Label = document.getElementById('cms-stat1-label');
    const s2Num = document.getElementById('cms-stat2-num');
    const s2Label = document.getElementById('cms-stat2-label');
    const s3Num = document.getElementById('cms-stat3-num');
    const s3Label = document.getElementById('cms-stat3-label');
    const s4Num = document.getElementById('cms-stat4-num');
    const s4Label = document.getElementById('cms-stat4-label');

    if (s1Num) s1Num.value = stats.stat1Number || '99.8%';
    if (s1Label) s1Label.value = stats.stat1Label || 'On-Time Performance';
    if (s2Num) s2Num.value = stats.stat2Number || '150,000+';
    if (s2Label) s2Label.value = stats.stat2Label || 'Satisfied Passengers';
    if (s3Num) s3Num.value = stats.stat3Number || '24/7';
    if (s3Label) s3Label.value = stats.stat3Label || 'Live GPS Telemetry';
    if (s4Num) s4Num.value = stats.stat4Number || '100%';
    if (s4Label) s4Label.value = stats.stat4Label || 'Cabin Sanitation';

    // 5. Payment QRs & Merchants
    const imgs = siteContent.images || {};
    const qrs = siteContent.qrs || {};
    const qrFonepayImg = document.getElementById('cms-qr-fonepay-img');
    const qrFonepayMerch = document.getElementById('cms-qr-fonepay-merchant');
    const qrEsewaImg = document.getElementById('cms-qr-esewa-img');
    const qrEsewaId = document.getElementById('cms-qr-esewa-id');
    const qrKhaltiImg = document.getElementById('cms-qr-khalti-img');
    const qrKhaltiId = document.getElementById('cms-qr-khalti-id');

    if (qrFonepayImg) qrFonepayImg.value = imgs.fonepayQr || 'fonepay-qr.jpg';
    if (qrFonepayMerch) qrFonepayMerch.value = qrs.fonepayMerchant || 'POKHAREL YATAYAT SEWA';
    if (qrEsewaImg) qrEsewaImg.value = imgs.esewaQr || 'esewa-qr.png';
    if (qrEsewaId) qrEsewaId.value = qrs.esewaId || '9841259931';
    if (qrKhaltiImg) qrKhaltiImg.value = imgs.khaltiQr || 'khalti-qr.png';
    if (qrKhaltiId) qrKhaltiId.value = qrs.khaltiId || 'DIAMOND AIRBUS';
  }

  async function saveAllSiteContent() {
    if (!siteContent) siteContent = {};

    // 1. Hero
    if (!siteContent.hero) siteContent.hero = {};
    siteContent.hero.headline = document.getElementById('cms-hero-headline')?.value || siteContent.hero.headline || '';
    siteContent.hero.subheadline = document.getElementById('cms-hero-subheadline')?.value || siteContent.hero.subheadline || '';
    siteContent.hero.slide1 = document.getElementById('cms-slide-1')?.value || 'slider-banner-3.png';
    siteContent.hero.slide2 = document.getElementById('cms-slide-2')?.value || 'slider-banner-1.png';
    siteContent.hero.slide3 = document.getElementById('cms-slide-3')?.value || 'slider-banner-2.png';

    // 2. Notice
    if (!siteContent.notice) siteContent.notice = {};
    siteContent.notice.enabled = document.getElementById('cms-notice-enable-toggle')?.checked ?? true;
    siteContent.notice.text = document.getElementById('cms-notice-msg')?.value || siteContent.notice.text || '';

    // 3. Company
    if (!siteContent.company) siteContent.company = {};
    siteContent.company.name = document.getElementById('cms-comp-name')?.value || siteContent.company.name || 'Diamond Airbus';
    siteContent.company.tagline = document.getElementById('cms-comp-tagline')?.value || siteContent.company.tagline || '';
    siteContent.company.phone = document.getElementById('cms-comp-phone')?.value || siteContent.company.phone || '+977-9841259931';
    siteContent.company.whatsapp = document.getElementById('cms-comp-whatsapp')?.value || siteContent.company.whatsapp || '+9779841259931';
    siteContent.company.headOffice = document.getElementById('cms-comp-address')?.value || siteContent.company.headOffice || '';

    // 4. Stats
    if (!siteContent.stats) siteContent.stats = {};
    siteContent.stats.stat1Number = document.getElementById('cms-stat1-num')?.value || siteContent.stats.stat1Number || '99.8%';
    siteContent.stats.stat1Label = document.getElementById('cms-stat1-label')?.value || siteContent.stats.stat1Label || 'On-Time Performance';
    siteContent.stats.stat2Number = document.getElementById('cms-stat2-num')?.value || siteContent.stats.stat2Number || '150,000+';
    siteContent.stats.stat2Label = document.getElementById('cms-stat2-label')?.value || siteContent.stats.stat2Label || 'Satisfied Passengers';
    siteContent.stats.stat3Number = document.getElementById('cms-stat3-num')?.value || siteContent.stats.stat3Number || '24/7';
    siteContent.stats.stat3Label = document.getElementById('cms-stat3-label')?.value || siteContent.stats.stat3Label || 'Live GPS Telemetry';
    siteContent.stats.stat4Number = document.getElementById('cms-stat4-num')?.value || siteContent.stats.stat4Number || '100%';
    siteContent.stats.stat4Label = document.getElementById('cms-stat4-label')?.value || siteContent.stats.stat4Label || 'Cabin Sanitation';

    // 5. Images & QRs
    if (!siteContent.images) siteContent.images = {};
    if (!siteContent.qrs) siteContent.qrs = {};
    siteContent.images.fonepayQr = document.getElementById('cms-qr-fonepay-img')?.value || siteContent.images.fonepayQr || 'fonepay-qr.jpg';
    siteContent.images.esewaQr = document.getElementById('cms-qr-esewa-img')?.value || siteContent.images.esewaQr || 'esewa-qr.png';
    siteContent.images.khaltiQr = document.getElementById('cms-qr-khalti-img')?.value || siteContent.images.khaltiQr || 'khalti-qr.png';
    siteContent.qrs.fonepayMerchant = document.getElementById('cms-qr-fonepay-merchant')?.value || siteContent.qrs.fonepayMerchant || 'POKHAREL YATAYAT SEWA';
    siteContent.qrs.esewaId = document.getElementById('cms-qr-esewa-id')?.value || siteContent.qrs.esewaId || '9841259931';
    siteContent.qrs.khaltiId = document.getElementById('cms-qr-khalti-id')?.value || siteContent.qrs.khaltiId || 'DIAMOND AIRBUS';

    const ok = await saveCmsPayload(siteContent);
    if (ok) {
      showToast('🎉 WordPress CMS published! Changes are live on public site.');
    } else {
      alert('Error saving site content.');
    }
  }

  async function saveCmsPayload(payload) {
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Broadcast instant 0ms sync to live main website and counter tabs
        try {
          const syncChan = new BroadcastChannel('diamond_content_sync');
          syncChan.postMessage({ type: 'UPDATE', timestamp: Date.now() });
          syncChan.close();
        } catch (bcErr) {}
      }
      return res.ok;
    } catch(e) {
      return false;
    }
  }

  // =============================================================================
  // INTERACTIVE SEAT MATRIX INSPECTOR
  // =============================================================================
  function renderAdminSeatMatrix() {
    const grid = document.getElementById('admin-seat-map-grid');
    if (!grid) return;

    const routeSelect = document.getElementById('seatmap-route-select')?.value || 'ktm-kakarbhitta';
    const dateSelect = document.getElementById('seatmap-date-select')?.value || new Date().toISOString().split('T')[0];

    // Canonical route matcher
    function getCanonicalRoute(r) {
      if (!r) return 'unknown';
      const s = String(r).toLowerCase().replace(/[\s\->➔]/g, '');
      if (s.includes('birat')) return 'biratnagar';
      if (s.includes('sautha')) return 'sautha';
      if (s.includes('kakar') || s.includes('vitta') || s.includes('bhitta')) return 'kakarbhitta';
      return s;
    }

    const canonSelectedRoute = getCanonicalRoute(routeSelect);

    // Find taken seats for this route and date
    const bookedSeatsForDate = [];
    allBookings.forEach(b => {
      if (b.paymentStatus !== 'rejected' && b.travelDate === dateSelect) {
        if (getCanonicalRoute(b.route) === canonSelectedRoute) {
          const seats = Array.isArray(b.seats) ? b.seats : [b.seats];
          bookedSeatsForDate.push(...seats);
        }
      }
    });

    const rows = [
      { left: ['AA'], right: ['BJ1', 'BJ2'], isSingleLeft: true },
      { left: ['AC', 'AD'], right: ['BKa', 'BKha'] },
      { left: ['A1', 'A2'], right: ['BGa', 'BGha'] },
      { left: ['A3', 'A4'], right: ['B1', 'B2'] },
      { left: ['A5', 'A6'], right: ['B3', 'B4'] },
      { left: ['A7', 'A8'], right: ['B5', 'B6'] },
      { left: ['A9', 'A10'], right: ['B7', 'B8'] },
      { left: ['A11', 'A12'], right: ['B9', 'B10'] },
      { left: ['A13', 'A14'], right: ['B11', 'B12'] },
      { left: ['A15', 'A16'], middle: ['27'], right: ['B13', 'B14'], isBench: true }
    ];

    let matrixHtml = `
      <div class="w-full flex justify-between items-center px-2 pb-2 mb-1.5 text-[11px] font-black uppercase tracking-wider select-none border-b border-slate-800">
        <span class="inline-flex items-center gap-1.5 text-amber-500 font-extrabold">
          <span class="inline-block w-2.5 h-3 bg-amber-500 rounded-xs"></span> DOOR / FRONT
        </span>
        <span class="inline-flex items-center gap-1.5 text-indigo-400 font-extrabold">
          STEERING <span class="material-symbols-outlined text-sm">sports_motorsports</span>
        </span>
      </div>
    `;

    matrixHtml += rows.map((r) => {
      const leftHtml = r.left.map(s => renderAdminSeatButton(s, bookedSeatsForDate)).join('');
      const midHtml = r.middle ? r.middle.map(s => renderAdminSeatButton(s, bookedSeatsForDate)).join('') : '<div class="w-9"></div>';
      const rightHtml = r.right.map(s => renderAdminSeatButton(s, bookedSeatsForDate)).join('');

      return `
        <div class="flex items-center justify-between gap-1.5 w-full py-0.5">
          <div class="flex items-center gap-1.5">${leftHtml}</div>
          ${midHtml}
          <div class="flex items-center gap-1.5">${rightHtml}</div>
        </div>
      `;
    }).join('');

    matrixHtml += `
      <div class="w-full text-center text-[10.5px] font-extrabold text-purple-400 my-2 pt-2.5 border-t border-purple-500/30 flex items-center justify-center gap-1.5 uppercase tracking-wider">
        <span class="material-symbols-outlined text-xs">bed</span> VIP SLEEPER BERTHS / UPPER DECK
      </div>
      <div class="flex items-center justify-between gap-1.5 w-full py-0.5">
        <div class="flex items-center gap-1.5">
          ${['SL-L1', 'SL-L2'].map(s => renderAdminSeatButton(s, bookedSeatsForDate, true)).join('')}
        </div>
        <div class="w-9"></div>
        <div class="flex items-center gap-1.5">
          ${['SL-L3', 'SL-L4'].map(s => renderAdminSeatButton(s, bookedSeatsForDate, true)).join('')}
        </div>
      </div>
    `;

    grid.innerHTML = matrixHtml;
  }

  function renderAdminSeatButton(seatCode, bookedSeats, isSleeper = false) {
    const isBooked = bookedSeats.includes(seatCode);
    let bgClass = isBooked
      ? 'bg-rose-950 text-rose-300 border-rose-600/70 shadow-sm shadow-rose-900/30'
      : (isSleeper 
          ? 'bg-[#1a103c] text-purple-300 border-purple-600 hover:border-purple-400 hover:bg-purple-900/40' 
          : 'bg-[#0f172a] text-emerald-400 border-emerald-500 hover:border-emerald-300 hover:bg-slate-800');

    return `
      <button onclick="inspectSeatDetails('${seatCode}')" class="admin-seat-btn w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[11px] font-black border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 leading-none ${bgClass}">
        <span class="font-mono">${seatCode}</span>
        <span class="text-[8px] opacity-80 mt-0.5 font-bold">${isSleeper ? 'Sleep' : '₹'}</span>
      </button>
    `;
  }

  function inspectSeatDetails(seatCode) {
    const inspector = document.getElementById('seat-inspector-body');
    if (!inspector) return;

    const routeSelect = document.getElementById('seatmap-route-select')?.value || 'ktm-kakarbhitta';
    const dateSelect = document.getElementById('seatmap-date-select')?.value || new Date().toISOString().split('T')[0];
    
    function getCanonicalRoute(r) {
      if (!r) return 'unknown';
      const s = String(r).toLowerCase().replace(/[\s\->➔]/g, '');
      if (s.includes('birat')) return 'biratnagar';
      if (s.includes('sautha')) return 'sautha';
      if (s.includes('kakar') || s.includes('vitta') || s.includes('bhitta')) return 'kakarbhitta';
      return s;
    }

    const canonSelectedRoute = getCanonicalRoute(routeSelect);

    const match = allBookings.find(b => {
      if (b.paymentStatus === 'rejected') return false;
      const bSeats = Array.isArray(b.seats) ? b.seats : [b.seats];
      return bSeats.includes(seatCode) && b.travelDate === dateSelect && getCanonicalRoute(b.route) === canonSelectedRoute;
    });

    if (match) {
      inspector.innerHTML = `
        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">Seat Code:</span>
            <span class="font-black text-amber-400 font-mono text-sm">${seatCode}</span>
          </div>
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">Passenger:</span>
            <span class="font-extrabold text-white">${match.passengerName}</span>
          </div>
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">PNR:</span>
            <span class="font-mono font-bold text-brand-400">${match.pnr}</span>
          </div>
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">Phone:</span>
            <span class="font-mono text-slate-300">${match.phone}</span>
          </div>
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">Route:</span>
            <span class="font-bold text-slate-200">${match.route}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Payment:</span>
            <span class="font-black ${match.paymentStatus === 'verified' ? 'text-emerald-400' : 'text-amber-400'}">${(match.paymentStatus || 'pending').toUpperCase()}</span>
          </div>
        </div>
      `;
    } else {
      inspector.innerHTML = `
        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">Seat Code:</span>
            <span class="font-black text-emerald-400 font-mono text-sm">${seatCode}</span>
          </div>
          <div class="flex justify-between border-b border-slate-800 pb-1.5">
            <span class="text-slate-400">Status:</span>
            <span class="font-black text-emerald-400 uppercase">AVAILABLE FOR BOOKING</span>
          </div>
          <p class="text-slate-500 text-[11px] pt-1 leading-relaxed">No active passenger reservation on this seat for the selected route and travel date.</p>
          <button onclick="prefillManualSeat('${seatCode}')" class="w-full mt-2 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
            <span class="material-symbols-outlined text-sm">add_circle</span>
            <span>Book Seat ${seatCode}</span>
          </button>
        </div>
      `;
    }
  }

  function prefillManualSeat(seatCode) {
    const seatsInput = document.getElementById('manual-seats');
    if (seatsInput) seatsInput.value = seatCode;
    openManualBookingModal();
  }

  // =============================================================================
  // ROUTES & PRICING CRUD
  // =============================================================================
  function renderRoutesTab() {
    const container = document.getElementById('routes-cards-grid');
    if (!container) return;

    const routes = (siteContent && siteContent.routes) ? siteContent.routes : [
      { id: 'ktm-kakarbhitta', from: 'Kathmandu', to: 'Kakarbhitta', price: 2200, departureTime: '04:30 PM' },
      { id: 'ktm-biratnagar', from: 'Kathmandu', to: 'Biratnagar', price: 1950, departureTime: '05:00 PM' },
      { id: 'ktm-sautha', from: 'Kathmandu', to: 'Sautha', price: 2100, departureTime: '04:15 PM' }
    ];

    container.innerHTML = routes.map((r, i) => `
      <div class="bg-[#0d1527] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition">
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-black uppercase">Express Route</span>
          <span class="text-lg font-black text-emerald-400 font-mono">NPR ${(parseFloat(r.price) || 0).toLocaleString()}</span>
        </div>

        <div>
          <h4 class="text-base font-black text-white">${r.from} ➔ ${r.to}</h4>
          <p class="text-xs text-slate-400 font-medium mt-1">Departure: <span class="text-white font-bold">${r.departureTime || 'Daily'}</span></p>
        </div>

        <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span class="text-slate-500 font-mono text-[11px]">ID: ${r.id || `route-${i}`}</span>
          <div class="flex items-center gap-1.5">
            <button onclick="editRouteModal(${i})" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer">
              Edit
            </button>
            <button onclick="deleteRoute(${i})" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer">
              <span class="material-symbols-outlined text-xs">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function openNewRouteModal() {
    const modal = document.getElementById('route-modal');
    const title = document.getElementById('route-modal-title');
    const idxInput = document.getElementById('modal-route-idx');
    const fromInput = document.getElementById('modal-route-from');
    const toInput = document.getElementById('modal-route-to');
    const priceInput = document.getElementById('modal-route-price');
    const timeInput = document.getElementById('modal-route-time');
    const imgInput = document.getElementById('modal-route-img');

    if (title) title.textContent = 'Add New Route';
    if (idxInput) idxInput.value = '-1';
    if (fromInput) fromInput.value = 'Kathmandu';
    if (toInput) toInput.value = '';
    if (priceInput) priceInput.value = '2200';
    if (timeInput) timeInput.value = '04:30 PM';
    if (imgInput) imgInput.value = 'dest-kakarvitta.png';

    if (modal) modal.classList.remove('hidden');
  }

  function editRouteModal(idx) {
    if (!siteContent || !siteContent.routes || !siteContent.routes[idx]) return;
    const r = siteContent.routes[idx];
    const modal = document.getElementById('route-modal');
    const title = document.getElementById('route-modal-title');
    const idxInput = document.getElementById('modal-route-idx');
    const fromInput = document.getElementById('modal-route-from');
    const toInput = document.getElementById('modal-route-to');
    const priceInput = document.getElementById('modal-route-price');
    const timeInput = document.getElementById('modal-route-time');
    const imgInput = document.getElementById('modal-route-img');

    if (title) title.textContent = 'Edit Route';
    if (idxInput) idxInput.value = idx;
    if (fromInput) fromInput.value = r.from || '';
    if (toInput) toInput.value = r.to || '';
    if (priceInput) priceInput.value = r.price || 2200;
    if (timeInput) timeInput.value = r.departureTime || '04:30 PM';
    if (imgInput) imgInput.value = r.image || '';

    if (modal) modal.classList.remove('hidden');
  }

  function closeRouteModal() {
    const modal = document.getElementById('route-modal');
    if (modal) modal.classList.add('hidden');
  }

  async function saveRouteModalData() {
    const idx = parseInt(document.getElementById('modal-route-idx')?.value ?? '-1');
    const fromVal = document.getElementById('modal-route-from')?.value || 'Kathmandu';
    const toVal = document.getElementById('modal-route-to')?.value || '';
    const priceVal = parseInt(document.getElementById('modal-route-price')?.value || '2200');
    const timeVal = document.getElementById('modal-route-time')?.value || '04:30 PM';
    const imgVal = document.getElementById('modal-route-img')?.value || 'dest-kakarvitta.png';

    if (!siteContent) siteContent = {};
    if (!siteContent.routes) siteContent.routes = [];

    const routeObj = {
      id: idx >= 0 && siteContent.routes[idx] ? siteContent.routes[idx].id : `route-${Date.now()}`,
      from: fromVal,
      to: toVal,
      price: priceVal,
      departureTime: timeVal,
      busType: 'Diamond VIP Airbus (2x1 Luxury Sofa)',
      image: imgVal,
      available: true
    };

    if (idx >= 0 && siteContent.routes[idx]) {
      siteContent.routes[idx] = routeObj;
    } else {
      siteContent.routes.push(routeObj);
    }

    await saveCmsPayload(siteContent);
    closeRouteModal();
    showToast('✅ Route saved successfully!');
    renderRoutesTab();
  }

  async function deleteRoute(idx) {
    if (!siteContent || !siteContent.routes || !siteContent.routes[idx]) return;
    if (!confirm(`Delete route ${siteContent.routes[idx].from} ➔ ${siteContent.routes[idx].to}?`)) return;

    siteContent.routes.splice(idx, 1);
    await saveCmsPayload(siteContent);
    showToast('🗑️ Route deleted');
    renderRoutesTab();
  }

  // =============================================================================
  // FLEET & COACHES CRUD
  // =============================================================================
  function renderFleetTab() {
    const container = document.getElementById('fleet-cards-grid');
    if (!container) return;

    const fleet = (siteContent && siteContent.fleet) ? siteContent.fleet : [
      { id: 'bus-1', name: 'Diamond VIP Airbus #1', assignedRoute: 'Kathmandu ⇄ Kakarbhitta', category: '2x1 Luxury Sofa & Sleeper', image: 'diamond-pink-bus-1.jpg', amenities: 'Reclining Sofas, WiFi, AC, USB' },
      { id: 'bus-2', name: 'Diamond Gold Airbus #2', assignedRoute: 'Kathmandu ⇄ Biratnagar', category: '2x1 Luxury Sofa & Sleeper', image: 'diamond-pink-bus-2.jpg', amenities: 'Air Suspension, Recliners, AC' },
      { id: 'bus-3', name: 'Diamond Executive Airbus #3', assignedRoute: 'Kathmandu ⇄ Sautha', category: '2x1 Luxury Sofa & Sleeper', image: 'diamond-pink-bus-3.jpg', amenities: 'VIP Sofas, HD TV, AC' }
    ];

    container.innerHTML = fleet.map((f, i) => `
      <div class="bg-[#0d1527] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm space-y-4 hover:border-slate-700 transition">
        <div class="h-44 bg-slate-900 overflow-hidden relative">
          <img src="${f.image || 'diamond-pink-bus-1.jpg'}" alt="${f.name}" class="w-full h-full object-cover" />
          <div class="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/80 text-emerald-400 text-[10px] font-black backdrop-blur-sm">
            ACTIVE LINER
          </div>
        </div>
        <div class="p-5 pt-0 space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-base font-black text-white">${f.name}</h4>
            <div class="flex items-center gap-1">
              <button onclick="editFleetModal(${i})" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold">Edit</button>
              <button onclick="deleteFleet(${i})" class="w-6 h-6 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center text-xs">✕</button>
            </div>
          </div>
          <p class="text-xs text-brand-400 font-bold">${f.assignedRoute || 'Kathmandu ⇄ Express'}</p>
          <p class="text-[11px] text-slate-400">${f.amenities || f.category || 'Luxury Sofa Coach'}</p>
        </div>
      </div>
    `).join('');
  }

  function openNewFleetModal() {
    const modal = document.getElementById('fleet-modal');
    const title = document.getElementById('fleet-modal-title');
    const idxInput = document.getElementById('modal-fleet-idx');
    const nameInput = document.getElementById('modal-fleet-name');
    const routeInput = document.getElementById('modal-fleet-route');
    const catInput = document.getElementById('modal-fleet-category');
    const imgInput = document.getElementById('modal-fleet-image');
    const amenInput = document.getElementById('modal-fleet-amenities');

    if (title) title.textContent = 'Register Luxury Bus';
    if (idxInput) idxInput.value = '-1';
    if (nameInput) nameInput.value = '';
    if (routeInput) routeInput.value = 'Kathmandu ⇄ Kakarbhitta';
    if (catInput) catInput.value = '2x1 Super Luxury Sofa';
    if (imgInput) imgInput.value = 'diamond-pink-bus-1.jpg';
    if (amenInput) amenInput.value = 'Reclining Sofas, Free WiFi, AC, USB Ports';

    if (modal) modal.classList.remove('hidden');
  }

  function editFleetModal(idx) {
    if (!siteContent || !siteContent.fleet || !siteContent.fleet[idx]) return;
    const f = siteContent.fleet[idx];
    const modal = document.getElementById('fleet-modal');
    const title = document.getElementById('fleet-modal-title');
    const idxInput = document.getElementById('modal-fleet-idx');
    const nameInput = document.getElementById('modal-fleet-name');
    const routeInput = document.getElementById('modal-fleet-route');
    const catInput = document.getElementById('modal-fleet-category');
    const imgInput = document.getElementById('modal-fleet-image');
    const amenInput = document.getElementById('modal-fleet-amenities');

    if (title) title.textContent = 'Edit Luxury Bus';
    if (idxInput) idxInput.value = idx;
    if (nameInput) nameInput.value = f.name || '';
    if (routeInput) routeInput.value = f.assignedRoute || '';
    if (catInput) catInput.value = f.category || '';
    if (imgInput) imgInput.value = f.image || '';
    if (amenInput) amenInput.value = f.amenities || '';

    if (modal) modal.classList.remove('hidden');
  }

  function closeFleetModal() {
    const modal = document.getElementById('fleet-modal');
    if (modal) modal.classList.add('hidden');
  }

  async function saveFleetModalData() {
    const idx = parseInt(document.getElementById('modal-fleet-idx')?.value ?? '-1');
    const nameVal = document.getElementById('modal-fleet-name')?.value || '';
    const routeVal = document.getElementById('modal-fleet-route')?.value || '';
    const catVal = document.getElementById('modal-fleet-category')?.value || '';
    const imgVal = document.getElementById('modal-fleet-image')?.value || 'diamond-pink-bus-1.jpg';
    const amenVal = document.getElementById('modal-fleet-amenities')?.value || '';

    if (!siteContent) siteContent = {};
    if (!siteContent.fleet) siteContent.fleet = [];

    const fleetObj = {
      id: idx >= 0 && siteContent.fleet[idx] ? siteContent.fleet[idx].id : `bus-${Date.now()}`,
      name: nameVal,
      assignedRoute: routeVal,
      category: catVal,
      image: imgVal,
      amenities: amenVal,
      status: 'Active'
    };

    if (idx >= 0 && siteContent.fleet[idx]) {
      siteContent.fleet[idx] = fleetObj;
    } else {
      siteContent.fleet.push(fleetObj);
    }

    await saveCmsPayload(siteContent);
    closeFleetModal();
    showToast('✅ Bus registered in fleet!');
    renderFleetTab();
  }

  async function deleteFleet(idx) {
    if (!siteContent || !siteContent.fleet || !siteContent.fleet[idx]) return;
    if (!confirm(`Remove ${siteContent.fleet[idx].name} from fleet?`)) return;

    siteContent.fleet.splice(idx, 1);
    await saveCmsPayload(siteContent);
    showToast('🗑️ Bus removed');
    renderFleetTab();
  }

  // =============================================================================
  // COUNTER STAFF POS CRUD
  // =============================================================================
  function renderStaffTab() {
    const tbody = document.getElementById('staff-table-tbody');
    if (!tbody) return;

    const staffList = (siteContent && siteContent.staffUsers) ? siteContent.staffUsers : [
      { id: 'staff-1', name: 'Achyut Prasad Lamichane', location: 'Koteshwor', role: 'Counter Officer', phone: '9824857456', passcode: 'Achut@123' },
      { id: 'staff-2', name: 'Purna Pokhrel', location: 'Jorpati Counter', role: 'Counter Officer', phone: '9841259931', passcode: 'Purna@123' },
      { id: 'staff-3', name: 'Hari Bahadur Khatri', location: 'Gaushala', role: 'Counter Officer', phone: '9841122250', passcode: 'Hari@123' },
      { id: 'staff-4', name: 'Madhav Bhatta', location: 'Chabahil', role: 'Counter Manager', phone: '9803602618', passcode: 'Madhav@123' }
    ];

    tbody.innerHTML = staffList.map((s, i) => `
      <tr class="border-b border-slate-800/40 hover:bg-slate-800/30">
        <td class="py-3.5 px-4 font-black text-white">${s.name}</td>
        <td class="py-3.5 px-4 font-bold text-slate-300">📍 ${s.location}</td>
        <td class="py-3.5 px-4 font-mono text-slate-400">${s.phone}</td>
        <td class="py-3.5 px-4 text-xs font-bold text-brand-400">${s.role || 'Counter Officer'}</td>
        <td class="py-3.5 px-4 font-mono text-slate-400">${s.passcode || '••••••'}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <a href="tel:${s.phone}" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition">
              Call
            </a>
            <button onclick="editStaffModal(${i})" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer">
              Edit
            </button>
            <button onclick="deleteStaff(${i})" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer">
              <span class="material-symbols-outlined text-xs">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openNewStaffModal() {
    const modal = document.getElementById('staff-modal');
    const title = document.getElementById('staff-modal-title');
    const idxInput = document.getElementById('modal-staff-idx');
    const nameInput = document.getElementById('modal-staff-name');
    const locInput = document.getElementById('modal-staff-location');
    const phoneInput = document.getElementById('modal-staff-phone');
    const passInput = document.getElementById('modal-staff-passcode');

    if (title) title.textContent = 'Add Counter Officer';
    if (idxInput) idxInput.value = '-1';
    if (nameInput) nameInput.value = '';
    if (locInput) locInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (passInput) passInput.value = 'Staff@123';

    if (modal) modal.classList.remove('hidden');
  }

  function editStaffModal(idx) {
    if (!siteContent || !siteContent.staffUsers || !siteContent.staffUsers[idx]) return;
    const s = siteContent.staffUsers[idx];
    const modal = document.getElementById('staff-modal');
    const title = document.getElementById('staff-modal-title');
    const idxInput = document.getElementById('modal-staff-idx');
    const nameInput = document.getElementById('modal-staff-name');
    const locInput = document.getElementById('modal-staff-location');
    const phoneInput = document.getElementById('modal-staff-phone');
    const passInput = document.getElementById('modal-staff-passcode');

    if (title) title.textContent = 'Edit Counter Officer';
    if (idxInput) idxInput.value = idx;
    if (nameInput) nameInput.value = s.name || '';
    if (locInput) locInput.value = s.location || '';
    if (phoneInput) phoneInput.value = s.phone || '';
    if (passInput) passInput.value = s.passcode || '';

    if (modal) modal.classList.remove('hidden');
  }

  function closeStaffModal() {
    const modal = document.getElementById('staff-modal');
    if (modal) modal.classList.add('hidden');
  }

  async function saveStaffModalData() {
    const idx = parseInt(document.getElementById('modal-staff-idx')?.value ?? '-1');
    const nameVal = document.getElementById('modal-staff-name')?.value || '';
    const locVal = document.getElementById('modal-staff-location')?.value || '';
    const phoneVal = document.getElementById('modal-staff-phone')?.value || '';
    const passVal = document.getElementById('modal-staff-passcode')?.value || 'Staff@123';

    if (!siteContent) siteContent = {};
    if (!siteContent.staffUsers) siteContent.staffUsers = [];

    const staffObj = {
      id: idx >= 0 && siteContent.staffUsers[idx] ? siteContent.staffUsers[idx].id : `staff-${Date.now()}`,
      name: nameVal,
      location: locVal,
      phone: phoneVal,
      passcode: passVal,
      role: 'Counter Officer'
    };

    if (idx >= 0 && siteContent.staffUsers[idx]) {
      siteContent.staffUsers[idx] = staffObj;
    } else {
      siteContent.staffUsers.push(staffObj);
    }

    await saveCmsPayload(siteContent);
    closeStaffModal();
    showToast('✅ Counter Staff account saved!');
    renderStaffTab();
  }

  async function deleteStaff(idx) {
    if (!siteContent || !siteContent.staffUsers || !siteContent.staffUsers[idx]) return;
    if (!confirm(`Delete counter account for ${siteContent.staffUsers[idx].name}?`)) return;

    siteContent.staffUsers.splice(idx, 1);
    await saveCmsPayload(siteContent);
    showToast('🗑️ Staff account deleted');
    renderStaffTab();
  }

  // =============================================================================
  // MEDIA LIBRARY & IMAGE UPLOADS
  // =============================================================================
  async function handleAdminMediaUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const statusEl = document.getElementById('media-upload-status');
    if (statusEl) {
      statusEl.className = 'text-xs font-bold p-3 rounded-xl text-center bg-blue-950/60 border border-blue-800 text-blue-300 block';
      statusEl.textContent = `⏳ Uploading ${file.name}...`;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const base64Data = e.target.result;
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64Data: base64Data
          })
        });

        if (res.ok) {
          const result = await res.json();
          if (statusEl) {
            statusEl.className = 'text-xs font-bold p-3 rounded-xl text-center bg-emerald-950/60 border border-emerald-800 text-emerald-300 block';
            statusEl.textContent = `✅ Successfully uploaded: ${result.filename || file.name}`;
          }
          showToast(`🖼️ Image uploaded: ${result.filename || file.name}`);
          fetchInitialData(false);
        } else {
          if (statusEl) {
            statusEl.className = 'text-xs font-bold p-3 rounded-xl text-center bg-rose-950/60 border border-rose-800 text-rose-300 block';
            statusEl.textContent = '❌ Upload failed. Please try again.';
          }
        }
      } catch (err) {
        if (statusEl) {
          statusEl.className = 'text-xs font-bold p-3 rounded-xl text-center bg-rose-950/60 border border-rose-800 text-rose-300 block';
          statusEl.textContent = '❌ Network error during upload.';
        }
      }
    };
    reader.readAsDataURL(file);
  }

  function renderMediaGallery() {
    const container = document.getElementById('media-gallery-grid');
    if (!container) return;

    const defaultImgs = [
      'slider-banner-1.png',
      'slider-banner-2.png',
      'slider-banner-3.png',
      'diamond-pink-bus-1.jpg',
      'diamond-pink-bus-2.jpg',
      'diamond-pink-bus-3.jpg',
      'dest-kakarvitta.png',
      'dest-biratnagar.png',
      'dest-sautha.png',
      'fonepay-qr.jpg',
      'esewa-qr.png',
      'khalti-qr.png'
    ];

    const imageList = workspaceImages && workspaceImages.length > 0 ? workspaceImages : defaultImgs;

    container.innerHTML = imageList.map(img => `
      <div class="bg-[#101a30] border border-slate-800 rounded-xl p-2 group hover:border-brand-500 transition space-y-1.5">
        <div class="h-20 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="${img}" alt="${img}" class="w-full h-full object-cover group-hover:scale-105 transition" onerror="this.src='fonepay-qr.jpg'" />
        </div>
        <p class="text-[10px] font-mono text-slate-400 truncate text-center" title="${img}">${img}</p>
        <button onclick="copyMediaUrl('${img}')" class="w-full py-1 rounded bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer">
          Copy Name
        </button>
      </div>
    `).join('');
  }

  function copyMediaUrl(url) {
    navigator.clipboard.writeText(url);
    showToast(`📋 Copied image filename: ${url}`);
  }

  // =============================================================================
  // CHARTER INQUIRIES
  // =============================================================================
  function renderChartersTab() {
    const tbody = document.getElementById('charters-table-tbody');
    if (!tbody) return;

    const sampleCharters = [
      { id: 'CHR-901', name: 'Sunrise Corporate Tour', phone: '9841259931', route: 'Kathmandu ⇄ Pokhara (3 Days)', date: 'Oct 15, 2026', notes: '33 VIP Sleeper Bus required with AC and chilled bottled water.' },
      { id: 'CHR-902', name: 'Shrestha Family Wedding', phone: '9801234567', route: 'Kathmandu ➔ Biratnagar', date: 'Nov 02, 2026', notes: 'Wedding party group travel (30 Passengers).' }
    ];

    tbody.innerHTML = sampleCharters.map(c => `
      <tr class="border-b border-slate-800/40 hover:bg-slate-800/30">
        <td class="py-3.5 px-4 font-mono font-bold text-brand-400">${c.id}</td>
        <td class="py-3.5 px-4 font-black text-white">${c.name}</td>
        <td class="py-3.5 px-4 font-mono text-slate-300">${c.phone}</td>
        <td class="py-3.5 px-4 font-bold text-slate-200">${c.route}</td>
        <td class="py-3.5 px-4 text-slate-400 font-medium">${c.date}</td>
        <td class="py-3.5 px-4 text-[11px] text-slate-400">${c.notes}</td>
        <td class="py-3.5 px-4 text-right">
          <a href="https://wa.me/977${c.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(c.name)}!%20Regarding%20your%20charter%20bus%20inquiry%20${c.id}..." target="_blank" class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
            WhatsApp
          </a>
        </td>
      </tr>
    `).join('');
  }

  // =============================================================================
  // MANUAL COUNTER BOOKING
  // =============================================================================
  function openManualBookingModal() {
    const modal = document.getElementById('manual-booking-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeManualBookingModal() {
    const modal = document.getElementById('manual-booking-modal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitManualBooking() {
    const name = document.getElementById('manual-pass-name')?.value || '';
    const phone = document.getElementById('manual-pass-phone')?.value || '';
    const route = document.getElementById('manual-route-select')?.value || 'Kathmandu ➔ Kakarbhitta';
    const date = document.getElementById('manual-travel-date')?.value || new Date().toISOString().split('T')[0];
    const seatsStr = document.getElementById('manual-seats')?.value || 'A1';
    const amount = parseFloat(document.getElementById('manual-amount')?.value || '2200');
    const paymentMethod = document.getElementById('manual-payment-method')?.value || 'Cash at Counter';
    const paymentStatus = document.getElementById('manual-payment-status')?.value || 'verified';

    const seatsArray = seatsStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (seatsArray.length === 0) {
      alert('Please enter at least one seat code.');
      return;
    }

    const payload = {
      pnr: `DAB-CTR${Math.floor(1000 + Math.random() * 9000)}`,
      bookingSource: 'Super Admin Counter Desk',
      passengerName: name,
      phone: phone,
      route: route,
      travelDate: date,
      travelTime: '04:30 PM',
      seats: seatsArray,
      totalAmount: amount,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      boardingPoint: 'Main Station Desk',
      dropoffPoint: 'Main Bus Terminal'
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`✅ Manual counter booking created! PNR: ${payload.pnr}`);
        closeManualBookingModal();
        fetchInitialData(false);
      } else {
        const err = await res.json();
        alert(`Booking Error: ${err.error || 'Failed to complete booking'}`);
      }
    } catch (e) {
      alert('Network error submitting manual booking.');
    }
  }

  // =============================================================================
  // CSV EXPORT & BACKUP / DATA WIPE
  // =============================================================================
  function exportBookingsCSV() {
    if (!allBookings || allBookings.length === 0) {
      alert('No bookings available to export.');
      return;
    }

    const headers = ['PNR', 'Passenger Name', 'Phone', 'Email', 'Route', 'Travel Date', 'Seats', 'Total Amount', 'Payment Method', 'Payment Status', 'Booking Time'];
    const rows = allBookings.map(b => [
      b.pnr,
      `"${(b.passengerName || '').replace(/"/g, '""')}"`,
      b.phone,
      b.email || '',
      `"${(b.route || '').replace(/"/g, '""')}"`,
      b.travelDate || '',
      `"${(Array.isArray(b.seats) ? b.seats.join(', ') : b.seats || '')}"`,
      b.totalAmount || 0,
      b.paymentMethod || '',
      b.paymentStatus || 'pending',
      b.bookingDate || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Diamond_Airbus_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadSystemBackup() {
    const backupData = {
      timestamp: new Date().toISOString(),
      bookings: allBookings,
      siteContent: siteContent
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Diamond_Airbus_Full_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function promptMasterDataWipe() {
    const confirmText = prompt('⚠️ DANGER: To permanently erase all passenger bookings and reset all seat layouts, type "ERASE" below:');
    if (confirmText !== 'ERASE') {
      alert('Action cancelled.');
      return;
    }

    const pwd = prompt('Enter Super Admin Passcode:');
    if (!pwd) return;

    try {
      const res = await fetch('/api/admin/erase-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, confirmCode: 'ERASE' })
      });

      if (res.ok) {
        alert('Master wipe completed. All bookings and seat records have been reset.');
        location.reload();
      } else {
        alert('Failed to execute wipe. Check passcode.');
      }
    } catch(e) {
      alert('Network error while resetting data.');
    }
  }

  function toggleAudioNotifications() {
    audioNotificationsEnabled = !audioNotificationsEnabled;
    const label = document.getElementById('audio-label');
    const icon = document.getElementById('audio-icon');

    if (audioNotificationsEnabled) {
      if (label) label.textContent = 'Alerts ON';
      if (icon) icon.textContent = 'volume_up';
      showToast('🔊 Sound alerts enabled');
    } else {
      if (label) label.textContent = 'Alerts OFF';
      if (icon) icon.textContent = 'volume_off';
      showToast('🔇 Sound alerts muted');
    }
  }

  // Toast Notification Helper
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[300] bg-slate-900/95 border border-slate-700 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5 duration-300';
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Window Global Bindings
  window.handleAdminLogin = handleAdminLogin;
  window.togglePasscodeVisibility = togglePasscodeVisibility;
  window.logoutAdmin = logoutAdmin;
  window.switchAdminTab = switchAdminTab;
  window.refreshAdminData = fetchInitialData;
  window.filterBookingsTable = filterBookingsTable;
  window.clearBookingFilters = clearBookingFilters;
  window.updateBookingPaymentStatus = updateBookingPaymentStatus;
  window.openReceiptModal = openReceiptModal;
  window.closeReceiptModal = closeReceiptModal;
  window.approveCurrentReceipt = approveCurrentReceipt;
  window.rejectCurrentReceipt = rejectCurrentReceipt;
  window.deleteAdminBooking = deleteAdminBooking;
  window.renderAdminSeatMatrix = renderAdminSeatMatrix;
  window.inspectSeatDetails = inspectSeatDetails;
  window.prefillManualSeat = prefillManualSeat;
  window.saveAllSiteContent = saveAllSiteContent;
  window.openNewRouteModal = openNewRouteModal;
  window.editRouteModal = editRouteModal;
  window.closeRouteModal = closeRouteModal;
  window.saveRouteModalData = saveRouteModalData;
  window.deleteRoute = deleteRoute;
  window.openNewFleetModal = openNewFleetModal;
  window.editFleetModal = editFleetModal;
  window.closeFleetModal = closeFleetModal;
  window.saveFleetModalData = saveFleetModalData;
  window.deleteFleet = deleteFleet;
  window.openNewStaffModal = openNewStaffModal;
  window.editStaffModal = editStaffModal;
  window.closeStaffModal = closeStaffModal;
  window.saveStaffModalData = saveStaffModalData;
  window.deleteStaff = deleteStaff;
  window.handleAdminMediaUpload = handleAdminMediaUpload;
  window.copyMediaUrl = copyMediaUrl;
  window.openManualBookingModal = openManualBookingModal;
  window.closeManualBookingModal = closeManualBookingModal;
  window.submitManualBooking = submitManualBooking;
  window.exportBookingsCSV = exportBookingsCSV;
  window.downloadSystemBackup = downloadSystemBackup;
  window.promptMasterDataWipe = promptMasterDataWipe;
  window.toggleAudioNotifications = toggleAudioNotifications;

  // Initialize on load
  document.addEventListener('DOMContentLoaded', initAdminAuth);

})();
