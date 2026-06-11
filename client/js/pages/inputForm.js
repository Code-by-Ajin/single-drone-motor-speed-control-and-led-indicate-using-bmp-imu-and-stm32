window.InputFormPage = {
  render(container) {
    this.container = container || document.getElementById('app');
    const s = State.data.input;
    
    container.innerHTML = `
      <div class="container fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <h2 style="font-size: 2rem; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Configure Propeller</h2>
          <button class="btn btn-secondary" onclick="Router.navigate('/')" style="padding: 8px 16px; font-size: 0.9rem;">← Back</button>
        </div>

        <div class="grid grid-cols-2">
          
          <!-- Environment & Hub -->
          <div class="glass-panel slide-up delay-100">
            <h3 style="margin-bottom: 20px; color: var(--accent-cyan);">Operating Conditions & Hub</h3>
            
            <div class="grid grid-cols-2">
              <div class="form-group">
                <label>Elevation (mAMSL)</label>
                <input type="number" class="input-control" id="inp-elevation" value="${s.elevation}" onchange="window.InputFormPage.update('elevation', this.value)">
              </div>
              <div class="form-group">
                <label>Temperature (°C)</label>
                <input type="number" class="input-control" id="inp-temp" value="${s.temperature}" onchange="window.InputFormPage.update('temperature', this.value)">
              </div>
              <div class="form-group">
                <label>Air Speed (km/h)</label>
                <input type="number" class="input-control" id="inp-speed" value="${s.airSpeed}" onchange="window.InputFormPage.update('airSpeed', this.value)">
              </div>
              <div class="form-group">
                <label>Target RPM</label>
                <input type="number" class="input-control" id="inp-rpm" value="${s.rpm}" onchange="window.InputFormPage.update('rpm', this.value)">
              </div>
              <div class="form-group">
                <label>Drone Type</label>
                <select class="input-control" id="inp-drone" onchange="window.InputFormPage.update('droneMotors', this.value)">
                  <option value="1" ${s.droneMotors == 1 ? 'selected' : ''}>Single Rotor (1)</option>
                  <option value="3" ${s.droneMotors == 3 ? 'selected' : ''}>Tri-copter (3)</option>
                  <option value="4" ${s.droneMotors == 4 ? 'selected' : ''}>Quad-copter (4)</option>
                  <option value="6" ${s.droneMotors == 6 ? 'selected' : ''}>Hexa-copter (6)</option>
                  <option value="8" ${s.droneMotors == 8 ? 'selected' : ''}>Octo-copter (8)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Spinner Ø (mm)</label>
                <input type="number" class="input-control" id="inp-spinner" value="${s.spinner}" onchange="window.InputFormPage.updateGeo('spinner', this.value)">
              </div>
              <div class="form-group">
                <label>Yoke Width (mm)</label>
                <input type="number" step="0.1" class="input-control" id="inp-yokeW" value="${s.yokeWidth}" onchange="window.InputFormPage.updateGeo('yokeWidth', this.value)">
              </div>
              <div class="form-group">
                <label>Yoke Twist (°)</label>
                <input type="number" step="0.1" class="input-control" id="inp-yokeT" value="${s.yokeTwist}" onchange="window.InputFormPage.update('yokeTwist', this.value)">
              </div>
            </div>
          </div>

          <!-- Propeller Specs -->
          <div class="glass-panel slide-up delay-200">
            <h3 style="margin-bottom: 20px; color: var(--accent-blue);">Propeller Selection</h3>
            
            <div class="form-group search-wrapper" style="display: flex; gap: 10px;">
              <div style="flex: 1; position: relative;">
                <label>Search Pre-defined Propellers</label>
                <input type="text" class="input-control" id="inp-search" placeholder="e.g. Gemfan 5043..." autocomplete="off">
                <div id="autocomplete-list" class="autocomplete-dropdown"></div>
              </div>
              <button class="btn btn-secondary" style="margin-top: 24px; padding: 0 20px;" onclick="window.InputFormPage.handleSearchEnter()">Load / Enter</button>
            </div>

            <div class="grid grid-cols-3">
              <div class="form-group">
                <label>Diameter (in)</label>
                <input type="number" step="0.1" class="input-control" id="inp-diameter" value="${s.diameter}" onchange="window.InputFormPage.updateGeo('diameter', this.value)">
              </div>
              <div class="form-group">
                <label>Pitch (in)</label>
                <input type="number" step="0.1" class="input-control" id="inp-pitch" value="${s.pitch}" onchange="window.InputFormPage.updateGeo('pitch', this.value)">
              </div>
              <div class="form-group">
                <label>Blades</label>
                <input type="number" min="2" max="6" class="input-control" id="inp-blades" value="${s.blades}" onchange="window.InputFormPage.updateGeo('blades', this.value)">
              </div>
            </div>
            
            <div class="grid grid-cols-2">
              <div class="form-group">
                <label>Root Airfoil</label>
                <select class="input-control" id="inp-root" onchange="window.InputFormPage.update('rootAirfoil', this.value)">
                  <option value="NACA 4412" ${s.rootAirfoil === 'NACA 4412' ? 'selected' : ''}>NACA 4412</option>
                  <option value="Clark Y" ${s.rootAirfoil === 'Clark Y' ? 'selected' : ''}>Clark Y</option>
                  <option value="NACA 0012" ${s.rootAirfoil === 'NACA 0012' ? 'selected' : ''}>NACA 0012</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tip Airfoil</label>
                <select class="input-control" id="inp-tip" onchange="window.InputFormPage.update('tipAirfoil', this.value)">
                  <option value="Clark Y" ${s.tipAirfoil === 'Clark Y' ? 'selected' : ''}>Clark Y</option>
                  <option value="NACA 4412" ${s.tipAirfoil === 'NACA 4412' ? 'selected' : ''}>NACA 4412</option>
                  <option value="ARA-D" ${s.tipAirfoil === 'ARA-D' ? 'selected' : ''}>ARA-D</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Blade Geometry -->
          <div class="glass-panel slide-up delay-300">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px;">
               <h3 style="color: var(--accent-cyan);">Blade Geometry (mm)</h3>
               <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="window.InputFormPage.redrawDiagram()">↻ Redraw</button>
            </div>
            
            <div class="grid grid-cols-3">
              <div class="form-group">
                <label>Max Chord</label>
                <input type="number" step="0.1" class="input-control geo-input" data-key="maxChord" value="${s.bladeGeometry.maxChord}">
              </div>
              <div class="form-group">
                <label>From Hub (mm)</label>
                <input type="number" step="0.1" class="input-control geo-input" data-key="fromHub" value="${s.bladeGeometry.fromHub}">
              </div>
              <div class="form-group">
                <label>LE Overhang</label>
                <input type="number" step="0.1" class="input-control geo-input" data-key="overhang" value="${s.bladeGeometry.overhang}">
              </div>
              <div class="form-group">
                <label>Chord @27mm</label>
                <input type="number" step="0.1" class="input-control geo-input" data-key="chord27" value="${s.bladeGeometry.chord27}">
              </div>
              <div class="form-group">
                <label>Thick @27mm</label>
                <input type="number" step="0.1" class="input-control geo-input" data-key="thickness27" value="${s.bladeGeometry.thickness27}">
              </div>
              <div class="form-group">
                <label>Tip Chord</label>
                <input type="number" step="0.1" class="input-control geo-input" data-key="trailingTip" value="${s.bladeGeometry.trailingTip}">
              </div>
            </div>
          </div>

          <!-- Live Preview -->
          <div class="glass-panel" style="display: flex; flex-direction: column; min-height: 340px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="color: var(--accent-blue); margin:0;">Geometry Preview</h3>
              <div style="display:flex; align-items:center; gap:6px;">
                <button onclick="window.PropDiagram.zoomOut(); window.InputFormPage.redrawDiagram();"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);
                         background:rgba(255,255,255,0.06);color:#e0e8f0;font-size:16px;font-weight:700;
                         cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;"
                  title="Zoom Out">−</button>
                <span id="prop-zoom-label"
                  style="min-width:38px;text-align:center;font-size:0.8rem;color:#8b9bb4;font-family:var(--font-mono);">100%</span>
                <button onclick="window.PropDiagram.zoomIn(); window.InputFormPage.redrawDiagram();"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);
                         background:rgba(255,255,255,0.06);color:#e0e8f0;font-size:16px;font-weight:700;
                         cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;"
                  title="Zoom In">+</button>
                <button onclick="window.PropDiagram.resetZoom(); window.InputFormPage.redrawDiagram();"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);
                         background:rgba(255,255,255,0.06);color:#8b9bb4;font-size:13px;
                         cursor:pointer;display:flex;align-items:center;justify-content:center;"
                  title="Reset Zoom">↺</button>
              </div>
            </div>
            
            <div id="prop-diagram-container"
              style="flex:1; border-radius:8px; background:white; overflow:auto; min-height:280px; width:100%;"></div>
          </div>
        </div>
        
        <div style="margin-top: 40px; text-align: center;">
          <button class="btn btn-primary" style="padding: 18px 60px; font-size: 1.3rem;" onclick="window.InputFormPage.calculate()">
            CALCULATE THRUST
          </button>
        </div>
      </div>
    `;

    this.initSearch();
    this.initGeoListeners();
    this.redrawDiagram();
    setTimeout(() => this.redrawDiagram(), 100);
    setTimeout(() => this.redrawDiagram(), 700);

    this._resizeHandler = () => this.redrawDiagram();
    window.addEventListener('resize', this._resizeHandler);
    window.activePageDestructor = () => window.removeEventListener('resize', this._resizeHandler);
  },

  update(key, val) {
    State.updateInput(key, Number(val) || val);
  },

  updateGeo(key, val) {
    this.update(key, val);
    this.redrawDiagram();
  },

  initGeoListeners() {
    document.querySelectorAll('.geo-input').forEach(el => {
      el.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        State.updateInput(`bladeGeometry.${e.target.dataset.key}`, val);
        this.redrawDiagram();
      });
      el.addEventListener('change', (e) => {
        const val = Number(e.target.value);
        State.updateInput(`bladeGeometry.${e.target.dataset.key}`, val);
        this.redrawDiagram();
      });
    });
    ['inp-diameter', 'inp-pitch', 'inp-spinner', 'inp-blades'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.redrawDiagram());
    });
  },

  redrawDiagram() {
    if (window.PropDiagram) {
      PropDiagram.render(
        'prop-diagram-container',
        State.data.input.bladeGeometry,
        State.data.input.diameter,
        State.data.input.pitch,
        State.data.input.spinner,
        State.data.input.blades,
        State.data.input.yokeWidth,
        State.data.input.yokeTwist
      );
    }
  },

  initSearch() {
    const inp = document.getElementById('inp-search');
    const list = document.getElementById('autocomplete-list');
    let timeout = null;

    inp.addEventListener('input', () => {
      clearTimeout(timeout);
      const val = inp.value;
      if (!val) {
        list.style.display = 'none';
        return;
      }
      
      timeout = setTimeout(async () => {
        const results = await API.searchProps(val);
        if (results.length > 0 && inp.value === val) {
          list.innerHTML = results.map(r => `
            <div class="autocomplete-item" onclick="window.InputFormPage.selectProp('${btoa(JSON.stringify(r))}')">
              <div class="prop-name">${r.name}</div>
              <div class="prop-specs">${r.diameter}" x ${r.pitch}" | ${r.blades} blades</div>
            </div>
          `).join('');
          list.style.display = 'block';
        } else {
          list.style.display = 'none';
        }
      }, 300);
    });

    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSearchEnter();
    });

    document.addEventListener('click', (e) => {
      if (e.target !== inp && !e.target.closest('.search-wrapper')) list.style.display = 'none';
    });
  },

  async handleSearchEnter() {
    const inp = document.getElementById('inp-search');
    const val = inp.value;
    if (!val) return;
    const results = await API.searchProps(val);
    if (results.length > 0) {
      const exactMatch = results.find(p => p.name.toLowerCase() === val.toLowerCase());
      this.selectProp(btoa(JSON.stringify(exactMatch || results[0])));
    }
  },

  selectProp(encoded) {
    const p = JSON.parse(atob(encoded));
    document.getElementById('inp-search').value = p.name;
    
    State.updateInput('diameter', p.diameter);
    State.updateInput('pitch', p.pitch);
    State.updateInput('blades', p.blades);
    if (p.rootAirfoil) State.updateInput('rootAirfoil', p.rootAirfoil);
    if (p.tipAirfoil)  State.updateInput('tipAirfoil', p.tipAirfoil);

    if (p.bladeGeometry) {
      Object.entries(p.bladeGeometry).forEach(([k, v]) => {
        State.updateInput(`bladeGeometry.${k}`, v);
      });
    }

    // Close dropdown
    document.getElementById('autocomplete-list').style.display = 'none';

    // Re-render form with updated values then redraw SVG
    this.render(this.container);
  },

  async calculate() {
    if (window.location.pathname.includes('/bench') || window.location.hash.includes('/bench')) {
      if (window.BenchPage && window.BenchPage.openDashboard) {
        window.BenchPage.openDashboard();
      }
      return;
    }

    try {
      const btn = document.querySelector('.btn-primary');
      btn.innerHTML = `CALCULATING...`;
      btn.disabled = true;
      
      const payload = { ...State.data.input };
      const res = await API.calculateThrust(payload);
      State.setResults(res.results, res.sweep);
      
      Router.navigate('/results');
    } catch (e) {
      alert("Error calculating: " + e.message);
      const btn = document.querySelector('.btn-primary');
      btn.innerHTML = `CALCULATE THRUST`;
      btn.disabled = false;
    }
  }
};
