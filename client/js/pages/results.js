window.ResultsPage = {
  animationLoop: null,
  currentThrottle: 100, // 0-100

  render(container) {
    if (!State.data.results) {
      Router.navigate('/input');
      return;
    }

    const { results, sweep, input } = State.data;

    container.innerHTML = `
      <div class="container fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <div>
            <h2 style="font-size: 2rem; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Analysis Results</h2>
            <p style="color: var(--text-muted);">${input.brand || ''} ${input.diameter}x${input.pitch} | ${input.blades}-Blade @ ${input.rpm} RPM</p>
          </div>
          <button class="btn btn-secondary" onclick="Router.navigate('/input')" style="padding: 8px 16px; font-size: 0.9rem;">← Modify Setup</button>
        </div>

        <div class="grid" style="grid-template-columns: 2fr 1fr;">
          
          <!-- Left Column: Metrics & Chart -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- Key Metrics Grid -->
            <div class="grid grid-cols-3 slide-up delay-100">
              <div class="glass-panel" style="text-align: center;">
                 <h4 style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Total Thrust</h4>
                 <div id="val-thrust" style="font-size: 2.5rem; font-weight: 800; color: var(--text-main); font-family: var(--font-mono);">${Math.round(results.thrustG * (input.droneMotors || 4))}<span style="font-size: 1.2rem; color: var(--text-muted);">g</span></div>
              </div>
              <div class="glass-panel" style="text-align: center;">
                 <h4 style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Shaft Power</h4>
                 <div id="val-power" style="font-size: 2.5rem; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-mono);">${Math.round(results.shaftPower)}<span style="font-size: 1.2rem; color: var(--text-muted);">W</span></div>
              </div>
              <div class="glass-panel" style="text-align: center;">
                 <h4 style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Est. Payload</h4>
                 <div id="val-payload" style="font-size: 2.5rem; font-weight: 800; color: #f43f5e; font-family: var(--font-mono);">${Math.round(results.thrustG * (input.droneMotors || 4) * 0.5)}<span style="font-size: 1.2rem; color: var(--text-muted);">g</span></div>
              </div>
            </div>

            <!-- Detailed Table -->
            <div class="glass-panel slide-up delay-200">
              <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--accent-blue);">Aerodynamic Properties</h3>
              <table style="width: 100%; text-align: left; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.9rem;">
                <tbody style="color: var(--text-muted);">
                  <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 8px 0;">Ct / Cp</td><td style="text-align: right; color: var(--text-main);">${results.Ct.toFixed(4)} / ${results.Cp.toFixed(4)}</td></tr>
                  <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 8px 0;">Torque</td><td style="text-align: right; color: var(--text-main);">${results.torque.toFixed(3)} Nm</td></tr>
                  <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 8px 0;">Disk Load</td><td style="text-align: right; color: var(--text-main);">${(results.diskLoad / 9.80665).toFixed(2)} kg/m²</td></tr>
                  <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 8px 0;">Thrust per Motor</td><td style="text-align: right; color: var(--text-main);">${Math.round(results.thrustG)} g</td></tr>
                  <tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 8px 0;">n10N / n100W</td><td style="text-align: right; color: var(--text-main);">${results.n10N} / ${results.n100W} RPM</td></tr>
                </tbody>
              </table>
            </div>

            <!-- Chart -->
            <div class="glass-panel slide-up delay-300" style="flex: 1; min-height: 300px; display: flex; flex-direction: column;">
               <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--accent-cyan);">In-Flight Performance (J-Sweep)</h3>
               <div style="flex: 1; position: relative;"><canvas id="perf-chart"></canvas></div>
            </div>

          </div>

          <!-- Right Column: Interactive Throttle -->
          <div class="glass-panel slide-up delay-400" style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h3 style="color: var(--accent-blue);">Interactive Flight</h3>
              <div id="flight-status" style="font-size: 0.8rem; font-weight: 600; padding: 4px 8px; border-radius: 4px; background: rgba(16,185,129,0.2); color: #10b981;">MAX POWER</div>
            </div>

            <div style="display: flex; flex: 1; gap: 20px;">
              
              <!-- Throttle Slider (Vertical) -->
              <div style="display: flex; flex-direction: column; align-items: center; width: 60px; background: rgba(0,0,0,0.3); border-radius: 30px; padding: 20px 0;">
                <div id="throttle-val" style="font-family: var(--font-mono); font-weight: 700; margin-bottom: 15px;">100%</div>
                <input type="range" id="inp-throttle" min="0" max="100" value="100" orient="vertical" style="-webkit-appearance: slider-vertical; flex: 1; width: 8px; cursor: pointer;">
              </div>

              <!-- Drone Animation Container -->
              <div id="drone-anim-container" style="flex: 1;"></div>

            </div>
          </div>

        </div>
      </div>
    `;

    // Initialize Chart
    setTimeout(() => {
      PerformanceChart.render('perf-chart', sweep);
      DroneAnimation.render('drone-anim-container');
      this.initInteractive();
    }, 50);

    window.activePageDestructor = () => {
      PerformanceChart.destroy();
      if(this.animationLoop) cancelAnimationFrame(this.animationLoop);
    };
  },

  initInteractive() {
    const slider = document.getElementById('inp-throttle');
    const valText = document.getElementById('throttle-val');
    const thrustText = document.getElementById('val-thrust');
    const powerText = document.getElementById('val-power');
    const effText = document.getElementById('val-eff');
    const statusBox = document.getElementById('flight-status');
    
    const maxThrust = State.data.results.thrustG;
    const maxPower = State.data.results.shaftPower;
    
    // Assume Drone Weight = 50% of our max thrust (for 1 motor = 1 quad arm)
    // Thus hover is around 50% throttle (thrust scales with throttle^2)
    const hoverThrust = maxThrust * 0.25; 

    // We start an update loop for smooth drone wobble
    const loop = () => {
      this.currentThrottle = parseInt(slider.value, 10);
      
      const motors = State.data.input.droneMotors || 4;
      const tRatio = this.currentThrottle / 100; // RPM scaling
      // Laws of propeller: T ~ RPM^2, P ~ RPM^3
      const liveThrust = maxThrust * Math.pow(tRatio, 2) * motors;
      const livePower = maxPower * Math.pow(tRatio, 3);

      // Update UI texts
      valText.innerText = `${this.currentThrottle}%`;
      thrustText.innerHTML = `${Math.round(liveThrust)}<span style="font-size: 1.2rem; color: var(--text-muted)">g</span>`;
      powerText.innerHTML = `${Math.round(livePower)}<span style="font-size: 1.2rem; color: var(--text-muted)">W</span>`;
      document.getElementById('val-payload').innerHTML = `${Math.round(liveThrust * 0.5)}<span style="font-size: 1.2rem; color: var(--text-muted)">g</span>`;

      // Status logic
      let isHover = false;
      let isTakeoff = false;
      let heightDisplay = "0m";

      if (this.currentThrottle < 30) {
        statusBox.innerText = "IDLE (0m)";
        statusBox.style.background = "rgba(139,155,180,0.2)";
        statusBox.style.color = "#8b9bb4";
      } else if (this.currentThrottle >= 30 && this.currentThrottle < 55) {
        heightDisplay = (0.5 + Math.random()*0.2).toFixed(1) + "m";
        statusBox.innerText = `HOVERING (${heightDisplay})`;
        statusBox.style.background = "rgba(59,130,246,0.2)";
        statusBox.style.color = "#3b82f6";
        isHover = true;
      } else {
        heightDisplay = (2 + (this.currentThrottle - 55) * 0.5).toFixed(1) + "m";
        statusBox.innerText = `ASCENDING (${heightDisplay})`;
        statusBox.style.background = "rgba(16,185,129,0.2)";
        statusBox.style.color = "#10b981";
        isTakeoff = true;
      }

      // Update drone visual
      DroneAnimation.updateState(this.currentThrottle, isHover, isTakeoff);

      this.animationLoop = requestAnimationFrame(loop);
    };
    
    this.animationLoop = requestAnimationFrame(loop);
  }
};
