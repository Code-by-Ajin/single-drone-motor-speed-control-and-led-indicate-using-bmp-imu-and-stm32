const express = require('express');
const router = express.Router();
const TestSession = require('../models/TestSession');

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await TestSession.find().sort({ date: -1 }).select('-dataPoints');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const session = await TestSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions
router.post('/', async (req, res) => {
  try {
    const session = new TestSession(req.body);
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/log
router.post('/:id/log', async (req, res) => {
  try {
    const session = await TestSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    
    session.dataPoints.push(req.body);
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
