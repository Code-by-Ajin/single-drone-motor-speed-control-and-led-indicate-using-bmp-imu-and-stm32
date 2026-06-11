const assert = require('assert');
var maxCh = 10.1, ovhg = 2, spR = 2.5;
var scl = 10;
var AX = 100, xH = 50, spRpx = spR * scl;

var rootCEst = maxCh * 0.52, rootOEst = ovhg * 0.42;
var yRT_orig = AX - rootOEst * scl;
var yRB_orig = AX + (rootCEst - rootOEst) * scl;

var yRT = Math.max(yRT_orig, AX - spRpx * 0.85);
var yRB = Math.min(yRB_orig, AX + spRpx * 0.85);

console.log("Original yRT:", yRT_orig, " Clamped yRT:", yRT, " AX:", AX, " spRpx:", spRpx);
console.log("Original yRB:", yRB_orig, " Clamped yRB:", yRB);

