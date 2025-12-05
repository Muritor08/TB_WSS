# How to Run the TradeBridge WebSocket Client

## Step-by-Step Instructions

### 1. Start the Development Server
```bash
npm run dev
```

You should see:
```
▲ Next.js 16.0.5 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://10.13.26.29:3000
✓ Ready in 562ms
```

### 2. Open Your Browser
- Go to: **http://localhost:3000**
- You'll see the Login page

### 3. Login Process
1. **Enter your credentials** (User ID, API Key, etc.)
2. Click **Login** or **Send OTP**
3. You'll be redirected to the OTP page (`/otp`)

### 4. Verify OTP
1. **Enter the OTP code** you received
2. Click **Verify OTP**
3. The WebSocket connection will start automatically

### 5. View Logs

#### Option A: Browser UI (Event Logs Section)
- Scroll down on the OTP page
- You'll see an **"Event Logs"** section
- All logs appear here in real-time
- This includes:
  - Connection status
  - Subscription messages
  - Decoded market data
  - Error messages

#### Option B: Browser Console (Developer Tools)
1. **Open Developer Tools:**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)
   - Or right-click → "Inspect" → "Console" tab

2. **View Console Logs:**
   - All logs will also appear in the browser console
   - This is useful for debugging

### 6. What You Should See

When connected and receiving data:
```
✅ Connected to TradeBridge WebSocket
📨 Subscription message sent
📥 Waiting for market data...
📥 Received message (type: ArrayBuffer)
📥 Binary data: 35 bytes
📦 Packet - length: XX, type: 49
═══════════════════════════════════════════════════════
📊 MARKET DATA (X fields decoded):
═══════════════════════════════════════════════════════
  symbol         : 11536_NSE
  ltp            : 1,234.56
  open           : 1,200.00
  ...
═══════════════════════════════════════════════════════
```

## Troubleshooting

### Logs Not Showing?
1. **Check Browser Console** (F12) for errors
2. **Refresh the page** (Ctrl+R or F5)
3. **Check Network tab** in DevTools to see WebSocket connection
4. **Verify you're on the `/otp` page** after login

### WebSocket Not Connecting?
- Check if the access token is valid
- Verify API credentials are correct
- Check browser console for connection errors

### No Data Received?
- Wait a few seconds (data comes in real-time)
- Check if symbols are subscribed correctly
- Verify market is open (if applicable)

## Quick Reference

| Where | What to See |
|-------|-------------|
| **Terminal** | Server logs, compilation status |
| **Browser UI** | Event Logs section (on `/otp` page) |
| **Browser Console** | All logs + errors (F12) |
| **Network Tab** | WebSocket connection status |

## Notes

- The logs appear in **BOTH** the UI and browser console
- Keep the browser console open for debugging
- The Event Logs section auto-scrolls to show latest messages
- Maximum 300 log entries are kept in memory

