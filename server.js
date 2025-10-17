// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const THROTTLE_SECONDS = parseInt(process.env.THROTTLE_SECONDS || '10', 10);

// Safety checks
if (!BOT_TOKEN || !CHAT_ID) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in env.');
  process.exit(1);
}

let currentCount = 0;
let lastSentCount = null;
let lastSentAt = 0;

// Helper: send message to Telegram
async function sendTelegramMessage(text) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error('Telegram send error:', err?.response?.data || err.message);
  }
}

// Throttled updater: call when count changes
function maybeNotifyTelegram() {
  const now = Date.now();
  const secsSinceLast = (now - lastSentAt) / 1000;

  // Only send if different OR enough time passed (to avoid spam)
  if (currentCount !== lastSentCount && secsSinceLast >= THROTTLE_SECONDS) {
    const msg = `<b>Website viewers:</b> ${currentCount}\nTime: ${new Date().toLocaleString()}`;
    sendTelegramMessage(msg);
    lastSentCount = currentCount;
    lastSentAt = now;
  } else {
    // If count changed but throttled, schedule a forced send after remaining time
    if (currentCount !== lastSentCount) {
      const wait = Math.max(0, THROTTLE_SECONDS * 1000 - (now - lastSentAt));
      clearTimeout(maybeNotifyTelegram._timer);
      maybeNotifyTelegram._timer = setTimeout(() => {
        const msg = `<b>Website viewers:</b> ${currentCount}\nTime: ${new Date().toLocaleString()}`;
        sendTelegramMessage(msg);
        lastSentCount = currentCount;
        lastSentAt = Date.now();
      }, wait);
    }
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Each client that opens page will emit 'viewer:join' from client (see client code)
  // But we can also count sockets directly as fallback:
  currentCount = io.engine.clientsCount; // simple connected sockets count
  console.log('New socket connected, total', currentCount);
  maybeNotifyTelegram();

  socket.on('disconnect', () => {
    currentCount = io.engine.clientsCount;
    console.log('Socket disconnected, total', currentCount);
    maybeNotifyTelegram();
  });

  // Optional: client can send heartbeat or custom events if you prefer
  socket.on('viewer:heartbeat', () => {
    // nothing needed for now
  });
});

// Simple API to get current count
app.get('/api/viewers', (req, res) => {
  res.json({ viewers: currentCount });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
