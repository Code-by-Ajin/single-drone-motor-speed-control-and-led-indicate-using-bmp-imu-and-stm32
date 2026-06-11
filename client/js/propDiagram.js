/**
 * PropDiagram — Precision engineering propeller planform SVG generator.
 *
 * Coordinate system:
 *   X axis  = spanwise direction (hub → tip, left → right)
 *   Y axis  = chordwise direction (leading edge = top, trailing edge = bottom)
 *   Origin  = spinner centre on the chord axis
 *
 * All geometry is derived from real measured parameters only:
 *   diameter (in)  → blade radius Rmm
 *   spinner (mm)   → hub radius spR
 *   fromHub (mm)   → distance from spinner edge to max-chord station
 *   maxChord (mm)  → max chord width
 *   overhang (mm)  → leading-edge offset above chord axis at max-chord station
 *   chord27 (mm)   → chord width at the 27 mm spanwise station
 *   thickness27(mm)→ leading-edge overhang at the 27 mm station
 *   trailingTip(mm)→ total chord at blade tip
 */
(function () {
  'use strict';

  var _zoom = 1.0;
  var ZOOM_STEP = 0.15, ZOOM_MIN = 0.30, ZOOM_MAX = 3.0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t)    { return a + (b - a) * t; }
  function ff(n, d)         { return parseFloat(n).toFixed(d == null ? 1 : d); }

  /* ─────────────────────────────────────────────
     NACA-style airfoil cross-section outline path
     cx,cy = left (LE) anchor; w = chord width; th = max thickness; cam = camber ratio
  ───────────────────────────────────────────── */
  function airfoilPath(cx, cy, w, th, cam) {
    cam = cam || 0.04;
    var le = cx, te = cx + w;
    var topPk = cx + w * 0.28;
    var botPk = cx + w * 0.38;
    return 'M' + le + ',' + cy +
      ' C' + (le + w * 0.08) + ',' + (cy - th - cam * w) +
      '   ' + topPk + ','       + (cy - th * 1.1 - cam * w * 0.5) +
      '   ' + te + ','           + cy +
      ' C' + (te - w * 0.18) + ',' + (cy + th * 0.20) +
      '   ' + botPk + ','        + (cy + th * 0.13) +
      '   ' + le + ','           + cy + ' Z';
  }

  /* ─────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────── */
  function render(containerId, geometry, diameter, pitch, spinner, blades, yokeWidth, yokeTwist) {
    var el = document.getElementById(containerId);
    if (!el) return;

    /* ── Parse inputs with safe defaults ── */
    var Din   = parseFloat(diameter)          || 10;
    var Dmm   = Din * 25.4;
    var Rmm   = Dmm / 2;                          // blade tip radius
    var Pin   = parseFloat(pitch)             || 4.5;
    var nB    = Math.max(2, Math.min(6, parseInt(blades) || 2));
    var g     = geometry || {};

    var spDia = Math.max(10,  parseFloat(spinner)         || 30);
    var spR   = spDia / 2;                           // spinner radius mm

    var yokeW = Math.max(0,   parseFloat(yokeWidth)       || 0);   // mm
    var yokeT = parseFloat(yokeTwist) || 0;                         // degrees

    var maxCh = Math.max(2,   parseFloat(g.maxChord)      || 16.5);
    var fHub  = Math.max(0,   parseFloat(g.fromHub)       || 19);   // from SPINNER EDGE
    var ovhg  = Math.max(0,   parseFloat(g.overhang)      || 3.2);  // LE overhang at max-chord
    var ch27  = Math.max(1,   parseFloat(g.chord27)       || 13.5);
    var thk27 = Math.max(0.1, parseFloat(g.thickness27)   || 1.9);  // LE overhang at 27mm
    var tipCh = Math.max(0.5, parseFloat(g.trailingTip)   || 5.2);

    /* ── Spanwise stations (mm from spinner centre) ── */
    var sta_hub = spR;                    // spinner edge
    var sta_max = spR + fHub;            // max-chord station
    var sta_27  = Math.min(sta_hub + 27, Rmm - 2); // 27mm from spinner edge, capped
    var sta_tip = Rmm;                   // blade tip

    /* ── Blade root chord (smooth start inside spinner) ── */
    // Estimate root chord as a proportion of max-chord, scaled by how far we are from centre
    var rootPct   = clamp(spR / Math.max(sta_max, spR + 1), 0.05, 0.70);
    var rootChord = maxCh * rootPct;
    var rootOver  = ovhg  * rootPct * 0.5;

    /* ── SVG canvas ── */
    var VW = 980, VH = 460;
    var PAD_L = 60, PAD_R = 50, PAD_T = 100, PAD_B = 150;
    var drawW = VW - PAD_L - PAD_R;
    var drawH = VH - PAD_T - PAD_B;

    /* ── Scale: map real mm to pixels ── */
    // X: blade span (0 → Rmm)  must fit in drawW
    // Y: max chord (maxCh)     must fit in drawH, with some headroom for annotations
    var sX = drawW  / Math.max(Rmm, 1);
    var sY = drawH  / Math.max(maxCh * 1.30, 1);
    var S  = Math.min(sX, sY) * _zoom;   // uniform scale px/mm

    /* ── Pixel X positions ── */
    var X0    = PAD_L;                          // spinner centre
    var Xhub  = X0 + spR      * S;             // spinner edge
    var Xmax  = X0 + sta_max  * S;             // max-chord station
    var X27   = X0 + sta_27   * S;             // 27mm station
    var Xtip  = X0 + sta_tip  * S;             // blade tip

    /* ── Chord axis Y (horizontal centre-line of diagram) ── */
    // Place it so the max-chord blade is vertically centred in drawH
    // Leading edge above axis = ovhg, trailing edge below = maxCh - ovhg
    var AX = PAD_T + drawH * 0.5 + (maxCh * 0.5 - ovhg) * S * 0.5;

    /* ── Pixel Y chord positions (Y increases downward in SVG) ──
       Convention: LE = smaller Y (top), TE = larger Y (bottom)
       ovhang = how far LE is ABOVE the axis
    */
    // Root (at spinner edge)
    var yR_le = AX - rootOver  * S;
    var yR_te = AX + (rootChord - rootOver) * S;

    // Max-chord station
    var yM_le = AX - ovhg  * S;
    var yM_te = AX + (maxCh - ovhg) * S;

    // @27mm station
    var yS_le = AX - thk27 * S;
    var yS_te = AX + (ch27 - thk27) * S;

    // Tip (very thin, tapered)
    var tipOver = tipCh * 0.18;
    var yT_le   = AX - tipOver * S;
    var yT_te   = AX + (tipCh - tipOver) * S;

    /* ── Show 27-mm station only if it falls meaningfully between max & tip ── */
    var show27 = (sta_27 > sta_max + 2) && (sta_27 < sta_tip - 3) && (X27 - Xmax > 8);

    /* ─────────────────────────────────────────
       BLADE PLANFORM PATH
       Full outline: LE from root→tip then TE tip→root, closed.
       The path starts at the spinner edge (Xhub) on both LE and TE.
       The spinner semicircle is drawn on top so the root disappears cleanly.
    ───────────────────────────────────────── */

    // We start at a point on the spinner arc (yR_le), trace LE to tip,
    // then TE from tip back to spinner (yR_te), then back along spinner arc
    // (but spinner fill covers this). Using 'Z' to close.

    var pd = '';

    // Move to root LE on spinner arc
    pd += 'M ' + Xhub + ',' + yR_le;

    // ── LEADING EDGE (top of blade) ──
    if (show27) {
      // Hub → Max-chord
      pd += ' C ' + lerp(Xhub, Xmax, 0.30) + ',' + yR_le +
            '   ' + lerp(Xhub, Xmax, 0.80) + ',' + yM_le +
            '   ' + Xmax + ',' + yM_le;
      // Max-chord → 27mm
      pd += ' C ' + lerp(Xmax, X27, 0.45) + ',' + yM_le +
            '   ' + lerp(Xmax, X27, 0.65) + ',' + yS_le +
            '   ' + X27 + ',' + yS_le;
      // 27mm → Tip (pinch to axis)
      pd += ' C ' + lerp(X27, Xtip, 0.50) + ',' + yS_le +
            '   ' + lerp(X27, Xtip, 0.90) + ',' + yT_le +
            '   ' + Xtip + ',' + AX;
    } else {
      // Hub → Max-chord → Tip (simplified, no 27mm station)
      pd += ' C ' + lerp(Xhub, Xmax, 0.30) + ',' + yR_le +
            '   ' + lerp(Xhub, Xmax, 0.80) + ',' + yM_le +
            '   ' + Xmax + ',' + yM_le;
      pd += ' C ' + lerp(Xmax, Xtip, 0.42) + ',' + yM_le +
            '   ' + lerp(Xmax, Xtip, 0.88) + ',' + yT_le +
            '   ' + Xtip + ',' + AX;
    }

    // ── TRAILING EDGE (bottom of blade, reversed) ──
    if (show27) {
      // Tip → 27mm
      pd += ' C ' + lerp(X27, Xtip, 0.90) + ',' + yT_te +
            '   ' + lerp(X27, Xtip, 0.50) + ',' + yS_te +
            '   ' + X27 + ',' + yS_te;
      // 27mm → Max-chord
      pd += ' C ' + lerp(Xmax, X27, 0.65) + ',' + yS_te +
            '   ' + lerp(Xmax, X27, 0.45) + ',' + yM_te +
            '   ' + Xmax + ',' + yM_te;
      // Max-chord → Hub TE
      pd += ' C ' + lerp(Xhub, Xmax, 0.80) + ',' + yM_te +
            '   ' + lerp(Xhub, Xmax, 0.30) + ',' + yR_te +
            '   ' + Xhub + ',' + yR_te;
    } else {
      pd += ' C ' + lerp(Xmax, Xtip, 0.88) + ',' + yT_te +
            '   ' + lerp(Xmax, Xtip, 0.42) + ',' + yM_te +
            '   ' + Xmax + ',' + yM_te;
      pd += ' C ' + lerp(Xhub, Xmax, 0.80) + ',' + yM_te +
            '   ' + lerp(Xhub, Xmax, 0.30) + ',' + yR_te +
            '   ' + Xhub + ',' + yR_te;
    }

    pd += ' Z';

    /* ── Grid ── */
    var grid = '';
    for (var gx = 0; gx <= VW; gx += 30)
      grid += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + VH + '" stroke="#edf0f3" stroke-width="1"/>';
    for (var gy = 0; gy <= VH; gy += 30)
      grid += '<line x1="0" y1="' + gy + '" x2="' + VW + '" y2="' + gy + '" stroke="#edf0f3" stroke-width="1"/>';

    /* ── Annotation helpers ── */
    var AC  = '#6b7a8d';
    var TF  = 'font-size="11" font-family="Helvetica,Arial,sans-serif" fill="' + AC + '"';
    var TFB = 'font-size="11" font-family="Helvetica,Arial,sans-serif" fill="' + AC + '" font-weight="600"';

    function vSpan(x, y1, y2, lbl, side) {
      var tx     = (side === 'left') ? x - 5 : x + 5;
      var anchor = (side === 'left') ? 'end' : 'start';
      var my     = (y1 + y2) / 2 + 4;
      return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 +
             '" stroke="' + AC + '" stroke-width="1.2" marker-start="url(#arrS)" marker-end="url(#arrE)"/>' +
             '<text x="' + tx + '" y="' + my + '" text-anchor="' + anchor + '" ' + TF + '>' + lbl + '</text>';
    }

    function hSpan(x1, x2, y, lbl) {
      var mx = (x1 + x2) / 2;
      return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y +
             '" stroke="' + AC + '" stroke-width="1.2" marker-start="url(#arrS)" marker-end="url(#arrE)"/>' +
             '<text x="' + mx + '" y="' + (y - 5) + '" text-anchor="middle" ' + TF + '>' + lbl + '</text>';
    }

    function dropLine(x, yFrom, yTo) {
      return '<line x1="' + x + '" y1="' + yFrom + '" x2="' + x + '" y2="' + yTo +
             '" stroke="' + AC + '" stroke-width="0.8" stroke-dasharray="3 3"/>';
    }

    /* ── Pitch helix lines overlaid on blade ── */
    // Show two pitch-reference lines as dashed lines — one at root, one at tip
    // Pitch angle: β = atan(pitch / (2π·r))
    function pitchAngleDeg(rMm) {
      var circ = 2 * Math.PI * rMm;
      return Math.atan((Pin * 25.4) / circ) * 180 / Math.PI;
    }

    /* ── Build annotations ── */
    var anns = '';
    var topRow  = PAD_T - 22;  // top annotation row
    var topRow2 = PAD_T - 8;   // second row

    // 1. Spinner radius bracket
    var brktY = topRow - 12;
    anns += '<line x1="' + X0   + '" y1="' + (brktY + 8) + '" x2="' + X0   + '" y2="' + brktY + '" stroke="' + AC + '" stroke-width="1"/>';
    anns += '<line x1="' + Xhub + '" y1="' + (brktY + 8) + '" x2="' + Xhub + '" y2="' + brktY + '" stroke="' + AC + '" stroke-width="1"/>';
    anns += hSpan(X0, Xhub, brktY, 'R=' + ff(spR) + 'mm');

    // 2. From-hub (spinner edge → max chord station)
    anns += dropLine(Xmax, yM_le, topRow);
    anns += hSpan(Xhub, Xmax, topRow, ff(fHub) + 'mm (from hub)');

    // 3. 27mm station label
    if (show27) {
      anns += dropLine(X27, yS_le, topRow2);
      anns += hSpan(Xmax, X27, topRow2, ff(sta_27 - sta_hub, 0) + 'mm');
    }

    // 4. Diameter bar (bottom)
    var botY = Math.max(yM_te, yR_te) + 38;
    var propName = '';
    var sl = document.getElementById('inp-search');
    if (sl) propName = sl.value;
    if (propName) {
      anns += '<text x="' + ((Xhub + Xtip) / 2) + '" y="' + (botY + 22) + '" text-anchor="middle"' +
              ' font-size="13" font-weight="600" font-family="Helvetica,Arial,sans-serif" fill="#4a5a72">' +
              propName + '</text>';
    }
    anns += dropLine(X0,   AX + spR * S, botY);
    anns += dropLine(Xtip, AX,           botY);
    anns += hSpan(X0, Xtip, botY, ff(Din, 1) + '" (' + ff(Dmm, 1) + 'mm) · ' + nB + '-blade');

    // 5. Max chord (vertical)
    anns += vSpan(Xmax - 10, yM_le, yM_te, ff(maxCh) + 'mm', 'left');

    // 6. LE overhang at max chord (above axis, right side)
    if (ovhg > 0.3) {
      anns += vSpan(Xmax + 12, yM_le, AX, ff(ovhg) + 'mm LE', 'right');
    }

    // 7. Chord @27mm (vertical)
    if (show27) {
      anns += vSpan(X27 + 10, yS_le, yS_te, ff(ch27) + 'mm', 'right');
    }

    // 8. Thickness @27mm (angled pointer)
    if (show27 && thk27 > 0.2) {
      var txA = X27 + 34, tyA = yS_le - 16;
      anns += '<line x1="' + txA + '" y1="' + (tyA + 4) + '" x2="' + (X27 + 2) + '" y2="' + (yS_le + 2) +
              '" stroke="' + AC + '" stroke-width="1" marker-end="url(#arrE)"/>';
      anns += '<text x="' + (txA + 2) + '" y="' + tyA + '" text-anchor="start" ' + TF + '>↑' + ff(thk27) + 'mm LE</text>';
    }

    // 9. Tip chord (vertical)
    anns += vSpan(Xtip + 10, yT_le, yT_te, ff(tipCh) + 'mm', 'right');

    // 10. Yoke Width annotation (horizontal span from spinner edge → yoke end)
    if (yokeW > 0) {
      var Xyoke = X0 + (spR + yokeW) * S;  // pixel X of yoke end
      // Only draw if yoke end is within the blade span
      if (Xyoke > Xhub + 4 && Xyoke < Xtip - 4) {
        var yokeRowY = Math.max(yM_te, yR_te) + 58;  // below diameter bar
        // Tick marks at spinner edge and yoke end
        anns += '<line x1="' + Xhub  + '" y1="' + (yokeRowY + 6) + '" x2="' + Xhub  + '" y2="' + yokeRowY + '" stroke="#e67e22" stroke-width="1.2"/>';
        anns += '<line x1="' + Xyoke + '" y1="' + (yokeRowY + 6) + '" x2="' + Xyoke + '" y2="' + yokeRowY + '" stroke="#e67e22" stroke-width="1.2"/>';
        // Horizontal span arrow
        anns += '<line x1="' + Xhub + '" y1="' + yokeRowY + '" x2="' + Xyoke + '" y2="' + yokeRowY +
                '" stroke="#e67e22" stroke-width="1.3" marker-start="url(#arrS)" marker-end="url(#arrE)"/>';
        // Label
        anns += '<text x="' + ((Xhub + Xyoke) / 2) + '" y="' + (yokeRowY - 5) + '" text-anchor="middle"' +
                ' font-size="11" font-family="Helvetica,Arial,sans-serif" fill="#e67e22">Yoke ' + ff(yokeW) + 'mm</text>';
        // Vertical dashed marker at yoke end
        anns += '<line x1="' + Xyoke + '" y1="' + yM_le + '" x2="' + Xyoke + '" y2="' + (yokeRowY + 8) +
                '" stroke="rgba(230,126,34,0.35)" stroke-width="1" stroke-dasharray="4 3"/>';
      }
    }

    // 11. Yoke Twist — shown as a small arc indicator at the spinner edge station
    if (Math.abs(yokeT) > 0.05) {
      var twistX  = Xhub + 6;
      var twistY  = AX;
      var twistR  = Math.min(spR * S * 0.55, 22);
      var startA  = -Math.PI / 2;                            // pointing up (LE direction)
      var endA    = startA + (yokeT * Math.PI / 180);       // offset by twist degrees
      var x1t = twistX + twistR * Math.cos(startA);
      var y1t = twistY + twistR * Math.sin(startA);
      var x2t = twistX + twistR * Math.cos(endA);
      var y2t = twistY + twistR * Math.sin(endA);
      var largeArc = Math.abs(yokeT) > 180 ? 1 : 0;
      var sweep    = yokeT > 0 ? 1 : 0;
      anns += '<path d="M' + x1t + ',' + y1t +
              ' A' + twistR + ',' + twistR + ' 0 ' + largeArc + ',' + sweep +
              ' ' + x2t + ',' + y2t + '"' +
              ' fill="none" stroke="#9b59b6" stroke-width="1.5" stroke-dasharray="4 2" marker-end="url(#arrE)"/>';
      anns += '<text x="' + (twistX + twistR + 5) + '" y="' + (twistY - twistR * 0.3) +
              '" font-size="10" font-family="Helvetica,Arial,sans-serif" fill="#9b59b6">Twist ' +
              (yokeT > 0 ? '+' : '') + ff(yokeT, 1) + '°</text>';
    }

    // 12. Pitch info (top-right corner)
    var betaMax = pitchAngleDeg(sta_max).toFixed(1);
    var betaTip = pitchAngleDeg(sta_tip).toFixed(1);
    anns += '<text x="' + (VW - PAD_R - 4) + '" y="' + (PAD_T - 18) + '" text-anchor="end"' +
            ' font-size="12" font-family="Helvetica,Arial,sans-serif" fill="' + AC + '">' +
            'Pitch ' + ff(Pin, 1) + '" (' + ff(Pin * 25.4, 1) + 'mm)' +
            ' · β=' + betaMax + '° @ max-chord · ' + betaTip + '° @ tip' +
            '</text>';

    /* ── Pitch angle reference lines on the blade ── */
    // Draw a small angled rectangle at the max-chord station representing the pitch angle
    // This is a visual indicator only: a short diagonal line across the chord width
    var pitchLines = '';
    var stations = show27 ? [sta_max, sta_27, sta_tip * 0.85] : [sta_max, sta_tip * 0.80];
    stations.forEach(function(sta) {
      var Xs = X0 + sta * S;
      var betaRad = Math.atan((Pin * 25.4) / (2 * Math.PI * sta));
      var halfH;
      if (sta === sta_max)         halfH = maxCh / 2 * S;
      else if (show27 && sta === sta_27) halfH = ch27  / 2 * S;
      else                               halfH = tipCh / 2 * S * 0.9;

      var dxChord = halfH * 2 * Math.cos(betaRad) * 0.14;
      var dyChord = halfH * 2 * Math.sin(betaRad) * 0.14;
      // chord reference tick (small angled hash)
      pitchLines += '<line x1="' + (Xs - dxChord) + '" y1="' + (AX - halfH + dyChord) +
                    '" x2="' + (Xs + dxChord) + '" y2="' + (AX + halfH - dyChord) +
                    '" stroke="rgba(59,130,246,0.35)" stroke-width="1" stroke-dasharray="4 3"/>';
    });

    /* ── Airfoil cross-section insets (bottom strip) ── */
    var insetBaseY = VH - 16;
    var airW = 100;

    var sections = [
      { label: 'Root',        xFrac: 0.22, th: maxCh * 0.12, cam: 0.07 },
      show27 ? { label: '@' + Math.round(sta_27 - sta_hub) + 'mm', xFrac: 0.52, th: maxCh * 0.06, cam: 0.05 } : null,
      { label: 'Tip',         xFrac: 0.82, th: maxCh * 0.035, cam: 0.025 }
    ].filter(Boolean);

    var insetPaths = '';
    sections.forEach(function(sec) {
      var ax = VW * sec.xFrac - airW / 2;
      insetPaths += airfoilPath(ax, insetBaseY, airW, sec.th * S * 0.55, sec.cam);
      anns += '<text x="' + (ax + airW / 2) + '" y="' + (insetBaseY - sec.th * S * 0.55 - 10) + '"' +
              ' text-anchor="middle" font-size="10" font-family="Helvetica,sans-serif" fill="#5a6a82">' +
              sec.label + '</text>';
    });

    /* ── Spinner semicircle ── */
    var spRpx = spR * S;
    var spinnerPath =
      'M' + X0 + ',' + (AX - spRpx) +
      ' A ' + spRpx + ' ' + spRpx + ' 0 0 1 ' + X0 + ',' + (AX + spRpx);
    var spinnerInner =
      'M' + X0 + ',' + (AX - spRpx * 0.62) +
      ' A ' + (spRpx * 0.62) + ' ' + (spRpx * 0.62) + ' 0 0 1 ' + X0 + ',' + (AX + spRpx * 0.62);

    /* ── Chord axis line ── */
    var axisLine = '<line x1="' + X0 + '" y1="' + AX + '" x2="' + (Xtip + 28) + '" y2="' + AX +
                   '" stroke="#b8c4d0" stroke-width="1.2" stroke-dasharray="9 5"/>';

    /* ── Chord-axis label ── */
    var axisLabel = '<text x="' + (Xtip + 32) + '" y="' + (AX + 4) +
                    '" font-size="9" font-family="Helvetica,sans-serif" fill="#b8c4d0">Chord axis</text>';

    /* ── Vertical station markers ── */
    var stationMarkers = '';
    [[Xhub, 'Hub', yR_le], [Xmax, 'Max Chord', yM_le]].forEach(function(s) {
      stationMarkers += '<line x1="' + s[0] + '" y1="' + s[2] + '" x2="' + s[0] + '" y2="' + AX +
                        '" stroke="rgba(100,120,150,0.25)" stroke-width="1" stroke-dasharray="2 3"/>';
    });

    /* ── Zoom label ── */
    var zPct = Math.round(_zoom * 100);
    var zl = document.getElementById('prop-zoom-label');
    if (zl) zl.textContent = zPct + '%';

    /* ── Assemble SVG ── */
    el.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '"' +
      ' preserveAspectRatio="xMidYMid meet"' +
      ' style="width:100%;height:100%;min-height:300px;display:block;background:#ffffff;border-radius:6px;">' +

      '<defs>' +
        '<marker id="arrE" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">' +
          '<path d="M0,2 L9,5 L0,8 Z" fill="' + AC + '"/></marker>' +
        '<marker id="arrS" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
          '<path d="M0,2 L9,5 L0,8 Z" fill="' + AC + '"/></marker>' +
        '<linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%"   stop-color="#dce6ef"/>' +
          '<stop offset="35%"  stop-color="#f2f6fa"/>' +
          '<stop offset="100%" stop-color="#e8eef4"/>' +
        '</linearGradient>' +
        '<linearGradient id="spinnerGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%"   stop-color="#c8d4de"/>' +
          '<stop offset="100%" stop-color="#a8b8c8"/>' +
        '</linearGradient>' +
      '</defs>' +

      grid +
      stationMarkers +
      axisLine +
      axisLabel +

      // Blade planform — gradient fill, heavy outline
      '<path d="' + pd + '" fill="url(#bladeGrad)" stroke="#1e2d3d" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +

      // Pitch reference lines on blade
      pitchLines +

      // Spinner drawn over blade root
      '<path d="' + spinnerPath + '" fill="url(#spinnerGrad)" stroke="#4a5e72" stroke-width="2.0"/>' +
      '<path d="' + spinnerInner + '" fill="none" stroke="#8a9cb0" stroke-width="0.9"/>' +
      '<circle cx="' + X0 + '" cy="' + AX + '" r="' + Math.max(2.5, spRpx * 0.13) + '" fill="#8a9cb0"/>' +

      // Rotation arrow on spinner
      '<path d="M' + (X0 + spRpx * 0.36) + ',' + (AX - spRpx * 0.52) +
        ' Q ' + (X0 + spRpx * 0.70) + ',' + AX +
        '   ' + (X0 + spRpx * 0.36) + ',' + (AX + spRpx * 0.52) + '"' +
        ' fill="none" stroke="#8a9cb0" stroke-width="1.8" marker-end="url(#arrE)"/>' +

      anns +

      // Airfoil inset cross-sections (red outlines)
      '<path d="' + insetPaths + '" fill="none" stroke="#e74c3c" stroke-width="1.2"/>' +

      // Zoom watermark
      '<text x="' + (VW - 5) + '" y="' + (VH - 4) + '" text-anchor="end"' +
      ' font-size="9" font-family="Helvetica,sans-serif" fill="#d1d5db">' + zPct + '%</text>' +

      '</svg>';
  }

  window.PropDiagram = {
    render:    render,
    zoomIn:    function () { _zoom = clamp(_zoom + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX); },
    zoomOut:   function () { _zoom = clamp(_zoom - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX); },
    resetZoom: function () { _zoom = 1.0; },
    getZoom:   function () { return Math.round(_zoom * 100); }
  };
}());
