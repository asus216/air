# Diamond Airbus — Luxury Highway Coach Booking & Operations Suite

An end-to-end, real-time online bus ticketing system, Super Admin CMS, and Staff Counter POS engine built for **Diamond Airbus** (Nepal's premier luxury VIP night coach operator).

---

## 🚀 Key Portals

| Portal | URL | Purpose |
| :--- | :--- | :--- |
| **Public Customer Website** | `http://localhost:3000/` | Interactive 2x1 luxury sofa seat booking, live pricing, route schedules, digital QR payment with screenshot upload, and live PNR ticket status lookup. |
| **Super Admin CMS Console** | `http://localhost:3000/admin.html` | Real-time reservation approvals, payment verification, dynamic WordPress-style website CMS, interactive seat matrix inspector, fleet & route management, audio notifications. |
| **Staff Ticket Counter POS** | `http://localhost:3000/counter.html` | High-speed in-person counter ticketing, cash collection, instant thermal ticket printing, departure manifests, and staff role authentication. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**:
  - Semantic HTML5 with modern utility-based responsive styling.
  - Interactive Seat Matrix engine with multi-row custom bus layouts (sofa seats, single driver-side seats, bench seats, sleeper berths).
  - Real-time client sync via **Server-Sent Events (SSE)** and **BroadcastChannel API** (0ms cross-tab updates).
- **Dual Backend Options**:
  - **Python (`server.py`)**: Multi-threaded HTTP & SSE engine using standard library modules (**0 external dependencies required**). Compatible with Python 3.8+.
  - **Node.js (`server.js`)**: Express-based alternative with SSE notifications and CORS support.
- **Data Persistence**:
  - `data/site-content.json`: Live dynamic CMS configurations, fleet details, routes, pricing, and company information.
  - `data/bookings.json`: Reservation records, passenger details, payment audit logs, and seat assignments.
  - `receipts/`: Uploaded payment screenshots organized by transaction date.

---

## 🏃 Quick Start (Local Development)

### Option 1: 1-Click Windows Launcher (Recommended)
Double-click **`start.bat`**. This automatically launches the server on port `3000` and opens all 3 portals in your default browser.

### Option 2: Run with Python
```bash
python server.py
```
Visit `http://localhost:3000` in your web browser.

### Option 3: Run with Node.js
```bash
npm install
npm start
```
Visit `http://localhost:3000` in your web browser.

---

## 📁 Project Directory Structure

```text
diamond-airbus-website/
├── index.html                 # Main public booking website
├── admin.html                 # Super Admin Console & CMS interface
├── counter.html               # Staff Counter POS & Ticketing interface
├── main.js                    # Public website booking & dynamic seat map logic
├── app.js                     # Dynamic CMS content synchronizer & animations
├── admin.js                   # Super Admin logic, booking audits & CMS publishing
├── counter.js                 # Counter POS logic, offline ticket issuance & printing
├── style.css                  # Main website styles
├── admin.css                  # Admin console styles
├── counter.css                # Counter POS styles
├── server.py                  # Primary Python HTTP + SSE backend server
├── server.js                  # Alternative Node.js Express backend server
├── package.json               # Node.js project metadata & dependencies
├── requirements.txt           # Python environment specification
├── start.bat                  # Windows 1-click server launcher
├── start-hidden.vbs           # Windows silent background launcher
├── .gitignore                 # Git ignore rules for clean repository
├── data/
│   ├── site-content.json      # Dynamic website CMS content, routes & fleet data
│   └── bookings.json          # Booking records & seat occupancy database
└── receipts/                  # Payment receipt storage directory
    └── .gitkeep               # Directory structure keeper for Git
```

---

## 📦 Deploying to Git & Production

To initialize this repository and push to GitHub / GitLab:

```bash
# 1. Initialize Git repository
git init

# 2. Stage all organized files
git add .

# 3. Create initial commit
git commit -m "Initial commit: Diamond Airbus website, Super Admin CMS & Counter POS suite"

# 4. Link your remote repository (replace with your repo URL)
git branch -M main
git remote add origin https://github.com/your-username/diamond-airbus-website.git

# 5. Push to GitHub
git push -u origin main
```

---

## 🔐 Credentials & Access

- **Super Admin Passcode**: `Diamond@Admin2026` (configurable in `server.py` and `server.js`)
- **Staff Counter Passcodes**: Managed via Admin Panel under the **Staff & Roles** tab (`data/site-content.json`).

---

## 📄 License
Proprietary software for **Diamond Airbus (Pokharel Yatayat Sewa Pvt. Ltd.)**, Kathmandu, Nepal. All rights reserved.
