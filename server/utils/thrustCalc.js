/**
 * BEM (Blade Element Momentum) Thrust Calculation Engine
 * Based on standard aerodynamic formulas used in propeller analysis tools.
 */

// Airfoil Cl/Cd data (simplified polar approximations)
const AIRFOIL_DATA = {
  'NACA 4412': { clMax: 1.4, clAlpha: 0.11, cdMin: 0.008, camber: 0.04 },
  'Clark Y':   { clMax: 1.35, clAlpha: 0.105, cdMin: 0.009, camber: 0.038 },
  'NACA 0012': { clMax: 1.1,  clAlpha: 0.109, cdMin: 0.006, camber: 0.0 },
  'NACA 2412': { clMax: 1.3,  clAlpha: 0.11,  cdMin: 0.007, camber: 0.02 },
  'NACA 6412': { clMax: 1.5,  clAlpha: 0.112, cdMin: 0.009, camber: 0.06 },
  'E63':       { clMax: 1.2,  clAlpha: 0.108, cdMin: 0.0075, camber: 0.03 },
  'ARA-D':     { clMax: 1.45, clAlpha: 0.113, cdMin: 0.0085, camber: 0.045 },
};

function getAirfoilData(name) {
  return AIRFOIL_DATA[name] || AIRFOIL_DATA['NACA 4412'];
}

function calcAirDensity(elevationM, tempC) {
  const T = tempC + 273.15; // Kelvin
  const P0 = 101325; // Pa at sea level
  const T0 = 288.15; // K at sea level
  const L  = 0.0065; // K/m lapse rate
  const g  = 9.80665;
  const R  = 287.058; // J/(kg·K)
  const M  = 0.0289644; // kg/mol
  const Rstar = 8.3144598;

  const P = P0 * Math.pow((T0 - L * elevationM) / T0, (g * M) / (Rstar * L));
  const rho = P / (R * T);
  return rho;
}

function calcViscosity(tempC) {
  const T = tempC + 273.15;
  const mu0 = 1.716e-5;
  const T0  = 273.15;
  const C   = 110.4;
  return mu0 * Math.pow(T / T0, 1.5) * ((T0 + C) / (T + C));
}

function calcBEM(params) {
  const {
    blades = 2,
    diameter = 5,
    pitch = 4.5,
    bladeGeometry,
    elevation = 0,
    temperature = 25,
    airSpeed = 0,
    rpm = 10000,
    throttle = 1.0,
  } = params;

  const D = diameter * 0.0254; // m
  const p_in = pitch;
  const D_in = diameter;
  
  const n = (rpm * throttle) / 60; // rev/s
  const Omega = 2 * Math.PI * n;
  const V = (airSpeed / 3.6); // m/s

  const rho = calcAirDensity(elevation, temperature);
  const mu  = calcViscosity(temperature);

  const J = n > 0 ? V / (n * D) : 0;
  const A = Math.PI * (D/2) * (D/2);

  const geo = bladeGeometry || {};
  const chordRoot = (parseFloat(geo.chord27) || (D * 0.12)) / 1000;
  const chordTip  = (parseFloat(geo.trailingTip) || (D * 0.04)) / 1000;
  const maxChord  = (parseFloat(geo.maxChord) || (D * 0.13)) / 1000;

  const cMean = 0.6 * maxChord + 0.3 * chordRoot + 0.1 * chordTip;

  // --- Empirical "Perfect Formula" (eCalc / Boucher style) ---
  const pRatio = p_in / D_in;
  const cMeanRatio = Math.max(0.01, cMean / D);
  const areaScale = (cMeanRatio / 0.106) * (blades / 2); // normalize to avg 2-blade

  const Ct0 = 0.2196 * pRatio * areaScale;
  const Cp0 = 0.1060 * pRatio * areaScale;

  const J0 = pRatio;
  let Ct_flight = Ct0 * Math.max(0, 1 - (J / J0));
  let Cp_flight = Cp0 * Math.max(0.2, 1 - (J / J0));

  if (J > J0) Ct_flight = 0; // propeller acting as windmill

  const Ct = Ct_flight;
  const Cp = Cp_flight;

  const T_thrust = Ct * rho * Math.pow(n, 2) * Math.pow(D, 4);
  const P_power = Cp * rho * Math.pow(n, 3) * Math.pow(D, 5);

  const Q = n > 0 ? P_power / (2 * Math.PI * n) : 0;
  const Cq = n > 0 ? Q / (rho * n * n * Math.pow(D, 5)) : 0;
  
  const diskLoad = A > 0 ? T_thrust / A : 0;
  const specificThrust = P_power > 0 ? (T_thrust * 1000 / 9.80665) / P_power : 0;

  const r70 = 0.7 * (D/2);
  const Vrel70 = n > 0 ? Math.sqrt(Math.pow(V, 2) + Math.pow(Omega * r70, 2)) : 0;
  const Re70 = (rho * Vrel70 * cMean) / mu;

  function rpmForThrust(targetN) {
    if (Ct <= 0) return 0;
    const nReq = Math.sqrt(targetN / (Ct * rho * Math.pow(D, 4)));
    return nReq * 60;
  }
  function rpmForPower(targetW) {
    if (Cp <= 0) return 0;
    const nReq = Math.pow(targetW / (Cp * rho * Math.pow(D, 5)), 1 / 3);
    return nReq * 60;
  }

  return {
    thrust: T_thrust, 
    thrustG: T_thrust * 1000 / 9.80665, 
    Ct: Math.max(0, Ct),
    Cp: Math.max(0, Cp),
    shaftPower: P_power, 
    torque: Q, 
    Cq: Math.max(0, Cq),
    specificThrust, 
    airDensity: rho, 
    viscosity: mu, 
    Re: Math.round(Re70),
    diskLoad, 
    J,
    n10N: Math.round(rpmForThrust(10)),
    n100W: Math.round(rpmForPower(100)),
  };
}

function calcPerformanceSweep(params) {
  const rows = [];
  const { rpm = 10000, diameter = 5 } = params;
  const D = diameter * 0.0254;
  const n = rpm / 60;

  for (let ji = 0; ji <= 30; ji++) {
    const J = ji * 0.02;
    const V_kmh = J * n * D * 3.6;
    const p = { ...params, airSpeed: V_kmh };
    const r = calcBEM(p);
    const eta = r.Ct > 0 && r.Cp > 0 ? (r.Ct / r.Cp) * J : 0;
    rows.push({
      J: parseFloat(J.toFixed(3)),
      v: parseFloat(V_kmh.toFixed(1)),
      Ct: parseFloat(r.Ct.toFixed(4)),
      Cp: parseFloat(r.Cp.toFixed(4)),
      eta: parseFloat((eta * 100).toFixed(1)),
      T: Math.round(r.thrustG),
      P: Math.round(r.shaftPower),
      Re: r.Re || 0,
    });
  }
  return rows;
}

module.exports = { calcBEM, calcPerformanceSweep, calcAirDensity, calcViscosity };
