(function() {
  const script = document.currentScript;
  const token = script.getAttribute('data-token');
  const endpoint = script.src.replace('/tracker.js', '/api/track');
  
  if (!token) return;

  let seconds = 0;
  setInterval(() => {
    seconds += 5;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, duration: 5 })
    }).catch(() => {});
  }, 5000);
})();
