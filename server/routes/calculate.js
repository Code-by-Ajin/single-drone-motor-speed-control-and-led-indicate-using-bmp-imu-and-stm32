const express = require('express');
const router  = express.Router();
const { calcBEM, calcPerformanceSweep } = require('../utils/thrustCalc');

// POST /api/calculate
router.post('/', (req, res) => {
  try {
    const {
      elevation    = 0,
      temperature  = 25,
      airSpeed     = 0,
      blades       = 2,
      diameter     = 5,
      pitch        = 4.5,
      rpm          = 10000,
      rootAirfoil  = 'NACA 4412',
      tipAirfoil   = 'Clark Y',
      bladeGeometry,
      throttle     = 1.0,
    } = req.body;

    const params = {
      elevation:   Number(elevation),
      temperature: Number(temperature),
      airSpeed:    Number(airSpeed),
      blades:      Number(blades),
      diameter:    Number(diameter),
      pitch:       Number(pitch),
      rpm:         Number(rpm),
      rootAirfoil,
      tipAirfoil,
      bladeGeometry,
      throttle:    Number(throttle),
    };

    const results = calcBEM(params);
    const sweep   = calcPerformanceSweep({ ...params, throttle: 1.0 });

    res.json({ results, sweep });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
