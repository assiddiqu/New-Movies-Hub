<!-- viewer-client.js - include this script on every webpage you want tracked -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
  (function() {
    // Connect to server (change origin if hosted elsewhere)
    const socket = io(); // assumes same origin; or io('https://your-server.com')
    // Emit join (not strictly necessary since socket connect counts)
    socket.emit('viewer:join');

    // Optional: send regular heartbeat to keep connection alive
    setInterval(() => {
      socket.emit('viewer:heartbeat');
    }, 20_000);

    // You can also show live count on page by polling API:
    async function updateLocalBadge() {
      try {
        const r = await fetch('/api/viewers');
        const j = await r.json();
        let el = document.getElementById('live-viewers-badge');
        if (!el) {
          el = document.createElement('div');
          el.id = 'live-viewers-badge';
          el.style.position = 'fixed';
          el.style.right = '12px';
          el.style.bottom = '12px';
          el.style.padding = '8px 10px';
          el.style.background = 'rgba(0,0,0,0.6)';
          el.style.color = '#fff';
          el.style.borderRadius = '8px';
          el.style.fontFamily = 'sans-serif';
          el.style.zIndex = 9999;
          document.body.appendChild(el);
        }
        el.textContent = 'Live viewers: ' + j.viewers;
      } catch(e) {
        // ignore
      }
    }
    setInterval(updateLocalBadge, 3000);
    updateLocalBadge();
  })();
</script>
