/* ==========================================================================
   DIAMOND AIRBUS - WEBSITE INTERACTION ENGINE
   ========================================================================== */

function initApp() {
  // Force browser scroll restoration to manual and scroll to top on refresh
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // Theme Toggle Controller (Desktop & Mobile)
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');

  function toggleThemeMode() {
    document.documentElement.classList.toggle('dark');
    const isDarkActive = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDarkActive ? 'dark' : 'light');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleThemeMode);
  }
  if (mobileThemeToggleBtn) {
    mobileThemeToggleBtn.addEventListener('click', () => {
      toggleThemeMode();
      // Auto close mobile menu after clicking theme toggler for smooth mobile UX
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.classList.add('hidden');
    });
  }

  // Mobile Navigation Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // Active Navigation Highlighting on Scroll
  const sections = document.querySelectorAll('section, header');
  const navItems = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${current}`) {
        item.classList.add('active');
      }
    });
  });

  // Fleet Category Tab Filtering
  const tabBtns = document.querySelectorAll('.tab-btn');
  const fleetCards = document.querySelectorAll('.fleet-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      fleetCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Interactive Seat Selection Logic handled exclusively by main.js toggleSeat


  // Dynamic Backend Integration (Site Content & Booking Persistence)
  let activeTicketPrice = 2200;
  let activeRouteTitle = 'Kathmandu ➔ Kakarbhitta';

  function getApiUrl(path) {
    if (window.location.origin.includes(':3000')) {
      return path;
    }
    return 'http://localhost:3000' + path;
  }

  let lastRenderedRoutesJSON = null;
  let lastRenderedFleetJSON = null;

  // Fetch Live Site Data from Backend API
  async function loadDynamicContent() {
    let data = null;
    try {
      const res = await fetch(getApiUrl('/api/content?t=' + Date.now()));
      if (res.ok) {
        data = await res.json();
        try {
          localStorage.setItem('diamond_site_content', JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err) {
      console.log('Backend API connection offline, checking local cached content.');
    }

    if (!data) {
      try {
        const cached = localStorage.getItem('diamond_site_content');
        if (cached) {
          data = JSON.parse(cached);
        }
      } catch (e) {}
    }

    // Default fallback routes if API is unreachable or returned empty routes
    const defaultRoutes = [
      { id: '1', from: 'Kathmandu', to: 'Kakarbhitta', departureTime: '16:30 (04:30 PM)', price: 2200, image: 'dest-kakarvitta.png' },
      { id: '2', from: 'Kathmandu', to: 'Biratnagar', departureTime: '17:00 (05:00 PM)', price: 1950, image: 'dest-biratnagar.png' },
      { id: '3', from: 'Kathmandu', to: 'Sautha', departureTime: '16:00 (04:00 PM)', price: 2100, image: 'dest-sautha.png' }
    ];

    if (!data) {
      data = { routes: defaultRoutes };
    } else if (!data.routes || data.routes.length === 0) {
      data.routes = defaultRoutes;
    }
    window.currentSiteContent = data;
    window.siteCurrency = data.currency || 'NPR';

    try {
      // Dynamic Section Images
      if (data.images) {
        if (data.images.logo) {
          document.querySelectorAll('img[alt*="Logo"]').forEach(img => img.src = data.images.logo);
        }
        if (data.images.fonepayQr) {
          document.querySelectorAll('img[alt*="Fonepay"]').forEach(img => img.src = data.images.fonepayQr);
        }
        if (data.images.destKakarbhitta) {
          const el = document.getElementById('route-img-1');
          if (el) el.src = data.images.destKakarbhitta;
        }
        if (data.images.destBiratnagar) {
          const el = document.getElementById('route-img-2');
          if (el) el.src = data.images.destBiratnagar;
        }
        if (data.images.destSautha) {
          const el = document.getElementById('route-img-3');
          if (el) el.src = data.images.destSautha;
        }
        if (data.images.fleetCenter) {
          const el = document.getElementById('fleet-img-center');
          if (el) el.src = data.images.fleetCenter;
        }
        if (data.images.aboutHeritage) {
          const el = document.querySelector('img[alt*="Real Luxury Interior"]');
          if (el) el.src = data.images.aboutHeritage;
        }
        if (data.images.aboutCrew) {
          const el = document.querySelector('img[alt*="Professional Crew"]');
          if (el) el.src = data.images.aboutCrew;
        }
      }

      // Hero Banner & Slider Images
      if (data.hero) {
        const heroTitle = document.getElementById('heroHeadline') || document.querySelector('h1');
        const heroSub = document.getElementById('heroSubheadline') || document.querySelector('header p');
        if (heroTitle && data.hero.headline) heroTitle.textContent = data.hero.headline;
        if (heroSub && data.hero.subheadline) heroSub.textContent = data.hero.subheadline;

        if (data.hero.slide1) {
          const s0 = document.getElementById('hero-slide-img-0');
          if (s0) s0.src = data.hero.slide1;
        }
        if (data.hero.slide2) {
          const s1 = document.getElementById('hero-slide-img-1');
          if (s1) s1.src = data.hero.slide2;
        }
        if (data.hero.slide3) {
          const s2 = document.getElementById('hero-slide-img-2');
          if (s2) s2.src = data.hero.slide3;
        }
      }

      // Update Notice Banner if present
      const noticeBanner = document.getElementById('topNoticeBanner');
      const noticeTextEl = document.getElementById('topNoticeText');
      if (data.notice) {
        if (noticeBanner) {
          if (data.notice.enabled) {
            noticeBanner.classList.remove('hidden');
            noticeBanner.style.display = 'flex';
            if (noticeTextEl) noticeTextEl.textContent = data.notice.text || '';
          } else {
            noticeBanner.classList.add('hidden');
            noticeBanner.style.display = 'none';
          }
        }
      }

      // Checkout Payment QR Code Image
      if (data.images && data.images.fonepayQr) {
        const qrImg = document.getElementById('qr-image');
        if (qrImg) qrImg.src = data.images.fonepayQr;
      }

      // Experience Section Dynamic Update
      if (data.experience) {
        const expHeading = document.querySelector('#experience h2');
        const expDesc = document.querySelector('#experience p');
        if (expHeading && data.experience.title) expHeading.textContent = data.experience.title;
        if (expDesc && data.experience.subtitle) expDesc.textContent = data.experience.subtitle;

        if (data.experience.features && data.experience.features.length > 0) {
          const grid = document.getElementById('experienceGrid');
          if (grid) {
            grid.innerHTML = '';
            data.experience.features.forEach((feat) => {
              const card = document.createElement('div');
              card.className = "bg-[#F8FAFC] dark:bg-surface-container-low rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group";
              
              const mediaHtml = (feat.mediaType === 'image' && feat.image) 
                ? `<img src="${feat.image}" class="w-full h-full object-cover rounded-xl">` 
                : `<span class="material-symbols-outlined text-2xl font-bold">${feat.icon || 'star'}</span>`;

              card.innerHTML = `
                <div class="w-14 h-14 rounded-2xl bg-[#EBF3FF] text-[#003893] flex items-center justify-center mb-6 group-hover:bg-[#003893] group-hover:text-white transition-colors duration-300 shadow-sm overflow-hidden p-2">
                  ${mediaHtml}
                </div>
                <h3 class="text-xl font-bold text-[#031B42] dark:text-white mb-3">${feat.title}</h3>
                <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">${feat.desc}</p>
              `;
              grid.appendChild(card);
            });
          }
        }
      }

      // About Us Section Dynamic Update
      if (data.about) {
        const heritageTitleEl = document.querySelector('#about h2');
        const heritageTextEl = document.querySelector('#about p');
        const heritageImgEl = document.querySelector('img[alt*="Real Luxury Interior"]');
        const crewImgEl = document.querySelector('img[alt*="Professional Crew"]');

        if (heritageTitleEl && data.about.heritageTitle) heritageTitleEl.textContent = data.about.heritageTitle;
        if (heritageTextEl && data.about.heritageText) heritageTextEl.textContent = data.about.heritageText;
        if (heritageImgEl && data.about.heritageImg) heritageImgEl.src = data.about.heritageImg;
        if (crewImgEl && data.about.crewImg) crewImgEl.src = data.about.crewImg;

        const storyTextEl = document.querySelector('#about .lg\\:col-span-7:nth-child(1) p');
        if (storyTextEl && data.about.storyText) storyTextEl.textContent = data.about.storyText;
      }

      // Reserve Bus / Charter Section Dynamic Update
      if (data.reserveBus) {
        const charterTitleEl = document.getElementById('modalCharterTitle');
        const charterDescEl = document.getElementById('modalCharterDesc');
        if (charterTitleEl && data.reserveBus.title) charterTitleEl.textContent = data.reserveBus.title;
        if (charterDescEl && data.reserveBus.description) charterDescEl.textContent = data.reserveBus.description;

        const charterImgEl = document.querySelector('img[alt*="Charter"]');
        if (charterImgEl && data.reserveBus.image) charterImgEl.src = data.reserveBus.image;
      }

      // Dynamic Seat Layout Render per Selected Route
      window.siteContentData = data;

      // Update Route Selection Dropdown dynamically (only if routes changed)
      const routeDropdown = document.getElementById('routeSelectDropdown');
      const routesKey = JSON.stringify(data.routes || []);
      if (routeDropdown && data.routes && data.routes.length > 0 && window._lastRenderedRoutesDropdown !== routesKey) {
        window._lastRenderedRoutesDropdown = routesKey;
        const currentVal = routeDropdown.value;
        routeDropdown.innerHTML = '';
        data.routes.forEach(r => {
          // 1. Forward route option
          const opt = document.createElement('option');
          opt.value = `${r.from}|${r.to}|${r.price || 2200}|${r.departureTime || '04:30 PM'}`;
          opt.textContent = `${r.from} ➔ ${r.to} (${r.departureTime || 'Daily'}) • ${window.siteCurrency || 'NPR'} ${(r.price || 2200).toLocaleString()}`;
          routeDropdown.appendChild(opt);

          // 2. Return (Vice-Versa) route option
          const optReturn = document.createElement('option');
          optReturn.value = `${r.to}|${r.from}|${r.price || 2200}|${r.departureTime || '04:30 PM'}`;
          optReturn.textContent = `${r.to} ➔ ${r.from} (${r.departureTime || 'Daily'}) • ${window.siteCurrency || 'NPR'} ${(r.price || 2200).toLocaleString()}`;
          routeDropdown.appendChild(optReturn);
        });
        if (currentVal && Array.from(routeDropdown.options).some(o => o.value === currentVal)) {
          routeDropdown.value = currentVal;
        }
      }

      if (typeof window.updateWebsiteSeatMapForSelectedRoute === 'function') {
        window.updateWebsiteSeatMapForSelectedRoute();
      } else if (typeof updateWebsiteSeatMapForSelectedRoute === 'function') {
        updateWebsiteSeatMapForSelectedRoute();
      } else if (data.seatLayout && typeof window.renderDynamicWebsiteSeatMap === 'function') {
        window.renderDynamicWebsiteSeatMap(data.seatLayout);
      }

      // Update Contact Phone Numbers & WhatsApp across site
      if (data.company) {
        if (data.company.phone) {
          document.querySelectorAll('[data-dynamic="phone"], #footer-dispatch-phone').forEach(el => {
            el.textContent = data.company.phone;
          });
          document.querySelectorAll('a[href^="tel:"]').forEach(a => {
            a.setAttribute('href', `tel:${data.company.phone.replace(/[^0-9+]/g, '')}`);
          });
        }
        if (data.company.whatsapp) {
          document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
            a.setAttribute('href', `https://wa.me/${data.company.whatsapp.replace(/[^0-9]/g, '')}`);
          });
        }
      }

      // Update Section Titles & Subtitles
      if (data.routesTitle) {
        const el = document.getElementById('routes-section-title') || document.getElementById('routes-title');
        if (el) el.textContent = data.routesTitle;
      }
      if (data.routesSubtitle) {
        const el = document.getElementById('routes-section-subtitle') || document.getElementById('routes-subtitle');
        if (el) el.textContent = data.routesSubtitle;
      }
      if (data.fleetTitle) {
        const el = document.getElementById('fleet-section-title') || document.getElementById('fleet-title');
        if (el) el.textContent = data.fleetTitle;
      }
      if (data.fleetSubtitle) {
        const el = document.getElementById('fleet-section-subtitle') || document.getElementById('fleet-subtitle');
        if (el) el.textContent = data.fleetSubtitle;
      }

      if (data.stats) {
        for (let i = 1; i <= 4; i++) {
          const numEl = document.getElementById(`stat-${i}-num`);
          const lblEl = document.getElementById(`stat-${i}-lbl`);
          const descEl = document.getElementById(`stat-${i}-desc`);
          const iconEl = document.getElementById(`stat-${i}-icon`);
          if (numEl && data.stats[`stat${i}Number`]) numEl.textContent = data.stats[`stat${i}Number`];
          if (lblEl && data.stats[`stat${i}Label`]) lblEl.textContent = data.stats[`stat${i}Label`];
          if (descEl && data.stats[`stat${i}Desc`]) descEl.textContent = data.stats[`stat${i}Desc`];
          if (iconEl && data.stats[`stat${i}Icon`]) iconEl.textContent = data.stats[`stat${i}Icon`];
        }
      }

      // Update Our Professional Crew & About Section
      if (data.about) {
        if (data.about.crewTitle && document.getElementById('crew-title')) {
          document.getElementById('crew-title').textContent = data.about.crewTitle;
        }
        if (data.about.crewSubtitle && document.getElementById('crew-subtitle')) {
          document.getElementById('crew-subtitle').textContent = data.about.crewSubtitle;
        }
        if (data.about.crewPoint1 && document.getElementById('crew-point-1')) {
          document.getElementById('crew-point-1').textContent = data.about.crewPoint1;
        }
        if (data.about.crewPoint1Icon && document.getElementById('crew-point-1-icon')) {
          document.getElementById('crew-point-1-icon').textContent = data.about.crewPoint1Icon;
        }
        if (data.about.crewPoint2 && document.getElementById('crew-point-2')) {
          document.getElementById('crew-point-2').textContent = data.about.crewPoint2;
        }
        if (data.about.crewPoint2Icon && document.getElementById('crew-point-2-icon')) {
          document.getElementById('crew-point-2-icon').textContent = data.about.crewPoint2Icon;
        }
        if (data.about.crewPoint3 && document.getElementById('crew-point-3')) {
          document.getElementById('crew-point-3').textContent = data.about.crewPoint3;
        }
        if (data.about.crewPoint3Icon && document.getElementById('crew-point-3-icon')) {
          document.getElementById('crew-point-3-icon').textContent = data.about.crewPoint3Icon;
        }
        if (data.about.crewImg && document.querySelector('img[alt*="Professional Crew"]')) {
          document.querySelector('img[alt*="Professional Crew"]').src = data.about.crewImg;
        }
      }

      // Dynamic Fleet Showcase Grid & Hero Carousel Cutouts
      if (data.fleet && Array.isArray(data.fleet) && data.fleet.length > 0) {
        window.busImages = data.fleet.map(b => b.image || 'diamond-pink-cutout-1.png');
        if (window.updateFleetCarouselDisplay) {
          window.updateFleetCarouselDisplay();
        }

        // Meet Our Fleet Showcase Dynamic Update (Image 2 Redesign)
        window.allFleetData = data.fleet;
        const currentFleetJSON = JSON.stringify(data.fleet);
        if (currentFleetJSON !== lastRenderedFleetJSON) {
          lastRenderedFleetJSON = currentFleetJSON;
          if (window.renderFleetShowcase) {
            window.renderFleetShowcase(data.fleet, window.currentFleetIndex || 0);
          }
        }
      }

      // Routes Slider Dynamic Update (Image 2 Redesign)
      if (data.routes && Array.isArray(data.routes) && data.routes.length > 0) {
        window.allRoutesData = data.routes;
        const currentRoutesJSON = JSON.stringify(data.routes);
        if (currentRoutesJSON !== lastRenderedRoutesJSON) {
          lastRenderedRoutesJSON = currentRoutesJSON;
          if (window.renderRoutesSlider) {
            window.renderRoutesSlider(data.routes);
          }
        }

        if (data.routes[0] && data.routes[0].price) {
          activeTicketPrice = data.routes[0].price;
          updateBookingSummary();
        }
      } else if (data.defaultTicketPrice) {
        activeTicketPrice = data.defaultTicketPrice;
        updateBookingSummary();
      }
    } catch (err) {
      console.error('Error applying dynamic content updates:', err);
    }
  }

  window.loadDynamicContent = loadDynamicContent;
  loadDynamicContent();

  // Instant Real-Time Sync & Auto-Refresh Listener
  try {
    const syncChannel = new BroadcastChannel('diamond_content_sync');
    syncChannel.onmessage = (event) => {
      if (!event.data || event.data.type === 'UPDATE' || event.data.type === 'CONTENT_SYNC') {
        loadDynamicContent();
      }
    };
  } catch (e) {}

  // Auto Polling every 3 seconds to keep website live-synced with admin edits
  setInterval(loadDynamicContent, 3000);

  function updateBookingSummary() {
    const selectedSeatsContainer = document.getElementById('selectedSeatsDisplay');
    const totalPriceDisplay = document.getElementById('totalPriceDisplay');
    if (selectedSeatsContainer) {
      if (!window.selectedSeatNumbers || window.selectedSeatNumbers.length === 0) {
        selectedSeatsContainer.textContent = 'None Selected';
      } else {
        selectedSeatsContainer.textContent = window.selectedSeatNumbers.join(', ');
      }
    }

    if (totalPriceDisplay) {
      const total = (window.selectedSeatNumbers ? window.selectedSeatNumbers.length : 0) * activeTicketPrice;
      totalPriceDisplay.textContent = `${window.siteCurrency || 'NPR'} ${total.toLocaleString()}`;
    }
  }

  // Modals (Booking Modal & Ticket Confirmation Modal)
  const bookingModal = document.getElementById('bookingModal');
  const ticketModal = document.getElementById('ticketModal');

  window.openBookingModal = function(routeTitle = 'Kathmandu to Kakarbhitta') {
    activeRouteTitle = routeTitle;
    const modalRouteTitle = document.getElementById('modalRouteTitle');
    if (modalRouteTitle) modalRouteTitle.textContent = routeTitle;
    if (bookingModal) bookingModal.classList.add('active');
  };

  window.closeBookingModal = function() {
    if (bookingModal) bookingModal.classList.remove('active');
  };

  window.closeTicketModal = function() {
    const actualModal = document.getElementById('ticket-modal');
    if (actualModal) {
      actualModal.classList.add('hidden');
      actualModal.style.display = 'none';
    }
    if (window.customerPaymentSSE) {
      try { window.customerPaymentSSE.close(); } catch (e) {}
      window.customerPaymentSSE = null;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Search Form Submit -> Opens Booking Modal
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const origin = document.getElementById('originInput')?.value || 'Kathmandu';
      const destination = document.getElementById('destInput')?.value || 'Kakarbhitta';
      openBookingModal(`${origin} ➔ ${destination}`);
    });
  }

  // Confirm Reservation & Save to Backend API
  const confirmBookingBtn = document.getElementById('confirmBookingBtn');
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', async () => {
      if (selectedSeatNumbers.length === 0) {
        alert('Please select at least 1 seat to confirm your reservation.');
        return;
      }

      const passengerName = document.getElementById('passengerNameInput')?.value || 'Valued Passenger';
      const passengerPhone = document.getElementById('passengerPhoneInput')?.value || '+977-98XXXXXXXX';
      const boardingPoint = document.getElementById('boardingSelect')?.value || 'Gongabu New Bus Park';
      const totalAmount = selectedSeatNumbers.length * activeTicketPrice;

      let pnrCode = 'DAB-' + Math.floor(100000 + Math.random() * 900000);

      // Attempt to save booking to backend API
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passengerName,
            phone: passengerPhone,
            route: activeRouteTitle,
            boardingPoint,
            seats: selectedSeatNumbers,
            totalAmount
          })
        });
        const result = await res.json();
        if (result.success && result.booking) {
          pnrCode = result.booking.pnr;
        }
      } catch (err) {
        console.log('Saved booking locally in browser.');
      }

      // Populate Ticket Modal
      document.getElementById('ticketPassengerName').textContent = passengerName;
      document.getElementById('ticketSeats').textContent = selectedSeatNumbers.join(', ');
      document.getElementById('ticketBoarding').textContent = boardingPoint;
      document.getElementById('ticketPNR').textContent = pnrCode;
      document.getElementById('ticketTotal').textContent = `${window.siteCurrency || 'NPR'} ${totalAmount.toLocaleString()}`;

      closeBookingModal();
      if (ticketModal) ticketModal.classList.add('active');
    });
  }

  // Simulated Live GPS Bus Progress Animation
  const liveProgressFill = document.getElementById('liveProgressFill');
  const liveBusPin = document.getElementById('liveBusPin');
  let currentProgress = 58;

  setInterval(() => {
    currentProgress += 0.5;
    if (currentProgress > 95) currentProgress = 15;

    if (liveProgressFill) liveProgressFill.style.width = `${currentProgress}%`;
    if (liveBusPin) liveBusPin.style.left = `${currentProgress}%`;
  }, 3000);

  // Initialize Scroll-driven Reveal Animations
  function setupScrollAnimations() {
    const reveals = document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale');
    
    // Auto-tag major layout elements if not already tagged
    if (reveals.length === 0 || reveals.length < 5) {
      const headings = document.querySelectorAll('section h2, section p.max-w-2xl, #routes h2, #routes p');
      const cards = document.querySelectorAll('section .grid > div, #routesGrid > div, .booking-widget, .fleet-card, .tab-btn');
      
      headings.forEach((el, index) => {
        el.classList.add('scroll-reveal');
        el.classList.add('reveal-delay-1');
      });
      
      cards.forEach((el, index) => {
        el.classList.add('scroll-reveal-scale');
        const delayClass = `reveal-delay-${(index % 4) + 1}`;
        el.classList.add(delayClass);
      });
    }

    const observerOptions = {
      threshold: 0.05,
      rootMargin: '0px 0px -40px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const allReveals = document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale');
    allReveals.forEach(el => {
      revealObserver.observe(el);
    });
  }

  setupScrollAnimations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

