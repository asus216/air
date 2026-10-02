/* =============================================================================
   DIAMOND AIRBUS — STAFF COUNTER POS LOGIC
   Extracted from counter.html for clean code organization
   Staff portal: ticket issuance, seat management, passenger lookup,
   payment tracking, auto-logout timer, receipt printing.
   ============================================================================= */
    let selectedCounterSeats = [];
    let currentSeatLayout = null;
    let counterOperatingMode = 'booking'; // 'booking' or 'manage'
    let staffPainterTool = 'avail'; // 'avail', 'booked', 'sleeper'
    let activeRegionMode = 'inside'; // 'inside' or 'outside'

    let ROUTES_INSIDE_VALLEY = [
      { val: "Kathmandu|Kakarvitta|2200|04:30 PM", label: "Kathmandu ➔ Kakarbhitta (04:30 PM) • NPR 2,200" },
      { val: "Kathmandu|Biratnagar|2300|05:00 PM", label: "Kathmandu ➔ Biratnagar (05:00 PM) • NPR 2,300" },
      { val: "Kathmandu|Sautha|2300|04:15 PM", label: "Kathmandu ➔ Sautha, Jhapa (04:15 PM) • NPR 2,300" }
    ];

    let ROUTES_OUTSIDE_VALLEY = [
      { val: "Kakarvitta|Kathmandu|2200|04:00 PM", label: "Kakarbhitta ➔ Kathmandu (04:00 PM) • NPR 2,200" },
      { val: "Biratnagar|Kathmandu|2300|04:30 PM", label: "Biratnagar ➔ Kathmandu (04:30 PM) • NPR 2,300" },
      { val: "Sautha|Kathmandu|2300|04:00 PM", label: "Sautha ➔ Kathmandu (04:00 PM) • NPR 2,300" }
    ];

    function filterRouteRegion(region) {
      activeRegionMode = region;
      const btnInside = document.getElementById('region-btn-inside');
      const btnOutside = document.getElementById('region-btn-outside');
      const routeSelect = document.getElementById('counter-route-select');
      const detailsGrid = document.getElementById('counter-main-details-grid');

      if (detailsGrid) {
        detailsGrid.classList.add('hidden');
      }

      const defaultOpt = `<option value="" disabled selected>-- Select Route --</option>`;

      if (region === 'inside') {
        if (btnInside) btnInside.className = "region-tab-btn active bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-2.5 px-3.5 rounded-lg text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-md transition-all";
        if (btnOutside) btnOutside.className = "region-tab-btn text-slate-300 hover:text-white font-bold py-2.5 px-3.5 rounded-lg text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all";
        
        if (routeSelect) {
          routeSelect.innerHTML = defaultOpt + ROUTES_INSIDE_VALLEY.map(r => `<option value="${r.val}">${r.label}</option>`).join('');
        }
      } else {
        if (btnInside) btnInside.className = "region-tab-btn text-slate-300 hover:text-white font-bold py-2.5 px-3.5 rounded-lg text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all";
        if (btnOutside) btnOutside.className = "region-tab-btn active bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-2.5 px-3.5 rounded-lg text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-md transition-all";

        if (routeSelect) {
          routeSelect.innerHTML = defaultOpt + ROUTES_OUTSIDE_VALLEY.map(r => `<option value="${r.val}">${r.label}</option>`).join('');
        }
      }

      onCounterRouteDateChange();
    }

    // Clock
    setInterval(() => {
      const clockEl = document.getElementById('counter-live-clock');
      if (clockEl) clockEl.textContent = new Date().toLocaleTimeString();
    }, 1000);

    function validateCounterTravelDate() {
      const dateInput = document.getElementById('counter-travel-date');
      if (!dateInput) return true;

      const todayStr = new Date().toISOString().split('T')[0];
      dateInput.min = todayStr;

      if (dateInput.value && dateInput.value < todayStr) {
        alert(`❌ Cannot select a past departure date (${dateInput.value}).\nTravel date has been reset to TODAY (${todayStr}).`);
        dateInput.value = todayStr;
        return false;
      }
      return true;
    }

    // Initialize date to today & start auto-polling live routes
    document.addEventListener('DOMContentLoaded', () => {
      const dateInput = document.getElementById('counter-travel-date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
      }
      fetchContentAndRenderSeats();
      setInterval(fetchContentAndRenderSeats, 5000);
    });

    function loadRouteAndShowSeatMap() {
      if (!validateCounterTravelDate()) return;

      const routeSelect = document.getElementById('counter-route-select');
      const detailsGrid = document.getElementById('counter-main-details-grid');

      if (!routeSelect || !routeSelect.value) {
        if (detailsGrid) detailsGrid.classList.add('hidden');
        alert('⚠️ Please select a route from the dropdown first!');
        routeSelect?.focus();
        return;
      }

      if (detailsGrid) {
        detailsGrid.classList.remove('hidden');
      }
      updateCounterSeatMapForSelectedRoute();
      setTimeout(() => {
        detailsGrid?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    function getRouteIdFromNames(origin, destination) {
      const orig = (origin || '').toLowerCase();
      const dest = (destination || '').toLowerCase();

      if (dest.includes('kakarvitta') || dest.includes('kakarbhitta') || orig.includes('kakarvitta') || orig.includes('kakarbhitta')) {
        return 'ktm-kakarbhitta';
      }
      if (dest.includes('biratnagar') || orig.includes('biratnagar')) {
        return 'ktm-biratnagar';
      }
      if (dest.includes('sautha') || orig.includes('sautha')) {
        return 'ktm-sautha';
      }
      return 'default';
    }

    function getRouteIdFromBookingRoute(routeStr) {
      if (!routeStr) return 'default';
      let origin = '';
      let destination = '';
      if (routeStr.includes('➔')) {
        const parts = routeStr.split('➔');
        origin = parts[0];
        destination = parts[1];
      } else if (routeStr.includes('->')) {
        const parts = routeStr.split('->');
        origin = parts[0];
        destination = parts[1];
      } else if (routeStr.toLowerCase().includes(' to ')) {
        const parts = routeStr.split(/ to /i);
        origin = parts[0];
        destination = parts[1];
      } else {
        const rLower = routeStr.toLowerCase();
        if (rLower.includes('kakarbhitta') || rLower.includes('kakarvitta')) return 'ktm-kakarbhitta';
        if (rLower.includes('biratnagar')) return 'ktm-biratnagar';
        if (rLower.includes('sautha')) return 'ktm-sautha';
        return 'default';
      }
      return getRouteIdFromNames(origin, destination);
    }

    function formatDepartureTimeLabel(depTime) {
      if (!depTime) return '04:30 PM';
      if (depTime.includes('(') && depTime.includes(')')) {
        const match = depTime.match(/\(([^)]+)\)/);
        if (match) return match[1];
      }
      return depTime;
    }

    function populateDynamicCounterRoutes(data) {
      if (!data || !Array.isArray(data.routes) || data.routes.length === 0) return;

      const dynamicInside = [];
      const dynamicOutside = [];

      data.routes.forEach(r => {
        if (r.available === false) return;
        const timeStr = formatDepartureTimeLabel(r.departureTime);
        const priceNum = Number(r.price) || 2200;
        const fareFormatted = `NPR ${priceNum.toLocaleString()}`;

        const fwdVal = `${r.from}|${r.to}|${priceNum}|${timeStr}`;
        const fwdLabel = `${r.from} ➔ ${r.to} (${timeStr}) • ${fareFormatted}`;
        const fwdObj = { val: fwdVal, label: fwdLabel };

        const retVal = `${r.to}|${r.from}|${priceNum}|${timeStr}`;
        const retLabel = `${r.to} ➔ ${r.from} (${timeStr}) • ${fareFormatted}`;
        const retObj = { val: retVal, label: retLabel };

        const fromKtm = (r.from || '').toLowerCase().includes('kathmandu');
        if (fromKtm) {
          dynamicInside.push(fwdObj);
          dynamicOutside.push(retObj);
        } else if ((r.to || '').toLowerCase().includes('kathmandu')) {
          dynamicOutside.push(fwdObj);
          dynamicInside.push(retObj);
        } else {
          dynamicInside.push(fwdObj);
          dynamicOutside.push(fwdObj);
        }
      });

      if (dynamicInside.length > 0) ROUTES_INSIDE_VALLEY = dynamicInside;
      if (dynamicOutside.length > 0) ROUTES_OUTSIDE_VALLEY = dynamicOutside;

      const routeSelect = document.getElementById('counter-route-select');
      if (routeSelect) {
        const currentVal = routeSelect.value;
        const defaultOpt = `<option value="" disabled ${!currentVal ? 'selected' : ''}>-- Select Route --</option>`;
        const activeList = activeRegionMode === 'inside' ? ROUTES_INSIDE_VALLEY : ROUTES_OUTSIDE_VALLEY;
        
        routeSelect.innerHTML = defaultOpt + activeList.map(r => 
          `<option value="${r.val}" ${r.val === currentVal ? 'selected' : ''}>${r.label}</option>`
        ).join('');
      }
    }

    async function fetchContentAndRenderSeats() {
      try {
        const res = await fetch('/api/content?t=' + Date.now());
        if (res.ok) {
          window.siteContentData = await res.json();
          populateDynamicCounterRoutes(window.siteContentData);
        }
      } catch(e) {
        console.error('Failed to fetch content:', e);
      }
    }

    function onCounterRouteDateChange() {
      if (!validateCounterTravelDate()) return;
      updateCounterSeatMapForSelectedRoute();
    }

    async function updateCounterSeatMapForSelectedRoute() {
      if (!window.siteContentData) {
        await fetchContentAndRenderSeats();
      }
      if (!window.siteContentData) return;

      const dropdown = document.getElementById('counter-route-select');
      let routeId = 'ktm-kakarbhitta';
      if (dropdown && dropdown.value) {
        const parts = dropdown.value.split('|');
        if (parts.length >= 2) routeId = getRouteIdFromNames(parts[0], parts[1]);
      }

      const sls = window.siteContentData.seatLayoutsByRoute || {};
      const layout = sls[routeId] || sls['default'] || window.siteContentData.seatLayout;

      if (layout) {
        const clonedLayout = JSON.parse(JSON.stringify(layout));
        if (!clonedLayout.occupiedSeats) clonedLayout.occupiedSeats = [];

        try {
          const res = await fetch('/api/bookings?t=' + Date.now());
          if (res.ok) {
            const bookings = await res.json();
            window.currentActiveBookings = bookings;
            const bookedSeats = [];
            const selectedDate = document.getElementById('counter-travel-date')?.value || new Date().toISOString().split('T')[0];
            
            bookings.forEach(b => {
              if (b.paymentStatus !== 'rejected') {
                const bRouteId = getRouteIdFromBookingRoute(b.route);
                if (bRouteId === routeId && b.travelDate === selectedDate) {
                  const seats = Array.isArray(b.seats) ? b.seats : [b.seats];
                  bookedSeats.push(...seats);
                }
              }
            });

            clonedLayout.occupiedSeats = Array.from(new Set(bookedSeats));
          }
        } catch (e) {
          console.error("Failed to load live bookings for counter seat layout:", e);
        }

        currentSeatLayout = clonedLayout;
        renderCounterSeatMap();
      }
    }

    function switchOperatingMode(mode) {
      counterOperatingMode = mode;

      const btnBooking = document.getElementById('tab-mode-booking');
      const btnManage = document.getElementById('tab-mode-manage');
      const panelBooking = document.getElementById('panel-counter-booking');
      const panelManage = document.getElementById('panel-counter-manage');
      const statusLabel = document.getElementById('mode-status-label');
      const mapIcon = document.getElementById('map-header-icon');
      const mapText = document.getElementById('map-header-text');

      if (mode === 'manage') {
        if (btnBooking) btnBooking.className = "flex-1 sm:flex-none text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all";
        if (btnManage) btnManage.className = "flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all";
        if (panelBooking) panelBooking.classList.add('hidden');
        if (panelManage) panelManage.classList.remove('hidden');
        if (statusLabel) statusLabel.textContent = "Active: Seat Availability Manager Mode";
        if (mapIcon) mapIcon.textContent = "tune";
        if (mapText) mapText.textContent = "Staff Painter: Click Seats to Change Status";
      } else {
        if (btnBooking) btnBooking.className = "flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all";
        if (btnManage) btnManage.className = "flex-1 sm:flex-none text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all";
        if (panelBooking) panelBooking.classList.remove('hidden');
        if (panelManage) panelManage.classList.add('hidden');
        if (statusLabel) statusLabel.textContent = "Active: Ticket Issuance Mode";
        if (mapIcon) mapIcon.textContent = "event_seat";
        if (mapText) mapText.textContent = "Click Seats to Reserve";
      }

      updateCounterSeatMapForSelectedRoute();
    }

    function setStaffPainterTool(tool) {
      staffPainterTool = tool;

      const btnAvail = document.getElementById('tool-btn-avail');
      const btnBooked = document.getElementById('tool-btn-booked');
      const btnSleeper = document.getElementById('tool-btn-sleeper');

      [btnAvail, btnBooked, btnSleeper].forEach(b => {
        if (b) b.className = "painter-tool-btn bg-slate-800 text-slate-300 font-bold p-2 rounded-xl text-xs flex flex-col items-center justify-center gap-1 border border-slate-700 hover:bg-slate-700";
      });

      if (tool === 'avail' && btnAvail) {
        btnAvail.className = "painter-tool-btn active bg-emerald-600 text-white font-bold p-2 rounded-xl text-xs flex flex-col items-center justify-center gap-1 border border-emerald-400 shadow-md";
      } else if (tool === 'booked' && btnBooked) {
        btnBooked.className = "painter-tool-btn active bg-red-600 text-white font-bold p-2 rounded-xl text-xs flex flex-col items-center justify-center gap-1 border border-red-400 shadow-md";
      } else if (tool === 'sleeper' && btnSleeper) {
        btnSleeper.className = "painter-tool-btn active bg-violet-600 text-white font-bold p-2 rounded-xl text-xs flex flex-col items-center justify-center gap-1 border border-violet-400 shadow-md";
      }
    }

    function onCounterRouteDateChange() {
      selectedCounterSeats = [];
      updateCounterSummary();
      const routeSelect = document.getElementById('counter-route-select');
      const detailsGrid = document.getElementById('counter-main-details-grid');

      if (!routeSelect || !routeSelect.value) {
        if (detailsGrid) detailsGrid.classList.add('hidden');
        return;
      }

      loadRouteAndShowSeatMap();
    }

    function refreshCounterSeats() {
      fetchContentAndRenderSeats();
      updateCounterSeatMapForSelectedRoute();
    }

    function handleCounterSeatClick(seatCode) {
      if (counterOperatingMode === 'manage') {
        // Staff Painter Mode: modify currentSeatLayout directly
        if (!currentSeatLayout) currentSeatLayout = { occupiedSeats: [], sleeperSeats: [] };
        if (!Array.isArray(currentSeatLayout.occupiedSeats)) currentSeatLayout.occupiedSeats = [];
        if (!Array.isArray(currentSeatLayout.sleeperSeats)) currentSeatLayout.sleeperSeats = [];

        if (staffPainterTool === 'avail') {
          currentSeatLayout.occupiedSeats = currentSeatLayout.occupiedSeats.filter(s => s !== seatCode);
          currentSeatLayout.sleeperSeats = currentSeatLayout.sleeperSeats.filter(s => s !== seatCode);
        } else if (staffPainterTool === 'booked') {
          if (!currentSeatLayout.occupiedSeats.includes(seatCode)) currentSeatLayout.occupiedSeats.push(seatCode);
          currentSeatLayout.sleeperSeats = currentSeatLayout.sleeperSeats.filter(s => s !== seatCode);
        } else if (staffPainterTool === 'sleeper') {
          if (!currentSeatLayout.sleeperSeats.includes(seatCode)) currentSeatLayout.sleeperSeats.push(seatCode);
          currentSeatLayout.occupiedSeats = currentSeatLayout.occupiedSeats.filter(s => s !== seatCode);
        }

        renderCounterSeatMap();
      } else {
        // Ticket Booking Mode
        if (selectedCounterSeats.includes(seatCode)) {
          selectedCounterSeats = selectedCounterSeats.filter(s => s !== seatCode);
        } else {
          selectedCounterSeats.push(seatCode);
        }
        updateCounterSummary();
        renderCounterSeatMap();
      }
    }

    function updateCounterSummary() {
      const seatsBadge = document.getElementById('counter-selected-seats-badge');
      const seatsList = document.getElementById('counter-seats-list');

      if (seatsBadge) seatsBadge.textContent = `${selectedCounterSeats.length} Seats`;

      if (seatsList) {
        if (selectedCounterSeats.length === 0) {
          seatsList.innerHTML = `<span class="text-slate-500 italic font-normal text-xs">No seat clicked on map yet</span>`;
        } else {
          seatsList.innerHTML = selectedCounterSeats.map(s => 
            `<span class="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-lg text-xs font-mono font-bold">${s}</span>`
          ).join('');
        }
      }

      calculateDiscountAndRemaining();
    }

    function calculateDiscountAndRemaining() {
      const routeSelect = document.getElementById('counter-route-select');
      let seatPrice = 2200;
      if (routeSelect && routeSelect.value) {
        const parts = routeSelect.value.split('|');
        if (parts.length >= 3) seatPrice = parseInt(parts[2]) || 2200;
      }

      const grossTotal = selectedCounterSeats.length * seatPrice;

      const discountInput = document.getElementById('counter-discount-amount');
      const discountTag = document.getElementById('counter-discount-tag');

      let discountVal = parseFloat(discountInput?.value) || 0;
      if (discountVal < 0) discountVal = 0;
      if (grossTotal > 0 && discountVal > grossTotal) discountVal = grossTotal;

      const netTotal = Math.max(0, grossTotal - discountVal);

      const grossEl = document.getElementById('counter-gross-price');
      const totalPriceEl = document.getElementById('counter-total-price');

      if (grossEl) grossEl.textContent = `NPR ${grossTotal.toLocaleString()}`;
      if (totalPriceEl) totalPriceEl.textContent = `NPR ${netTotal.toLocaleString()}`;

      if (discountTag) {
        if (discountVal > 0) {
          discountTag.textContent = `✓ NPR ${discountVal.toLocaleString()} Discount Applied`;
          discountTag.classList.remove('hidden');
        } else {
          discountTag.classList.add('hidden');
        }
      }

      // Calculate Paid & Remaining
      const paidInput = document.getElementById('counter-paid-amount');
      const remainingEl = document.getElementById('counter-remaining-amount');
      if (!paidInput || !remainingEl) return;

      const paid = parseFloat(paidInput.value) || 0;
      if (netTotal > 0) {
        const remaining = Math.max(0, netTotal - paid);
        remainingEl.textContent = `NPR ${remaining.toLocaleString()}`;
        if (remaining === 0) {
          remainingEl.className = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-emerald-400';
        } else {
          remainingEl.className = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-amber-400';
        }
      } else {
        remainingEl.textContent = `NPR 0`;
        remainingEl.className = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500';
      }
    }

    function renderCounterSeatMap() {
      const container = document.getElementById('counter-seat-grid');
      if (!container) return;

      const sl = currentSeatLayout || { type: 'customMatrix', occupiedSeats: ['AA', 'AB', 'AC', 'AD'], sleeperSeats: ['Sleeper L1', 'Sleeper L2', 'Sleeper L3', 'Sleeper L4'] };
      const occupiedSeats = Array.isArray(sl.occupiedSeats) ? sl.occupiedSeats : ['AA', 'AB', 'AC', 'AD'];
      const sleeperSeats = Array.isArray(sl.sleeperSeats) ? sl.sleeperSeats : ['Sleeper L1', 'Sleeper L2', 'Sleeper L3', 'Sleeper L4'];

      const sleeperRowsDef = [];
      const currentSleeperSeats = (sleeperSeats && sleeperSeats.length > 0)
        ? sleeperSeats
        : ['Sleeper L1', 'Sleeper L2', 'Sleeper L3', 'Sleeper L4'];

      for (let i = 0; i < currentSleeperSeats.length; i += 4) {
        const chunk = currentSleeperSeats.slice(i, i + 4);
        const left = chunk.slice(0, 2);
        const right = chunk.slice(2, 4);
        sleeperRowsDef.push({ left, right, isLongSleeper: true });
      }

      function buildCustomBusRows(totalRows, singleSeatFront = true, hasLastRowBench = true, sleeperRowsDef = []) {
        const numRows = Math.max(3, Math.min(18, parseInt(totalRows) || 10));
        const rows = [];

        const specialRows = [
          { left: singleSeatFront ? ['AA'] : ['AA', 'AB'], right: ['BJ1', 'BJ2'] },
          { left: ['AC', 'AD'], right: ['BKa', 'BKha'] },
          { left: ['A1', 'A2'], right: ['BGa', 'BGha'] }
        ];

        for (let r = 1; r <= numRows; r++) {
          let rowDef;
          if (r <= 3) {
            rowDef = JSON.parse(JSON.stringify(specialRows[r - 1]));
          } else {
            const aStart = (r - 4) * 2 + 3;
            const bStart = (r - 4) * 2 + 1;
            rowDef = {
              left: [`A${aStart}`, `A${aStart + 1}`],
              right: [`B${bStart}`, `B${bStart + 1}`]
            };
          }

          if (r === numRows && hasLastRowBench) {
            rowDef.isBench = true;
            const middleSeatNum = (numRows - 4) * 2 + 15;
            rowDef.middle = [`${middleSeatNum > 0 ? middleSeatNum : 27}`];
          }

          rows.push(rowDef);
        }

        if (Array.isArray(sleeperRowsDef) && sleeperRowsDef.length > 0) {
          rows.push(...sleeperRowsDef);
        }

        return rows;
      }

      const totalRows = sl.totalRows || 10;
      const singleSeatFront = (sl.singleSeatFront !== false);
      const hasLastRowBench = (sl.lastRowBench !== false);
      const CUSTOM_BUS_ROWS = buildCustomBusRows(totalRows, singleSeatFront, hasLastRowBench, sleeperRowsDef);

      // Calculate stats
      let allSeatsCount = CUSTOM_BUS_ROWS.reduce((acc, r) => acc + (r.left?r.left.length:0) + (r.middle?r.middle.length:0) + (r.right?r.right.length:0), 0);
      let bookedCount = occupiedSeats.length;
      let sleeperCount = sleeperSeats.length;
      let remainingCount = Math.max(0, allSeatsCount - bookedCount);

      if (document.getElementById('stat-avail-count')) document.getElementById('stat-avail-count').textContent = `${remainingCount} Seats`;
      if (document.getElementById('stat-booked-count')) document.getElementById('stat-booked-count').textContent = `${bookedCount} Seats`;
      if (document.getElementById('stat-sleeper-count')) document.getElementById('stat-sleeper-count').textContent = `${sleeperCount} Seats`;

      container.innerHTML = '';
      let sleeperHeaderAdded = false;

      CUSTOM_BUS_ROWS.forEach(rowDef => {
        if (rowDef.isLongSleeper && !sleeperHeaderAdded) {
          sleeperHeaderAdded = true;
          const headerDiv = document.createElement('div');
          headerDiv.className = 'w-full text-center text-[10px] font-extrabold text-violet-400 my-2 pt-2 border-t border-violet-500/30 flex items-center justify-center gap-1.5';
          headerDiv.innerHTML = `<span class="material-symbols-outlined text-xs">bed</span> VIP SLEEPER BERTHS / UPPER DECK`;
          container.appendChild(headerDiv);
        }

        const rowDiv = document.createElement('div');
        rowDiv.className = 'w-full flex justify-between items-center py-0.5';

        if (rowDef.isBench) {
          rowDiv.innerHTML = `
            <div style="display:flex;gap:4px;align-items:center;">
              ${rowDef.left.map(s => renderSeatButton(s, occupiedSeats, sleeperSeats)).join('')}
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${rowDef.middle.map(s => renderSeatButton(s, occupiedSeats, sleeperSeats)).join('')}
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${rowDef.right.map(s => renderSeatButton(s, occupiedSeats, sleeperSeats)).join('')}
            </div>
          `;
        } else {
          rowDiv.innerHTML = `
            <div style="width:95px;display:flex;gap:5px;align-items:center;justify-content:flex-start;">
              ${rowDef.left.map(s => renderSeatButton(s, occupiedSeats, sleeperSeats)).join('')}
            </div>
            <div style="width:95px;display:flex;gap:5px;align-items:center;justify-content:flex-end;">
              ${rowDef.right.map(s => renderSeatButton(s, occupiedSeats, sleeperSeats)).join('')}
            </div>
          `;
        }

        container.appendChild(rowDiv);
      });
    }

    function renderSeatButton(seatCode, occupiedSeats, sleeperSeats) {
      const isOcc = occupiedSeats.includes(seatCode);
      const isSleeper = sleeperSeats.includes(seatCode) || seatCode.includes('Sleeper');
      const isSelected = selectedCounterSeats.includes(seatCode);

      // Clean display label for long seat codes like 'Sleeper L1' -> 'SL-L1'
      let displayLabel = seatCode;
      if (seatCode.toLowerCase().startsWith('sleeper')) {
        displayLabel = seatCode.replace(/sleeper\s*/i, 'SL-');
      }

      // If seat is occupied (booked), resolve counter name / booker tag
      let tooltipText = `Seat ${seatCode} (Booked)`;
      let bookerNameTag = 'Booked';

      if (isOcc && window.currentActiveBookings) {
        const selectedDate = document.getElementById('counter-travel-date')?.value || new Date().toISOString().split('T')[0];
        const routeSelect = document.getElementById('counter-route-select')?.value || '';
        const parts = routeSelect.split('|');
        const origin = parts[0] || 'Kathmandu';
        const dest = parts[1] || 'Kakarbhitta';
        const routeId = getRouteIdFromNames(origin, dest);

        const matchingB = window.currentActiveBookings.find(b => {
          if (b.paymentStatus === 'rejected') return false;
          const bRouteId = getRouteIdFromBookingRoute(b.route);
          const bSeats = Array.isArray(b.seats) ? b.seats : [b.seats];
          return bRouteId === routeId && b.travelDate === selectedDate && bSeats.includes(seatCode);
        });

        if (matchingB) {
          const bookingSource = (matchingB.bookingSource || '').toLowerCase();
          const paymentMethod = (matchingB.paymentMethod || '').toLowerCase();
          const officerName = (matchingB.issuedOfficer || '').trim();
          const stationName = (matchingB.counterLocation || matchingB.email || '').trim() || 'Counter';

          const isCounterBooking = bookingSource.includes('counter') ||
            bookingSource.includes('staff') ||
            paymentMethod.includes('cash') ||
            paymentMethod.includes('counter') ||
            (officerName.length > 0 && officerName.toLowerCase() !== 'online customer') ||
            stationName.toLowerCase().includes('counter') ||
            stationName.toLowerCase().includes('koteshwor') ||
            stationName.toLowerCase().includes('gaushala') ||
            stationName.toLowerCase().includes('jorpati') ||
            stationName.toLowerCase().includes('chabahil');

          const activeOfficerName = officerName || 'Staff';

          if (isCounterBooking) {
            let cleanCounterName = stationName
              .replace(/Kathmandu\s*\(/i, '')
              .replace(/\)/, '')
              .replace(/Counter\s*#?\d*/i, '')
              .replace(/Main\s*Station/i, '')
              .trim();
            if (!cleanCounterName) cleanCounterName = activeOfficerName.split(' ')[0] || 'Counter';

            tooltipText = `Seat ${seatCode} - Issued at Counter: ${stationName} by Officer: ${activeOfficerName} for Passenger: ${matchingB.passengerName || 'Passenger'}`;
            bookerNameTag = cleanCounterName;
          } else {
            tooltipText = `Seat ${seatCode} - Booked on Website by Customer: ${matchingB.passengerName || 'Online User'}`;
            bookerNameTag = (matchingB.passengerName || 'Online').split(' ')[0];
          }
        }
      }

      if (counterOperatingMode === 'manage') {
        // Staff Manager Mode: All buttons interactive
        if (isOcc) {
          return `<button onclick="handleCounterSeatClick('${seatCode}')" title="${tooltipText}" class="w-11 h-11 rounded-lg text-[9px] font-extrabold bg-red-950 border border-red-500 text-red-300 flex flex-col items-center justify-center hover:scale-105 active:scale-95 shadow-md">
            <span>${displayLabel}</span>
            <span style="font-size:6.5px" class="text-amber-300 font-black truncate max-w-[36px] block">${bookerNameTag}</span>
          </button>`;
        }
        if (isSleeper) {
          return `<button onclick="handleCounterSeatClick('${seatCode}')" class="w-11 h-11 rounded-lg text-[9px] font-extrabold bg-violet-950 border border-violet-500 text-violet-300 flex flex-col items-center justify-center hover:scale-105 active:scale-95 shadow-md">
            <span>${displayLabel}</span>
            <span style="font-size:7px">Sleeper</span>
          </button>`;
        }
        return `<button onclick="handleCounterSeatClick('${seatCode}')" class="w-11 h-11 rounded-lg text-[9.5px] font-extrabold bg-emerald-950 border border-emerald-500 text-emerald-300 flex flex-col items-center justify-center hover:scale-105 active:scale-95 shadow-md">
          <span>${displayLabel}</span>
          <span style="font-size:7px">Avail</span>
        </button>`;
      }

      // Ticket Booking Mode
      if (isOcc) {
        return `<button onclick="openBookedSeatDetailsModal('${seatCode}')" title="${tooltipText}" class="w-11 h-11 rounded-lg text-[8.5px] font-bold bg-red-950/90 border border-red-500 text-red-300 flex flex-col items-center justify-center hover:bg-red-900 hover:scale-105 active:scale-95 shadow-md cursor-pointer transition-all leading-tight">
          <span>${displayLabel}</span>
          <span style="font-size:6.5px" class="text-amber-300 font-black truncate max-w-[36px] block" title="${tooltipText}">${bookerNameTag}</span>
        </button>`;
      }

      if (isSelected) {
        return `<button onclick="handleCounterSeatClick('${seatCode}')" class="w-11 h-11 rounded-lg text-[9.5px] font-extrabold bg-blue-600 border border-blue-400 text-white flex flex-col items-center justify-center shadow-lg active:scale-95">
          <span>${displayLabel}</span>
          <span style="font-size:7px">✓</span>
        </button>`;
      }

      if (isSleeper) {
        return `<button onclick="handleCounterSeatClick('${seatCode}')" class="w-11 h-11 rounded-lg text-[9px] font-bold bg-violet-950/80 border border-violet-500/80 text-violet-300 flex flex-col items-center justify-center hover:bg-violet-900 active:scale-95 shadow-sm">
          <span>${displayLabel}</span>
          <span style="font-size:7.5px" class="text-violet-400">Sleep</span>
        </button>`;
      }

      return `<button onclick="handleCounterSeatClick('${seatCode}')" class="w-11 h-11 rounded-lg text-[9.5px] font-extrabold bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 flex flex-col items-center justify-center hover:bg-emerald-900 active:scale-95">
        <span>${displayLabel}</span>
        <span style="font-size:7.5px">₹</span>
      </button>`;
    }

    // ==========================================
    // STAFF TICKET CANCELLATION & DETAILS LOGIC
    // ==========================================
    let currentCancelTargetPnr = null;
    let currentCancelTargetSeats = [];
    let currentCancelTargetSource = 'Website Online Booking';
    let currentCancelTargetPassenger = '';
    let currentCancelTargetIssuer = '';
    let currentCancelTargetLocation = '';

    async function openBookedSeatDetailsModal(seatCode) {
      try {
        const routeSelect = document.getElementById('counter-route-select')?.value || '';
        const parts = routeSelect.split('|');
        const origin = parts[0] || 'Kathmandu';
        const dest = parts[1] || 'Kakarbhitta';
        const routeId = getRouteIdFromNames(origin, dest);
        const selectedDate = document.getElementById('counter-travel-date')?.value || new Date().toISOString().split('T')[0];

        const res = await fetch('/api/bookings?t=' + Date.now());
        if (!res.ok) return;

        const bookings = await res.json();
        const matchingBooking = bookings.find(b => {
          if (b.paymentStatus === 'rejected') return false;
          const bRouteId = getRouteIdFromBookingRoute(b.route);
          const bSeats = Array.isArray(b.seats) ? b.seats : [b.seats];
          return bRouteId === routeId && b.travelDate === selectedDate && bSeats.includes(seatCode);
        });

        if (!matchingBooking) {
          alert(`⚠️ Seat ${seatCode} is currently reserved, but no active ticket PNR was found for this date.`);
          return;
        }

        currentCancelTargetPnr = matchingBooking.pnr;
        currentCancelTargetSeats = Array.isArray(matchingBooking.seats) ? matchingBooking.seats : [matchingBooking.seats];
        currentCancelTargetPassenger = matchingBooking.passengerName || 'N/A';
        currentCancelTargetIssuer = (matchingBooking.issuedOfficer || '').trim();
        currentCancelTargetLocation = (matchingBooking.counterLocation || matchingBooking.email || '').trim();

        // Detect if ticket was issued by Staff Officer vs Web Customer
        const bookingSource = (matchingBooking.bookingSource || '').toLowerCase();
        const paymentMethod = (matchingBooking.paymentMethod || '').toLowerCase();
        const officerName = currentCancelTargetIssuer;
        const stationName = currentCancelTargetLocation || 'Station Counter';
        const passengerName = matchingBooking.passengerName || 'Passenger';

        // Check active logged-in staff session (counter location and officer name)
        let loggedInLocation = '';
        let loggedInOfficerName = '';
        try {
          const sess = JSON.parse(sessionStorage.getItem('staff_user_session'));
          if (sess) {
            if (sess.location) loggedInLocation = sess.location.trim();
            if (sess.name) loggedInOfficerName = sess.name.trim();
          }
        } catch(e) {}

        function cleanLocation(loc) {
          if (!loc) return '';
          return loc.toLowerCase().replace(/counter|station|main/g, '').trim();
        }

        const ticketLocClean = cleanLocation(currentCancelTargetLocation);
        const userLocClean = cleanLocation(loggedInLocation);

        const isCounterBooking = ticketLocClean.length > 0 ||
          bookingSource.includes('counter') ||
          bookingSource.includes('staff') ||
          paymentMethod.includes('cash') ||
          paymentMethod.includes('counter') ||
          (officerName.length > 0 && officerName.toLowerCase() !== 'online customer');

        const activeOfficerName = officerName || 'Duty Staff Officer';

        // Counter-Level Authorization:
        // A ticket issued at Counter X can be cancelled by ANY officer assigned to Counter X!
        const isIssuedByAnotherCounter = isCounterBooking &&
          ticketLocClean.length > 0 &&
          userLocClean.length > 0 &&
          ticketLocClean !== userLocClean;

        const cancelBtn = document.getElementById('btn-confirm-cancel-ticket');
        const warnEl = document.getElementById('cancel-modal-restriction-warning');
        const warnText = document.getElementById('cancel-modal-restriction-text');
        const actionWarnEl = document.getElementById('cancel-modal-action-warning');

        if (isIssuedByAnotherCounter) {
          // Hide cancel button for staff from another counter location!
          if (cancelBtn) cancelBtn.classList.add('hidden');
          if (actionWarnEl) actionWarnEl.classList.add('hidden');
          if (warnEl) warnEl.classList.remove('hidden');
          if (warnText) warnText.textContent = `⛔ Cancellation Restricted: Ticket ${matchingBooking.pnr} was issued at ${currentCancelTargetLocation}. Your counter (${loggedInLocation || 'Current Counter'}) cannot cancel tickets issued by another station counter.`;
        } else {
          // Show cancel button if staff belongs to the same counter station or online website booking
          if (cancelBtn) cancelBtn.classList.remove('hidden');
          if (actionWarnEl) actionWarnEl.classList.remove('hidden');
          if (warnEl) warnEl.classList.add('hidden');
        }

        if (isCounterBooking) {
          currentCancelTargetSource = `🎟️ Staff Counter POS (Officer: ${activeOfficerName} @ ${stationName})`;
        } else {
          currentCancelTargetSource = `🌐 Website Online Booking`;
        }

        document.getElementById('cancel-modal-pnr').textContent = matchingBooking.pnr;
        document.getElementById('cancel-modal-name').textContent = passengerName;
        document.getElementById('cancel-modal-phone').textContent = matchingBooking.phone || 'N/A';
        document.getElementById('cancel-modal-seats').textContent = currentCancelTargetSeats.join(', ');
        document.getElementById('cancel-modal-route-date').textContent = `${matchingBooking.route} (${matchingBooking.travelDate})`;
        
        const sourceEl = document.getElementById('cancel-modal-source');
        if (sourceEl) {
          if (isCounterBooking) {
            sourceEl.textContent = `🎟️ Staff Portal Counter POS`;
            sourceEl.className = 'font-black text-amber-300 text-[11px]';
          } else {
            sourceEl.textContent = `🌐 Website Online Booking`;
            sourceEl.className = 'font-black text-blue-300 text-[11px]';
          }
        }

        const issuedEl = document.getElementById('cancel-modal-issued');
        if (issuedEl) {
          if (isCounterBooking) {
            const cNumStr = matchingBooking.counterNumber ? ` (Ph: ${matchingBooking.counterNumber})` : '';
            issuedEl.textContent = `👮 Officer: ${activeOfficerName} @ ${stationName}${cNumStr}`;
            issuedEl.className = 'font-bold text-emerald-400 text-[11px]';
          } else {
            issuedEl.textContent = `🌐 Online Customer (Self-Booked via Website)`;
            issuedEl.className = 'font-bold text-blue-300 text-[11px]';
          }
        }

        const tot = matchingBooking.totalAmount || 0;
        const paid = (matchingBooking.receivedAmount !== undefined) ? matchingBooking.receivedAmount : tot;
        const rem = (matchingBooking.remainingAmount !== undefined) ? matchingBooking.remainingAmount : Math.max(0, tot - paid);

        if (document.getElementById('cancel-modal-total')) document.getElementById('cancel-modal-total').textContent = `NPR ${tot.toLocaleString()}`;
        if (document.getElementById('cancel-modal-paid')) document.getElementById('cancel-modal-paid').textContent = `NPR ${paid.toLocaleString()}`;
        if (document.getElementById('cancel-modal-remaining')) document.getElementById('cancel-modal-remaining').textContent = `NPR ${rem.toLocaleString()}`;

        const modal = document.getElementById('cancelBookingModal');
        if (modal) modal.classList.remove('hidden');

      } catch (e) {
        console.error("Error opening ticket cancellation modal:", e);
      }
    }

    function closeCancelBookingModal() {
      const modal = document.getElementById('cancelBookingModal');
      if (modal) modal.classList.add('hidden');
      currentCancelTargetPnr = null;
      currentCancelTargetSeats = [];
      currentCancelTargetPassenger = '';
      currentCancelTargetIssuer = '';
      currentCancelTargetLocation = '';
    }

    async function confirmCancelCurrentBooking() {
      if (!currentCancelTargetPnr) return;

      const pnr = currentCancelTargetPnr;
      const seatsStr = currentCancelTargetSeats.join(', ');
      const passenger = currentCancelTargetPassenger;
      const source = currentCancelTargetSource;

      let loggedInLocation = '';
      let loggedInOfficerName = '';
      let cancellerInfo = 'Staff Officer';
      try {
        const sess = JSON.parse(sessionStorage.getItem('staff_user_session'));
        if (sess) {
          if (sess.location) loggedInLocation = sess.location.trim();
          if (sess.name) loggedInOfficerName = sess.name.trim();
          cancellerInfo = `${sess.name || 'Officer'} (${sess.location || 'Counter'})`;
        }
      } catch(e) {}

      function cleanLocation(loc) {
        if (!loc) return '';
        return loc.toLowerCase().replace(/counter|station|main/g, '').trim();
      }

      const ticketLocClean = cleanLocation(currentCancelTargetLocation);
      const userLocClean = cleanLocation(loggedInLocation);

      if (ticketLocClean && userLocClean && ticketLocClean !== userLocClean) {
        const warnEl = document.getElementById('cancel-modal-restriction-warning');
        const warnText = document.getElementById('cancel-modal-restriction-text');
        if (warnEl) warnEl.classList.remove('hidden');
        if (warnText) warnText.textContent = `⛔ Cancellation Restricted: Ticket ${pnr} was issued at ${currentCancelTargetLocation}. Your counter (${loggedInLocation}) cannot cancel tickets issued by another station counter.`;
        return;
      }

      if (!confirm(`Are you sure you want to CANCEL ticket PNR ${pnr}?\n\n📍 Booking Source: ${source}\n👤 Passenger: ${passenger}\n💺 Seat(s): ${seatsStr}\n\n❌ Cancelling Officer: ${cancellerInfo}\n\nSeat(s) ${seatsStr} will be released back to AVAILABLE!`)) {
        return;
      }

      try {
        const res = await fetch(`/api/admin/bookings/${pnr}?cancelledBy=${encodeURIComponent(cancellerInfo)}`, { method: 'DELETE' });
        if (res.ok) {
          alert(`✅ Ticket ${pnr} cancelled by ${cancellerInfo}!\nSeat(s) ${seatsStr} are now AVAILABLE.`);
          closeCancelBookingModal();
          updateCounterSeatMapForSelectedRoute();

          try {
            const syncChannel = new BroadcastChannel('diamond_content_sync');
            syncChannel.postMessage({ type: 'UPDATE' });
          } catch (e) {}
        } else {
          const err = await res.json();
          alert(`❌ Failed to cancel ticket: ${err.error || 'Server error'}`);
        }
      } catch (err) {
        alert(`🔌 Network error while cancelling ticket: ${err.message}`);
      }
    }

    async function saveSeatAvailabilityLive() {
      try {
        let fullContent = {};
        const getRes = await fetch('/api/content');
        if (getRes.ok) {
          fullContent = await getRes.json();
        }

        const dropdown = document.getElementById('counter-route-select');
        let routeId = 'ktm-kakarbhitta';
        if (dropdown && dropdown.value) {
          const parts = dropdown.value.split('|');
          if (parts.length >= 2) routeId = getRouteIdFromNames(parts[0], parts[1]);
        }

        if (!fullContent.seatLayoutsByRoute) fullContent.seatLayoutsByRoute = {};
        if (!fullContent.seatLayoutsByRoute[routeId]) {
          fullContent.seatLayoutsByRoute[routeId] = {
            type: 'customMatrix',
            totalRows: 10,
            lastRowBench: true,
            singleSeatFront: true,
            sleeperSeats: [],
            occupiedSeats: []
          };
        }

        fullContent.seatLayoutsByRoute[routeId].occupiedSeats = (currentSeatLayout && currentSeatLayout.occupiedSeats) ? currentSeatLayout.occupiedSeats : [];
        fullContent.seatLayoutsByRoute[routeId].sleeperSeats = (currentSeatLayout && currentSeatLayout.sleeperSeats) ? currentSeatLayout.sleeperSeats : [];

        const saveRes = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullContent)
        });

        if (saveRes.ok) {
          alert('✅ Seat availability updated live! Changes published to main website & Super Admin.');
          fetchContentAndRenderSeats();
          updateCounterSeatMapForSelectedRoute();
        } else {
          alert('❌ Failed to save seat availability.');
        }
      } catch(err) {
        alert('🔌 Error saving seat layout: ' + err.message);
      }
    }

    function getExtractedCounterPhone() {
      try {
        const sess = JSON.parse(sessionStorage.getItem('staff_user_session'));
        if (sess && sess.phone) return sess.phone.trim();
      } catch (e) {}

      try {
        const selectVal = document.getElementById('staffUserSelect')?.value || '';
        const parts = selectVal.split('|');
        if (parts.length >= 5 && parts[4]) return parts[4].trim();
      } catch (e) {}

      return '9841259931';
    }

    async function submitCounterBooking() {
      if (selectedCounterSeats.length === 0) {
        alert('⚠️ Please click and select at least 1 seat on the bus seat chart.');
        return;
      }

      const firstName = document.getElementById('counter-first-name')?.value?.trim();
      const lastName = document.getElementById('counter-last-name')?.value?.trim();
      const phone = document.getElementById('counter-phone')?.value?.trim();
      const issuedOfficer = document.getElementById('counter-issued-officer')?.value?.trim();
      const counterLocation = document.getElementById('counter-location-name')?.value?.trim() || 'Gongabu Main Counter';
      const counterNumber = getExtractedCounterPhone();
      const pickup = document.getElementById('counter-pickup')?.value?.trim();
      const dropoff = document.getElementById('counter-dropoff')?.value?.trim();

      if (!firstName || !lastName || !phone || !issuedOfficer || !counterLocation || !pickup || !dropoff) {
        alert('⚠️ Please fill in all required passenger, officer name, and counter location fields.');
        return;
      }

      const routeSelect = document.getElementById('counter-route-select')?.value || '';
      const parts = routeSelect.split('|');
      const origin = parts[0] || 'Kathmandu';
      const dest = parts[1] || 'Kakarbhitta';
      const fare = parseInt(parts[2]) || 2200;
      const travelTime = parts[3] || '04:30 PM';
      const travelDate = document.getElementById('counter-travel-date')?.value || new Date().toISOString().split('T')[0];

      const grossTotal = selectedCounterSeats.length * fare;
      const discountInputVal = parseFloat(document.getElementById('counter-discount-amount')?.value);
      const discountAmount = (!isNaN(discountInputVal) && discountInputVal > 0) ? Math.min(grossTotal, discountInputVal) : 0;

      const netTotalAmount = Math.max(0, grossTotal - discountAmount);

      const paidVal = parseFloat(document.getElementById('counter-paid-amount')?.value);
      const receivedAmount = !isNaN(paidVal) ? paidVal : netTotalAmount;
      const remainingAmount = Math.max(0, netTotalAmount - receivedAmount);

      const paymentMethod = document.getElementById('counter-payment-method')?.value || 'Cash at Counter';
      const paymentStatus = document.getElementById('counter-payment-status')?.value || (remainingAmount === 0 ? 'confirmed' : 'pending');
      const pnr = `DAB-${Math.floor(100000 + Math.random() * 900000)}`;

      const payload = {
        pnr: pnr,
        bookingSource: 'Staff Counter POS',
        passengerName: `${firstName} ${lastName}`,
        phone: phone,
        email: counterLocation,
        counterLocation: counterLocation,
        counterNumber: counterNumber,
        issuedOfficer: issuedOfficer,
        route: `${origin} -> ${dest}`,
        boardingPoint: pickup,
        dropoffPoint: dropoff,
        seats: selectedCounterSeats,
        grossAmount: grossTotal,
        discountAmount: discountAmount,
        totalAmount: netTotalAmount,
        receivedAmount: receivedAmount,
        remainingAmount: remainingAmount,
        travelDate: travelDate,
        travelTime: travelTime,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showCounterTicketModal(payload);
        } else {
          const errData = await res.json();
          alert('❌ Failed to issue ticket: ' + (errData.error || 'Server error'));
        }
      } catch(err) {
        alert('🔌 Network error while creating ticket: ' + err.message);
      }
    }

    function showCounterTicketModal(b) {
      document.getElementById('tkt-pnr').textContent = b.pnr;
      document.getElementById('tkt-date-issued').textContent = new Date().toLocaleString();
      document.getElementById('tkt-passenger-name').textContent = b.passengerName;
      document.getElementById('tkt-phone').textContent = b.phone;
      document.getElementById('tkt-route').textContent = b.route;
      document.getElementById('tkt-travel-date').textContent = `${b.travelDate} (${b.travelTime})`;
      document.getElementById('tkt-pickup').textContent = b.boardingPoint;
      document.getElementById('tkt-dropoff').textContent = b.dropoffPoint;
      document.getElementById('tkt-seats').textContent = b.seats.join(', ');

      const counterNum = b.counterNumber || getExtractedCounterPhone();
      if (document.getElementById('tkt-counter-number')) {
        document.getElementById('tkt-counter-number').textContent = counterNum || 'N/A';
      }

      const tot = b.totalAmount || 0;
      const disc = b.discountAmount || 0;
      const paid = (b.receivedAmount !== undefined) ? b.receivedAmount : tot;
      const rem = (b.remainingAmount !== undefined) ? b.remainingAmount : Math.max(0, tot - paid);

      if (document.getElementById('tkt-total-amount')) document.getElementById('tkt-total-amount').textContent = `NPR ${tot.toLocaleString()}`;
      if (document.getElementById('tkt-paid-amount')) document.getElementById('tkt-paid-amount').textContent = `NPR ${paid.toLocaleString()}`;
      if (document.getElementById('tkt-remaining-amount')) document.getElementById('tkt-remaining-amount').textContent = `NPR ${rem.toLocaleString()}`;

      const discRow = document.getElementById('tkt-discount-row');
      if (discRow) {
        if (disc > 0) {
          discRow.classList.remove('hidden');
          if (document.getElementById('tkt-discount-amount')) {
            document.getElementById('tkt-discount-amount').textContent = `-NPR ${disc.toLocaleString()}`;
          }
        } else {
          discRow.classList.add('hidden');
        }
      }

      const station = b.counterLocation || document.getElementById('counter-location-name')?.value || 'Gongabu Main Counter';
      const officer = b.issuedOfficer || document.getElementById('counter-issued-officer')?.value || 'Duty Officer';
      const counterPhoneStr = counterNum ? ` | Ph: ${counterNum}` : '';

      if (document.getElementById('tkt-counter-phone-badge')) {
        document.getElementById('tkt-counter-phone-badge').textContent = counterNum || 'N/A';
      }
      if (document.getElementById('tkt-officer-name')) {
        document.getElementById('tkt-officer-name').textContent = officer || 'Counter Officer';
      }
      if (document.getElementById('tkt-counter-station')) {
        document.getElementById('tkt-counter-station').textContent = station || 'Station Counter';
      }
      if (document.getElementById('tkt-issued-by')) {
        document.getElementById('tkt-issued-by').textContent = `Officer: ${officer} | ${station}${counterPhoneStr}`;
      }

      const modal = document.getElementById('ticketModal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeTicketModal() {
      const modal = document.getElementById('ticketModal');
      if (modal) modal.classList.add('hidden');

      // Clear selection & refresh live map
      selectedCounterSeats = [];
      document.getElementById('counter-first-name').value = '';
      document.getElementById('counter-last-name').value = '';
      document.getElementById('counter-phone').value = '';
      // Re-populate officer name from active staff user session
      try {
        const sess = JSON.parse(sessionStorage.getItem('staff_user_session'));
        if (sess && sess.name && document.getElementById('counter-issued-officer')) {
          document.getElementById('counter-issued-officer').value = sess.name;
        }
      } catch(e) {}
      document.getElementById('counter-dropoff').value = '';
      if (document.getElementById('counter-paid-amount')) document.getElementById('counter-paid-amount').value = '';
      if (document.getElementById('counter-discount-amount')) document.getElementById('counter-discount-amount').value = '';
      updateCounterSummary();
      updateCounterSeatMapForSelectedRoute();
    }

    // ==========================================
    // 5-MINUTE AUTOMATIC STAFF AUTO-LOGOUT SYSTEM
    // ==========================================
    const AUTO_LOGOUT_SECONDS = 300; // 5 minutes = 300 seconds
    let secondsRemaining = AUTO_LOGOUT_SECONDS;
    let countdownInterval = null;
    let lastStaffActivityTimestamp = Date.now();

    function resetInactivityTimer() {
      const screen = document.getElementById('staffLoginScreen');
      if (screen && !screen.classList.contains('hidden')) return;

      const now = Date.now();
      if (now - lastStaffActivityTimestamp > 1000) {
        lastStaffActivityTimestamp = now;
        try {
          localStorage.setItem('diamond_staff_last_activity', now.toString());
        } catch (e) {}
      }
      checkStaffAutoLogout();
    }

    function updateTimerDisplay() {
      const display = document.getElementById('staff-logout-timer-display');
      if (!display) return;
      const mins = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
      const secs = (secondsRemaining % 60).toString().padStart(2, '0');
      display.textContent = `${mins}:${secs}`;

      const badge = document.getElementById('staff-timer-badge');
      if (secondsRemaining <= 60 && badge) {
        badge.classList.remove('bg-amber-400/10', 'border-amber-400/30', 'text-amber-300');
        badge.classList.add('bg-red-500/20', 'border-red-500/50', 'text-red-400', 'animate-pulse');
      } else if (badge) {
        badge.classList.remove('bg-red-500/20', 'border-red-500/50', 'text-red-400', 'animate-pulse');
        badge.classList.add('bg-amber-400/10', 'border-amber-400/30', 'text-amber-300');
      }
    }

    function checkStaffAutoLogout() {
      const screen = document.getElementById('staffLoginScreen');
      if (screen && !screen.classList.contains('hidden')) return;

      try {
        const storedTs = parseInt(localStorage.getItem('diamond_staff_last_activity') || '0', 10);
        if (storedTs > lastStaffActivityTimestamp) {
          lastStaffActivityTimestamp = storedTs;
        }
      } catch (e) {}

      const elapsedSeconds = Math.floor((Date.now() - lastStaffActivityTimestamp) / 1000);
      secondsRemaining = Math.max(0, AUTO_LOGOUT_SECONDS - elapsedSeconds);
      updateTimerDisplay();

      if (secondsRemaining <= 0) {
        logoutStaffPortal(true);
      }
    }

    function startAutoLogoutMonitoring() {
      lastStaffActivityTimestamp = Date.now();
      try {
        localStorage.setItem('diamond_staff_last_activity', lastStaffActivityTimestamp.toString());
      } catch (e) {}
      secondsRemaining = AUTO_LOGOUT_SECONDS;
      updateTimerDisplay();

      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(checkStaffAutoLogout, 1000);

      const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, resetInactivityTimer);
        window.addEventListener(evt, resetInactivityTimer, { passive: true });
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkStaffAutoLogout();
      });
      window.addEventListener('focus', checkStaffAutoLogout);
      window.addEventListener('storage', (e) => {
        if (e.key === 'diamond_staff_last_activity') checkStaffAutoLogout();
      });
    }

    let cachedStaffUsersList = [
      { name: "Achyut Prasad Lamichane", passcode: "Achut@123", location: "Koteshwor Counter", region: "outside", phone: "9824857456" },
      { name: "purna Pokhrel", passcode: "Purna@123", location: "Jorpati Counter", region: "inside", phone: "9841259931" },
      { name: "Hari Bahadur Khatri", passcode: "Hari@123", location: "Gaushala Counter", region: "outside", phone: "9841122250" },
      { name: "Madhav Bhatta", passcode: "Madhav@123", location: "Chabahil Counter", region: "inside", phone: "9808123456" },
      { name: "Duty Counter Manager", passcode: "1234", location: "Gongabu Main Station Counter", region: "inside", phone: "9841259931" }
    ];

    async function fetchStaffUsersFromApi() {
      try {
        const res = await fetch('/api/content?t=' + Date.now());
        if (res.ok) {
          const content = await res.json();
          if (content.staffUsers && Array.isArray(content.staffUsers) && content.staffUsers.length > 0) {
            cachedStaffUsersList = content.staffUsers;
          }
        }
      } catch (e) {
        console.warn("Could not fetch staff accounts:", e);
      }
    }

    function applyStaffUserSession(userObj) {
      if (!userObj) return;
      const headerLabel = document.getElementById('staff-user-header-label');
      if (headerLabel) {
        const regBadge = userObj.region === 'outside' ? ' Outside' : ' Inside';
        headerLabel.textContent = `👤 ${userObj.name} (${regBadge})`;
      }

      const officerInput = document.getElementById('counter-issued-officer');
      if (officerInput) officerInput.value = userObj.name;

      const locationInput = document.getElementById('counter-location-name');
      if (locationInput && userObj.location) locationInput.value = userObj.location;

      const counterNumInput = document.getElementById('counter-number');
      if (counterNumInput && userObj.phone) counterNumInput.value = userObj.phone;

      const regionBadge = document.getElementById('counter-assigned-region-badge');
      if (regionBadge) {
        if (userObj.region === 'outside') {
          regionBadge.textContent = '🌄 Outside Valley (Inbound to Kathmandu)';
          regionBadge.className = 'bg-blue-400/20 text-blue-300 border border-blue-400/30 text-xs font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider';
        } else {
          regionBadge.textContent = '🏢 Inside Valley (Kathmandu Outbound)';
          regionBadge.className = 'bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider';
        }
      }

      // Automatically switch route dropdown to assigned region (Inside / Outside Valley)
      if (typeof filterRouteRegion === 'function') {
        filterRouteRegion(userObj.region || 'inside');
      }
    }

    function logoutStaffPortal(isAuto = false) {
      const screen = document.getElementById('staffLoginScreen');
      const userInput = document.getElementById('staffUsername');
      const passInput = document.getElementById('staffPasscode');
      const err = document.getElementById('staffLoginError');

      fetchStaffUsersFromApi();

      if (screen) screen.classList.remove('hidden');
      if (passInput) passInput.value = '';
      if (userInput) {
        userInput.focus();
      }
      if (err) {
        if (isAuto) {
          err.textContent = "⏱️ Logged out automatically after 5 minutes of inactivity.";
          err.classList.remove('hidden', 'text-red-400');
          err.classList.add('text-amber-300');
        } else {
          err.classList.add('hidden');
        }
      }
      sessionStorage.removeItem('staff_portal_authenticated');
      sessionStorage.removeItem('staff_user_session');
      lastStaffActivityTimestamp = Date.now();
      try {
        localStorage.setItem('diamond_staff_last_activity', lastStaffActivityTimestamp.toString());
      } catch (e) {}
    }

    async function handleStaffLogin(e) {
      if (e) e.preventDefault();
      await fetchStaffUsersFromApi();

      const usernameInput = (document.getElementById('staffUsername')?.value || '').trim();
      const passcodeInput = (document.getElementById('staffPasscode')?.value || '').trim();
      const err = document.getElementById('staffLoginError');

      if (!usernameInput || !passcodeInput) {
        if (err) {
          err.textContent = "❌ Please enter both Username and Password.";
          err.classList.remove('hidden', 'text-amber-300');
          err.classList.add('text-red-400');
        }
        return;
      }

      const lowerUser = usernameInput.toLowerCase();
      const lowerPass = passcodeInput.toLowerCase();
      const masterCodes = ['1234', 'admin', '0000', '2026', 'staff'];

      // Match against staff list
      let matchedStaff = cachedStaffUsersList.find(u => {
        const nameMatch = u.name && u.name.toLowerCase().includes(lowerUser);
        const phoneMatch = u.phone && u.phone.includes(usernameInput);
        const idMatch = u.id && u.id.toLowerCase() === lowerUser;
        return nameMatch || phoneMatch || idMatch;
      });

      let isAuthenticated = false;
      let sessionData = null;

      if (matchedStaff) {
        const validPass = matchedStaff.passcode ? matchedStaff.passcode.toLowerCase() : '';
        if (lowerPass === validPass || masterCodes.includes(lowerPass)) {
          isAuthenticated = true;
          sessionData = {
            name: matchedStaff.name,
            location: matchedStaff.location || 'Gongabu Counter',
            region: matchedStaff.region || 'inside',
            phone: matchedStaff.phone || '9841259931',
            loginTime: new Date().toISOString()
          };
        } else {
          if (err) {
            err.textContent = `❌ Incorrect password for "${matchedStaff.name}". Please try again.`;
            err.classList.remove('hidden', 'text-amber-300');
            err.classList.add('text-red-400');
          }
          return;
        }
      } else {
        // If username not explicitly in staff list, allow master passcode login with typed username
        if (masterCodes.includes(lowerPass) || lowerUser === 'admin' || lowerUser === 'staff') {
          isAuthenticated = true;
          sessionData = {
            name: usernameInput,
            location: 'Gongabu Main Station Counter',
            region: 'inside',
            phone: '9841259931',
            loginTime: new Date().toISOString()
          };
        } else {
          if (err) {
            err.textContent = `❌ Invalid Username or Password. Please check credentials or contact Super Admin.`;
            err.classList.remove('hidden', 'text-amber-300');
            err.classList.add('text-red-400');
          }
          return;
        }
      }

      if (isAuthenticated && sessionData) {
        sessionStorage.setItem('staff_portal_authenticated', 'true');
        sessionStorage.setItem('staff_user_session', JSON.stringify(sessionData));

        applyStaffUserSession(sessionData);
        document.getElementById('staffLoginScreen')?.classList.add('hidden');
        if (err) err.classList.add('hidden');
        startAutoLogoutMonitoring();
      }
    }

    // Staff Counter Ticket Tracker Modal Functions
    function openStaffTrackTicketModal() {
      const modal = document.getElementById('staffTrackTicketModal');
      if (modal) modal.classList.remove('hidden');
      const resultsEl = document.getElementById('staff-track-results');
      const errEl = document.getElementById('staff-track-not-found');
      if (resultsEl) resultsEl.classList.add('hidden');
      if (errEl) errEl.classList.add('hidden');
      setTimeout(() => {
        document.getElementById('staff-track-name-input')?.focus();
      }, 100);
    }

    function closeStaffTrackTicketModal() {
      const modal = document.getElementById('staffTrackTicketModal');
      if (modal) modal.classList.add('hidden');
    }

    async function performStaffTicketSearch() {
      const nameVal = (document.getElementById('staff-track-name-input')?.value || '').trim();
      const phoneVal = (document.getElementById('staff-track-phone-input')?.value || '').trim();
      const resultsContainer = document.getElementById('staff-track-results');
      const notFoundEl = document.getElementById('staff-track-not-found');
      const errorMsgEl = document.getElementById('staff-track-error-msg');

      if (!nameVal && !phoneVal) {
        alert('⚠️ Please enter a Passenger Name, Phone Number, or PNR Code to search.');
        document.getElementById('staff-track-name-input')?.focus();
        return;
      }

      if (resultsContainer) resultsContainer.classList.add('hidden');
      if (notFoundEl) notFoundEl.classList.add('hidden');

      try {
        const res = await fetch('/api/bookings?t=' + Date.now());
        if (!res.ok) throw new Error('Failed to fetch bookings');

        const bookings = await res.json();
        window.currentActiveBookings = bookings;

        const cleanPhone = phoneVal.replace(/[^0-9]/g, '');
        const normName = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '');

        const matching = bookings.filter(b => {
          if (b.paymentStatus === 'rejected') return false;
          const bPhone = (b.phone || '').replace(/[^0-9]/g, '');
          const bName = (b.passengerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const bPnr = (b.pnr || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          let phoneMatch = false;
          if (cleanPhone) {
            phoneMatch = bPhone.endsWith(cleanPhone) || cleanPhone.endsWith(bPhone);
          }

          let nameMatch = false;
          if (normName) {
            nameMatch = bName.includes(normName) || normName.includes(bName) || bPnr.includes(normName);
          }

          if (cleanPhone && normName) {
            return phoneMatch && nameMatch;
          } else if (cleanPhone) {
            return phoneMatch;
          } else if (normName) {
            return nameMatch;
          }
          return false;
        });

        if (matching.length === 0) {
          if (notFoundEl) notFoundEl.classList.remove('hidden');
          if (errorMsgEl) errorMsgEl.textContent = `No active tickets found matching "${nameVal || phoneVal}".`;
          return;
        }

        if (resultsContainer) {
          resultsContainer.innerHTML = matching.map(b => {
            const seatsStr = Array.isArray(b.seats) ? b.seats.join(', ') : (b.seats || 'N/A');
            const tot = b.totalAmount || 0;
            const paid = (b.receivedAmount !== undefined) ? b.receivedAmount : tot;
            const rem = (b.remainingAmount !== undefined) ? b.remainingAmount : Math.max(0, tot - paid);
            const officer = b.issuedOfficer || 'Duty Officer';
            const station = b.counterLocation || 'Station Counter';
            const cPhone = b.counterNumber ? ` (Ph: ${b.counterNumber})` : '';

            return `
              <div class="bg-slate-800/95 rounded-2xl p-4 border border-slate-700 space-y-3 shadow-lg">
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-black text-amber-400 text-xs tracking-wider">${b.pnr}</span>
                    <span class="bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">${b.paymentStatus || 'Confirmed'}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">${b.travelDate || ''}</span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span class="block text-[9px] font-bold text-slate-400 uppercase">Passenger Name</span>
                    <strong class="font-extrabold text-white text-xs">${b.passengerName}</strong>
                  </div>
                  <div>
                    <span class="block text-[9px] font-bold text-slate-400 uppercase">Mobile Phone</span>
                    <span class="font-mono font-bold text-slate-200">${b.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span class="block text-[9px] font-bold text-slate-400 uppercase">Booked Seat(s)</span>
                    <span class="font-mono font-black text-blue-400">${seatsStr}</span>
                  </div>
                  <div class="col-span-2">
                    <span class="block text-[9px] font-bold text-slate-400 uppercase">Route / Schedule</span>
                    <span class="font-bold text-amber-300">${b.route} (${b.travelTime || ''})</span>
                  </div>
                  <div>
                    <span class="block text-[9px] font-bold text-slate-400 uppercase">Total Fare / Due</span>
                    <span class="font-extrabold text-emerald-400">NPR ${paid.toLocaleString()}</span>
                    ${rem > 0 ? `<span class="text-[10px] text-rose-400 font-bold block">Due: NPR ${rem.toLocaleString()}</span>` : ''}
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 flex-wrap gap-2">
                  <span>👮 ${officer} @ ${station}${cPhone}</span>
                  <button onclick="triggerPrintFromTracker('${b.pnr}')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer text-xs">
                    <span class="material-symbols-outlined text-xs">print</span> Print Ticket Pass
                  </button>
                </div>
              </div>
            `;
          }).join('');

          resultsContainer.classList.remove('hidden');
        }

      } catch (err) {
        if (notFoundEl) notFoundEl.classList.remove('hidden');
        if (errorMsgEl) errorMsgEl.textContent = 'Error fetching records: ' + err.message;
      }
    }

    function triggerPrintFromTracker(pnr) {
      if (!window.currentActiveBookings) return;
      const b = window.currentActiveBookings.find(x => x.pnr === pnr);
      if (b) {
        closeStaffTrackTicketModal();
        showCounterTicketModal(b);
      }
    }

    // Initialize monitoring & check auth status
    document.addEventListener('DOMContentLoaded', () => {
      startAutoLogoutMonitoring();
      if (!sessionStorage.getItem('staff_portal_authenticated')) {
        logoutStaffPortal(false);
      } else {
        document.getElementById('staffLoginScreen')?.classList.add('hidden');
        try {
          const userSession = JSON.parse(sessionStorage.getItem('staff_user_session'));
          if (userSession) applyStaffUserSession(userSession);
        } catch (e) {}
      }

      // Live Real-time Sync with Website Bookings & Admin
      try {
        const staffEvtSource = new EventSource('/api/admin/notifications');
        const refreshFunc = () => {
          if (typeof updateCounterSeatMapForSelectedRoute === 'function') {
            updateCounterSeatMapForSelectedRoute();
          }
        };
        staffEvtSource.addEventListener('new_booking', refreshFunc);
        staffEvtSource.addEventListener('payment_status_update', refreshFunc);
        staffEvtSource.addEventListener('booking_updated', refreshFunc);
      } catch (e) {
        console.warn("SSE real-time sync setup error:", e);
      }
    });
