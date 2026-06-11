const express = require('express');
const router  = express.Router();
const Propeller = require('../models/Propeller');
const Fuse = require('fuse.js');

let fuseIndex = null;
let allProps   = [];

async function buildIndex() {
  try {
    allProps = await Propeller.find({}).lean();
    fuseIndex = new Fuse(allProps, {
      keys: ['name', 'brand', 'tags'],
      threshold: 0.45,
      includeScore: true,
    });
    console.log(`✅ Propeller index built (${allProps.length} props)`);
  } catch (err) {
    console.warn('⚠️  Propeller index build skipped (MongoDB unavailable):', err.message);
    fuseIndex = null;
  }
}

// Build index on startup and refresh every 5 min
buildIndex();
setInterval(buildIndex, 5 * 60 * 1000);

// GET /api/propellers/search?q=gemfan+3
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    // If index not ready (DB unavailable), return empty so client uses local fallback
    if (!fuseIndex) return res.json([]);

    const results = fuseIndex.search(q, { limit: 10 });
    const props = results.map(r => ({
      _id:          r.item._id,
      name:         r.item.name,
      brand:        r.item.brand,
      diameter:     r.item.diameter,
      pitch:        r.item.pitch,
      blades:       r.item.blades,
      rootAirfoil:  r.item.rootAirfoil,
      tipAirfoil:   r.item.tipAirfoil,
      bladeGeometry: r.item.bladeGeometry,
      score:        r.score,
    }));
    res.json(props);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/propellers/:id
router.get('/:id', async (req, res) => {
  try {
    const prop = await Propeller.findById(req.params.id);
    if (!prop) return res.status(404).json({ error: 'Not found' });
    res.json(prop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/propellers
router.get('/', async (req, res) => {
  try {
    const props = await Propeller.find({}).select('name brand diameter pitch blades').lean();
    res.json(props);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
