const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://thrust-calculator.onrender.com/api';

const API = {
  async calculateThrust(params) {
    try {
      const res = await fetch(`${API_BASE}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  async getPropellers() {
    const res = await fetch(`${API_BASE}/propellers`);
    if (!res.ok) throw new Error('Failed to fetch propellers');
    return await res.json();
  },

  async searchProps(query) {
    if (!query) return [];
    try {
      const res = await fetch(`${API_BASE}/propellers/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err) {
      console.warn('Backend unavailable, falling back to local propeller DB:', err.message);
      // Fallback: search the local propellerDB bundled in propellerDB.js
      if (window.PropellerDB && window.Fuse) {
        const fuse = new window.Fuse(window.PropellerDB, {
          keys: ['name', 'brand', 'tags'],
          threshold: 0.45,
        });
        return fuse.search(query, { limit: 10 }).map(r => r.item);
      }
      return [];
    }
  },

  async createSession(sessionData) {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    if (!res.ok) throw new Error('Failed to create session');
    return await res.json();
  },

  async logSessionData(sessionId, dataPoint) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataPoint)
    });
    if (!res.ok) throw new Error('Failed to log data point');
    return await res.json();
  }
};
