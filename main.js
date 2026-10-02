/* =============================================================================
   DIAMOND AIRBUS — MAIN PAGE INTERACTIVE LOGIC
   Extracted from index.html for clean code organization
   Main website interactions: scroll animations, seat selection, booking flow,
   route loading, fleet carousel, ticket tracker, modals, payment status SSE.
   ============================================================================= */
function initMainPage() {
  // 1. Intersection Observer for Scroll Animations
      const revealElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left, .scroll-reveal-right');

      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-revealed');
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      });

      revealElements.forEach(el => revealObserver.observe(el));

      // 2. Navbar shrink, blur, and flexible auto-hide on scroll
      let lastScrollY = window.scrollY;
      const nav = document.querySelector('nav');
      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Add nav-scrolled when scrolled past 40px
        if (currentScrollY > 40) {
          nav.classList.add('nav-scrolled');
        } else {
          nav.classList.remove('nav-scrolled');
        }

        // Flexible Auto-hide behavior:
        // Hide navbar only when scrolling down past 150px
        if (currentScrollY > lastScrollY && currentScrollY > 150) {
          nav.classList.add('nav-hidden');
          // Automatically hide mobile menu when scrolling down
          const mobileMenu = document.getElementById('mobile-menu');
          if (mobileMenu) {
            mobileMenu.classList.add('hidden');
          }
        } else if (currentScrollY < lastScrollY) {
          // Show navbar when scrolling up
          nav.classList.remove('nav-hidden');
        }

        lastScrollY = currentScrollY;
      });

      // 2b. Dynamic Active Navigation Link Highlighting on Scroll
      const pageSections = document.querySelectorAll('section, footer');
      const pageNavLinks = document.querySelectorAll('.nav-link');

      function updateActiveHeaderNav() {
        let currentId = '';
        const scrollPos = window.scrollY + 180;

        pageSections.forEach(section => {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          if (section.id && scrollPos >= top && scrollPos < top + height) {
            currentId = section.id;
          }
        });

        pageNavLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${currentId}`) {
            link.classList.add('text-brand-600', 'font-bold', 'border-brand-600');
            link.classList.remove('text-slate-600', 'border-transparent');
          } else {
            link.classList.remove('text-brand-600', 'border-brand-600');
            link.classList.add('text-slate-600', 'border-transparent');
          }
        });

        // Also update mobile nav links
        const mobileLinks = document.querySelectorAll('.mobile-nav-link');
        mobileLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${currentId}`) {
            link.classList.add('text-brand-600', 'font-bold');
            link.classList.remove('text-slate-700');
          } else {
            link.classList.remove('text-brand-600', 'font-bold');
            link.classList.add('text-slate-700');
          }
        });
      }

      window.addEventListener('scroll', updateActiveHeaderNav, { passive: true });
      updateActiveHeaderNav();

      // 3. Click Ripple Animation on Buttons
      document.querySelectorAll('button, a').forEach(btn => {
        btn.addEventListener('click', function (e) {
          const circle = document.createElement('span');
          const diameter = Math.max(this.clientWidth, this.clientHeight);
          const radius = diameter / 2;

          const rect = this.getBoundingClientRect();
          circle.style.width = circle.style.height = `${diameter}px`;
          circle.style.left = `${e.clientX - rect.left - radius}px`;
          circle.style.top = `${e.clientY - rect.top - radius}px`;
          circle.classList.add('ripple-wave');

          const ripple = this.getElementsByClassName('ripple-wave')[0];
          if (ripple) ripple.remove();

          this.appendChild(circle);
        });
      });

      // 4. Seat Selection Pop & Click Feedback
      document.querySelectorAll('.seat-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          this.classList.toggle('bg-primary-container');
          this.classList.toggle('text-on-primary-container');

          // Trigger pop animation
          this.classList.remove('seat-pop');
          void this.offsetWidth; // Force reflow
          this.classList.add('seat-pop');
        });
      });

      // 5. Fleet Category Tab Click Animation
      document.querySelectorAll('.fleet-tab-btn').forEach(tab => {
        tab.addEventListener('click', function () {
          document.querySelectorAll('.fleet-tab-btn').forEach(t => {
            t.classList.remove('text-primary', 'border-b-[3px]', 'border-primary', 'pb-[17px]', '-mb-[19px]');
            t.classList.add('text-on-surface-variant');
          });
          this.classList.add('text-primary', 'border-b-[3px]', 'border-primary', 'pb-[17px]', '-mb-[19px]');

          // Trigger smooth slider reload transition
          rotateFleet(0);
        });
      });

      // 6. Animated Count-Up for Safety & Reliability Stats
      const statElements = document.querySelectorAll('.stat-counter');
      let statsAnimated = false;

      const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !statsAnimated) {
            statsAnimated = true;
            statElements.forEach(counter => {
              const targetStr = counter.getAttribute('data-target');
              if (!targetStr) return;

              const target = parseFloat(targetStr);
              const suffix = counter.getAttribute('data-suffix') || '';
              const decimals = parseInt(counter.getAttribute('data-decimals') || '0');
              const formatComma = counter.getAttribute('data-format') === 'comma';

              if (isNaN(target)) return;

              const duration = 2000;
              const startTime = performance.now();

              function updateCounter(currentTime) {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);

                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentVal = target * easeProgress;

                let formattedVal = currentVal.toFixed(decimals);
                if (formatComma) {
                  formattedVal = Math.floor(currentVal).toLocaleString();
                }

                counter.textContent = `${formattedVal}${suffix}`;

                if (progress < 1) {
                  requestAnimationFrame(updateCounter);
                }
              }

              requestAnimationFrame(updateCounter);
            });
          }
        });
      }, { threshold: 0.25 });

      const experienceSection = document.getElementById('experience');
      if (experienceSection) {
        statsObserver.observe(experienceSection);
      }

    window.busImages = [
      "hero-bus-4k.jpg",
      "bus-photo2.jpg",
      "diamond-pink-bus-2.jpg",
      "diamond-pink-bus-3.jpg"
    ];

    // =========================================================================
    // IMAGE 2 REDESIGN: PREMIUM ROUTES SLIDER CONTROLLER
    // =========================================================================
    window.currentRouteSlide = 0;
    window.allRoutesData = [];

    function updateRoutesPagination(idx, total) {
      const dotsContainer = document.getElementById('routesDots');
      const counterEl = document.getElementById('routesCounter');
      if (counterEl) {
        const cur = String(idx + 1).padStart(2, '0');
        const tot = String(total).padStart(2, '0');
        counterEl.textContent = `${cur} / ${tot}`;
      }
      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < total; i++) {
          const dot = document.createElement('span');
          if (i === idx) {
            dot.className = 'w-12 h-1 bg-amber-400 rounded-full transition-all duration-300 cursor-pointer';
          } else {
            dot.className = 'w-6 h-1 bg-slate-200 hover:bg-slate-300 rounded-full transition-all duration-300 cursor-pointer';
          }
          dot.onclick = () => {
            window.currentRouteSlide = i;
            const track = document.getElementById('routesSliderTrack');
            if (track && track.children.length > 0) {
              const slideWidth = track.children[0].offsetWidth;
              track.style.transform = `translateX(-${i * (slideWidth + 24)}px)`;
            }
            updateRoutesPagination(i, total);
          };
          dotsContainer.appendChild(dot);
        }
      }
    }

    window.slideRoutes = function (dir) {
      const track = document.getElementById('routesSliderTrack');
      if (!track) return;
      const slides = track.children;
      if (!slides || slides.length === 0) return;

      const total = slides.length;
      window.currentRouteSlide = (window.currentRouteSlide + dir + total) % total;

      const firstSlide = slides[0];
      const slideWidth = firstSlide.offsetWidth;
      const gap = 24; // 24px gap between cards
      const offset = window.currentRouteSlide * (slideWidth + gap);

      track.style.transform = `translateX(-${offset}px)`;
      updateRoutesPagination(window.currentRouteSlide, total);
    };

    window.addEventListener('resize', () => {
      const track = document.getElementById('routesSliderTrack');
      if (track && track.children.length > 0) {
        const slideWidth = track.children[0].offsetWidth;
        const gap = 24;
        track.style.transform = `translateX(-${window.currentRouteSlide * (slideWidth + gap)}px)`;
      }
    });

    window.renderRoutesSlider = function (routesList) {
      if (!routesList || !Array.isArray(routesList) || routesList.length === 0) return;
      window.allRoutesData = routesList;
      const track = document.getElementById('routesSliderTrack');
      if (!track) return;

      track.innerHTML = '';
      routesList.forEach((rt, i) => {
        const bannerImg = rt.image || (i === 0 ? 'banner-kakadvitta.png' : (i === 1 ? 'banner-sautha.png' : (i === 2 ? 'slider-banner-1.png' : 'slider-banner-2.png')));
        const depTime = rt.departureTime || (i === 0 ? '08:30 PM' : '04:00 PM');
        const arrTime = rt.arrivalTime || (i === 0 ? '06:30 AM' : '05:30 AM');
        const serviceType = rt.serviceType || 'EXPRESS NIGHT SERVICE';
        const price = rt.price || 2200;

        const slide = document.createElement('div');
        slide.className = 'w-[88%] sm:w-[86%] md:w-[84%] lg:w-[85%] shrink-0 bg-white rounded-3xl sm:rounded-[32px] border border-slate-200/90 shadow-xl overflow-hidden group';
        slide.innerHTML = `
          <div class="relative h-60 sm:h-72 md:h-84 lg:h-96 w-full overflow-hidden bg-slate-900">
            <img src="${bannerImg}" alt="${rt.from} to ${rt.to}" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
            <div class="absolute top-4 sm:top-5 left-4 sm:left-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b1f48]/90 text-white text-[11px] sm:text-xs font-black tracking-wide uppercase backdrop-blur-md shadow-lg border border-white/10">
              <span class="material-symbols-outlined text-sm text-blue-200">${serviceType.includes('DAY') ? 'wb_sunny' : 'bedtime'}</span>
              <span>${serviceType}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 items-center p-5 sm:p-7 gap-5 sm:gap-6 bg-white">
            <div class="lg:col-span-5 flex items-center justify-between gap-3 sm:gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 text-base sm:text-lg font-black text-[#08173d] truncate">
                  <svg class="w-4 h-4 text-brand-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                  <span class="truncate">${rt.from}</span>
                </div>
                <div class="text-xs text-slate-500 font-medium pl-5 sm:pl-6">
                  Departure <span class="font-bold text-slate-800">${depTime}</span>
                </div>
              </div>

              <div class="flex-1 flex items-center justify-center px-1 sm:px-2">
                <div class="w-full flex items-center relative">
                  <div class="h-[1.5px] bg-slate-300 w-full"></div>
                  <div class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded-full border border-slate-200 text-brand-600 flex items-center shadow-xs">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>
                  </div>
                  <div class="w-1.5 h-1.5 border-t-[1.5px] border-r-[1.5px] border-slate-400 rotate-45 ml-auto -mr-1"></div>
                </div>
              </div>

              <div class="text-right min-w-0">
                <div class="flex items-center justify-end gap-1.5 text-base sm:text-lg font-black text-[#08173d] truncate">
                  <svg class="w-4 h-4 text-brand-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                  <span class="truncate">${rt.to}</span>
                </div>
                <div class="text-xs text-slate-500 font-medium pr-1">
                  Arrival <span class="font-bold text-slate-800">${arrTime}</span>
                </div>
              </div>
            </div>

            <div class="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-center gap-2">
              <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
                <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20m10-10H2m15.07-7.07l-14.14 14.14m0-14.14l14.14 14.14"/></svg>
                <span>AC Facility</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
                <svg class="w-4 h-4 text-brand-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18v3h3v-3h10v3h3v-3h1a1 1 0 001-1v-5a3 3 0 00-3-3h-1V6a3 3 0 00-3-3H9a3 3 0 00-3 3v3H5a3 3 0 00-3 3v5a1 1 0 001 1h1zm4-12a1 1 0 011-1h6a1 1 0 011 1v3H8V6z"/></svg>
                <span>Luxury Seats</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
                <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                <span>Night Service</span>
              </div>
            </div>

            <div class="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6 flex items-center justify-between gap-4">
              <div>
                <span class="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block">FARE FROM</span>
                <span class="text-xl sm:text-2xl font-black text-[#08173d]">NPR ${price.toLocaleString()}</span>
              </div>
              <button onclick="window.openBookingSection('${rt.from}', '${rt.to}')" class="px-6 sm:px-7 py-3 sm:py-3.5 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black rounded-full text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer">
                <span>BOOK YOUR SEAT</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>
        `;
        track.appendChild(slide);
      });

      window.currentRouteSlide = 0;
      track.style.transform = 'translateX(0px)';
      updateRoutesPagination(0, routesList.length);
    };

    // =========================================================================
    // IMAGE 2 REDESIGN: MEET OUR FLEET SHOWCASE CONTROLLER
    // =========================================================================
    window.currentFleetIndex = 0;
    window.allFleetData = [];

    function extractBusRoute(bus) {
      let origin = 'Kathmandu';
      let dest = bus.destination || 'Kakadbhitta';
      if (bus.assignedRoute) {
        const cleaned = bus.assignedRoute.replace('⇄', '->').replace('➔', '->').replace('–', '->').replace('-', '->');
        const parts = cleaned.split('->');
        if (parts.length >= 2) {
          origin = parts[0].trim();
          dest = parts[1].trim();
        }
      }
      return { origin, dest };
    }

    window.renderFleetShowcase = function (fleetList, startIdx = 0) {
      if (!fleetList || !Array.isArray(fleetList) || fleetList.length === 0) return;
      window.allFleetData = fleetList;
      const total = fleetList.length;
      const heroIdx = ((startIdx % total) + total) % total;
      const compIdx = (heroIdx + 1) % total;

      const heroBus = fleetList[heroIdx];
      const compBus = fleetList[compIdx];

      const heroRoute = extractBusRoute(heroBus);
      const compRoute = extractBusRoute(compBus);

      // Hero Elements
      const heroImg = document.getElementById('fleetHeroImg');
      const heroBadge = document.getElementById('fleetHeroBadge');
      const heroTitle = document.getElementById('fleetHeroTitle');
      const heroSubtitle = document.getElementById('fleetHeroSubtitle');
      const heroBtn = document.getElementById('fleetHeroBtn');

      if (heroImg) heroImg.src = heroBus.image || 'diamond-pink-bus-1.jpg';
      if (heroBadge) heroBadge.textContent = heroBus.category || 'VIP SOFA & SLEEPER';
      if (heroTitle) heroTitle.textContent = heroBus.name || 'Diamond VIP Airbus';
      if (heroSubtitle) heroSubtitle.textContent = heroBus.destination || heroRoute.dest;
      if (heroBtn) {
        heroBtn.onclick = () => window.openBookingSection(heroRoute.origin, heroRoute.dest);
      }

      // Companion Elements
      const compImg = document.getElementById('fleetCompImg');
      const compTitle = document.getElementById('fleetCompTitle');
      const compSubtitle = document.getElementById('fleetCompSubtitle');
      const compBtn = document.getElementById('fleetCompBtn');

      if (compImg) compImg.src = compBus.image || 'bus-photo2.jpg';
      if (compTitle) compTitle.textContent = compBus.name || 'Diamond Deluxe Airbus #4';
      if (compSubtitle) compSubtitle.textContent = compBus.assignedRoute || `${compRoute.origin} – ${compRoute.dest}`;
      if (compBtn) {
        compBtn.onclick = () => window.openBookingSection(compRoute.origin, compRoute.dest);
      }
    };

    window.slideFleet = function (dir) {
      const fleetList = (window.allFleetData && window.allFleetData.length >= 2) ? window.allFleetData : [
        {
          id: "bus-vip-1",
          name: "Diamond VIP Airbus",
          category: "VIP SOFA & SLEEPER",
          image: "diamond-pink-bus-1.jpg",
          destination: "Kakadbhitta",
          assignedRoute: "Kathmandu -> Kakadbhitta"
        },
        {
          id: "bus-deluxe-4",
          name: "Diamond Deluxe Airbus #4",
          category: "VIP 2x1 Sofa",
          image: "bus-photo2.jpg",
          destination: "Kathmandu – Kakadbhitta",
          assignedRoute: "Kathmandu – Kakadbhitta"
        },
        {
          id: "bus-pink-2",
          name: "Diamond Super Executive",
          category: "VIP 2x2 AIR SUSPENSION",
          image: "diamond-pink-bus-2.jpg",
          destination: "Sautha",
          assignedRoute: "Kathmandu -> Sautha"
        },
        {
          id: "bus-pink-3",
          name: "Diamond Royal Coach",
          category: "SUPER VIP SLEEPER",
          image: "diamond-pink-bus-3.jpg",
          destination: "Biratnagar",
          assignedRoute: "Kathmandu -> Biratnagar"
        }
      ];

      const total = fleetList.length;
      window.currentFleetIndex = ((window.currentFleetIndex + dir) % total + total) % total;

      const showcase = document.getElementById('fleetShowcaseWrapper');
      if (showcase) {
        showcase.classList.add('opacity-40', 'scale-[0.99]', 'transition-all', 'duration-200');
        setTimeout(() => {
          window.renderFleetShowcase(fleetList, window.currentFleetIndex);
          showcase.classList.remove('opacity-40', 'scale-[0.99]');
        }, 180);
      } else {
        window.renderFleetShowcase(fleetList, window.currentFleetIndex);
      }
    };

    // Backward compatibility aliases
    window.scrollRoutesContainer = window.slideRoutes;

    // Dynamic Vice-Versa Route Direction Swap Handler
    function swapRouteDirection(cardNum) {
      const fromEl = document.getElementById(`route-from-${cardNum}`);
      const toEl = document.getElementById(`route-to-${cardNum}`);
      const btnEl = document.getElementById(`route-btn-${cardNum}`);
      const imgEl = document.getElementById(`route-img-${cardNum}`);
      const swapIcon = document.getElementById(`swap-icon-${cardNum}`);

      if (swapIcon) {
        swapIcon.classList.add('rotate-180');
        setTimeout(() => swapIcon.classList.remove('rotate-180'), 300);
      }

      if (fromEl && toEl) {
        const temp = fromEl.textContent;
        fromEl.textContent = toEl.textContent;
        toEl.textContent = temp;

        const newFrom = fromEl.textContent.trim();
        const newTo = toEl.textContent.trim();

        if (btnEl) {
          btnEl.setAttribute('onclick', `window.openBookingSection('${newFrom}', '${newTo}'); return false;`);
        }

        // Dynamic Image Swap when destination changes
        if (imgEl) {
          if (!imgEl.dataset.outboundImage) {
            imgEl.dataset.outboundImage = imgEl.src;
          }

          const outboundImg = imgEl.dataset.outboundImage;
          const inboundImg = 'dest-kathmandu.png';

          imgEl.classList.add('opacity-30', 'scale-105');
          setTimeout(() => {
            if (newTo.toLowerCase().includes('kathmandu')) {
              imgEl.src = inboundImg;
            } else {
              imgEl.src = outboundImg;
            }
            imgEl.classList.remove('opacity-30', 'scale-105');
          }, 150);
        }
      }
    }

    let selectedSeats = [];
    let currentTicketPrice = 2500;

    function selectRoute(origin = 'Kathmandu', destination = 'Kakarvitta') {
      openBookingSection(origin, destination);
    }

    function updateBookingBusImage(origin, destination) {
      const busImg = document.getElementById('booking-bus-image');
      const busBadge = document.getElementById('booking-bus-badge');

      if (!busImg) return;

      const destLower = (destination || '').toLowerCase();
      const origLower = (origin || '').toLowerCase();

      let targetImg = 'diamond-pink-bus-1.jpg';
      let targetBadge = 'Diamond VIP Airbus Kakadvitta • (A/C) VIP 2x2 Sofa sleeper';

      // 1. Get Fleet vehicles configured in Admin Panel
      let fleet = [];
      try {
        const siteContent = window.currentSiteContent || JSON.parse(localStorage.getItem('diamond_site_content') || '{}');
        if (siteContent.fleet && Array.isArray(siteContent.fleet)) {
          fleet = siteContent.fleet;
        }
      } catch (e) { }

      // 2. Find bus in Admin Fleet matching target destination or non-Kathmandu origin
      const nonKtmTarget = (destLower && destLower !== 'kathmandu' ? destLower : origLower).replace(/[^a-z]/g, '');
      const searchKey = nonKtmTarget.substring(0, 4); // e.g. "saut", "bira", "kaka"

      let assignedBus = fleet.find(b => {
        if (!b.assignedRoute || b.assignedRoute === 'All Routes') return false;
        const ar = b.assignedRoute.toLowerCase().replace(/[^a-z]/g, '');
        return ar.includes(searchKey);
      });

      // 3. Fallback: match by bus name in Fleet section
      if (!assignedBus) {
        assignedBus = fleet.find(b => {
          const nameLower = (b.name || '').toLowerCase().replace(/[^a-z]/g, '');
          return nameLower.includes(searchKey);
        });
      }

      if (assignedBus && assignedBus.image) {
        targetImg = assignedBus.image;
        targetBadge = `${assignedBus.name} • ${assignedBus.category || 'VIP Airbus'}`;
      } else {
        // Default fleet vehicle fallbacks
        if (destLower.includes('biratnagar') || origLower.includes('biratnagar')) {
          targetImg = 'bus-biratnagar.jpg';
          targetBadge = 'Diamond VIP Airbus Biratnagar • (A/C) VIP 2x2 Sofa sleeper';
        } else if (destLower.includes('sautha') || origLower.includes('sautha')) {
          targetImg = 'diamond-pink-cutout-2.png';
          targetBadge = 'Diamond VIP Airbus Sautha • (A/C) VIP 2x2 Sofa sleeper';
        } else {
          targetImg = 'diamond-pink-bus-1.jpg';
          targetBadge = 'Diamond VIP Airbus Kakadvitta • (A/C) VIP 2x2 Sofa sleeper';
        }
      }

      // Smooth fade transition
      busImg.classList.add('opacity-30', 'scale-105');
      setTimeout(() => {
        busImg.src = targetImg;
        if (busBadge) busBadge.textContent = targetBadge;
        busImg.classList.remove('opacity-30', 'scale-105');
      }, 150);
    }

    function onRouteDropdownChange(val) {
      const parts = val.split('|');
      if (parts.length >= 4) {
        const origin = parts[0];
        const destination = parts[1];
        const price = parseInt(parts[2]);
        const depTime = parts[3];

        currentTicketPrice = price;

        const summaryOrigin = document.getElementById('summary-origin');
        const summaryDest = document.getElementById('summary-destination');
        const summaryDate = document.getElementById('summary-date');
        const confirmDepTime = document.getElementById('confirm-dep-time');

        if (summaryOrigin) summaryOrigin.textContent = origin;
        if (summaryDest) summaryDest.textContent = destination;
        if (confirmDepTime) confirmDepTime.textContent = depTime;

        // Update new header elements
        const headerRoute = document.getElementById('header-route-text');
        const headerTime = document.getElementById('header-time-text');
        const busCardRoute = document.getElementById('bus-card-route');
        const busCardDepTime = document.getElementById('bus-card-dep-time');
        if (headerRoute) headerRoute.textContent = `${origin} → ${destination}`;
        if (headerTime) headerTime.textContent = depTime;
        if (busCardRoute) busCardRoute.textContent = `${origin} → ${destination}`;
        if (busCardDepTime) busCardDepTime.textContent = depTime;

        updateBookingBusImage(origin, destination);
        updateSeatSummary();
        updatePickupLocationField(origin);
        updateDropoffLocationField(destination);
        if (typeof resetPaymentSection === 'function') {
          resetPaymentSection();
        }
      }
    }

    function openBookingSection(origin = 'Kathmandu', destination = 'Kakarvitta') {
      const bookingSection = document.getElementById('booking-section');
      if (bookingSection) {
        bookingSection.classList.remove('hidden');
        bookingSection.style.display = 'block';
        bookingSection.style.opacity = '1';
        document.body.style.overflow = '';
        try {
          bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
        const top = bookingSection.getBoundingClientRect().top + window.pageYOffset - 75;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }

      // Set fare & departure time depending on route
      const destLower = destination.toLowerCase();
      const origLower = origin.toLowerCase();
      let depTime = '04:30 PM';

      let configuredRoute = null;
      try {
        const siteContent = window.currentSiteContent || window.siteContentData || JSON.parse(localStorage.getItem('diamond_site_content') || '{}');
        if (siteContent.routes && Array.isArray(siteContent.routes)) {
          const searchOrig = origLower.substring(0, 4);
          const searchDest = destLower.substring(0, 4);
          configuredRoute = siteContent.routes.find(r =>
            (r.from || '').toLowerCase().includes(searchOrig) &&
            (r.to || '').toLowerCase().includes(searchDest)
          );
        }
      } catch (e) { }

      if (configuredRoute) {
        currentTicketPrice = configuredRoute.price || 2200;
        depTime = configuredRoute.departureTime || '04:30 PM';
      } else {
        if (destLower.includes('biratnagar') || origLower.includes('biratnagar')) {
          currentTicketPrice = 1950;
          depTime = '05:00 PM';
        } else if (destLower.includes('sautha') || origLower.includes('sautha')) {
          currentTicketPrice = 2100;
          depTime = '04:15 PM';
        } else {
          currentTicketPrice = 2200;
          depTime = '04:30 PM';
        }
      }

      const dropdown = document.getElementById('routeSelectDropdown');
      if (dropdown) {
        const targetOpt = Array.from(dropdown.options).find(opt => {
          const parts = opt.value.split('|');
          return parts[0].toLowerCase().includes(origLower.substring(0, 4)) &&
            parts[1].toLowerCase().includes(destLower.substring(0, 4));
        });
        if (targetOpt) {
          dropdown.value = targetOpt.value;
        }
      }

      const summaryOrigin = document.getElementById('summary-origin');
      const summaryDest = document.getElementById('summary-destination');
      const summaryDate = document.getElementById('summary-date');
      const confirmDepTime = document.getElementById('confirm-dep-time');

      if (summaryOrigin) summaryOrigin.textContent = origin;
      if (summaryDest) summaryDest.textContent = destination;
      if (summaryDate) summaryDate.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      if (confirmDepTime) confirmDepTime.textContent = depTime;

      // Update new header elements
      const modalReserveTitle = document.getElementById('modal-reserve-title');
      if (modalReserveTitle) modalReserveTitle.textContent = `${origin} ➔ ${destination}`;

      const headerRoute = document.getElementById('header-route-text');
      const headerTime = document.getElementById('header-time-text');
      const busCardRoute = document.getElementById('bus-card-route');
      const busCardDepTime = document.getElementById('bus-card-dep-time');
      if (headerRoute) headerRoute.textContent = `${origin} → ${destination}`;
      if (headerTime) headerTime.textContent = depTime;
      if (busCardRoute) busCardRoute.textContent = `${origin} → ${destination}`;
      if (busCardDepTime) busCardDepTime.textContent = depTime;

      const currentRouteId = getRouteIdFromNames(origin, destination);
      updateWebsiteSeatMapForSelectedRoute(currentRouteId, true);
      updatePickupLocationField(origin);
      updateDropoffLocationField(destination);
      if (typeof resetPaymentSection === 'function') {
        resetPaymentSection();
      }
    }
    window.openBookingSection = openBookingSection;

    function closeBookingSection() {
      const routesSection = document.getElementById('routes') || document.getElementById('home');
      if (routesSection) {
        routesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    window.closeBookingSection = closeBookingSection;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const bookingSection = document.getElementById('booking-section');
        if (bookingSection && !bookingSection.classList.contains('hidden')) {
          closeBookingSection();
        }
      }
    });

    function backFromCheckoutToSeats() {
      const checkoutForm = document.getElementById('checkout-form-step');
      if (checkoutForm) {
        checkoutForm.classList.add('hidden');
        checkoutForm.style.display = 'none';
      }
      const ctaButtons = document.querySelectorAll('button[onclick*="proceedToCheckout"], #btn-proceed-checkout');
      ctaButtons.forEach(btn => {
        btn.style.display = 'flex';
      });
      const seatCard = document.getElementById('seat-selection-card') || document.getElementById('booking-section');
      if (seatCard) {
        seatCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function renderSeatBtnHtml(seatCode, occupiedSeats, sleeperSeats, isClickable = true, price = 2225, customSeatNames = {}) {
      const codeStr = String(seatCode || '');
      let displayCode = (customSeatNames && customSeatNames[codeStr]) ? customSeatNames[codeStr] : codeStr;
      if (typeof displayCode === 'string' && displayCode.toLowerCase().startsWith('sleeper')) {
        displayCode = displayCode.replace(/sleeper\s*/i, 'SL-');
      }

      const isOcc = Array.isArray(occupiedSeats) && (
        occupiedSeats.some(s => String(s).toLowerCase() === codeStr.toLowerCase() || String(s).toLowerCase() === String(displayCode).toLowerCase())
      );
      const isSleeper = (Array.isArray(sleeperSeats) && sleeperSeats.some(s => String(s).toLowerCase() === codeStr.toLowerCase() || String(s).toLowerCase() === String(displayCode).toLowerCase())) || 
                        codeStr.toLowerCase().includes('sleeper') || 
                        String(displayCode).toLowerCase().includes('sleeper') || 
                        codeStr.startsWith('SL-') || 
                        String(displayCode).startsWith('SL-');
      const isSelected = selectedSeats.some(s => String(s).toLowerCase() === codeStr.toLowerCase() || String(s).toLowerCase() === String(displayCode).toLowerCase());
      const selectClass = isSelected ? 'seat-selected' : '';

      if (isOcc) {
        if (isSleeper) {
          return `<button class="w-[46px] h-[48px] rounded-xl font-bold text-[9px] cursor-not-allowed flex flex-col items-center justify-center leading-none p-1 select-none opacity-40 bg-[#1e293b] border border-slate-700 text-slate-500" disabled>
            <span class="font-mono text-[9.5px] font-bold text-slate-400">${displayCode}</span>
            <span class="text-[8px] font-medium text-slate-500 mt-0.5">Sleep</span>
          </button>`;
        }
        return `<button class="w-[42px] h-[46px] rounded-xl font-medium text-[10px] cursor-not-allowed flex flex-col items-center justify-center leading-none p-0.5 select-none opacity-40 bg-[#1e293b] border border-slate-700 text-slate-500" disabled>
          <span class="font-mono font-bold text-[11px] text-slate-400">${displayCode}</span>
          <span class="text-[8px] font-medium text-slate-500 mt-0.5">₹</span>
        </button>`;
      }

      if (isSleeper) {
        const sleeperStyle = isSelected 
          ? 'background:#2563eb;border:2px solid #60a5fa;color:#ffffff;box-shadow:0 0 14px rgba(37,99,235,0.7);transform:scale(1.05);' 
          : 'background:#1a103c;border:1.5px solid #7c3aed;color:#c084fc;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
        return `<button type="button" onclick="window.toggleSeat && window.toggleSeat(this, '${codeStr}')" class="seat-btn seat-sleeper ${selectClass} w-[46px] h-[48px] rounded-xl font-bold text-xs transition-all duration-200 flex flex-col items-center justify-center leading-none p-1 hover:scale-105 active:scale-95 shadow-sm cursor-pointer" style="${sleeperStyle}">
          <span class="font-mono pointer-events-none text-[10px] font-extrabold">${displayCode}</span>
          <span class="text-[8px] pointer-events-none font-semibold mt-0.5 opacity-90">Sleep</span>
        </button>`;
      }

      const regularStyle = isSelected 
        ? 'background:#2563eb;border:2px solid #60a5fa;color:#ffffff;box-shadow:0 0 14px rgba(37,99,235,0.7);transform:scale(1.05);' 
        : 'background:#0f172a;border:1.5px solid #10b981;color:#34d399;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
      return `<button type="button" onclick="window.toggleSeat && window.toggleSeat(this, '${codeStr}')" class="seat-btn ${selectClass} w-[42px] h-[46px] rounded-xl font-extrabold text-xs transition-all duration-200 flex flex-col items-center justify-center leading-none p-0.5 hover:scale-105 active:scale-95 shadow-sm cursor-pointer" style="${regularStyle}">
        <span class="font-mono pointer-events-none text-[11px] font-bold">${displayCode}</span>
        <span class="text-[8.5px] pointer-events-none font-semibold mt-0.5 opacity-80">₹</span>
      </button>`;
    }

    function renderDynamicWebsiteSeatMap(seatLayout, forceRender = false) {
      const container = document.getElementById('dynamic-seat-map-grid');
      if (!container) return;

      const sl = seatLayout || { type: 'customMatrix', totalRows: 10, singleSeatFront: true, lastRowBench: true, sleeperSeats: ['SL-L1', 'SL-L2', 'SL-L3', 'SL-L4'], occupiedSeats: [] };
      const type = sl.type || 'customMatrix';
      const totalRows = sl.totalRows || 10;
      const hasLastRowBench = sl.lastRowBench !== false;
      const occupiedSeats = Array.isArray(sl.occupiedSeats) ? sl.occupiedSeats : [];
      const sleeperSeats = Array.isArray(sl.sleeperSeats) ? sl.sleeperSeats : ['SL-L1', 'SL-L2', 'SL-L3', 'SL-L4'];
      const customSeatNames = sl.customSeatNames || {};
      window.currentCustomSeatNames = customSeatNames;

      const layoutSpecEl = document.querySelector('#seat-selection-card .font-bold.text-\\[\\#003893\\]');
      if (layoutSpecEl) {
        layoutSpecEl.textContent = 'Diamond 33-Seat VIP Airbus (Nepali Luxury Layout)';
      }

      // Skip re-render during auto-poll if user already has seats selected.
      if (selectedSeats.length > 0 && !forceRender) return;

      container.innerHTML = '';
      selectedSeats = [];
      if (typeof updateSeatSummary === 'function') updateSeatSummary();

      // Top Door / Front and Steering Bar
      const topBar = document.createElement('div');
      topBar.className = 'w-full flex justify-between items-center px-2 pb-2.5 mb-1 text-[11px] font-black uppercase tracking-wider select-none border-b border-slate-700/60';
      topBar.innerHTML = `
        <span class="inline-flex items-center gap-1.5 text-amber-500 font-extrabold">
          <span class="inline-block w-2.5 h-3 bg-amber-500 rounded-xs"></span> DOOR / FRONT
        </span>
        <span class="inline-flex items-center gap-1.5 text-indigo-400 font-extrabold">
          STEERING <span class="material-symbols-outlined text-sm">sports_motorsports</span>
        </span>
      `;
      container.appendChild(topBar);

      // The exact 10 Bus Rows
      const BUS_ROWS = [
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

      BUS_ROWS.forEach(rowDef => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'w-full flex justify-between items-center py-0.5';

        if (rowDef.isBench) {
          rowDiv.innerHTML = `
            <div style="display:flex;gap:4px;align-items:center;">
              ${rowDef.left.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${rowDef.middle.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${rowDef.right.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
          `;
        } else if (rowDef.isSingleLeft) {
          rowDiv.innerHTML = `
            <div style="width:88px;display:flex;gap:4px;align-items:center;justify-content:flex-start;">
              ${rowDef.left.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
            <div style="width:88px;display:flex;gap:4px;align-items:center;justify-content:flex-end;">
              ${rowDef.right.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
          `;
        } else {
          rowDiv.innerHTML = `
            <div style="width:88px;display:flex;gap:4px;align-items:center;justify-content:flex-start;">
              ${rowDef.left.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
            <div style="width:88px;display:flex;gap:4px;align-items:center;justify-content:flex-end;">
              ${rowDef.right.map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
            </div>
          `;
        }

        container.appendChild(rowDiv);
      });

      // VIP Sleeper Berths / Upper Deck Header
      const sleeperHeader = document.createElement('div');
      sleeperHeader.className = 'w-full text-center text-[10.5px] font-extrabold text-purple-400 my-2 pt-2.5 border-t border-purple-500/30 flex items-center justify-center gap-1.5 uppercase tracking-wider';
      sleeperHeader.innerHTML = `<span class="material-symbols-outlined text-xs">bed</span> VIP SLEEPER BERTHS / UPPER DECK`;
      container.appendChild(sleeperHeader);

      // Sleeper Berths Row
      const sleeperRowDiv = document.createElement('div');
      sleeperRowDiv.className = 'w-full flex justify-between items-center py-0.5';
      sleeperRowDiv.innerHTML = `
        <div style="width:96px;display:flex;gap:4px;align-items:center;justify-content:flex-start;">
          ${['SL-L1', 'SL-L2'].map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
        </div>
        <div style="width:96px;display:flex;gap:4px;align-items:center;justify-content:flex-end;">
          ${['SL-L3', 'SL-L4'].map(s => renderSeatBtnHtml(s, occupiedSeats, sleeperSeats, true, 2225, customSeatNames)).join('')}
        </div>
      `;
      container.appendChild(sleeperRowDiv);
    }
    window.renderDynamicWebsiteSeatMap = renderDynamicWebsiteSeatMap;

    function getRouteIdFromNames(origin, destination) {
      const orig = (origin || '').toLowerCase().trim();
      const dest = (destination || '').toLowerCase().trim();

      try {
        const sc = window.currentSiteContent || window.siteContentData || JSON.parse(localStorage.getItem('diamond_site_content') || '{}');
        if (sc && sc.routes && Array.isArray(sc.routes)) {
          const match = sc.routes.find(r => 
            ((r.from || '').toLowerCase() === orig && (r.to || '').toLowerCase() === dest) ||
            ((r.to || '').toLowerCase() === orig && (r.from || '').toLowerCase() === dest) ||
            (orig && (r.from || '').toLowerCase().includes(orig.substring(0, 4)) && dest && (r.to || '').toLowerCase().includes(dest.substring(0, 4))) ||
            (dest && (r.from || '').toLowerCase().includes(dest.substring(0, 4)) && orig && (r.to || '').toLowerCase().includes(orig.substring(0, 4)))
          );
          if (match && match.id) return match.id;
        }
      } catch (e) {}

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
        if (rLower.includes('kakarbhitta') || rLower.includes('kakarvitta')) {
          return 'ktm-kakarbhitta';
        }
        if (rLower.includes('biratnagar')) {
          return 'ktm-biratnagar';
        }
        if (rLower.includes('sautha')) {
          return 'ktm-sautha';
        }
        return 'default';
      }
      return getRouteIdFromNames(origin, destination);
    }

    function getCanonicalRouteKey(routeStr) {
      if (!routeStr) return 'unknown';
      const r = String(routeStr).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (r.includes('birat')) return 'biratnagar';
      if (r.includes('sautha')) return 'sautha';
      if (r.includes('pokhara')) return 'pokhara';
      if (r.includes('nepalgunj')) return 'nepalgunj';
      if (r.includes('kakar') || r.includes('vitta') || r.includes('bhitta')) return 'kakarbhitta';
      return r;
    }

    function hasDeparturePassed(travelDateStr, travelTimeStr) {
      if (!travelDateStr || !travelTimeStr) return false;
      try {
        const [year, month, day] = travelDateStr.split('-').map(Number);
        let hours = 12;
        let minutes = 0;
        const timeMatch = travelTimeStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
        }
        if (travelTimeStr.toUpperCase().includes('PM') && hours < 12) {
          hours += 12;
        } else if (travelTimeStr.toUpperCase().includes('AM') && hours === 12) {
          hours = 0;
        }
        const departureDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();
        return now > departureDate;
      } catch (e) {
        return false;
      }
    }

    async function updateWebsiteSeatMapForSelectedRoute(routeId, forceRender = false) {
      if (!window.siteContentData) {
        try {
          const stored = localStorage.getItem('diamond_site_content');
          if (stored) window.siteContentData = JSON.parse(stored);
        } catch(e) {}
      }
      if (!window.siteContentData) {
        window.siteContentData = {
          routes: [
            { from: 'Kathmandu', to: 'Kakarvitta', price: 2200, departureTime: '04:30 PM' },
            { from: 'Kathmandu', to: 'Biratnagar', price: 2300, departureTime: '05:00 PM' },
            { from: 'Kathmandu', to: 'Sautha', price: 2300, departureTime: '04:15 PM' }
          ],
          seatLayoutsByRoute: {
            "ktm-kakarbhitta": {
              type: "customMatrix",
              totalRows: 10,
              lastRowBench: true,
              singleSeatFront: true,
              sleeperSeats: ["Sleeper L1", "Sleeper L2", "Sleeper L3", "Sleeper L4"],
              occupiedSeats: ["AA", "AC", "AD", "A1", "A2", "BJ1", "BJ2"]
            },
            "default": {
              type: "customMatrix",
              totalRows: 10,
              lastRowBench: true,
              singleSeatFront: true,
              sleeperSeats: ["Sleeper L1", "Sleeper L2", "Sleeper L3", "Sleeper L4"],
              occupiedSeats: ["AA", "AC", "AD", "A1", "A2", "BJ1", "BJ2"]
            }
          }
        };
      }

      const dropdown = document.getElementById('routeSelectDropdown');
      let currentOrigin = 'Kathmandu';
      let currentDest = 'Kakarvitta';
      if (dropdown && dropdown.value) {
        const parts = dropdown.value.split('|');
        if (parts[0]) currentOrigin = parts[0];
        if (parts[1]) currentDest = parts[1];
        if (!routeId && parts.length >= 2) {
          routeId = getRouteIdFromNames(parts[0], parts[1]);
        }
      }
      routeId = routeId || 'ktm-kakarbhitta';

      const sls = (window.siteContentData && window.siteContentData.seatLayoutsByRoute) || 
                  (window.currentSiteContent && window.currentSiteContent.seatLayoutsByRoute) || {};
      const fallbackMatrix = {
        type: "customMatrix",
        totalRows: 10,
        lastRowBench: true,
        singleSeatFront: true,
        sleeperSeats: ["Sleeper L1", "Sleeper L2", "Sleeper L3", "Sleeper L4"],
        occupiedSeats: []
      };
      const layout = sls[routeId] || sls['ktm-kakarbhitta'] || sls['default'] || (window.siteContentData && window.siteContentData.seatLayout) || fallbackMatrix;
      if (layout) {
        const clonedLayout = JSON.parse(JSON.stringify(layout));
        if (!clonedLayout.occupiedSeats) clonedLayout.occupiedSeats = [];

        try {
          const res = await fetch('/api/bookings?t=' + Date.now());
          if (res.ok) {
            const bookings = await res.json();
            const bookedSeats = [];
            const selectedDate = document.getElementById('pass-travel-date')?.value || new Date().toISOString().split('T')[0];
            bookings.forEach(b => {
              if (b.paymentStatus !== 'rejected') {
                const bCanon = getCanonicalRouteKey(b.route);
                const curCanon = getCanonicalRouteKey(currentDest);
                const matchesRoute = (bCanon === curCanon);
                if (matchesRoute && b.travelDate === selectedDate) {
                  const seats = Array.isArray(b.seats) ? b.seats : [b.seats];
                  bookedSeats.push(...seats);
                }
              }
            });

            const staticOccupied = Array.isArray(layout.occupiedSeats) ? layout.occupiedSeats : [];
            clonedLayout.occupiedSeats = Array.from(new Set([...staticOccupied, ...bookedSeats]));

            // If any of the user's currently selected seats just got booked by someone else on this exact route & date, auto-deselect it
            if (selectedSeats && selectedSeats.length > 0) {
              const conflicts = selectedSeats.filter(s => {
                const sAlias = (window.currentCustomSeatNames && window.currentCustomSeatNames[s]) || s;
                return bookedSeats.includes(s) || bookedSeats.includes(sAlias);
              });
              if (conflicts.length > 0) {
                selectedSeats = selectedSeats.filter(s => {
                  const sAlias = (window.currentCustomSeatNames && window.currentCustomSeatNames[s]) || s;
                  return !conflicts.includes(s) && !conflicts.includes(sAlias);
                });
                if (typeof updateSeatSummary === 'function') updateSeatSummary();
                alert(`⚠️ Notice: Seat(s) ${conflicts.join(', ')} were just booked by another user for this date and are no longer available.`);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load live bookings for seat layout:", e);
        }

        renderDynamicWebsiteSeatMap(clonedLayout, forceRender);
      }
    }
    window.updateWebsiteSeatMapForSelectedRoute = updateWebsiteSeatMapForSelectedRoute;

    // Auto-poll live seat bookings every 4 seconds to keep all users instantly in sync
    setInterval(() => {
      if (typeof updateWebsiteSeatMapForSelectedRoute === 'function') {
        updateWebsiteSeatMapForSelectedRoute();
      }
    }, 4000);

    // Broadcast Sync Listener for Admin Content Updates
    try {
      const syncChannel = new BroadcastChannel('diamond_content_sync');
      syncChannel.onmessage = (event) => {
        if (!event.data || event.data.type === 'UPDATE' || event.data.type === 'CONTENT_SYNC') {
          if (typeof window.loadDynamicContent === 'function') {
            window.loadDynamicContent();
          }
          fetch('/api/content?t=' + Date.now())
            .then(res => res.json())
            .then(data => {
              window.siteContentData = data;
              if (typeof updateWebsiteSeatMapForSelectedRoute === 'function') {
                updateWebsiteSeatMapForSelectedRoute();
              }
            }).catch(e => { });
        }
      };
    } catch (e) { }

    // Live Real-Time Sync with Counter & Admin Bookings
    try {
      const siteEvtSource = new EventSource('/api/admin/notifications');
      const refreshSiteSeats = () => {
        if (typeof updateWebsiteSeatMapForSelectedRoute === 'function') {
          updateWebsiteSeatMapForSelectedRoute();
        }
      };
      siteEvtSource.addEventListener('new_booking', refreshSiteSeats);
      siteEvtSource.addEventListener('payment_status_update', refreshSiteSeats);
      siteEvtSource.addEventListener('booking_updated', refreshSiteSeats);
      siteEvtSource.addEventListener('content_updated', () => {
        console.log('[LIVE SYNC] Received content_updated event from server push.');
        if (typeof window.loadDynamicContent === 'function') {
          window.loadDynamicContent();
        }
        if (typeof updateWebsiteSeatMapForSelectedRoute === 'function') {
          updateWebsiteSeatMapForSelectedRoute();
        }
      });
    } catch (e) { }

    // Auto-fetch & Render Seat Layout on Page Load
    function formatTravelDate(dateStr) {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const dObj1 = new Date(parts[0], parts[1] - 1, parts[2]);
          return dObj1.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }
        const dObj2 = new Date(dateStr);
        return dObj2.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    }

    function initWebsiteBooking() {
      openBookingSection('Kathmandu', 'Kakarvitta');

      // Initialize Travel Date input
      const dateInput = document.getElementById('pass-travel-date');
      if (dateInput) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        dateInput.min = today;
        const isPast430 = (now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() >= 30));
        const defaultDate = isPast430 
          ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
          : today;
        if (!dateInput.value) dateInput.value = defaultDate;

        const summaryDate = document.getElementById('summary-date');
        if (summaryDate) {
          summaryDate.textContent = formatTravelDate(dateInput.value || defaultDate);
        }

        dateInput.addEventListener('change', (e) => {
          const todayStr = new Date().toISOString().split('T')[0];
          dateInput.min = todayStr;

          if (e.target.value && e.target.value < todayStr) {
            alert(`❌ Cannot select a past departure date.\nTravel date reset to TODAY (${todayStr}).`);
            e.target.value = todayStr;
          }

          if (summaryDate) {
            summaryDate.textContent = formatTravelDate(e.target.value);
          }
          const headerDate = document.getElementById('header-date-text');
          if (headerDate) headerDate.textContent = formatTravelDate(e.target.value);
          // Refresh the seat map layout dynamically for the newly selected date
          updateWebsiteSeatMapForSelectedRoute(null, true);
        });
      }

      // Immediately render default seat layout so seat map is never blank
      renderDynamicWebsiteSeatMap({
        type: 'customMatrix',
        totalRows: 10,
        lastRowBench: true,
        singleSeatFront: true,
        sleeperSeats: ['Sleeper L1', 'Sleeper L2', 'Sleeper L3', 'Sleeper L4'],
        occupiedSeats: ['AA', 'AC', 'AD', 'A1', 'A2', 'BJ1', 'BJ2']
      }, true);

      fetch('/api/content?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
          window.siteContentData = data;
          updateWebsiteSeatMapForSelectedRoute();

          // Re-render pickup locations dropdown with newly fetched database options
          const dropdown = document.getElementById('routeSelectDropdown');
          if (dropdown && dropdown.value) {
            const parts = dropdown.value.split('|');
            if (parts.length >= 2) {
              updatePickupLocationField(parts[0]);
              updateDropoffLocationField(parts[1]);
            }
          }
        })
        .catch(() => {
          renderDynamicWebsiteSeatMap({
            type: 'customMatrix',
            totalRows: 10,
            lastRowBench: true,
            singleSeatFront: true,
            sleeperSeats: ['Sleeper L1', 'Sleeper L2', 'Sleeper L3', 'Sleeper L4'],
            occupiedSeats: ['AA', 'AC', 'AD', 'A1', 'A2', 'BJ1', 'BJ2']
          });
        });
    }

    initWebsiteBooking();
    window.initWebsiteBooking = initWebsiteBooking;

    function toggleSeat(btn, seatNo) {
      btn = (btn && btn.closest) ? (btn.closest('button') || btn) : btn;
      if (!btn || btn.disabled) return;

      const strSeatNo = String(seatNo);
      const index = selectedSeats.findIndex(s => String(s).toLowerCase() === strSeatNo.toLowerCase());
      const isSleeper = btn.classList.contains('seat-sleeper') || strSeatNo.startsWith('SL-') || strSeatNo.toLowerCase().includes('sleeper');
      const spans = btn.querySelectorAll('span');

      if (index > -1) {
        // Deselect seat
        selectedSeats.splice(index, 1);
        btn.removeAttribute('style');
        btn.classList.remove('seat-selected');

        if (isSleeper) {
          btn.style.cssText = 'background:#1a103c;border:1.5px solid #7c3aed;color:#c084fc;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
          if (spans[0]) spans[0].style.color = '#c084fc';
          if (spans[1]) spans[1].style.color = '#c084fc';
        } else {
          btn.style.cssText = 'background:#0f172a;border:1.5px solid #10b981;color:#34d399;box-shadow:0 2px 6px rgba(0,0,0,0.3);';
          if (spans[0]) spans[0].style.color = '#34d399';
          if (spans[1]) spans[1].style.color = '#34d399';
        }
      } else {
        // Select new seat
        selectedSeats.push(strSeatNo);
        btn.removeAttribute('style');
        btn.classList.add('seat-selected');

        btn.style.cssText = 'background:#2563eb;border:2px solid #60a5fa;color:#ffffff;box-shadow:0 0 14px rgba(37,99,235,0.7);transform:scale(1.05);';

        if (spans[0]) spans[0].style.color = '#ffffff';
        if (spans[1]) spans[1].style.color = '#ffffff';
      }

      updateSeatSummary();
    }
    window.toggleSeat = toggleSeat;

    function updateSeatSummary() {
      const count = selectedSeats.length;
      const displaySeats = selectedSeats.map(s => (window.currentCustomSeatNames && window.currentCustomSeatNames[s]) ? window.currentCustomSeatNames[s] : s);
      const seatsStr = displaySeats.join(', ');
      const seatSubtotal = count * currentTicketPrice;

      const seatDisplay = document.getElementById('selected-seat-display');
      const summarySeatLabel = document.getElementById('summary-seat-label');
      const summarySeatPrice = document.getElementById('summary-seat-price');
      const summaryTotalPrice = document.getElementById('summary-total-price');

      const cur = window.siteCurrency || 'NPR';
      if (count === 0) {
        if (seatDisplay) seatDisplay.textContent = 'None';
        if (summarySeatLabel) summarySeatLabel.textContent = 'Please select seat(s) on map';
        if (summarySeatPrice) summarySeatPrice.textContent = `${cur} 0`;
        if (summaryTotalPrice) summaryTotalPrice.textContent = `${cur} 0`;
        document.querySelectorAll('#confirm-seat-no, [id="confirm-seat-no"]').forEach(el => el.textContent = '-');
      } else {
        if (seatDisplay) seatDisplay.textContent = `Seat ${seatsStr}`;
        if (summarySeatLabel) summarySeatLabel.textContent = `${count}x First Class Recliner (Seat ${seatsStr})`;
        if (summarySeatPrice) summarySeatPrice.textContent = `${cur} ${seatSubtotal.toLocaleString()}`;
        if (summaryTotalPrice) summaryTotalPrice.textContent = `${cur} ${seatSubtotal.toLocaleString()}`;
        document.querySelectorAll('#confirm-seat-no, [id="confirm-seat-no"]').forEach(el => el.textContent = seatsStr);
      }
    }

    function resetPaymentSection() {
      const inputsSection = document.getElementById('passenger-inputs-section');
      const confirmedSection = document.getElementById('passenger-confirmed-section');
      if (inputsSection) inputsSection.classList.remove('hidden');
      if (confirmedSection) confirmedSection.classList.add('hidden');

      const gridContainer = document.getElementById('booking-grid-container');
      if (gridContainer) {
        gridContainer.classList.remove('lg:grid-cols-3', 'max-w-7xl');
        gridContainer.classList.add('lg:grid-cols-2', 'max-w-5xl');
      }

      const paymentCard = document.getElementById('payment-summary-card');
      if (paymentCard) {
        paymentCard.classList.add('hidden');
        paymentCard.classList.remove('scroll-revealed');
      }

      const stepBadge2 = document.getElementById('step-badge-2');
      if (stepBadge2) {
        stepBadge2.innerHTML = '2';
        stepBadge2.className = 'w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-black';
      }

      const stepStatus2 = document.getElementById('step-status-2');
      if (stepStatus2) {
        stepStatus2.textContent = 'Step 2';
        stepStatus2.className = 'text-[10px] font-black text-slate-400 uppercase tracking-wider';
      }

      const btnProceed = document.getElementById('btn-proceed-to-payment');
      if (btnProceed) {
        btnProceed.innerHTML = '<span class="tracking-wide whitespace-nowrap">Proceed to Payment</span><span class="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>';
        btnProceed.className = 'group w-full h-12 min-h-[48px] max-h-[48px] py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl shadow-md shadow-brand-600/25 hover:shadow-lg transition-all duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 cursor-pointer shrink-0 whitespace-nowrap';
        btnProceed.onclick = proceedToPaymentStep;
      }

      document.querySelectorAll('input[name="payment-method"]').forEach(r => r.checked = false);
      document.querySelectorAll('.pay-option-card').forEach(card => {
        card.classList.remove('border-2', 'border-[#0B4BB4]', 'border-[#60BB46]', 'border-[#5C2D91]', 'bg-blue-50/40', 'bg-green-50/40', 'bg-purple-50/40');
        card.classList.add('border-slate-200');
      });
      const paymentDetails = document.getElementById('payment-details-container');
      const paymentPlaceholder = document.getElementById('payment-method-placeholder');
      if (paymentDetails) paymentDetails.classList.add('hidden');
      if (paymentPlaceholder) paymentPlaceholder.classList.remove('hidden');
    }
    window.resetPaymentSection = resetPaymentSection;

    async function proceedToPaymentStep() {
      if (!selectedSeats || selectedSeats.length === 0) {
        alert('⚠️ Please select at least one seat on the seat map (Part 1) first.');
        const seatCard = document.getElementById('seat-selection-card');
        if (seatCard) seatCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const dateVal = document.getElementById('pass-travel-date')?.value;
      const dropdown = document.getElementById('routeSelectDropdown');
      let depTime = '';
      let currentOrigin = 'Kathmandu';
      let currentDest = 'Kakarvitta';
      if (dropdown && dropdown.value) {
        const parts = dropdown.value.split('|');
        if (parts[0]) currentOrigin = parts[0];
        if (parts[1]) currentDest = parts[1];
        if (parts.length >= 4) depTime = parts[3];
      }
      if (dateVal && depTime && typeof hasDeparturePassed === 'function' && hasDeparturePassed(dateVal, depTime)) {
        alert("⚠️ The departure time for this bus has already passed on the selected travel date (" + dateVal + ").\nPlease select tomorrow or an upcoming date.");
        document.getElementById('pass-travel-date')?.focus();
        return;
      }

      // Check real-time if any selected seat was already booked
      try {
        const checkRes = await fetch('/api/bookings?t=' + Date.now());
        if (checkRes.ok) {
          const bookings = await checkRes.json();
          const selectedDate = document.getElementById('pass-travel-date')?.value || new Date().toISOString().split('T')[0];

          const takenSeats = [];
          const curCanon = getCanonicalRouteKey(currentDest);
          bookings.forEach(b => {
            if (b.paymentStatus !== 'rejected' && b.travelDate === selectedDate) {
              const bCanon = getCanonicalRouteKey(b.route);
              if (bCanon === curCanon) {
                const bSeats = Array.isArray(b.seats) ? b.seats : [b.seats];
                selectedSeats.forEach(s => {
                  const sAlias = (window.currentCustomSeatNames && window.currentCustomSeatNames[s]) || s;
                  if (bSeats.includes(s) || bSeats.includes(sAlias)) {
                    takenSeats.push(sAlias);
                  }
                });
              }
            }
          });

          if (takenSeats.length > 0) {
            alert(`❌ Seat(s) ${Array.from(new Set(takenSeats)).join(', ')} are already booked by another user for this date and route.\nPlease select different available seats.`);
            updateWebsiteSeatMapForSelectedRoute(null, true);
            return;
          }
        }
      } catch (e) { }

      const firstName = document.getElementById('pass-first-name')?.value?.trim();
      const lastName = document.getElementById('pass-last-name')?.value?.trim();
      const phone = document.getElementById('pass-phone')?.value?.trim();
      const email = document.getElementById('pass-email')?.value?.trim();

      if (!firstName) {
        alert('⚠️ Please enter the passenger First Name in Part 2.');
        document.getElementById('pass-first-name')?.focus();
        return;
      }
      if (!lastName) {
        alert('⚠️ Please enter the passenger Last Name in Part 2.');
        document.getElementById('pass-last-name')?.focus();
        return;
      }
      if (!phone || phone.length < 7) {
        alert('⚠️ Please enter a valid mobile Phone Number in Part 2.');
        document.getElementById('pass-phone')?.focus();
        return;
      }

      // Populate Confirmed Summary Section in Part 2
      const fullName = `${firstName} ${lastName}`.trim();
      const confName = document.getElementById('conf-passenger-name');
      if (confName) confName.textContent = fullName;

      const confPhone = document.getElementById('conf-passenger-phone');
      if (confPhone) confPhone.textContent = phone;

      const confEmail = document.getElementById('conf-passenger-email');
      const confEmailCont = document.getElementById('conf-email-container');
      if (confEmail) {
        if (email) {
          confEmail.textContent = email;
          if (confEmailCont) confEmailCont.classList.remove('hidden');
        } else {
          if (confEmailCont) confEmailCont.classList.add('hidden');
        }
      }

      const routeDropdown = document.getElementById('routeSelectDropdown');
      const confRoute = document.getElementById('conf-passenger-route');
      if (confRoute && routeDropdown) {
        const selText = routeDropdown.options[routeDropdown.selectedIndex]?.text || '';
        confRoute.textContent = selText || 'Standard Route';
      }

      const dateInput = document.getElementById('pass-travel-date');
      const confDate = document.getElementById('conf-passenger-date');
      if (confDate && dateInput) {
        confDate.textContent = dateInput.value || 'Today';
      }

      const pickupInput = document.getElementById('pass-pickup-location-compact');
      const confPickup = document.getElementById('conf-passenger-pickup');
      if (confPickup) {
        confPickup.textContent = pickupInput?.value?.trim() || 'Kathmandu Counter';
      }

      const dropoffInput = document.getElementById('pass-dropoff-location-compact');
      const confDropoff = document.getElementById('conf-passenger-dropoff');
      if (confDropoff) {
        confDropoff.textContent = dropoffInput?.value?.trim() || 'Bus Park / Main Station';
      }

      // Switch views in Part 2
      const inputsSection = document.getElementById('passenger-inputs-section');
      const confirmedSection = document.getElementById('passenger-confirmed-section');
      if (inputsSection) inputsSection.classList.add('hidden');
      if (confirmedSection) confirmedSection.classList.remove('hidden');

      // Expand Grid layout and reveal Part 3 (Payment Option Section)
      const gridContainer = document.getElementById('booking-grid-container');
      if (gridContainer) {
        gridContainer.classList.remove('lg:grid-cols-2', 'max-w-5xl');
        gridContainer.classList.add('lg:grid-cols-3', 'max-w-7xl');
      }

      const paymentCard = document.getElementById('payment-summary-card');
      if (paymentCard) {
        paymentCard.classList.remove('hidden');
        paymentCard.classList.add('scroll-revealed');
      }

      const stepBadge2 = document.getElementById('step-badge-2');
      if (stepBadge2) {
        stepBadge2.innerHTML = '<span class="material-symbols-outlined text-xs">check</span>';
        stepBadge2.className = 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm';
      }

      const stepStatus2 = document.getElementById('step-status-2');
      if (stepStatus2) {
        stepStatus2.textContent = 'Confirmed';
        stepStatus2.className = 'text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider';
      }

      // Reset payment options to let user choose
      document.querySelectorAll('input[name="payment-method"]').forEach(r => r.checked = false);
      document.querySelectorAll('.pay-option-card').forEach(card => {
        card.classList.remove('border-2', 'border-[#0B4BB4]', 'border-[#60BB46]', 'border-[#5C2D91]', 'bg-blue-50/40', 'bg-green-50/40', 'bg-purple-50/40');
        card.classList.add('border-slate-200');
      });
      const paymentDetails = document.getElementById('payment-details-container');
      const paymentPlaceholder = document.getElementById('payment-method-placeholder');
      if (paymentDetails) paymentDetails.classList.add('hidden');
      if (paymentPlaceholder) paymentPlaceholder.classList.remove('hidden');

      // Smooth scroll to payment section
      if (paymentCard) {
        paymentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    window.proceedToPaymentStep = proceedToPaymentStep;

    function proceedToCheckout() {
      if (selectedSeats.length === 0) {
        alert('Please select at least one seat to continue.');
        return;
      }
      
      const checkoutForm = document.getElementById('checkout-form-step');
      if (checkoutForm) {
        checkoutForm.classList.remove('hidden');
        checkoutForm.classList.add('scroll-revealed');
        checkoutForm.style.display = 'block';
        checkoutForm.style.opacity = '1';
        checkoutForm.style.transform = 'none';
      }
      
      const ctaButtons = document.querySelectorAll('button[onclick*="proceedToCheckout"], #btn-proceed-checkout');
      ctaButtons.forEach(btn => {
        btn.style.display = 'none';
      });
      
      const stepBadge1 = document.getElementById('step-badge-1');
      const stepBadge2 = document.getElementById('step-badge-2');
      
      if (stepBadge1) {
        stepBadge1.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
        stepBadge1.className = 'w-9 h-9 rounded-full bg-[#10b981] text-white flex items-center justify-center text-sm font-black shadow-md';
        const label1 = stepBadge1.nextElementSibling;
        if (label1) label1.className = 'text-[10px] font-bold text-[#10b981] mt-1 uppercase tracking-wider whitespace-nowrap';
      }
      
      if (stepBadge2) {
        stepBadge2.className = 'w-9 h-9 rounded-full bg-[#0B4BB4] text-white flex items-center justify-center text-sm font-black shadow-md';
        const label2 = stepBadge2.nextElementSibling;
        if (label2) label2.className = 'text-[10px] font-bold text-[#0B4BB4] mt-1 uppercase tracking-wider whitespace-nowrap';
      }
      
      if (checkoutForm) {
        checkoutForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function updatePickupLocationField(origin) {
      const wrapper = document.getElementById('pickup-location-wrapper');
      if (!wrapper) return;

      const isKtm = origin.toLowerCase() === 'kathmandu';
      if (isKtm) {
        const defaultPickups = [
          "Gongabu New Buspark (Main Station Counter)",
          "Kalanki",
          "Koteshwor",
          "Jorpati",
          "Chabahil",
          "Balaju"
        ];
        const pickups = (window.siteContentData && Array.isArray(window.siteContentData.kathmanduPickups))
          ? window.siteContentData.kathmanduPickups
          : defaultPickups;

        let optionsHtml = '';
        pickups.forEach(opt => {
          optionsHtml += `<option value="${opt}">${opt}</option>`;
        });

        wrapper.innerHTML = `
          <select id="pass-pickup-location-compact" onchange="updatePickupLocation(this.value)" required
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B4BB4] transition-all cursor-pointer">
            ${optionsHtml}
          </select>
        `;
        // Trigger initial update for Kathmandu default selection
        const defaultVal = pickups[0] || 'Gongabu New Buspark (Main Station Counter)';
        updatePickupLocation(defaultVal);
      } else {
        wrapper.innerHTML = `
          <input type="text" id="pass-pickup-location-compact" placeholder="Type your pickup location"
            oninput="updatePickupLocation(this.value)" required value=""
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B4BB4] transition-all">
          <span class="material-symbols-outlined absolute right-2.5 top-1.5 text-slate-400 pointer-events-none" style="font-size:16px">location_on</span>
        `;
        // Trigger initial update for empty input
        updatePickupLocation("");
      }
    }

    function updatePickupLocation(val) {
      const summaryPickup = document.getElementById('summary-pickup');
      if (summaryPickup) {
        const displayVal = val.trim() || 'Gongabu New Buspark (Main Station Counter)';
        summaryPickup.innerHTML = `<span class="material-symbols-outlined text-sm">location_on</span> ${displayVal}`;
      }
    }
    window.updatePickupLocation = updatePickupLocation;

    function updateDropoffLocationField(destination) {
      const wrapper = document.getElementById('dropoff-location-wrapper');
      if (!wrapper) return;

      const defaultDropoffs = [
        "Gongabu New Buspark (Main Station Counter)",
        "Kalanki",
        "Koteshwor",
        "Jadibutti",
        "Radhe Radhe (Bhaktapur)",
        "Jorpati",
        "Chabahil",
        "Balaju",
        "Balkhu",
        "Itahari",
        "Damak",
        "Birtamode",
        "Kakarbhitta",
        "Biratnagar"
      ];

      let optionsHtml = defaultDropoffs.map(opt => `<option value="${opt}">`).join('');

      wrapper.innerHTML = `
        <input type="text" id="pass-dropoff-location-compact" list="dropoff-suggestions" placeholder="Type your drop off location"
          oninput="updateDropoffLocation(this.value)" required value=""
          class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 pr-7 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0B4BB4] transition-all">
        <datalist id="dropoff-suggestions">
          ${optionsHtml}
        </datalist>
        <span class="material-symbols-outlined absolute right-2 top-1.5 text-slate-400 pointer-events-none" style="font-size:14px">location_off</span>
      `;
      updateDropoffLocation("");
    }

    function updateDropoffLocation(val) {
      const summaryDropoff = document.getElementById('summary-dropoff');
      if (summaryDropoff) {
        const displayVal = val.trim() || 'Main Station / Bus Park';
        summaryDropoff.innerHTML = `<span class="material-symbols-outlined text-sm">location_off</span> ${displayVal}`;
      }
    }
    window.updateDropoffLocation = updateDropoffLocation;


    let selectedPaymentMethodVal = null;

    const QR_DATA = {
      'Fonepay QR': {
        img: 'fonepay-qr.jpg',
        title: 'Scan & Pay via Fonepay',
        badge: 'fonepay',
        badgeBg: '#dc2626',
        borderColor: 'rgba(220,38,38,0.35)',
        cardBg: '#fff8f8',
        iconColor: '#dc2626',
        merchant: 'POKHAREL YATAYAT SEWA',
        account: 'Terminal: 2222030019541437',
        branch: 'Address: JORPATI BRANCH',
        appName: 'Fonepay / Mobile Banking'
      },
      'eSewa Wallet': {
        img: 'esewa-qr.png',
        title: 'Scan & Pay via eSewa',
        badge: 'eSewa',
        badgeBg: '#60BB46',
        borderColor: 'rgba(96,187,70,0.35)',
        cardBg: '#f0fdf4',
        iconColor: '#60BB46',
        merchant: 'DIAMOND AIRBUS',
        account: 'eSewa ID: 9801234567',
        branch: 'Verified Merchant',
        appName: 'eSewa'
      },
      'Khalti Wallet': {
        img: 'khalti-qr.png',
        title: 'Scan & Pay via Khalti',
        badge: 'Khalti',
        badgeBg: '#5C2D91',
        borderColor: 'rgba(92,45,145,0.35)',
        cardBg: '#faf5ff',
        iconColor: '#5C2D91',
        merchant: 'DIAMOND AIRBUS',
        account: 'Khalti ID: 9801234567',
        branch: 'Verified Merchant',
        appName: 'Khalti'
      }
    };

    function switchQR(val) {
      const d = QR_DATA[val] || QR_DATA['Fonepay QR'];
      const img = document.getElementById('qr-image');
      const title = document.getElementById('qr-card-title');
      const badge = document.getElementById('qr-badge');
      const container = document.getElementById('qr-container');
      const icon = document.getElementById('qr-header-icon');
      const merchant = document.getElementById('qr-merchant');
      const account = document.getElementById('qr-account');
      const branch = document.getElementById('qr-branch');
      const appName = document.getElementById('qr-app-name');

      if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = d.img; img.style.opacity = '1'; }, 200); img.style.transition = 'opacity 0.2s'; }
      if (title) title.textContent = d.title;
      if (badge) { badge.textContent = d.badge; badge.style.background = d.badgeBg; }
      if (container) { container.style.borderColor = d.borderColor; container.style.background = d.cardBg; }
      if (icon) icon.style.color = d.iconColor;
      if (merchant) merchant.textContent = d.merchant;
      if (account) account.innerHTML = d.account;
      if (branch) branch.textContent = d.branch;
      if (appName) appName.textContent = d.appName;
    }

    function selectPaymentOption(val) {
      selectedPaymentMethodVal = val;

      // Reveal payment details container and hide placeholder
      const placeholder = document.getElementById('payment-method-placeholder');
      const detailsContainer = document.getElementById('payment-details-container');
      if (placeholder) placeholder.classList.add('hidden');
      if (detailsContainer) detailsContainer.classList.remove('hidden');

      // Highlight card borders
      document.querySelectorAll('.pay-option-card').forEach(card => {
        card.classList.remove('border-2', 'border-[#0B4BB4]', 'border-[#60BB46]', 'border-[#5C2D91]', 'border-blue-500', 'bg-blue-50/40', 'bg-green-50/40', 'bg-purple-50/40');
        card.classList.add('border-slate-200');
      });

      const selectedRadio = document.querySelector(`input[name="payment-method"][value="${val}"]`);
      if (selectedRadio) {
        selectedRadio.checked = true;
        const parentLabel = selectedRadio.closest('label');
        if (parentLabel) {
          parentLabel.classList.remove('border-slate-200');
          if (val.includes('eSewa')) {
            parentLabel.classList.add('border-2', 'border-[#60BB46]', 'bg-green-50/40');
          } else if (val.includes('Khalti')) {
            parentLabel.classList.add('border-2', 'border-[#5C2D91]', 'bg-purple-50/40');
          } else {
            parentLabel.classList.add('border-2', 'border-[#0B4BB4]', 'bg-blue-50/40');
          }
        }
      }

      // Switch QR code
      switchQR(val);
    }
    window.selectPaymentOption = selectPaymentOption;

    let uploadedReceiptImage = null;

    async function handleCheckoutReceiptUpload(input) {
      const file = input.files[0];
      if (!file) return;

      const statusEl = document.getElementById('checkout-upload-status');
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, or JPEG) of your payment receipt.');
        return;
      }

      if (statusEl) {
        statusEl.textContent = '⌛ Uploading receipt...';
        statusEl.className = 'block text-xs font-bold text-amber-600 mt-2';
      }

      const reader = new FileReader();
      reader.onload = async function(event) {
        const base64Data = event.target.result;
        try {
          const res = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              base64Data: base64Data
            })
          });

          if (res.ok) {
            const data = await res.json();
            uploadedReceiptImage = data.filename;
            if (statusEl) {
              statusEl.textContent = '✅ Receipt uploaded successfully: ' + file.name;
              statusEl.className = 'block text-xs font-bold text-emerald-600 mt-2';
            }
          } else {
            uploadedReceiptImage = null;
            if (statusEl) {
              statusEl.textContent = '❌ Upload failed. Please try again.';
              statusEl.className = 'block text-xs font-bold text-red-600 mt-2';
            }
          }
        } catch (err) {
          uploadedReceiptImage = null;
          if (statusEl) {
            statusEl.textContent = '🔌 Connection error. Please try again.';
            statusEl.className = 'block text-xs font-bold text-red-600 mt-2';
          }
        }
      };
      reader.readAsDataURL(file);
    }

    async function confirmBookingPayment() {
      if (!selectedPaymentMethodVal) {
        alert("⚠️ Please select a payment method before confirming!");
        return;
      }
      if (!uploadedReceiptImage) {
        alert("⚠️ Please upload your payment receipt screenshot before confirming your ticket booking!");
        return;
      }

      const dateVal = document.getElementById('pass-travel-date')?.value;
      const dropdown = document.getElementById('routeSelectDropdown');
      let depTime = '04:30 PM';
      let originVal = 'Kathmandu';
      let destName = 'Kakarvitta';
      let routePrice = 2200;
      if (dropdown && dropdown.value) {
        const parts = dropdown.value.split('|');
        if (parts[0]) originVal = parts[0];
        if (parts[1]) destName = parts[1];
        if (parts[2]) routePrice = parseInt(parts[2]) || 2200;
        if (parts[3]) depTime = parts[3];
      }
      currentTicketPrice = routePrice;

      if (dateVal && depTime && hasDeparturePassed(dateVal, depTime)) {
        alert("The departure time for this bus has already passed on the selected travel date. You cannot submit this booking.");
        return;
      }

      if (!selectedSeats || selectedSeats.length === 0) {
        alert('Please click and select at least 1 seat on the seat map above before confirming.');
        const seatMap = document.getElementById('seat-selection-card') || document.getElementById('seat-map-step');
        if (seatMap) seatMap.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const firstName = document.getElementById('pass-first-name')?.value?.trim();
      const lastName = document.getElementById('pass-last-name')?.value?.trim();
      const phone = document.getElementById('pass-phone')?.value?.trim();
      const email = document.getElementById('pass-email')?.value?.trim() || '';
      const pickupVal = document.getElementById('pass-pickup-location-compact')?.value?.trim() || 'Kathmandu Counter';
      const dropoffVal = document.getElementById('pass-dropoff-location-compact')?.value?.trim() || 'Bus Park / Main Station';

      if (!firstName || !lastName) {
        alert('Please enter both your first and last name.');
        return;
      }
      if (!phone || !/^\d{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();

      const travelDateVal = document.getElementById('pass-travel-date')?.value || document.getElementById('summary-date')?.textContent || new Date().toISOString().split('T')[0];
      const routeVal = `${originVal} ➔ ${destName}`;
      const totalVal = selectedSeats.length * currentTicketPrice;
      const depTimeVal = document.getElementById('confirm-dep-time')?.textContent || depTime || '04:30 PM';

      let depDateFormatted = travelDateVal;
      try {
        const [y, m, d] = travelDateVal.split('-').map(Number);
        depDateFormatted = new Date(y, m - 1, d).toLocaleDateString('en-US', {
          month: 'short', day: '2-digit', year: 'numeric'
        });
      } catch (e) { }

      // Map seat codes to display names if custom seat names exist
      const displaySeats = selectedSeats.map(s => {
        if (window.currentCustomSeatNames && window.currentCustomSeatNames[s]) {
          return window.currentCustomSeatNames[s];
        }
        return s;
      });
      const seatsDisplayVal = (displaySeats && displaySeats.length > 0) ? displaySeats.join(', ') : 'None';

      // Generate random booking ID (DAB-XXXXXX system)
      const randomId = `DAB-${Math.floor(100000 + Math.random() * 900000)}`;
      let serverPnr = randomId.replace('#', '');

      const selectedPaymentMethod = selectedPaymentMethodVal || document.querySelector('input[name="payment-method"]:checked')?.value || 'Fonepay QR';

      // =========================================================================
      // SYNCHRONOUSLY POPULATE ALL TICKET MODAL ELEMENTS IMMEDIATELY
      // =========================================================================
      const destCode = (destName || 'Kakarvitta').substring(0, 3).toUpperCase();
      if (document.getElementById('confirm-booking-id')) document.getElementById('confirm-booking-id').textContent = randomId;
      if (document.getElementById('confirm-ticket-ref')) document.getElementById('confirm-ticket-ref').textContent = `Ticket ${randomId}`;
      if (document.getElementById('confirm-passenger-name')) document.getElementById('confirm-passenger-name').textContent = fullName;
      if (document.getElementById('confirm-passenger-phone')) document.getElementById('confirm-passenger-phone').textContent = phone;
      if (document.getElementById('confirm-origin-name')) document.getElementById('confirm-origin-name').textContent = originVal;
      if (document.getElementById('confirm-dest-name')) document.getElementById('confirm-dest-name').textContent = destName;
      if (document.getElementById('confirm-dest-code')) document.getElementById('confirm-dest-code').textContent = destCode;
      if (document.getElementById('confirm-boarding-point')) document.getElementById('confirm-boarding-point').textContent = pickupVal;
      if (document.getElementById('confirm-dropoff-point')) document.getElementById('confirm-dropoff-point').textContent = dropoffVal;
      if (document.getElementById('confirm-total-fare')) document.getElementById('confirm-total-fare').textContent = `NPR ${totalVal.toLocaleString()}`;

      // Populate seat numbers in all matching elements
      document.querySelectorAll('#confirm-seat-no, [id="confirm-seat-no"]').forEach(el => {
        el.textContent = seatsDisplayVal;
      });

      const issuedEl = document.getElementById('confirm-issued-date');
      if (issuedEl) {
        issuedEl.textContent = new Date().toLocaleDateString('en-US', {
          month: 'short', day: '2-digit', year: 'numeric'
        }) + ' ' + new Date().toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit'
        });
      }

      const depDateEl = document.getElementById('confirm-dep-date');
      if (depDateEl) depDateEl.textContent = depDateFormatted;

      const departureDatetimeEl = document.getElementById('confirm-departure-datetime');
      if (departureDatetimeEl) departureDatetimeEl.textContent = `${depDateFormatted} - ${depTimeVal}`;

      // Dynamic ticket modal payment heading & elements
      const qrContainer = document.getElementById('confirm-pay-qr-container');
      const walletBox = document.getElementById('confirm-pay-wallet-box');
      const walletIcon = document.getElementById('confirm-wallet-icon');
      const walletName = document.getElementById('confirm-wallet-name');
      const walletBankName = document.getElementById('confirm-wallet-bank-name');
      const walletAccName = document.getElementById('confirm-wallet-acc-name');
      const walletAccNo = document.getElementById('confirm-wallet-acc-no');
      const walletBranch = document.getElementById('confirm-wallet-branch');

      if (selectedPaymentMethod.includes('eSewa')) {
        if (qrContainer) { qrContainer.classList.add('hidden'); qrContainer.style.display = 'none'; }
        if (walletBox) { walletBox.classList.remove('hidden'); walletBox.style.display = 'flex'; }
        if (walletIcon) walletIcon.textContent = 'account_balance_wallet';
        if (walletName) walletName.textContent = 'eSewa Mobile Wallet';
        if (walletBankName) walletBankName.textContent = 'eSewa Wallet Transfer';
        if (walletAccName) walletAccName.textContent = 'POKHAREL YATAYAT SEWA';
        if (walletAccNo) walletAccNo.textContent = '9841259931';
        if (walletBranch) walletBranch.textContent = 'eSewa Wallet';
      } else if (selectedPaymentMethod.includes('Khalti')) {
        if (qrContainer) { qrContainer.classList.add('hidden'); qrContainer.style.display = 'none'; }
        if (walletBox) { walletBox.classList.remove('hidden'); walletBox.style.display = 'flex'; }
        if (walletIcon) walletIcon.textContent = 'payments';
        if (walletName) walletName.textContent = 'Khalti Digital Wallet';
        if (walletBankName) walletBankName.textContent = 'Khalti Wallet Transfer';
        if (walletAccName) walletAccName.textContent = 'POKHAREL YATAYAT SEWA';
        if (walletAccNo) walletAccNo.textContent = '9841259931';
        if (walletBranch) walletBranch.textContent = 'Khalti Wallet';
      } else if (selectedPaymentMethod.includes('Mobile Banking')) {
        if (qrContainer) { qrContainer.classList.add('hidden'); qrContainer.style.display = 'none'; }
        if (walletBox) { walletBox.classList.remove('hidden'); walletBox.style.display = 'flex'; }
        if (walletIcon) walletIcon.textContent = 'account_balance';
        if (walletName) walletName.textContent = 'Mobile Banking Transfer';
        if (walletBankName) walletBankName.textContent = 'Global IME Bank Ltd.';
        if (walletAccName) walletAccName.textContent = 'POKHAREL YATAYAT SEWA';
        if (walletAccNo) walletAccNo.textContent = '01010100049281';
        if (walletBranch) walletBranch.textContent = 'Jorpati / Gongabu, KTM';
      } else {
        if (qrContainer) { qrContainer.classList.remove('hidden'); qrContainer.style.display = 'flex'; }
        if (walletBox) { walletBox.classList.add('hidden'); walletBox.style.display = 'none'; }
      }

      // Update WhatsApp payment verification link
      const waPaymentText = encodeURIComponent(
        `Hello Diamond Airbus Counter!\n` +
        `I have booked my ticket online.\n\n` +
        `📌 Booking ID: ${randomId}\n` +
        `💳 Payment Method: ${selectedPaymentMethod}\n` +
        `👤 Passenger Name: ${fullName}\n` +
        `💺 Seat Number: ${seatsDisplayVal}\n` +
        `📍 Destination: ${destName}\n\n` +
        `Please confirm my ticket reservation.`
      );

      const waPaymentBtn = document.getElementById('ticket-whatsapp-verify-btn');
      if (waPaymentBtn) {
        const wpNumber = (window.siteContentData && window.siteContentData.company && window.siteContentData.company.whatsapp)
          ? window.siteContentData.company.whatsapp.replace(/[^0-9]/g, '')
          : '9779841259931';
        waPaymentBtn.href = `https://wa.me/${wpNumber}?text=${waPaymentText}`;
      }

      // Post booking to backend API and verify seat reservation
      try {
        const bookingRes = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pnr: serverPnr,
            bookingSource: 'Website Online Booking',
            passengerName: fullName,
            phone: phone,
            email: email,
            route: routeVal,
            boardingPoint: pickupVal,
            dropoffPoint: dropoffVal,
            seats: selectedSeats,
            totalAmount: totalVal,
            travelDate: travelDateVal,
            travelTime: depTimeVal,
            paymentMethod: selectedPaymentMethod,
            receiptImage: uploadedReceiptImage,
            createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          })
        });
        const bookingResult = await bookingRes.json();
        if (bookingRes.ok && bookingResult.success) {
          if (bookingResult.booking && bookingResult.booking.pnr) {
            serverPnr = bookingResult.booking.pnr;
            if (document.getElementById('confirm-booking-id')) document.getElementById('confirm-booking-id').textContent = serverPnr;
          }
        } else {
          alert(`❌ Booking Failed: ${bookingResult.error || 'Seat(s) have already been booked by another user for this date and route. Please pick different seats.'}`);
          updateWebsiteSeatMapForSelectedRoute(null, true);
          return;
        }
      } catch (e) {
        console.error("Booking error:", e);
        alert("🔌 Network connection error. Please check your internet connection and try again.");
        return;
      }

      // Reset payment status to pending
      updateTicketPaymentStatus('pending');

      // Un-hide and show Ticket Modal only on confirmed reservation
      const ticketModal = document.getElementById('ticket-modal');
      if (ticketModal) {
        ticketModal.classList.remove('hidden');
        ticketModal.style.display = 'flex';
        ticketModal.scrollIntoView({ behavior: 'smooth' });
      }

      // Start listening for real-time payment status updates via SSE
      startPaymentStatusSSE(serverPnr);

      // Trigger Operator Notification
      sendOperatorNotification(
        '🚌 New Ticket Booking Received!',
        `Passenger: ${fullName} | Seat: ${seatsDisplayVal} | Route: ${destName} | Method: ${selectedPaymentMethod}`
      );
      
      // Update seat map live for all instances
      updateWebsiteSeatMapForSelectedRoute();
    }
    window.confirmBookingPayment = confirmBookingPayment;
    window.confirmBooking = confirmBookingPayment;

    // --- Live Payment Status Update System ---
    let customerPaymentSSE = null;

    function updateTicketPaymentStatus(status) {
      const statusEl = document.getElementById('confirm-payment-status');
      if (!statusEl) return;

      if (status === 'verified') {
        statusEl.className = 'font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm">verified</span> Verified & Paid ✅';
      } else if (status === 'rejected') {
        statusEl.className = 'font-bold text-red-600 dark:text-red-400 text-xs flex items-center gap-1';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm">cancel</span> Payment Rejected ❌';
      } else {
        statusEl.className = 'font-bold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1';
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending Verification';
      }
    }

    function startPaymentStatusSSE(pnr) {
      // Close existing connection
      if (customerPaymentSSE) {
        try { customerPaymentSSE.close(); } catch (e) { }
      }

      try {
        customerPaymentSSE = new EventSource(`/api/bookings/${pnr}/live`);

        customerPaymentSSE.addEventListener('current_status', (e) => {
          const data = JSON.parse(e.data);
          updateTicketPaymentStatus(data.paymentStatus || 'pending');
        });

        customerPaymentSSE.addEventListener('payment_status_update', (e) => {
          const data = JSON.parse(e.data);
          updateTicketPaymentStatus(data.paymentStatus || 'pending');
        });

        customerPaymentSSE.onerror = () => {
          console.log('Payment status SSE connection lost, will retry...');
        };
      } catch (e) {
        console.log('Could not start payment status listener:', e);
      }
    }

    function sendOperatorNotification(title, bodyText) {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body: bodyText, icon: 'logo.png' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: bodyText, icon: 'logo.png' });
            }
          });
        }
      }
    }

    function closeTicketModal() {
      const ticketModal = document.getElementById('ticket-modal');
      if (ticketModal) {
        ticketModal.classList.add('hidden');
        ticketModal.style.display = 'none';
      }
      // Clean up SSE connection
      if (customerPaymentSSE) {
        try { customerPaymentSSE.close(); } catch (e) { }
        customerPaymentSSE = null;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function downloadTicketPDF() {
      let element = null;
      let pnrCode = 'D-Ticket';

      const ticketModal = document.getElementById('ticket-modal');
      if (ticketModal && !ticketModal.classList.contains('hidden') && ticketModal.style.display !== 'none') {
        element = ticketModal.querySelector('.printable-ticket-wrapper');
        const pnrEl = document.getElementById('confirm-booking-id');
        if (pnrEl) pnrCode = pnrEl.textContent.replace('#', '').trim();
      }

      if (!element) {
        const trackerModal = document.getElementById('tracker-modal');
        const trackerResults = document.getElementById('tracker-results-container');
        if (trackerModal && !trackerModal.classList.contains('hidden') && trackerResults && !trackerResults.classList.contains('hidden')) {
          element = trackerModal.querySelector('.printable-ticket-wrapper');
          const pnrEl = document.getElementById('tracker-confirm-pnr');
          if (pnrEl) pnrCode = pnrEl.textContent.trim();
        }
      }

      if (!element) {
        alert('Active ticket not found. Please complete booking or search a PNR first.');
        return;
      }

      // Clone the element to avoid changing style of active modal layout
      const clone = element.cloneNode(true);

      // Reset position and force static layout for rendering
      clone.style.position = 'static';
      clone.style.margin = '0';
      clone.style.padding = '0';
      clone.style.width = '480px';
      clone.style.background = '#ffffff';
      clone.style.color = '#1e293b';
      clone.style.display = 'block';
      clone.style.boxShadow = 'none';
      clone.style.border = '1px solid #cbd5e1';
      clone.style.borderRadius = '16px';
      clone.style.overflow = 'hidden';

      // Create temporary container off-screen
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '480px';
      tempDiv.style.background = '#ffffff';
      tempDiv.appendChild(clone);
      document.body.appendChild(tempDiv);

      const opt = {
        margin: 0,
        filename: `Diamond-Airbus-${pnrCode}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 480,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'pt', format: [480, 720], orientation: 'portrait' }
      };

      if (typeof html2pdf !== 'undefined') {
        html2pdf().from(clone).set(opt).save().then(() => {
          document.body.removeChild(tempDiv);
        }).catch(err => {
          console.error('[PDF Generation Error]', err);
          document.body.removeChild(tempDiv);
        });
      } else {
        document.body.removeChild(tempDiv);
        triggerTicketPrint();
      }
    }

    function printTicketElement(element) {
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      if (!printWindow) {
        alert('Please allow popups to print the ticket.');
        return;
      }

      // Get all style/link tags to preserve styling
      let stylesHtml = '';
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        stylesHtml += el.outerHTML;
      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Ticket</title>
          ${stylesHtml}
          <style>
            body {
              background: #ffffff !important;
              color: #000000 !important;
              padding: 20px !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-ticket-wrapper {
              width: 100% !important;
              max-width: 480px !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 16px !important;
              overflow: hidden !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="printable-ticket-wrapper">
            ${element.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            };
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }

    function triggerTicketPrint() {
      let element = null;

      const ticketModal = document.getElementById('ticket-modal');
      if (ticketModal && !ticketModal.classList.contains('hidden') && ticketModal.style.display !== 'none') {
        element = ticketModal.querySelector('.printable-ticket-wrapper');
      }

      if (!element) {
        const trackerModal = document.getElementById('tracker-modal');
        const trackerResults = document.getElementById('tracker-results-container');
        if (trackerModal && !trackerModal.classList.contains('hidden') && trackerResults && !trackerResults.classList.contains('hidden')) {
          element = trackerModal.querySelector('.printable-ticket-wrapper');
        }
      }

      if (!element) {
        alert('Active ticket not found to print.');
        return;
      }

      printTicketElement(element);
    }

    // ==================== RESERVE BUS (CHARTER) ENGINE ====================

    function openReserveBusModal() {
      const modal = document.getElementById('reserve-bus-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        const dateInput = document.getElementById('modal-charter-date');
        if (dateInput && !dateInput.value) {
          const today = new Date().toISOString().split('T')[0];
          dateInput.min = today;
          dateInput.value = today;
        }
      }
    }

    function closeReserveBusModal() {
      const modal = document.getElementById('reserve-bus-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    }

    function closeReserveConfirmModal() {
      const modal = document.getElementById('reserve-confirm-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    }

    function updateCharterEstimate() {
      // Rate estimation disabled per request
    }

    function updateModalCharterEstimate() {
      // Rate estimation disabled per request
    }

    function submitCharterInquiry(source = 'modal') {
      const prefix = source === 'modal' ? 'modal-charter-' : 'charter-';

      const name = document.getElementById(`${prefix}name`)?.value || 'Valued Client';
      const phone = document.getElementById(`${prefix}phone`)?.value || '+977-98XXXXXXXX';
      const pickup = document.getElementById(`${prefix}pickup`)?.value || 'Kathmandu';
      const destination = document.getElementById(`${prefix}destination`)?.value || 'Pokhara';
      const travelDate = document.getElementById(`${prefix}date`)?.value || new Date().toISOString().split('T')[0];
      const days = document.getElementById(`${prefix}days`)?.value || '2 Days (Overnight Stay)';
      const notes = document.getElementById(`${prefix}notes`)?.value || '';

      const charterId = `#DAB-CH-${Math.floor(10000 + Math.random() * 90000)}`;

      // Populate confirm modal
      if (document.getElementById('confirm-charter-id')) document.getElementById('confirm-charter-id').textContent = charterId;
      if (document.getElementById('confirm-charter-name')) document.getElementById('confirm-charter-name').textContent = name;
      if (document.getElementById('confirm-charter-route')) document.getElementById('confirm-charter-route').textContent = `${pickup} ➔ ${destination}`;
      if (document.getElementById('confirm-charter-date')) document.getElementById('confirm-charter-date').textContent = travelDate;
      if (document.getElementById('confirm-charter-duration')) document.getElementById('confirm-charter-duration').textContent = days;

      // Build pre-filled WhatsApp text
      const waText = encodeURIComponent(
        `Hello Diamond Airbus Charter Desk!\n` +
        `I would like to inquire about reserving a full bus.\n\n` +
        `📌 Ref ID: ${charterId}\n` +
        `👤 Name: ${name}\n` +
        `📞 Phone: ${phone}\n` +
        `📍 Route: ${pickup} to ${destination}\n` +
        `📅 Departure Date: ${travelDate}\n` +
        `⏳ Duration: ${days}` +
        (notes ? `\n📝 Notes: ${notes}\n\n` : `\n\n`) +
        `Please provide custom quotation & confirm bus availability.`
      );

      const waBtn = document.getElementById('charter-whatsapp-btn');
      if (waBtn) {
        const wpNumber = (window.siteContentData && window.siteContentData.reserveBus && window.siteContentData.reserveBus.phone)
          ? window.siteContentData.reserveBus.phone.replace(/[^0-9]/g, '')
          : ((window.siteContentData && window.siteContentData.company && window.siteContentData.company.whatsapp)
            ? window.siteContentData.company.whatsapp.replace(/[^0-9]/g, '')
            : '9779841259931');
        waBtn.href = `https://wa.me/${wpNumber}?text=${waText}`;
      }

      if (source === 'modal') {
        closeReserveBusModal();
      }

      const confirmModal = document.getElementById('reserve-confirm-modal');
      if (confirmModal) {
        confirmModal.classList.remove('hidden');
        confirmModal.style.display = 'flex';
      }

      // Trigger Operator Notification if active
      if (typeof sendOperatorNotification === 'function') {
        sendOperatorNotification(
          '🚐 New Bus Charter Inquiry Received!',
          `Client: ${name} | Route: ${pickup} to ${destination} (${days})`
        );
      }
    }

    // ==================== TICKET TRACKER ENGINE ====================
    let trackerPaymentSSE = null;
    let currentTrackerBooking = null;

    function openTrackerModal() {
      const modal = document.getElementById('tracker-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      }
      if (document.getElementById('tracker-name-input')) document.getElementById('tracker-name-input').value = '';
      if (document.getElementById('tracker-pnr-input')) document.getElementById('tracker-pnr-input').value = '';
      document.getElementById('tracker-phone-input').value = '';
      document.getElementById('tracker-error-state').classList.add('hidden');
      document.getElementById('tracker-results-container').classList.add('hidden');
      document.getElementById('tracker-loading-state').classList.add('hidden');
    }

    function closeTrackerModal() {
      const modal = document.getElementById('tracker-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
      if (trackerPaymentSSE) {
        try { trackerPaymentSSE.close(); } catch (e) { }
        trackerPaymentSSE = null;
      }
    }

    async function searchTicket() {
      const nameInput = document.getElementById('tracker-name-input') || document.getElementById('tracker-pnr-input');
      const phoneInput = document.getElementById('tracker-phone-input');
      const errorState = document.getElementById('tracker-error-state');
      const errorText = document.getElementById('tracker-error-text');
      const loadingState = document.getElementById('tracker-loading-state');
      const resultsContainer = document.getElementById('tracker-results-container');

      if (!nameInput || !phoneInput) return;

      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();

      if (!name) {
        alert('Please enter your Passenger Full Name.');
        nameInput.focus();
        return;
      }
      if (!phone) {
        alert('Please enter your Mobile Number.');
        phoneInput.focus();
        return;
      }

      // Reset views
      errorState.classList.add('hidden');
      resultsContainer.classList.add('hidden');
      loadingState.classList.remove('hidden');

      try {
        let booking = null;

        // 1. Try search API endpoint first
        try {
          const response = await fetch(`/api/bookings/search?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.booking) {
              booking = data.booking;
            }
          }
        } catch(e) {}

        // 2. Client-side search fallback via /api/admin/bookings
        if (!booking) {
          try {
            const adminRes = await fetch(`/api/admin/bookings?t=${Date.now()}`);
            if (adminRes.ok) {
              const bookings = await adminRes.json();
              const cleanInputPhone = phone.replace(/[^0-9]/g, '');
              const normInputName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

              const matching = bookings.filter(b => {
                if (b.paymentStatus === 'rejected') return false;
                const bPhone = (b.phone || '').replace(/[^0-9]/g, '');
                const bName = (b.passengerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                const phoneMatch = bPhone && cleanInputPhone && (bPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(bPhone));
                const nameMatch = bName && normInputName && (bName.includes(normInputName) || normInputName.includes(bName));
                return phoneMatch && nameMatch;
              });

              if (matching.length > 0) {
                booking = matching[0];
              }
            }
          } catch(e) {}
        }

        if (!booking) {
          loadingState.classList.add('hidden');
          errorText.textContent = `Verification failed: No active ticket found matching Passenger Name '${name}' and Mobile Number '${phone}'. Please double check your booking details.`;
          errorState.classList.remove('hidden');
          return;
        }

        // Keep local reference
        currentTrackerBooking = booking;

        // Populate Ticket
        document.getElementById('tracker-pass-name').textContent = booking.passengerName;
        document.getElementById('tracker-confirm-pnr').textContent = booking.pnr;
        document.getElementById('tracker-confirm-seats').textContent = Array.isArray(booking.seats) ? booking.seats.join(', ') : booking.seats;
        document.getElementById('tracker-confirm-pickup').textContent = booking.boardingPoint.replace(/location_on\n/g, '').trim();
        const dropoffEl = document.getElementById('tracker-confirm-dropoff');
        if (dropoffEl) {
          dropoffEl.textContent = (booking.dropoffPoint || '-').replace(/location_off\n/g, '').trim();
        }

        const totalAmount = Number(booking.totalAmount || 0);
        const receivedAmount = Number(booking.receivedAmount || 0);
        const remainingAmount = Number(booking.remainingAmount !== undefined ? booking.remainingAmount : (totalAmount - receivedAmount));

        const cur = window.siteCurrency || 'NPR';
        document.getElementById('tracker-confirm-fare').textContent = `${cur} ${totalAmount.toLocaleString()}`;

        const rcvEl = document.getElementById('tracker-received-fare');
        if (rcvEl) rcvEl.textContent = `${cur} ${receivedAmount.toLocaleString()}`;

        const remEl = document.getElementById('tracker-remaining-fare');
        const remContainer = document.getElementById('tracker-remaining-container');
        if (remEl) {
          remEl.textContent = `${cur} ${remainingAmount.toLocaleString()}`;
          if (remainingAmount > 0) {
            if (remContainer) {
              remContainer.className = 'flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-700/60 bg-red-50/50 dark:bg-red-950/20 px-2 py-1 rounded';
            }
            remEl.className = 'font-extrabold text-red-750 dark:text-red-400 text-xs';
          } else {
            if (remContainer) {
              remContainer.className = 'flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded';
            }
            remEl.className = 'font-extrabold text-slate-750 dark:text-slate-400 text-xs';
          }
        }

        // Parse Route codes
        let destName = booking.route.split('➔')[1] || booking.route.split('->')[1] || 'Kakarvitta';
        destName = destName.trim();
        document.getElementById('tracker-dest-name').textContent = destName;

        if (destName.toLowerCase().includes('biratnagar')) {
          document.getElementById('tracker-dest-code').textContent = 'BRT';
        } else if (destName.toLowerCase().includes('sautha')) {
          document.getElementById('tracker-dest-code').textContent = 'SUT';
        } else {
          document.getElementById('tracker-dest-code').textContent = 'KAK';
        }

        // Travel times & dates
        document.getElementById('tracker-dep-time').textContent = booking.travelTime || '04:30 PM';
        document.getElementById('tracker-dep-date').textContent = booking.travelDate || '';
        document.getElementById('tracker-arr-date').textContent = booking.travelDate || '';

        // Populate Ticket Issued and Departure DateTime in tracker
        const trackerIssuedDateEl = document.getElementById('tracker-issued-date');
        if (trackerIssuedDateEl) {
          let formattedIssued = 'N/A';
          if (booking.createdAt) {
            formattedIssued = booking.createdAt;
          } else if (booking.bookingDate) {
            try {
              formattedIssued = new Date(booking.bookingDate).toLocaleString('en-US', {
                month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });
            } catch (e) { }
          }
          trackerIssuedDateEl.textContent = formattedIssued;
        }

        const trackerDepDatetimeEl = document.getElementById('tracker-departure-datetime');
        if (trackerDepDatetimeEl) {
          let depDateFormatted = booking.travelDate || '';
          try {
            const [y, m, d] = depDateFormatted.split('-').map(Number);
            depDateFormatted = new Date(y, m - 1, d).toLocaleDateString('en-US', {
              month: 'short', day: '2-digit', year: 'numeric'
            });
          } catch (e) { }
          trackerDepDatetimeEl.textContent = `${depDateFormatted} - ${booking.travelTime || '04:30 PM'}`;
        }

        // Status view
        updateTrackerPaymentUI(booking.paymentStatus || 'pending');

        // Setup WhatsApp link
        const waText = encodeURIComponent(
          `Hello Diamond Airbus Counter!\n` +
          `I am checking my ticket online.\n\n` +
          `📌 Booking ID: ${booking.pnr}\n` +
          `💳 Payment Method: ${booking.paymentMethod || 'Fonepay QR'}\n` +
          `👤 Passenger Name: ${booking.passengerName}\n` +
          `💺 Seat Number: ${Array.isArray(booking.seats) ? booking.seats.join(', ') : booking.seats}\n` +
          `📍 Destination: ${destName}\n\n` +
          `Please confirm my ticket reservation.`
        );
        const wpNumber = (window.siteContentData && window.siteContentData.company && window.siteContentData.company.whatsapp)
          ? window.siteContentData.company.whatsapp.replace(/[^0-9]/g, '')
          : '9779841259931';
        document.getElementById('tracker-whatsapp-btn').href = `https://wa.me/${wpNumber}?text=${waText}`;

        // Check if cancellation is allowed (3 hours before departure)
        const cancelBtn = document.getElementById('tracker-cancel-btn');
        if (cancelBtn) {
          const allowed = isCancellationAllowed(booking.travelDate, booking.travelTime);
          if (allowed) {
            cancelBtn.disabled = false;
            cancelBtn.className = "bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5";
            cancelBtn.title = "Cancel Booking";
          } else {
            cancelBtn.disabled = true;
            cancelBtn.className = "bg-slate-300 dark:bg-slate-800 text-slate-400 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center gap-1.5 shadow-sm";
            cancelBtn.title = "Cancellations are only available up to 3 hours before departure.";
          }
        }

        // Hide loading, show results
        loadingState.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        // Start SSE stream for real time status
        startTrackerPaymentStatusSSE(booking.pnr);

      } catch (err) {
        loadingState.classList.add('hidden');
        errorText.textContent = 'Booking search failed. Please verify that your PNR ticket code (e.g., DAB-XXXXXX) is correct.';
        errorState.classList.remove('hidden');
      }
    }

    function updateTrackerPaymentUI(status) {
      const statusEl = document.getElementById('tracker-payment-status');
      const payPanel = document.getElementById('tracker-pending-payment-panel');
      const waBtn = document.getElementById('tracker-whatsapp-btn');
      const notifBox = document.getElementById('tracker-notifications-box');
      const emailText = document.getElementById('tracker-email-alert-text');
      const smsText = document.getElementById('tracker-sms-alert-text');

      if (!statusEl) return;

      if (status === 'verified') {
        statusEl.className = 'font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm font-bold">verified</span> Verified & Paid ✅';
        if (payPanel) payPanel.classList.add('hidden');
        if (waBtn) waBtn.classList.add('hidden');

        // Show SMS & Email Dispatched Alerts
        if (notifBox) {
          notifBox.classList.remove('hidden');
          const emailAddr = (currentTrackerBooking && currentTrackerBooking.email) ? currentTrackerBooking.email : 'passenger@example.com';
          if (emailText) emailText.textContent = `Email confirmation sent to ${emailAddr} (Ticket Verified & Confirmed)`;
          const phoneNo = currentTrackerBooking ? currentTrackerBooking.phone : 'mobile';
          if (smsText) smsText.textContent = `SMS boarding pass details dispatched to +977-${phoneNo}`;
        }
      } else if (status === 'rejected') {
        statusEl.className = 'font-bold text-red-600 dark:text-red-400 text-xs flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-900/50';
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm font-bold">cancel</span> Rejected ❌';
        if (payPanel) payPanel.classList.remove('hidden');
        if (waBtn) {
          waBtn.classList.remove('hidden');
          waBtn.textContent = 'Contact Operator on WhatsApp';
        }

        // Show SMS & Email Dispatched Alerts
        if (notifBox) {
          notifBox.classList.remove('hidden');
          const emailAddr = (currentTrackerBooking && currentTrackerBooking.email) ? currentTrackerBooking.email : 'passenger@example.com';
          if (emailText) emailText.textContent = `Email alert sent to ${emailAddr} (Payment Rejected)`;
          const phoneNo = currentTrackerBooking ? currentTrackerBooking.phone : 'mobile';
          if (smsText) smsText.textContent = `SMS warning details sent to +977-${phoneNo} (Contact Operator)`;
        }
      } else {
        statusEl.className = 'font-bold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50';
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending Approval';
        if (payPanel) payPanel.classList.remove('hidden');
        if (waBtn) {
          waBtn.classList.remove('hidden');
          waBtn.textContent = 'Send WhatsApp Payment Proof';
        }

        if (currentTrackerBooking) {
          switchTrackerQR(currentTrackerBooking.paymentMethod || 'Fonepay QR');
        }

        // Hide notification box when pending
        if (notifBox) notifBox.classList.add('hidden');
      }
    }

    function switchTrackerQR(method) {
      const fTab = document.getElementById('tracker-pay-tab-fonepay');
      const eTab = document.getElementById('tracker-pay-tab-esewa');
      const kTab = document.getElementById('tracker-pay-tab-khalti');

      const inactiveClasses = ['text-slate-500', 'hover:text-slate-900', 'dark:hover:text-white'];
      const activeClasses = ['bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-900', 'dark:text-white'];

      [fTab, eTab, kTab].forEach(tab => {
        if (tab) {
          tab.className = 'flex-1 py-1 rounded transition-all text-center';
          inactiveClasses.forEach(c => tab.classList.add(c));
          activeClasses.forEach(c => tab.classList.remove(c));
        }
      });

      let activeTab = fTab;
      if (method.includes('eSewa')) activeTab = eTab;
      else if (method.includes('Khalti')) activeTab = kTab;

      if (activeTab) {
        inactiveClasses.forEach(c => activeTab.classList.remove(c));
        activeClasses.forEach(c => activeTab.classList.add(c));
      }

      const qrContainer = document.getElementById('tracker-pay-qr-container');
      const walletBox = document.getElementById('tracker-pay-wallet-box');
      const walletIcon = document.getElementById('tracker-wallet-icon');
      const walletName = document.getElementById('tracker-wallet-name');
      const walletBankName = document.getElementById('tracker-wallet-bank-name');
      const walletAccNo = document.getElementById('tracker-wallet-acc-no');

      if (method.includes('eSewa')) {
        if (qrContainer) qrContainer.classList.add('hidden');
        if (walletBox) walletBox.classList.remove('hidden');
        if (walletIcon) walletIcon.textContent = 'account_balance_wallet';
        if (walletName) walletName.textContent = 'eSewa Wallet';
        if (walletBankName) walletBankName.textContent = 'POKHAREL YATAYAT SEWA';
        if (walletAccNo) walletAccNo.textContent = '9841259931';
      } else if (method.includes('Khalti')) {
        if (qrContainer) qrContainer.classList.add('hidden');
        if (walletBox) walletBox.classList.remove('hidden');
        if (walletIcon) walletIcon.textContent = 'payments';
        if (walletName) walletName.textContent = 'Khalti Wallet';
        if (walletBankName) walletBankName.textContent = 'POKHAREL YATAYAT SEWA';
        if (walletAccNo) walletAccNo.textContent = '9841259931';
      } else {
        if (qrContainer) qrContainer.classList.remove('hidden');
        if (walletBox) walletBox.classList.add('hidden');
      }

      if (currentTrackerBooking) {
        currentTrackerBooking.paymentMethod = method;
        const destName = document.getElementById('tracker-dest-name').textContent || 'Kakarvitta';
        const waText = encodeURIComponent(
          `Hello Diamond Airbus Counter!\n` +
          `I have updated my payment method in the tracker.\n\n` +
          `📌 Booking ID: ${currentTrackerBooking.pnr}\n` +
          `💳 Payment Method: ${method}\n` +
          `👤 Passenger Name: ${currentTrackerBooking.passengerName}\n` +
          `💺 Seat Number: ${Array.isArray(currentTrackerBooking.seats) ? currentTrackerBooking.seats.join(', ') : currentTrackerBooking.seats}\n` +
          `📍 Destination: ${destName}\n\n` +
          `Please confirm my ticket reservation.`
        );
        const wpNumber = (window.siteContentData && window.siteContentData.company && window.siteContentData.company.whatsapp)
          ? window.siteContentData.company.whatsapp.replace(/[^0-9]/g, '')
          : '9779841259931';
        document.getElementById('tracker-whatsapp-btn').href = `https://wa.me/${wpNumber}?text=${waText}`;
      }
    }

    function startTrackerPaymentStatusSSE(pnr) {
      if (trackerPaymentSSE) {
        try { trackerPaymentSSE.close(); } catch (e) { }
      }

      try {
        trackerPaymentSSE = new EventSource(`/api/bookings/${pnr}/live`);

        trackerPaymentSSE.addEventListener('current_status', (e) => {
          const data = JSON.parse(e.data);
          updateTrackerPaymentUI(data.paymentStatus || 'pending');
        });

        trackerPaymentSSE.addEventListener('payment_status_update', (e) => {
          const data = JSON.parse(e.data);
          updateTrackerPaymentUI(data.paymentStatus || 'pending');
          if (data.paymentStatus === 'verified') {
            sendOperatorNotification(
              '🎉 Ticket Verified & Paid!',
              `Your ticket ${pnr} has been verified by the operator. Bon Voyage!`
            );
          }
        });

        trackerPaymentSSE.onerror = () => {
          console.log('[Tracker SSE] Connection lost, will retry...');
        };

      } catch (e) {
        console.log('[Tracker SSE] Could not connect status listener:', e);
      }
    }

    function hasDeparturePassed(travelDateStr, travelTimeStr) {
      if (!travelDateStr || !travelTimeStr) return false;
      try {
        const [year, month, day] = travelDateStr.split('-').map(Number);

        let hours = 12;
        let minutes = 0;

        const timeMatch = travelTimeStr.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
        }

        if (travelTimeStr.toUpperCase().includes('PM') && hours < 12) {
          hours += 12;
        } else if (travelTimeStr.toUpperCase().includes('AM') && hours === 12) {
          hours = 0;
        }

        const departureDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();
        return now > departureDate;
      } catch (e) {
        console.error("Error parsing departure time:", e);
        return false;
      }
    }

    function isCancellationAllowed(travelDateStr, travelTimeStr) {
      if (!travelDateStr || !travelTimeStr) return true;
      try {
        const [year, month, day] = travelDateStr.split('-').map(Number);

        let [time, modifier] = travelTimeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) {
          hours += 12;
        }
        if (modifier === 'AM' && hours === 12) {
          hours = 0;
        }

        const departureDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();
        const diffMs = departureDate - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        return diffHours >= 3;
      } catch (e) {
        console.error("Error parsing departure time:", e);
        return true;
      }
    }

    async function cancelTrackerBooking() {
      if (!currentTrackerBooking || !currentTrackerBooking.pnr) {
        alert('Booking details not loaded. Please track a valid booking first.');
        return;
      }

      const pnr = currentTrackerBooking.pnr;
      if (!confirm(`Are you sure you want to cancel booking ${pnr}? This will release your selected seats.`)) {
        return;
      }

      try {
        const res = await fetch(`/api/bookings/${pnr}`, {
          method: 'DELETE'
        });
        const result = await res.json();
        if (result.success) {
          alert(`Booking ${pnr} has been successfully cancelled.`);
          closeTrackerModal();
          // Reload the seat map to release the seats visually immediately
          updateWebsiteSeatMapForSelectedRoute();
        } else {
          alert('Failed to cancel booking: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Error communicating with server: ' + err);
      }
    }

    // Force browser scroll restoration to manual and scroll to top on refresh
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Attach key modal control functions to the window object to prevent any script overwrites
    window.openTrackerModal = openTrackerModal;
    window.closeTrackerModal = closeTrackerModal;
    window.downloadTicketPDF = downloadTicketPDF;
    window.closeTicketModal = closeTicketModal;
    window.cancelTrackerBooking = cancelTrackerBooking;
    window.swapRouteDirection = swapRouteDirection;
    window.searchTicket = searchTicket;
    window.switchTrackerQR = switchTrackerQR;
    window.selectRoute = selectRoute;
    window.onRouteDropdownChange = onRouteDropdownChange;
    window.openReserveBusModal = openReserveBusModal;
    window.rotateFleet = rotateFleet;
    window.closeReserveBusModal = closeReserveBusModal;
    window.updateModalCharterEstimate = updateModalCharterEstimate;
    window.closeReserveConfirmModal = closeReserveConfirmModal;
    window.openBookingSection = openBookingSection;
    window.closeBookingSection = closeBookingSection;
    window.backFromCheckoutToSeats = backFromCheckoutToSeats;
    window.renderDynamicWebsiteSeatMap = renderDynamicWebsiteSeatMap;
    window.updateWebsiteSeatMapForSelectedRoute = updateWebsiteSeatMapForSelectedRoute;
    window.proceedToCheckout = proceedToCheckout;
    window.confirmBookingPayment = confirmBookingPayment;
    window.confirmBooking = confirmBookingPayment;
    window.toggleSeat = toggleSeat;
    window.updatePickupLocation = updatePickupLocation;
    window.updateDropoffLocation = updateDropoffLocation;
    window.selectPaymentOption = selectPaymentOption;
    window.handleCheckoutReceiptUpload = handleCheckoutReceiptUpload;
    window.triggerTicketPrint = triggerTicketPrint;
    window.submitCharterInquiry = submitCharterInquiry;

    // =============================================================================
    // HERO 3-SLIDE CAROUSEL CONTROLLER
    // =============================================================================
    let currentHeroSlideIndex = 0;
    const totalHeroSlides = 3;
    let heroSlideTimer = null;

    function setHeroSlide(index) {
      currentHeroSlideIndex = (index + totalHeroSlides) % totalHeroSlides;
      for (let i = 0; i < totalHeroSlides; i++) {
        const slide = document.getElementById(`hero-slide-${i}`);
        const dot = document.getElementById(`hero-dot-${i}`);
        if (slide) {
          if (i === currentHeroSlideIndex) {
            slide.classList.remove('opacity-0', 'pointer-events-none');
            slide.classList.add('opacity-100');
          } else {
            slide.classList.remove('opacity-100');
            slide.classList.add('opacity-0', 'pointer-events-none');
          }
        }
        if (dot) {
          if (i === currentHeroSlideIndex) {
            dot.className = 'hero-dot w-8 sm:w-10 h-2.5 rounded-full transition-all duration-300 bg-white shadow-md';
          } else {
            dot.className = 'hero-dot w-3 h-2.5 rounded-full transition-all duration-300 bg-white/40 hover:bg-white/70';
          }
        }
      }
    }

    function nextHeroSlide() {
      setHeroSlide(currentHeroSlideIndex + 1);
      resetHeroSlideTimer();
    }

    function prevHeroSlide() {
      setHeroSlide(currentHeroSlideIndex - 1);
      resetHeroSlideTimer();
    }

    function goHeroSlide(index) {
      setHeroSlide(index);
      resetHeroSlideTimer();
    }

    function startHeroSlideTimer() {
      if (heroSlideTimer) clearInterval(heroSlideTimer);
      heroSlideTimer = setInterval(() => {
        setHeroSlide(currentHeroSlideIndex + 1);
      }, 6000);
    }

    function resetHeroSlideTimer() {
      startHeroSlideTimer();
    }

    // Pause on hover
    const heroSec = document.getElementById('home');
    if (heroSec) {
      heroSec.addEventListener('mouseenter', () => {
        if (heroSlideTimer) clearInterval(heroSlideTimer);
      });
      heroSec.addEventListener('mouseleave', () => {
        startHeroSlideTimer();
      });
    }

    function handleWebsiteRouteChange() {
      const dropdown = document.getElementById('routeSelectDropdown');
      if (!dropdown || !dropdown.value) return;
      const parts = dropdown.value.split('|');
      const origin = parts[0] || 'Kathmandu';
      const destination = parts[1] || 'Kakarvitta';
      const price = parseInt(parts[2]) || 2200;
      const depTime = parts[3] || '04:30 PM';

      currentTicketPrice = price;

      const summaryOrigin = document.getElementById('summary-origin');
      const summaryDest = document.getElementById('summary-destination');
      const confirmDepTime = document.getElementById('confirm-dep-time');
      const headerRoute = document.getElementById('header-route-text');
      const headerTime = document.getElementById('header-time-text');
      const busCardRoute = document.getElementById('bus-card-route');
      const busCardDepTime = document.getElementById('bus-card-dep-time');

      if (summaryOrigin) summaryOrigin.textContent = origin;
      if (summaryDest) summaryDest.textContent = destination;
      if (confirmDepTime) confirmDepTime.textContent = depTime;
      if (headerRoute) headerRoute.textContent = `${origin} → ${destination}`;
      if (headerTime) headerTime.textContent = depTime;
      if (busCardRoute) busCardRoute.textContent = `${origin} → ${destination}`;
      if (busCardDepTime) busCardDepTime.textContent = depTime;

      updatePickupLocationField(origin);
      updateDropoffLocationField(destination);

      const currentRouteId = getRouteIdFromNames(origin, destination);
      updateWebsiteSeatMapForSelectedRoute(currentRouteId, true);

      if (typeof resetPaymentSection === 'function') {
        resetPaymentSection();
      }
    }

    window.setHeroSlide = setHeroSlide;
    window.nextHeroSlide = nextHeroSlide;
    window.prevHeroSlide = prevHeroSlide;
    window.goHeroSlide = goHeroSlide;
    window.handleWebsiteRouteChange = handleWebsiteRouteChange;

    window.proceedToPaymentStep = proceedToPaymentStep;
    window.resetPaymentSection = resetPaymentSection;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainPage);
} else {
  initMainPage();
}
