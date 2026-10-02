const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const CONTENT_FILE = path.join(__dirname, 'data', 'site-content.json');
const BOOKINGS_FILE = path.join(__dirname, 'data', 'bookings.json');

// SSE: Store connected admin clients for real-time push notifications
const sseClients = [];

// SSE: Store connected customer clients for real-time payment status updates
const customerSseClients = [];

// Ensure data folder and default files exist
function ensureDataFiles() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(CONTENT_FILE)) {
    const defaultContent = {
      company: {
        name: "Diamond Airbus",
        phone: "+977-9841259931",
        whatsapp: "+9779841259931",
        email: "info@diamondairbus.com",
        headOffice: "Gongabu New Bus Park, Counter No. 42, Kathmandu"
      },
      notice: {
        enabled: true,
        text: "🎉 Festive Night Bus Booking Open! Book early for preference.",
        type: "info"
      },
      defaultTicketPrice: 2200,
      currency: "NPR",
      routes: [
        {
          id: "ktm-kakarbhitta",
          from: "Kathmandu",
          to: "Kakarbhitta",
          departureTime: "16:30 (04:30 PM)",
          busType: "Diamond VIP Airbus (Sofa)",
          price: 2200,
          available: true
        }
      ]
    };
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(defaultContent, null, 2), 'utf-8');
  }

  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

ensureDataFiles();

// Helper to read JSON safely
function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return null;
  }
}

// Helper to write JSON safely with human-readable indentation
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Broadcast event to all connected SSE admin clients
function broadcastToAdmins(eventType, data) {
  const payload = JSON.stringify({ type: eventType, ...data });
  sseClients.forEach((client, index) => {
    try {
      client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
    } catch (err) {
      // Remove dead connections
      sseClients.splice(index, 1);
    }
  });
  console.log(`[SSE BROADCAST] ${eventType} → ${sseClients.length} admin client(s)`);
}

// ----------------------------------------------------
// PUBLIC API ENDPOINTS
// ----------------------------------------------------

// GET /api/content - Public dynamic site content (prices, notices, phones)
app.get('/api/content', (req, res) => {
  const content = readJson(CONTENT_FILE);
  if (!content) {
    return res.status(500).json({ error: 'Failed to read site content' });
  }
  res.json(content);
});

// POST /api/bookings - Save customer ticket booking
app.post('/api/bookings', (req, res) => {
  const { passengerName, phone, route, boardingPoint, seats, totalAmount } = req.body;

  if (!passengerName || !phone || !seats || seats.length === 0) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const reqSeats = Array.isArray(seats) ? seats : [seats];
  const reqRoute = route || 'Kathmandu ➔ Kakarbhitta';
  const reqDate = req.body.travelDate || new Date().toISOString().split('T')[0];

  const getCanonicalRoute = (r) => {
    if (!r) return 'unknown';
    const s = String(r).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s.includes('birat')) return 'biratnagar';
    if (s.includes('sautha')) return 'sautha';
    if (s.includes('pokhara')) return 'pokhara';
    if (s.includes('nepalgunj')) return 'nepalgunj';
    if (s.includes('kakar') || s.includes('vitta') || s.includes('bhitta')) return 'kakarbhitta';
    return s;
  };

  const bookings = readJson(BOOKINGS_FILE) || [];
  const content = readJson(CONTENT_FILE) || {};
  const customSeatNames = (content.seatLayout && content.seatLayout.customSeatNames) || {};
  const alreadyBooked = [];
  const canonReqRoute = getCanonicalRoute(reqRoute);

  bookings.forEach(b => {
    if (b.paymentStatus !== 'rejected') {
      const bDate = b.travelDate || '';
      const canonBRoute = getCanonicalRoute(b.route);

      if (bDate === reqDate && canonBRoute === canonReqRoute) {
        const bSeats = Array.isArray(b.seats) ? b.seats : [b.seats];
        const expandedBSeats = new Set(bSeats);
        bSeats.forEach(bs => {
          if (customSeatNames[bs]) expandedBSeats.add(customSeatNames[bs]);
          Object.keys(customSeatNames).forEach(k => {
            if (customSeatNames[k] === bs) expandedBSeats.add(k);
          });
        });

        reqSeats.forEach(s => {
          const sAlias = customSeatNames[s] || s;
          if (expandedBSeats.has(s) || expandedBSeats.has(sAlias)) {
            alreadyBooked.push(sAlias);
          }
        });
      }
    }
  });

  if (alreadyBooked.length > 0) {
    const bookedStr = Array.from(new Set(alreadyBooked)).join(', ');
    return res.status(400).json({ error: `Seat(s) ${bookedStr} are already booked for this route and travel date. Please pick other available seats.` });
  }

  const pnr = 'DAB-' + Math.floor(100000 + Math.random() * 900000);
  const newBooking = {
    pnr,
    bookingSource: req.body.bookingSource || (req.body.issuedOfficer ? 'Staff Counter POS' : 'Website Online Booking'),
    passengerName,
    phone,
    issuedOfficer: req.body.issuedOfficer || '',
    counterLocation: req.body.counterLocation || '',
    counterNumber: req.body.counterNumber || '',
    route: reqRoute,
    boardingPoint: boardingPoint || 'Gongabu New Bus Park',
    seats: reqSeats,
    grossAmount: req.body.grossAmount || totalAmount || 2200,
    discountAmount: req.body.discountAmount || 0,
    discountReason: req.body.discountReason || '',
    totalAmount: totalAmount || 2200,
    receivedAmount: req.body.receivedAmount !== undefined ? req.body.receivedAmount : (totalAmount || 2200),
    remainingAmount: req.body.remainingAmount !== undefined ? req.body.remainingAmount : 0,
    paymentMethod: req.body.paymentMethod || 'Fonepay QR',
    paymentStatus: req.body.paymentStatus || 'pending',
    travelDate: reqDate,
    travelTime: req.body.travelTime || '04:30 PM',
    bookingDate: new Date().toISOString(),
    createdAt: req.body.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  };

  bookings.unshift(newBooking);

  if (writeJson(BOOKINGS_FILE, bookings)) {
    console.log(`[BOOKING CONFIRMED] PNR: ${pnr} - Passenger: ${passengerName} - Status: PENDING`);

    // 🔔 Push real-time notification to all connected admin clients
    broadcastToAdmins('new_booking', { booking: newBooking });

    res.json({ success: true, booking: newBooking });
  } else {
    res.status(500).json({ error: 'Failed to save booking to database.' });
  }
});

// GET /api/bookings/search - Customer ticket search by Passenger Name & Phone
app.get('/api/bookings/search', (req, res) => {
  const { name, phone } = req.query;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Please provide both Passenger Name and Mobile Number.' });
  }

  const bookings = readJson(BOOKINGS_FILE) || [];
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

  if (matching.length === 0) {
    return res.status(404).json({ error: 'No active ticket booking found matching Passenger Name and Mobile Number.' });
  }

  res.json({ success: true, booking: matching[0] });
});

// GET /api/bookings/:pnr/status - Customer-facing payment status check
app.get('/api/bookings/:pnr/status', (req, res) => {
  const { pnr } = req.params;
  const bookings = readJson(BOOKINGS_FILE) || [];
  const booking = bookings.find(b => b.pnr === pnr);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  res.json({
    pnr: booking.pnr,
    paymentStatus: booking.paymentStatus || 'pending',
    passengerName: booking.passengerName,
    totalAmount: booking.totalAmount
  });
});

// ----------------------------------------------------
// ADMIN CMS ENDPOINTS
// ----------------------------------------------------

// POST /api/admin/login - Verify admin passcode
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  // Default password is admin123 (can be customized)
  if (password === 'admin123') {
    res.json({ success: true, message: 'Authentication successful' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid admin passcode' });
  }
});

// POST /api/admin/erase-data - Master One-Shot Data Erase
app.post('/api/admin/erase-data', (req, res) => {
  const { password, confirmCode } = req.body || {};

  if (password !== 'admin123' && confirmCode !== 'ERASE') {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid passcode or confirmation code.' });
  }

  // 1. Clear bookings.json
  writeJson(BOOKINGS_FILE, []);

  // 2. Clear occupied seats in site-content.json
  const content = readJson(CONTENT_FILE) || {};
  if (content.seatLayout && Array.isArray(content.seatLayout.occupiedSeats)) {
    content.seatLayout.occupiedSeats = [];
  }
  if (content.seatLayoutsByRoute && typeof content.seatLayoutsByRoute === 'object') {
    Object.keys(content.seatLayoutsByRoute).forEach(r => {
      if (content.seatLayoutsByRoute[r] && Array.isArray(content.seatLayoutsByRoute[r].occupiedSeats)) {
        content.seatLayoutsByRoute[r].occupiedSeats = [];
      }
    });
  }
  writeJson(CONTENT_FILE, content);

  // 3. Broadcast real-time update notification
  broadcastToAdmins('booking_updated', { message: 'All booking data erased by Super Admin' });
  broadcastToAdmins('content_updated', content);

  console.log('[ADMIN ERASE] Master one-shot data erase executed cleanly.');
  res.json({ success: true, message: 'All booking records and seat reservations erased successfully in one shot!' });
});

// POST /api/admin/content - Update website settings, prices, notices
app.post('/api/admin/content', (req, res) => {
  const newContent = req.body;

  if (!newContent || typeof newContent !== 'object') {
    return res.status(400).json({ error: 'Invalid content data payload' });
  }

  if (writeJson(CONTENT_FILE, newContent)) {
    console.log('[ADMIN UPDATE] Site content updated successfully via Admin Portal.');
    try {
      broadcastToAdmins('content_updated', { timestamp: new Date().toISOString() });
    } catch (e) {}
    res.json({ success: true, message: 'Site content updated successfully!' });
  } else {
    res.status(500).json({ error: 'Failed to update content file.' });
  }
});

// GET /api/admin/bookings - Fetch list of reservations
app.get('/api/admin/bookings', (req, res) => {
  const bookings = readJson(BOOKINGS_FILE) || [];
  res.json(bookings);
});

app.delete('/api/admin/bookings/:pnr', (req, res) => {
  const { pnr } = req.params;
  const cancelledBy = req.query.cancelledBy || 'Staff Portal Officer';

  let bookings = readJson(BOOKINGS_FILE) || [];
  const targetBooking = bookings.find(b => b.pnr === pnr);

  if (targetBooking) {
    const requestingOfficer = (cancelledBy.split('(')[0] || '').trim();
    const targetIssuer = (targetBooking.issuedOfficer || '').trim();

    if (targetIssuer && requestingOfficer && targetIssuer.toLowerCase() !== 'online customer') {
      if (targetIssuer.toLowerCase() !== requestingOfficer.toLowerCase() && requestingOfficer.toLowerCase() !== 'super admin') {
        return res.status(403).json({ error: `Cancellation Denied: Ticket was issued by Officer '${targetIssuer}'. Officer '${requestingOfficer}' cannot cancel another officer's ticket.` });
      }
    }

    const cancelledFile = path.join(DATA_DIR, 'cancelled-bookings.json');
    const cancelledLog = readJson(cancelledFile) || [];
    cancelledLog.unshift({
      pnr,
      passengerName: targetBooking.passengerName,
      phone: targetBooking.phone,
      seats: targetBooking.seats,
      route: targetBooking.route,
      travelDate: targetBooking.travelDate,
      bookingSource: targetBooking.bookingSource || (targetBooking.issuedOfficer ? 'Staff Counter' : 'Website'),
      issuedOfficer: targetBooking.issuedOfficer || 'Website Customer',
      cancelledBy,
      cancelledAt: new Date().toISOString()
    });
    writeJson(cancelledFile, cancelledLog);

    bookings = bookings.filter(b => b.pnr !== pnr);
    writeJson(BOOKINGS_FILE, bookings);
    res.json({ success: true, message: `Booking ${pnr} cancelled by ${cancelledBy}.` });
  } else {
    res.status(404).json({ error: 'Booking not found.' });
  }
});

// PATCH /api/admin/bookings/:pnr/status - Update payment status (verify/reject)
app.patch('/api/admin/bookings/:pnr/status', (req, res) => {
  const { pnr } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus || !['pending', 'verified', 'rejected'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid payment status. Use: pending, verified, or rejected.' });
  }

  let bookings = readJson(BOOKINGS_FILE) || [];
  const booking = bookings.find(b => b.pnr === pnr);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.paymentStatus = paymentStatus;

  if (writeJson(BOOKINGS_FILE, bookings)) {
    console.log(`[PAYMENT ${paymentStatus.toUpperCase()}] PNR: ${pnr} - ${booking.passengerName}`);

    // Broadcast status change to all admin clients
    broadcastToAdmins('payment_status_update', { pnr, paymentStatus, passengerName: booking.passengerName });

    // Broadcast to customer clients watching this PNR
    broadcastToCustomers(pnr, paymentStatus, booking);

    res.json({ success: true, message: `Payment status updated to ${paymentStatus}.`, booking });
  } else {
    res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// PATCH /api/admin/bookings/:pnr - Update booking details
app.patch('/api/admin/bookings/:pnr', (req, res) => {
  const { pnr } = req.params;
  const payload = req.body;

  let bookings = readJson(BOOKINGS_FILE) || [];
  const booking = bookings.find(b => b.pnr === pnr);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Update fields if present in request body
  if (payload.passengerName !== undefined) booking.passengerName = payload.passengerName;
  if (payload.phone !== undefined) booking.phone = payload.phone;
  if (payload.route !== undefined) booking.route = payload.route;
  if (payload.boardingPoint !== undefined) booking.boardingPoint = payload.boardingPoint;
  if (payload.dropoffPoint !== undefined) booking.dropoffPoint = payload.dropoffPoint;
  if (payload.seats !== undefined) booking.seats = payload.seats;
  if (payload.totalAmount !== undefined) booking.totalAmount = Number(payload.totalAmount) || booking.totalAmount;
  if (payload.paymentStatus !== undefined) booking.paymentStatus = payload.paymentStatus;
  if (payload.paymentMethod !== undefined) booking.paymentMethod = payload.paymentMethod;
  if (payload.travelDate !== undefined) booking.travelDate = payload.travelDate;
  if (payload.travelTime !== undefined) booking.travelTime = payload.travelTime;

  if (writeJson(BOOKINGS_FILE, bookings)) {
    console.log(`[BOOKING UPDATED] PNR: ${pnr} - ${booking.passengerName}`);

    // Broadcast status change to all admin clients
    broadcastToAdmins('booking_updated', { pnr, booking });

    // Broadcast to customer clients watching this PNR
    broadcastToCustomers(pnr, booking.paymentStatus || 'pending', booking);

    res.json({ success: true, message: `Booking ${pnr} updated successfully.`, booking });
  } else {
    res.status(500).json({ error: 'Failed to update booking.' });
  }
});

// SSE: Real-time notifications endpoint for admin panel
app.get('/api/admin/notifications', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Admin notification stream connected', timestamp: new Date().toISOString() })}\n\n`);

  // Add this client to SSE connections list
  const clientId = Date.now();
  const client = { id: clientId, res };
  sseClients.push(client);
  console.log(`[SSE CONNECTED] Admin client #${clientId} connected. Total: ${sseClients.length}`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Remove client on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    const index = sseClients.findIndex(c => c.id === clientId);
    if (index !== -1) sseClients.splice(index, 1);
    console.log(`[SSE DISCONNECTED] Admin client #${clientId} disconnected. Total: ${sseClients.length}`);
  });
});

// Broadcast payment status to customer SSE clients watching a specific PNR
function broadcastToCustomers(pnr, paymentStatus, booking) {
  const payload = JSON.stringify({ type: 'payment_status_update', pnr, paymentStatus, passengerName: booking.passengerName, totalAmount: booking.totalAmount });
  customerSseClients.forEach((client, index) => {
    if (client.pnr === pnr) {
      try {
        client.res.write(`event: payment_status_update\ndata: ${payload}\n\n`);
      } catch (err) {
        customerSseClients.splice(index, 1);
      }
    }
  });
  console.log(`[CUSTOMER SSE] Payment status ${paymentStatus} broadcast for PNR: ${pnr}`);
}

// SSE: Customer-facing real-time payment status updates for a specific PNR
app.get('/api/bookings/:pnr/live', (req, res) => {
  const { pnr } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send current status immediately
  const bookings = readJson(BOOKINGS_FILE) || [];
  const booking = bookings.find(b => b.pnr === pnr);
  if (booking) {
    res.write(`event: current_status\ndata: ${JSON.stringify({ pnr, paymentStatus: booking.paymentStatus || 'pending' })}\n\n`);
  }

  const clientId = Date.now();
  const client = { id: clientId, pnr, res };
  customerSseClients.push(client);

  // Heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const index = customerSseClients.findIndex(c => c.id === clientId);
    if (index !== -1) customerSseClients.splice(index, 1);
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 DIAMOND AIRBUS SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🌐 Website URL:     http://localhost:${PORT}`);
  console.log(`👑 Admin Portal:    http://localhost:${PORT}/admin.html`);
  console.log(`🎟️ Staff POS URL:   http://localhost:${PORT}/counter.html`);
  console.log(`📁 JSON Database:   ${CONTENT_FILE}`);
  console.log(`🔔 SSE Notifications: http://localhost:${PORT}/api/admin/notifications`);
  console.log('====================================================');
});
