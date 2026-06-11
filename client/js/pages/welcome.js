window.WelcomePage = {
  render(container) {
    container.innerHTML = `
      <div class="welcome-page" style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;">
        
        <!-- Animated Background Elements -->
        <div class="bg-pulse" style="position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(0,242,254,0.1) 0%, transparent 60%); border-radius: 50%; top: -100px; left: -100px; z-index: -1;"></div>
        <div class="bg-pulse delay-200" style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(79,172,254,0.1) 0%, transparent 60%); border-radius: 50%; bottom: -50px; right: 10vw; z-index: -1;"></div>
        
        <div class="hero-content slide-up" style="text-align: center; max-width: 800px; padding: 0 20px;">
          <h1 style="font-size: 4rem; margin-bottom: 20px; font-weight: 800; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(6, 182, 212, 0.4);">
            Thrust Calculator
          </h1>
          <p style="font-size: 1.3rem; color: var(--text-muted); margin-bottom: 40px; font-weight: 300;">
            Professional Blade Element Momentum (BEM) analysis engine for UAV propellers and rotors.
          </p>
          
          <div class="drone-graphic" style="margin-bottom: 50px;">
            <svg width="200" height="100" viewBox="0 0 200 100" fill="none" class="slide-up delay-100">
              <!-- Simple Drone Wireframe SVG -->
              <path d="M40 50 L160 50 M100 50 L100 80" stroke="var(--text-muted)" stroke-width="4" stroke-linecap="round"/>
              <circle cx="100" cy="50" r="15" fill="var(--bg-panel)" stroke="var(--accent-blue)" stroke-width="3"/>
              
              <!-- Left Propeller -->
              <g class="prop-spin">
                <ellipse cx="40" cy="45" rx="30" ry="6" fill="rgba(6, 182, 212, 0.3)" />
                <path d="M40 45 L40 50" stroke="var(--text-main)" stroke-width="4"/>
              </g>
              
              <!-- Right Propeller -->
              <g class="prop-spin" style="animation-direction: reverse;">
                <ellipse cx="160" cy="45" rx="30" ry="6" fill="rgba(6, 182, 212, 0.3)" />
                <path d="M160 45 L160 50" stroke="var(--text-main)" stroke-width="4"/>
              </g>
              
              <!-- Landing Gear -->
              <path d="M70 80 L130 80 M80 50 L70 80 M120 50 L130 80" stroke="var(--text-muted)" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>

          <div style="display: flex; justify-content: center; gap: 20px;">
            <button class="btn btn-primary" style="font-size: 1.2rem; padding: 16px 40px;" onclick="Router.navigate('/input')">
              START ANALYSIS →
            </button>
            <button class="btn" style="font-size: 1.2rem; padding: 16px 40px; background: rgba(255,255,255,0.1); border: 1px solid var(--border-color); color: var(--text-main);" onclick="Router.navigate('/bench')">
              🎛️ TEST BENCH
            </button>
          </div>
        </div>
      </div>
      
      <style>
        @keyframes spin { 100% { transform: rotateY(360deg); } }
        .prop-spin { transform-origin: center; animation: spin 0.3s linear infinite; }
        .prop-spin:nth-child(4) { transform-origin: 40px 45px; }
        .prop-spin:nth-child(5) { transform-origin: 160px 45px; }
      </style>
    `;
  }
};
