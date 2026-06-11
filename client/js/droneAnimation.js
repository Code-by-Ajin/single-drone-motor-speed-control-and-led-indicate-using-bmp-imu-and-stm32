const DroneAnimation = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    container.innerHTML = `
      <div id="drone-environment" style="position: relative; width: 100%; height: 100%; background: linear-gradient(to top, rgba(16,21,45,1) 0%, rgba(5,8,20,1) 100%); overflow: hidden; border-radius: 8px;">
        
        <!-- Background Elements -->
        <div class="sky-particles"></div>
        
        <!-- Ground Line -->
        <div style="position: absolute; bottom: 20px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.1);"></div>
        
        <!-- The Drone Container (moves Y) -->
        <div id="drone-character" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); transition: bottom 0.5s ease-out;">
          
          <div id="drone-body" style="position: relative; transition: transform 0.3s ease;">
            <!-- Simple Quad Graphic - front view -->
            <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
              <!-- Central Hub -->
              <rect x="40" y="20" width="40" height="15" rx="5" fill="var(--bg-panel)" stroke="var(--accent-blue)" stroke-width="2"/>
              <circle cx="60" cy="27" r="4" fill="var(--accent-cyan)" />
              
              <!-- Arms -->
              <path d="M40 25 L10 25 M80 25 L110 25" stroke="#8b9bb4" stroke-width="3" stroke-linecap="round"/>
              
              <!-- Left Motor -->
              <rect x="5" y="15" width="10" height="10" fill="#cbd5e1" rx="2"/>
              <!-- Right Motor -->
              <rect x="105" y="15" width="10" height="10" fill="#cbd5e1" rx="2"/>
              
              <!-- Left Prop Disk (animated height/opacity based on throttle) -->
              <ellipse id="anim-prop-L" cx="10" cy="14" rx="25" ry="3" fill="rgba(0, 242, 254, 0)" />
              <!-- Right Prop Disk -->
              <ellipse id="anim-prop-R" cx="110" cy="14" rx="25" ry="3" fill="rgba(0, 242, 254, 0)" />
              
              <!-- Legs -->
              <path d="M45 35 L35 45 M75 35 L85 45" stroke="#8b9bb4" stroke-width="2" stroke-linecap="round"/>
            </svg>
            
            <!-- Thrust effect lines -->
            <div id="thrust-wash-L" style="position: absolute; left: 10px; top: 14px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 50px solid rgba(0, 242, 254, 0); transform: translateX(-50%);"></div>
            <div id="thrust-wash-R" style="position: absolute; left: 110px; top: 14px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 50px solid rgba(0, 242, 254, 0); transform: translateX(-50%);"></div>
          </div>
        </div>
      </div>
    `;
  },

  updateState(throttlePercent, isHovering, isTakeoff) {
    const drone = document.getElementById('drone-character');
    const body = document.getElementById('drone-body');
    const propL = document.getElementById('anim-prop-L');
    const propR = document.getElementById('anim-prop-R');
    const washL = document.getElementById('thrust-wash-L');
    const washR = document.getElementById('thrust-wash-R');
    
    if(!drone) return;

    // Propeller spinning visual (faster throttle = taller oval and more opaque)
    const baseOpacity = 0.1 + (throttlePercent / 100) * 0.5;
    const washOpacity = (throttlePercent / 100) * 0.4;
    propL.setAttribute('fill', `rgba(0, 242, 254, ${baseOpacity})`);
    propR.setAttribute('fill', `rgba(0, 242, 254, ${baseOpacity})`);
    
    washL.style.borderTopColor = `rgba(0, 242, 254, ${washOpacity})`;
    washR.style.borderTopColor = `rgba(0, 242, 254, ${washOpacity})`;

    // Altitude calculation
    let altitudeStr = '20px'; // Ground
    if (isTakeoff) {
      // Scale from 20px to 80% container height
      const envHeight = document.getElementById('drone-environment').clientHeight;
      const tRelative = (throttlePercent - 50) / 50; // 0 to 1
      const pixels = 20 + tRelative * (envHeight * 0.6);
      altitudeStr = `${pixels}px`;
    }

    drone.style.bottom = altitudeStr;

    // Add turbulence / wobble
    if (isHovering && !isTakeoff) {
      body.style.transform = `translateY(${Math.sin(Date.now()/200)*2}px) rotate(${Math.sin(Date.now()/300)*1}deg)`;
    } else if (isTakeoff) {
      body.style.transform = `translateY(${Math.sin(Date.now()/150)*3}px) rotate(${Math.sin(Date.now()/250)*2}deg) scale(0.95)`;
    } else {
      body.style.transform = `translateY(0) rotate(0)`;
    }
  }
};
