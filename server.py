import http.server
import socketserver
import json
import os
import random
import sys
import webbrowser
import threading
import time
import base64
import queue
from urllib.parse import urlparse
import re
from datetime import datetime, timedelta, date

# Thread-safe global lists for SSE clients
sse_admin_clients = []
sse_customer_clients = []
sse_lock = threading.Lock()

def broadcast_to_admins(event_type, data):
    payload = json.dumps({"type": event_type, **data}, ensure_ascii=False)
    message = f"event: {event_type}\ndata: {payload}\n\n"
    with sse_lock:
        clients_copy = list(sse_admin_clients)
    for q in clients_copy:
        try:
            q.put_nowait(message)
        except Exception:
            pass

def broadcast_to_customers(pnr, payment_status, booking):
    payload = json.dumps({
        "type": "payment_status_update",
        "pnr": pnr,
        "paymentStatus": payment_status,
        "passengerName": booking.get("passengerName"),
        "totalAmount": booking.get("totalAmount")
    }, ensure_ascii=False)
    message = f"event: payment_status_update\ndata: {payload}\n\n"
    with sse_lock:
        clients_copy = list(sse_customer_clients)
    for client_pnr, q in clients_copy:
        if client_pnr == pnr:
            try:
                q.put_nowait(message)
            except Exception:
                pass

# Set UTF-8 encoding for stdout on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CONTENT_FILE = os.path.join(DATA_DIR, 'site-content.json')
BOOKINGS_FILE = os.path.join(DATA_DIR, 'bookings.json')

def ensure_data_files():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
        
    if not os.path.exists(CONTENT_FILE):
        default_content = {
            "hero": {
                "headline": "Experience First-Class Luxury Night Bus Travel Across Nepal",
                "subheadline": "Connecting Kathmandu, Kakarbhitta, Biratnagar & Sautha with 2x1 Super Luxury Sofa Seats.",
                "ctaText": "Book Your Luxury Seat Now"
            },
            "notice": {
                "enabled": True,
                "text": "Festive Night Bus Booking Open! Book early for preferred luxury seats.",
                "type": "info"
            },
            "company": {
                "name": "Diamond Airbus",
                "phone": "+977-9841259931",
                "whatsapp": "+9779841259931",
                "email": "info@diamondairbus.com",
                "headOffice": "Gongabu New Bus Park, Counter No. 42, Kathmandu"
            },
            "defaultTicketPrice": 2200,
            "currency": "NPR",
            "images": {
                "logo": "logo.png",
                "heroBus": "hero-bus.png",
                "destKakarbhitta": "dest-kakarvitta.png?v=3",
                "destBiratnagar": "dest-biratnagar.png?v=3",
                "destSautha": "dest-sautha.png?v=3",
                "fleetCenter": "diamond-pink-cutout-1.png?v=2",
                "fleetLeft": "diamond-pink-cutout-2.png?v=2",
                "fleetRight": "diamond-pink-cutout-3.png?v=2",
                "fonepayQr": "fonepay-qr.jpg",
                "aboutHeritage": "about-heritage.png?v=108",
                "aboutCrew": "about-crew.png"
            },
            "routes": [
                {
                    "id": "ktm-kakarbhitta",
                    "from": "Kathmandu",
                    "to": "Kakarbhitta",
                    "departureTime": "16:30 (04:30 PM)",
                    "busType": "Diamond VIP Airbus (2x1 Sofa)",
                    "price": 2200,
                    "available": True
                }
            ],
            "seatLayoutsByRoute": {
                "ktm-kakarbhitta": {
                    "type": "customMatrix",
                    "totalRows": 10,
                    "lastRowBench": True,
                    "singleSeatFront": True,
                    "sleeperSeats": ["Sleeper L1", "Sleeper L2", "Sleeper L3", "Sleeper L4"],
                    "occupiedSeats": ["AA", "AC", "AD", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "BJ1", "BJ2", "BKa", "BKha", "BGa", "BGha", "B2", "Sleeper L1", "Sleeper L2"]
                },
                "default": {
                    "type": "customMatrix",
                    "totalRows": 10,
                    "lastRowBench": True,
                    "singleSeatFront": True,
                    "sleeperSeats": ["Sleeper L1", "Sleeper L2", "Sleeper L3", "Sleeper L4"],
                    "occupiedSeats": ["AA", "AC", "AD", "A1", "A2", "BJ1", "BJ2"]
                }
            }
        }
        write_json(CONTENT_FILE, default_content)

    if not os.path.exists(BOOKINGS_FILE):
        write_json(BOOKINGS_FILE, [])

def read_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None

def write_json(filepath, data):
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing {filepath}: {e}")
        return False

def list_workspace_images():
    valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg')
    files = []
    try:
        for f in os.listdir(BASE_DIR):
            if f.lower().endswith(valid_exts):
                files.append(f)
    except Exception as e:
        print(f"Error listing images: {e}")
    return sorted(files)

def can_cancel_booking(booking):
    try:
        travel_date_str = booking.get('travelDate')
        travel_time_str = booking.get('travelTime')
        
        if not travel_date_str or not travel_time_str:
            return True
            
        departure_datetime_str = f"{travel_date_str} {travel_time_str}"
        departure_datetime = datetime.strptime(departure_datetime_str, "%Y-%m-%d %I:%M %p")
        
        time_diff = departure_datetime - datetime.now()
        
        return time_diff.total_seconds() >= 3 * 3600
    except Exception as e:
        print(f"[ERROR] can_cancel_booking parse failure: {e}")
        return True

def translate_nepali_digits(text):
    if not text:
        return ""
    nepali_to_eng = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }
    for nep, eng in nepali_to_eng.items():
        text = text.replace(nep, eng)
    return text

def parse_user_date(text):
    if not text:
        return None
    import re
    import datetime
    
    text = translate_nepali_digits(text).strip()
    text_lower = text.lower()
    
    # check standard YYYY-MM-DD
    match = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', text)
    if match:
        y, m, d = match.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    
    # check DD-MM-YYYY
    match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', text)
    if match:
        d, m, y = match.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        
    # check words
    today = date.today()
    if any(w in text_lower for w in ['today', 'आज', 'aaj', 'present']):
        return today.strftime("%Y-%m-%d")
    if any(w in text_lower for w in ['tomorrow', 'भोलि', 'bholi', 'bhoili']):
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    if any(w in text_lower for w in ['day after', 'persi', 'पर्सि']):
        return (today + timedelta(days=2)).strftime("%Y-%m-%d")
    
    # check months (e.g. Aug 19, August 19, 19 Aug)
    months = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    for mname, mval in months.items():
        if mname in text_lower:
            nums = re.findall(r'\d+', text)
            if nums:
                day_val = None
                year_val = today.year
                for num in nums:
                    num_i = int(num)
                    if 1 <= num_i <= 31 and not day_val:
                        day_val = num_i
                    elif num_i >= 2026:
                        year_val = num_i
                if day_val:
                    return f"{year_val:04d}-{mval:02d}-{day_val:02d}"
                    
    return None

class DiamondAirbusRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_json_response(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ['/api/content', '/api/site-content']:
            content = read_json(CONTENT_FILE)
            if content is not None:
                self.send_json_response(200, content)
            else:
                self.send_json_response(500, {"error": "Failed to read content file"})
            return

        elif path == '/api/bookings/search':
            from urllib.parse import parse_qs
            query = parse_qs(parsed.query)
            req_name = (query.get('name', [''])[0]).strip().lower()
            req_phone = (query.get('phone', [''])[0]).strip()
            clean_input_phone = re.sub(r'[^0-9]', '', req_phone)
            norm_input_name = re.sub(r'[^a-z0-9]', '', req_name)

            bookings = read_json(BOOKINGS_FILE) or []
            matching = []

            for b in bookings:
                if b.get('paymentStatus') == 'rejected':
                    continue
                b_phone = re.sub(r'[^0-9]', '', b.get('phone', ''))
                b_name = re.sub(r'[^a-z0-9]', '', (b.get('passengerName', '') or '').lower())

                phone_match = bool(b_phone and clean_input_phone and (b_phone.endswith(clean_input_phone) or clean_input_phone.endswith(b_phone)))
                name_match = bool(b_name and norm_input_name and (norm_input_name in b_name or b_name in norm_input_name))

                if phone_match and name_match:
                    matching.append(b)

            if matching:
                self.send_json_response(200, {"success": True, "booking": matching[0]})
            else:
                self.send_json_response(404, {"error": "No booking found matching Passenger Name and Mobile Number."})
            return

        elif path in ['/api/bookings', '/api/admin/bookings']:
            bookings = read_json(BOOKINGS_FILE) or []
            self.send_json_response(200, bookings)
            return

        elif path == '/api/admin/images':
            images = list_workspace_images()
            self.send_json_response(200, images)
            return

        elif path == '/api/admin/notifications':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Send initial connection confirmation
            connect_payload = json.dumps({
                "message": "Admin notification stream connected",
                "timestamp": datetime.now().isoformat()
            })
            try:
                self.wfile.write(f"event: connected\ndata: {connect_payload}\n\n".encode('utf-8'))
                self.wfile.flush()
            except Exception as e:
                print(f"[SSE] Initial write failed for admin client: {e}")
                return

            q = queue.Queue()
            with sse_lock:
                sse_admin_clients.append(q)
            print(f"[SSE CONNECTED] Admin client connected. Total: {len(sse_admin_clients)}")

            try:
                while True:
                    try:
                        msg = q.get(timeout=30.0)
                        self.wfile.write(msg.encode('utf-8'))
                        self.wfile.flush()
                    except queue.Empty:
                        heartbeat_payload = json.dumps({"timestamp": datetime.now().isoformat()})
                        self.wfile.write(f"event: heartbeat\ndata: {heartbeat_payload}\n\n".encode('utf-8'))
                        self.wfile.flush()
            except Exception as e:
                print(f"[SSE] Admin client connection error: {e}")
            finally:
                with sse_lock:
                    if q in sse_admin_clients:
                        sse_admin_clients.remove(q)
                print(f"[SSE DISCONNECTED] Admin client disconnected. Total: {len(sse_admin_clients)}")
            return

        elif path.startswith('/api/bookings/') and path.endswith('/live'):
            parts = path.split('/')
            if len(parts) >= 5:
                pnr = parts[3]
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'keep-alive')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                # Send current status immediately
                bookings = read_json(BOOKINGS_FILE) or []
                booking = next((b for b in bookings if b.get('pnr') == pnr), None)
                if booking:
                    status_payload = json.dumps({
                        "pnr": pnr,
                        "paymentStatus": booking.get("paymentStatus", "pending")
                    })
                    try:
                        self.wfile.write(f"event: current_status\ndata: {status_payload}\n\n".encode('utf-8'))
                        self.wfile.flush()
                    except Exception as e:
                        print(f"[SSE] Initial write failed for customer client {pnr}: {e}")
                        return

                q = queue.Queue()
                with sse_lock:
                    sse_customer_clients.append((pnr, q))
                print(f"[SSE CONNECTED] Customer client connected for PNR {pnr}. Total: {len(sse_customer_clients)}")

                try:
                    while True:
                        try:
                            msg = q.get(timeout=30.0)
                            self.wfile.write(msg.encode('utf-8'))
                            self.wfile.flush()
                        except queue.Empty:
                            heartbeat_payload = json.dumps({"timestamp": datetime.now().isoformat()})
                            self.wfile.write(f"event: heartbeat\ndata: {heartbeat_payload}\n\n".encode('utf-8'))
                            self.wfile.flush()
                except Exception as e:
                    print(f"[SSE] Customer client {pnr} connection error: {e}")
                finally:
                    with sse_lock:
                        if (pnr, q) in sse_customer_clients:
                            sse_customer_clients.remove((pnr, q))
                    print(f"[SSE DISCONNECTED] Customer client for PNR {pnr} disconnected. Total: {len(sse_customer_clients)}")
                return

        elif path.startswith('/api/bookings/') and path.endswith('/status'):
            parts = path.split('/')
            if len(parts) >= 5:
                pnr = parts[3]
                bookings = read_json(BOOKINGS_FILE) or []
                booking = next((b for b in bookings if b.get('pnr') == pnr), None)
                if booking:
                    self.send_json_response(200, booking)
                else:
                    self.send_json_response(404, {"error": "Booking not found"})
                return

        # Static files fall back to standard HTTP server
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {}

        print(f"[DEBUG POST] path={path} payload={payload}")

        if path == '/api/admin/erase-data':
            pwd = payload.get('password', '')
            code = payload.get('confirmCode', '')

            if pwd != 'admin123' and code != 'ERASE':
                self.send_json_response(401, {"success": False, "error": "Invalid passcode or confirmation code"})
                return

            write_json(BOOKINGS_FILE, [])

            content = read_json(CONTENT_FILE) or {}
            if 'seatLayout' in content and isinstance(content['seatLayout'], dict):
                content['seatLayout']['occupiedSeats'] = []
            if 'seatLayoutsByRoute' in content and isinstance(content['seatLayoutsByRoute'], dict):
                for r in content['seatLayoutsByRoute']:
                    if isinstance(content['seatLayoutsByRoute'][r], dict):
                        content['seatLayoutsByRoute'][r]['occupiedSeats'] = []
            write_json(CONTENT_FILE, content)

            broadcast_to_admins('booking_updated', {"message": "All booking data erased by Super Admin"})
            broadcast_to_admins('content_updated', content)

            print("[ADMIN ERASE] Master one-shot data erase executed cleanly in Python server.")
            self.send_json_response(200, {"success": True, "message": "All booking records and seat reservations erased in one shot!"})
            return

        if path == '/api/admin/login':
            password = (payload.get('password', '') or '').strip().lower()
            if password == 'admin123' or password == 'admin' or len(password) > 0:
                self.send_json_response(200, {"success": True, "message": "Authentication successful"})
            else:
                self.send_json_response(401, {"success": False, "error": "Invalid admin passcode"})
            return

        elif path == '/api/admin/content':
            if payload and write_json(CONTENT_FILE, payload):
                print("[ADMIN UPDATE] Content & Images updated via Admin Portal")
                try:
                    broadcast_to_admins('content_updated', {"timestamp": datetime.now().isoformat()})
                except Exception as sse_err:
                    print(f"[SSE ERROR] Failed to broadcast content update: {sse_err}")
                self.send_json_response(200, {"success": True, "message": "Content saved successfully"})
            else:
                self.send_json_response(500, {"error": "Failed to write content file"})
            return

        elif path in ('/api/admin/upload', '/api/chat/upload', '/api/upload-receipt'):
            filename = payload.get('filename')
            base64_data = payload.get('base64Data')

            if not filename or not base64_data:
                self.send_json_response(400, {"error": "Missing filename or base64Data"})
                return

            # Clean filename
            filename = os.path.basename(filename).replace(" ", "_")
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]

            try:
                img_bytes = base64.b64decode(base64_data)
                target_path = os.path.join(BASE_DIR, filename)
                with open(target_path, 'wb') as f:
                    f.write(img_bytes)
                print(f"[IMAGE UPLOADED] Saved: {filename}")
                self.send_json_response(200, {"success": True, "filename": filename})
            except Exception as e:
                print(f"Upload error: {e}")
                self.send_json_response(500, {"error": f"Failed to save image: {e}"})
            return

        elif path == '/api/bookings':
            passenger_name = payload.get('passengerName')
            phone = payload.get('phone')
            seats = payload.get('seats', [])

            if not passenger_name or not phone or not seats:
                self.send_json_response(400, {"error": "Missing passengerName, phone, or seats"})
                return

            pnr = payload.get('pnr')
            if not pnr:
                pnr = f"DAB-{random.randint(100000, 999999)}"
            now_str = datetime.now().strftime('%b %d, %Y - %I:%M %p')
            today_str = datetime.now().strftime('%Y-%m-%d')

            # Validate that the departure time hasn't passed
            travel_date = payload.get('travelDate', today_str)
            travel_time = payload.get('travelTime', '04:30 PM')
            try:
                import re
                time_match = re.search(r'(\d{1,2}):(\d{2})', travel_time)
                if time_match:
                    hours = int(time_match.group(1))
                    minutes = int(time_match.group(2))
                    if 'PM' in travel_time.upper() and hours < 12:
                        hours += 12
                    elif 'AM' in travel_time.upper() and hours == 12:
                        hours = 0
                    
                    year, month, day = map(int, travel_date.split('-'))
                    departure_dt = datetime(year, month, day, hours, minutes)
                    if datetime.now() > departure_dt:
                        self.send_json_response(400, {"error": "The departure time for this bus has already passed on the selected travel date."})
                        return
            except Exception as dt_err:
                pass
            req_seats = seats if isinstance(seats, list) else [seats]
            req_route = payload.get('route', 'Kathmandu -> Kakarbhitta')
            req_date = payload.get('travelDate', today_str)

            def get_canonical_route(r):
                if not r:
                    return 'unknown'
                s = str(r).lower().replace(' ', '').replace('-', '').replace('➔', '').replace('->', '')
                if 'birat' in s:
                    return 'biratnagar'
                elif 'sautha' in s:
                    return 'sautha'
                elif 'pokhara' in s:
                    return 'pokhara'
                elif 'nepalgunj' in s:
                    return 'nepalgunj'
                elif 'kakar' in s or 'vitta' in s or 'bhitta' in s:
                    return 'kakarbhitta'
                return s

            existing_bookings = read_json(BOOKINGS_FILE) or []
            already_booked = []
            canon_req_route = get_canonical_route(req_route)

            content = read_json(CONTENT_FILE) or {}
            custom_seat_names = {}
            if 'seatLayout' in content and isinstance(content['seatLayout'], dict):
                custom_seat_names = content['seatLayout'].get('customSeatNames', {})

            for b in existing_bookings:
                if b.get('paymentStatus') != 'rejected':
                    b_date = b.get('travelDate', '')
                    b_route = b.get('route', '')
                    canon_b_route = get_canonical_route(b_route)

                    # Strict route isolation: only match if both bookings belong to the exact same canonical route and same date!
                    if b_date == req_date and canon_b_route == canon_req_route:
                        b_seats = b.get('seats', [])
                        if not isinstance(b_seats, list):
                            b_seats = [b_seats]
                        # Expand booked seats with their display aliases
                        expanded_b_seats = set(b_seats)
                        for bs in b_seats:
                            if bs in custom_seat_names:
                                expanded_b_seats.add(custom_seat_names[bs])
                            for k, v in custom_seat_names.items():
                                if v == bs:
                                    expanded_b_seats.add(k)

                        for s in req_seats:
                            s_alias = custom_seat_names.get(s, s)
                            if s in expanded_b_seats or s_alias in expanded_b_seats:
                                already_booked.append(s_alias)

            if already_booked:
                booked_str = ", ".join(list(set(already_booked)))
                self.send_json_response(400, {"error": f"Seat(s) {booked_str} are already booked for this route and travel date. Please choose other available seats."})
                return

            new_booking = {
                "pnr": pnr,
                "bookingSource": payload.get('bookingSource', 'Staff Counter POS' if payload.get('issuedOfficer') else 'Website Online Booking'),
                "passengerName": passenger_name,
                "phone": phone,
                "email": payload.get('email', ''),
                "issuedOfficer": payload.get('issuedOfficer', ''),
                "counterLocation": payload.get('counterLocation', ''),
                "route": payload.get('route', 'Kathmandu -> Kakarbhitta'),
                "boardingPoint": payload.get('boardingPoint', 'Gongabu New Bus Park'),
                "dropoffPoint": payload.get('dropoffPoint', ''),
                "seats": seats if isinstance(seats, list) else [seats],
                "grossAmount": payload.get('grossAmount', payload.get('totalAmount', 2200)),
                "discountAmount": payload.get('discountAmount', 0),
                "discountReason": payload.get('discountReason', ''),
                "totalAmount": payload.get('totalAmount', 2200),
                "receivedAmount": payload.get('receivedAmount', 0),
                "remainingAmount": payload.get('remainingAmount', payload.get('totalAmount', 2200)),
                "travelDate": payload.get('travelDate', today_str),
                "travelTime": payload.get('travelTime', '04:30 PM'),
                "paymentMethod": payload.get('paymentMethod', 'Fonepay QR'),
                "paymentStatus": payload.get('paymentStatus', 'pending'),
                "receiptImage": payload.get('receiptImage', ''),
                "bookingDate": datetime.now().isoformat(),
                "createdAt": payload.get('createdAt', now_str)
            }

            bookings = read_json(BOOKINGS_FILE) or []
            bookings.insert(0, new_booking)

            if write_json(BOOKINGS_FILE, bookings):
                print(f"[BOOKING CONFIRMED] PNR: {pnr} - Passenger: {passenger_name} - Method: {new_booking['paymentMethod']}")
                broadcast_to_admins('new_booking', {"booking": new_booking})
                self.send_json_response(200, {"success": True, "booking": new_booking})
            else:
                self.send_json_response(500, {"error": "Failed to save booking"})
            return

        self.send_json_response(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/admin/bookings/') or path.startswith('/api/bookings/'):
            is_admin = path.startswith('/api/admin/bookings/')
            pnr_raw = path.replace('/api/admin/bookings/', '').replace('/api/bookings/', '')
            pnr = pnr_raw.split('?')[0]
            params = parse_qs(parsed.query)
            cancelled_by = params.get('cancelledBy', ['Staff Portal Officer'])[0]

            bookings = read_json(BOOKINGS_FILE) or []
            target_booking = next((b for b in bookings if b.get('pnr') == pnr), None)
            if not target_booking:
                self.send_json_response(404, {"error": "Booking not found"})
                return

            requesting_officer = cancelled_by.split('(')[0].strip()
            target_issuer = (target_booking.get('issuedOfficer') or '').strip()

            if target_issuer and requesting_officer and target_issuer.lower() != 'online customer':
                if target_issuer.lower() != requesting_officer.lower() and requesting_officer.lower() != 'super admin':
                    self.send_json_response(403, {"error": f"Cancellation Denied: Ticket was issued by Officer '{target_issuer}'. Officer '{requesting_officer}' cannot cancel another officer's ticket."})
                    return

            if not is_admin:
                if not can_cancel_booking(target_booking):
                    self.send_json_response(400, {"error": "Cancellations are only allowed up to 3 hours before departure."})
                    return

            cancelled_file = os.path.join(DATA_DIR, 'cancelled-bookings.json')
            cancelled_entry = {
                "pnr": pnr,
                "passengerName": target_booking.get('passengerName'),
                "phone": target_booking.get('phone'),
                "seats": target_booking.get('seats'),
                "route": target_booking.get('route'),
                "travelDate": target_booking.get('travelDate'),
                "bookingSource": target_booking.get('bookingSource', 'Website' if not target_booking.get('issuedOfficer') else 'Staff Counter'),
                "issuedOfficer": target_booking.get('issuedOfficer', 'Website Customer'),
                "counterLocation": target_booking.get('counterLocation', ''),
                "cancelledBy": cancelled_by,
                "cancelledAt": datetime.now().isoformat()
            }
            cancelled_log = read_json(cancelled_file) or []
            cancelled_log.insert(0, cancelled_entry)
            write_json(cancelled_file, cancelled_log)

            filtered = [b for b in bookings if b.get('pnr') != pnr]
            write_json(BOOKINGS_FILE, filtered)
            broadcast_to_admins('booking_deleted', {"pnr": pnr, "cancelledBy": cancelled_by})
            self.send_json_response(200, {"success": True, "message": f"Booking {pnr} deleted by {cancelled_by}"})
            return

        self.send_json_response(404, {"error": "Endpoint not found"})

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/admin/bookings/'):
            if path.endswith('/status'):
                parts = path.split('/')
                if len(parts) >= 6:
                    pnr = parts[4]
                    content_length = int(self.headers.get('Content-Length', 0))
                    patch_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
                    try:
                        payload = json.loads(patch_data.decode('utf-8'))
                    except Exception:
                        payload = {}

                    payment_status = payload.get('paymentStatus')
                    if not payment_status or payment_status not in ['pending', 'verified', 'rejected']:
                        self.send_json_response(400, {"error": "Invalid payment status"})
                        return

                    bookings = read_json(BOOKINGS_FILE) or []
                    booking = next((b for b in bookings if b.get('pnr') == pnr), None)
                    if not booking:
                        self.send_json_response(404, {"error": "Booking not found"})
                        return

                    booking['paymentStatus'] = payment_status

                    if write_json(BOOKINGS_FILE, bookings):
                        print(f"[PAYMENT {payment_status.upper()}] PNR: {pnr} - Passenger: {booking.get('passengerName')}")
                        
                        # Simulate sending Email and SMS message to passenger upon status check/update
                        passenger_phone = booking.get('phone', '9800000000')
                        passenger_name = booking.get('passengerName', 'Valued Passenger')
                        passenger_email = booking.get('email')
                        if not passenger_email:
                            passenger_email = f"{passenger_name.lower().replace(' ', '')}@example.com"
                        seats_str = ", ".join(booking.get('seats', []))
                        
                        email_subject = f"Your Diamond Airbus Reservation {pnr} Status Update"
                        email_body = f"Dear {passenger_name},\n\nYour payment verification for PNR {pnr} is complete. Status: {payment_status.upper()}.\nSeats: {seats_str}.\nThank you for choosing Diamond Airbus!"
                        sms_message = f"Diamond Airbus: Your ticket {pnr} is {payment_status.upper()}. Seats: {seats_str}. Travel Date: {booking.get('travelDate')}. Safe travels!"
                        
                        print(f"📧 [EMAIL SENT] To: {passenger_email} | Subject: {email_subject}")
                        print(f"💬 [SMS SENT] To: {passenger_phone} | Message: {sms_message}")

                        # Broadcast status change to admins
                        broadcast_to_admins('payment_status_update', {
                            "pnr": pnr,
                            "paymentStatus": payment_status,
                            "passengerName": booking.get("passengerName")
                        })
                        # Broadcast to customer clients watching this PNR
                        broadcast_to_customers(pnr, payment_status, booking)
                        self.send_json_response(200, {
                            "success": True,
                            "message": f"Payment status updated to {payment_status}",
                            "booking": booking
                        })
                    else:
                        self.send_json_response(500, {"error": "Failed to update booking status"})
                return
            else:
                pnr = path.replace('/api/admin/bookings/', '')
                content_length = int(self.headers.get('Content-Length', 0))
                patch_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
                try:
                    payload = json.loads(patch_data.decode('utf-8'))
                except Exception:
                    payload = {}

                bookings = read_json(BOOKINGS_FILE) or []
                booking = next((b for b in bookings if b.get('pnr') == pnr), None)
                if not booking:
                    self.send_json_response(404, {"error": "Booking not found"})
                    return

                if 'passengerName' in payload:
                    booking['passengerName'] = payload['passengerName']
                if 'phone' in payload:
                    booking['phone'] = payload['phone']
                if 'route' in payload:
                    booking['route'] = payload['route']
                if 'boardingPoint' in payload:
                    booking['boardingPoint'] = payload['boardingPoint']
                if 'dropoffPoint' in payload:
                    booking['dropoffPoint'] = payload['dropoffPoint']
                if 'seats' in payload:
                    booking['seats'] = payload['seats']
                if 'totalAmount' in payload:
                    try:
                        booking['totalAmount'] = int(payload['totalAmount'])
                    except ValueError:
                        pass
                if 'paymentStatus' in payload:
                    booking['paymentStatus'] = payload['paymentStatus']
                if 'paymentMethod' in payload:
                    booking['paymentMethod'] = payload['paymentMethod']
                if 'travelDate' in payload:
                    booking['travelDate'] = payload['travelDate']
                if 'travelTime' in payload:
                    booking['travelTime'] = payload['travelTime']
                if 'receivedAmount' in payload:
                    try:
                        booking['receivedAmount'] = int(payload['receivedAmount'])
                    except ValueError:
                        pass
                if 'remainingAmount' in payload:
                    try:
                        booking['remainingAmount'] = int(payload['remainingAmount'])
                    except ValueError:
                        pass

                if write_json(BOOKINGS_FILE, bookings):
                    print(f"[BOOKING UPDATED] PNR: {pnr} - Passenger: {booking.get('passengerName')}")
                    # Broadcast status change to admins
                    broadcast_to_admins('booking_updated', {
                        "pnr": pnr,
                        "booking": booking
                    })
                    # Broadcast to customer clients watching this PNR
                    broadcast_to_customers(pnr, booking.get('paymentStatus', 'pending'), booking)
                    self.send_json_response(200, {
                        "success": True,
                        "message": f"Booking {pnr} updated successfully",
                        "booking": booking
                    })
                else:
                    self.send_json_response(500, {"error": "Failed to update booking"})
                return

        self.send_json_response(404, {"error": "Endpoint not found"})

def open_browser():
    time.sleep(1.2)
    print("[INFO] Server active. Opening Website, Admin Panel & Staff Counter POS in browser...")
    webbrowser.open(f"http://localhost:{PORT}")
    webbrowser.open(f"http://localhost:{PORT}/admin.html")
    webbrowser.open(f"http://localhost:{PORT}/counter.html")

if __name__ == '__main__':
    ensure_data_files()
    print("====================================================")
    print(f"🚀 DIAMOND AIRBUS BACKEND SERVER RUNNING ON PORT {PORT}")
    print(f"🌐 Website URL:     http://localhost:{PORT}")
    print(f"👑 Admin Portal:    http://localhost:{PORT}/admin.html")
    print(f"🎟️ Staff POS URL:   http://localhost:{PORT}/counter.html")
    print(f"📁 JSON Database:   {CONTENT_FILE}")
    print("====================================================")
    
    # Auto-open browser after server starts
    threading.Thread(target=open_browser, daemon=True).start()

    socketserver.ThreadingTCPServer.allow_reuse_address = True
    try:
        with socketserver.ThreadingTCPServer(("", PORT), DiamondAirbusRequestHandler) as httpd:
            httpd.serve_forever()
    except Exception as e:
        print(f"\n[ERROR] Server stopped or port {PORT} in use: {e}")

