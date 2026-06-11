// client/js/pages/bench.js
window.BenchPage = {
    connected: false,
    chart: null,
    dataHistory: [],
    latestTelemetry: { v: 12.0, i: 0 },
    latestSensorData: null,
    calibratedRpm: null,   // set after motor calibration
    rollOffset: 0,
    pitchOffset: 0,
    yawOffset: 0,
    altOffset: 0,
    scene: null, camera: null, renderer: null, imuMesh: null,

    render(container) {
        container.innerHTML = `
      <div class="page-container" style="max-width: 1000px; margin: 30px auto; text-align: center;">
        
        <!-- VIEW 1: DISCONNECTED -->
        <div id="view1" style="display: block; margin: 50px auto; max-width: 400px; padding: 40px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-panel);">
          <h2 style="margin-bottom: 20px;">Hardware Disconnected</h2>
          <button id="btnConnect" class="btn btn-primary" style="padding: 15px 30px; font-size: 18px; width: 100%; margin-bottom: 15px;">🔌 Connect STM32</button>
          <button id="btnBackToHome" class="btn btn-secondary" style="padding: 15px 30px; font-size: 16px; width: 100%;">← Back</button>
          <p id="statusText" style="color: #ef4444; margin-top: 15px;">Status: Not Connected</p>
        </div>

        <!-- VIEW 2: SPECIFICATIONS -->
        <div id="view2" style="display: none; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #10b981;">✅ STM32 Connected</h2>
                <button id="btnSpecBack" class="btn" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 15px;">Disconnect STM32</button>
            </div>
            <div id="benchInputContainer"></div>
        </div>

        <!-- VIEW 3: DASHBOARD -->
        <div id="view3" style="display: none; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #10b981;">✅ STM32 Test Bench</h2>
                <button id="btnDisconnect" class="btn" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 15px;">Disconnect STM32</button>
            </div>

            <!-- ROW 1: Throttle + Calibrate + Graph -->
            <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">

                <!-- Throttle Control -->
                <div style="flex: 1; min-width: 260px; padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-panel);">
                  <h3 style="margin-bottom: 14px;">Throttle Control</h3>
                  <div style="display: flex; justify-content: space-between; margin: 16px 0;">
                      <div style="text-align: center; flex: 1;">
                          <p style="color: var(--text-muted); font-size: 0.85em; margin: 0;">Throttle</p>
                          <h2 id="throttleVal" style="color: var(--accent-blue); font-size: 2.4rem; margin: 4px 0;">0%</h2>
                      </div>
                      <div style="width: 1px; background: var(--border-color);"></div>
                      <div style="text-align: center; flex: 1;">
                          <p style="color: var(--text-muted); font-size: 0.85em; margin: 0;">Est. Thrust</p>
                          <h2 id="thrustVal" style="color: #10b981; font-size: 2.4rem; margin: 4px 0;">0 g</h2>
                      </div>
                  </div>
                  <input type="range" id="throttleSlider" min="0" max="100" value="0" style="width: 100%; height: 28px; margin-top: 8px;">
                  <div id="calibBadge" style="display:none; margin-top:10px; padding:6px 10px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:6px; font-size:0.8em; color:#10b981; text-align:center;"></div>
                  <button id="btnStop" class="btn" style="margin-top: 20px; padding: 16px; font-size: 18px; background: #ef4444; color: white; width: 100%; border: none; font-weight: bold; border-radius: 8px;">
                    🛑 EMERGENCY STOP
                  </button>
                </div>

                <!-- Live Sensor Data -->
                <div style="flex: 1; min-width: 220px; padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-panel); display: flex; flex-direction: column;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <h3 style="color: var(--accent-cyan); margin: 0;">Live Sensors</h3>
                    <button id="btnZeroImu" class="btn" style="padding: 4px 10px; font-size: 0.8em; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; text-transform: uppercase; font-weight: bold;">CALIBRATE</button>
                  </div>
                  <div style="text-align: left; font-family: monospace; font-size: 1.1em; color: var(--text-muted); line-height: 2.2; flex: 1;">
                      <div>🌡️ Tmp: &nbsp;<span id="lblTemp" style="color: #fff; font-weight: bold;">--</span> °C</div>
                      <div>☁️ Prs: &nbsp;<span id="lblPress" style="color: #fff; font-weight: bold;">--</span> hPa</div>
                      <div>⛰️ Alt: &nbsp;<span id="lblAlt" style="color: #fff; font-weight: bold;">--</span> m</div>
                      <div>🔄 Rll: &nbsp;<span id="lblRoll" style="color: #fff; font-weight: bold;">--</span>°</div>
                      <div>🔄 Ptc: &nbsp;<span id="lblPitch" style="color: #fff; font-weight: bold;">--</span>°</div>
                      <div>🔄 Yaw: &nbsp;<span id="lblYaw" style="color: #fff; font-weight: bold;">--</span>°</div>
                      <div>⚡ PWM: &nbsp;<span id="lblPwm" style="color: #fff; font-weight: bold;">--</span>us</div>
                  </div>
                </div>

                <!-- 3D IMU Viewer -->
                <div style="flex: 1.5; min-width: 300px; padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-panel); display: flex; flex-direction: column;">
                  <h3 style="margin-bottom: 14px;">IMU 3D View</h3>
                  <div id="imuCanvasContainer" style="width: 100%; height: 260px; background: #111; border-radius: 8px; overflow: hidden; border: 1px solid #333;"></div>
                </div>

                <!-- LED Indicators -->
                <div style="flex: 1; min-width: 240px; padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-panel); display: flex; flex-direction: column; align-items: center;">
                  <h3 style="margin-bottom: 14px; width: 100%; text-align: left;">LED Indicators</h3>
                  <div style="position: relative; width: 160px; height: 160px; margin: auto; background: rgba(0,0,0,0.2); border-radius: 50%; border: 1px dashed #444;">
                     <!-- Front Left -->
                     <div id="led-fl" style="position: absolute; top: 15px; left: 15px; width: 36px; height: 36px; border-radius: 50%; background: #333; border: 2px solid #555; transition: background 0.05s;"></div>
                     <!-- Front Right -->
                     <div id="led-fr" style="position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: #333; border: 2px solid #555; transition: background 0.05s;"></div>
                     <!-- Back Left -->
                     <div id="led-bl" style="position: absolute; bottom: 15px; left: 15px; width: 36px; height: 36px; border-radius: 50%; background: #333; border: 2px solid #555; transition: background 0.05s;"></div>
                     <!-- Back Right -->
                     <div id="led-br" style="position: absolute; bottom: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: #333; border: 2px solid #555; transition: background 0.05s;"></div>
                     <!-- Center (Yaw) -->
                     <div id="led-yaw" style="position: absolute; top: 62px; left: 62px; width: 36px; height: 36px; border-radius: 50%; background: #333; border: 2px solid #555; display: flex; justify-content: center; align-items: center; font-size: 11px; color: #aaa; transition: background 0.05s; font-weight: bold;">YAW</div>
                  </div>
                  <div style="margin-top: 15px; font-size: 0.85em; color: var(--text-muted); text-align: center;">
                    Blinks when tilted/yawed > 5°
                  </div>
                </div>

                <!-- Telemetry Graph -->
                <div style="flex: 2; min-width: 360px; padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-panel);">
                  <h3 style="margin-bottom: 14px;">Live Telemetry</h3>
                  <canvas id="telemetryChart" width="400" height="220"></canvas>
                </div>
            </div>

        </div>
      </div>
    `;

        this.bindEvents();
    },

    bindEvents() {
        const view1 = document.getElementById('view1');
        const view2 = document.getElementById('view2');
        const view3 = document.getElementById('view3');

        const btnConnect    = document.getElementById('btnConnect');
        const btnBackToHome = document.getElementById('btnBackToHome');
        const statusText    = document.getElementById('statusText');
        const btnSpecBack   = document.getElementById('btnSpecBack');
        const btnDisconnect = document.getElementById('btnDisconnect');
        const btnStop       = document.getElementById('btnStop');
        const throttleSlider = document.getElementById('throttleSlider');
        const btnZeroImu    = document.getElementById('btnZeroImu');

        this.showView = (viewNum) => {
            view1.style.display = viewNum === 1 ? 'block' : 'none';
            view2.style.display = viewNum === 2 ? 'block' : 'none';
            view3.style.display = viewNum === 3 ? 'block' : 'none';

            if (viewNum === 2) {
                window.InputFormPage.render(document.getElementById('benchInputContainer'));
                const c = document.getElementById('benchInputContainer');
                const header = c.querySelector('h2')?.parentElement;
                if (header) header.style.display = 'none';
            }
        };

        this.openDashboard = () => {
            this.showView(3);
            this.initChart();
            this.initThreeJS();
            this.startTelemetryLoop();
        };

        btnBackToHome.addEventListener('click', () => Router.navigate('/'));

        btnConnect.addEventListener('click', async () => {
            const success = await window.WebSerial.connect();
            if (success) {
                this.connected = true;
                this.showView(2);
            } else {
                statusText.textContent = 'Connection Failed! Check USB.';
            }
        });

        btnSpecBack.addEventListener('click', async () => {
            await window.WebSerial.disconnect();
            this.connected = false;
            this.showView(1);
        });

        btnDisconnect.addEventListener('click', async () => {
            throttleSlider.value = 0;
            this.updateThrottle(0);
            await window.WebSerial.disconnect();
            this.connected = false;
            if (this.chart) this.chart.destroy();
            this.showView(1);
        });

        btnZeroImu.addEventListener('click', () => {
            if (this.latestSensorData && !this.latestSensorData.error) {
                this.rollOffset = this.latestSensorData.roll || 0;
                this.pitchOffset = this.latestSensorData.pitch || 0;
                this.yawOffset = this.latestSensorData.yaw || 0;
                this.altOffset = this.latestSensorData.alt || 0;
            }
        });

        throttleSlider.addEventListener('input', (e) => this.updateThrottle(e.target.value));
        btnStop.addEventListener('click', () => {
            throttleSlider.value = 0;
            this.updateThrottle(0);
        });

    },

    updateThrottle(val) {
        document.getElementById('throttleVal').textContent = `${val}%`;

        if (this.connected) window.WebSerial.sendThrottle(val);

        const s = window.State.data.input;
        const maxRpm = s.rpm || 10000;   // uses calibrated RPM if set
        const currentRpm = (val / 100) * maxRpm;

        if (currentRpm > 0 && window.ThrustCalc) {
            const payload = { ...s, rpm: currentRpm };
            const result  = window.ThrustCalc.calcBEM(payload);

            document.getElementById('thrustVal').textContent = `${Math.round(result.thrustG)} g`;

            const electricalPower = result.shaftPower / 0.75;
            const volts   = 11.1 - ((val / 100) * 1.0);
            const current = electricalPower / volts;
            this.latestTelemetry = { v: volts, i: current };
        } else {
            document.getElementById('thrustVal').textContent = `0 g`;
            this.latestTelemetry = { v: 11.1, i: 0 };
        }
    },

    initThreeJS() {
        const container = document.getElementById('imuCanvasContainer');
        if (!container || this.renderer) return;

        // Force a slight delay to ensure the browser has computed the flexbox layout width
        setTimeout(() => {
            let width = container.clientWidth || 300;
            let height = container.clientHeight || 260;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
            this.camera.position.set(0, 3, 5); // Elevated view looking down
            this.camera.lookAt(0, 0, 0);

            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this.renderer.setSize(width, height);
            
            // Make responsive
            window.addEventListener('resize', () => {
                if(container && this.renderer) {
                    this.camera.aspect = container.clientWidth / container.clientHeight;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(container.clientWidth, container.clientHeight);
                }
            });

            container.innerHTML = '';
            container.appendChild(this.renderer.domElement);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            this.scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
            dirLight.position.set(5, 10, 5);
            this.scene.add(dirLight);

            // ==========================================
            // BUILD A 3D DRONE
            // ==========================================
            this.imuMesh = new THREE.Group();
            this.scene.add(this.imuMesh);

            // 1. Central Body
            const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
            const bodyMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            this.imuMesh.add(body);

            // Green front indicator
            const frontGeo = new THREE.BoxGeometry(0.6, 0.45, 0.4);
            const frontMat = new THREE.MeshLambertMaterial({ color: 0x10b981 });
            const front = new THREE.Mesh(frontGeo, frontMat);
            front.position.set(0, 0, -0.6); // Front is -Z
            this.imuMesh.add(front);

            // 2. Arms (X configuration)
            const armGeo = new THREE.BoxGeometry(3.6, 0.15, 0.15);
            const armMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
            
            const arm1 = new THREE.Mesh(armGeo, armMat);
            arm1.rotation.y = Math.PI / 4;
            this.imuMesh.add(arm1);

            const arm2 = new THREE.Mesh(armGeo, armMat);
            arm2.rotation.y = -Math.PI / 4;
            this.imuMesh.add(arm2);

            // 3. Motors & Propellers
            const propGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16);
            const propMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 }); // Blue semi-transparent
            
            this.props = [];
            const offset = 1.27; // roughly 1.8 * cos(45)

            const positions = [
                {x: offset, z: -offset}, // Front Right
                {x: -offset, z: -offset}, // Front Left
                {x: offset, z: offset},  // Back Right
                {x: -offset, z: offset}  // Back Left
            ];

            positions.forEach(pos => {
                // Motor
                const motorGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
                const motorMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
                const motor = new THREE.Mesh(motorGeo, motorMat);
                motor.position.set(pos.x, 0.15, pos.z);
                this.imuMesh.add(motor);

                // Propeller
                const prop = new THREE.Mesh(propGeo, propMat);
                prop.position.set(pos.x, 0.35, pos.z);
                this.props.push(prop);
                this.imuMesh.add(prop);
            });

            const animate = () => {
                requestAnimationFrame(animate);
                
                // Spin propellers continuously
                if (this.props) {
                    this.props.forEach((prop, i) => {
                        prop.rotation.y += (i % 2 === 0) ? 0.3 : -0.3;
                    });
                }
                
                this.renderer.render(this.scene, this.camera);
            };
            animate();
        }, 50); // Small timeout
    },

    initChart() {
        const ctx = document.getElementById('telemetryChart').getContext('2d');
        Chart.defaults.color = '#888';
        this.dataHistory = Array(50).fill({ v: 11.1, i: 0 });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(50).fill(''),
                datasets: [
                    {
                        label: 'Current (A)',
                        data: this.dataHistory.map(d => d.i),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true, yAxisID: 'y', tension: 0.4, pointRadius: 0
                    },
                    {
                        label: 'Voltage (V)',
                        data: this.dataHistory.map(d => d.v),
                        borderColor: '#3b82f6',
                        backgroundColor: 'transparent',
                        yAxisID: 'y1', tension: 0.4, pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true, animation: false,
                scales: {
                    x: { display: false },
                    y:  { type: 'linear', display: true, position: 'left',  title: { display: true, text: 'Current (A)' }, min: 0, max: 20 },
                    y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Voltage (V)' }, min: 9, max: 13, grid: { drawOnChartArea: false } }
                }
            }
        });
    },

    startTelemetryLoop() {
        if (this.telemetryInterval) clearInterval(this.telemetryInterval);

        this.telemetryInterval = setInterval(() => {
            if (!this.connected) { clearInterval(this.telemetryInterval); return; }

            if (this.latestSensorData && !this.latestSensorData.error) {
                const r = this.latestSensorData.roll - this.rollOffset;
                const p = this.latestSensorData.pitch - this.pitchOffset;
                const y = this.latestSensorData.yaw - this.yawOffset;
                const a = this.latestSensorData.alt - this.altOffset;

                document.getElementById('lblTemp').textContent = this.latestSensorData.temp;
                document.getElementById('lblPress').textContent = this.latestSensorData.press;
                document.getElementById('lblAlt').textContent = a.toFixed(2);
                document.getElementById('lblRoll').textContent = r.toFixed(1);
                document.getElementById('lblPitch').textContent = p.toFixed(1);
                document.getElementById('lblYaw').textContent = y.toFixed(1);
                document.getElementById('lblPwm').textContent = this.latestSensorData.pwm;

                if (this.imuMesh) {
                    this.imuMesh.rotation.x = -p * (Math.PI / 180);
                    this.imuMesh.rotation.y = y * (Math.PI / 180);
                    this.imuMesh.rotation.z = -r * (Math.PI / 180);
                }

                // LED Indicators Logic
                const THRESH = 5;
                let sFL = 0, sFR = 0, sBL = 0, sBR = 0, sYaw = 0;
                
                // Pitch: tilt down front -> back LEDs blink; tilt up front -> front LEDs blink.
                if (p < -THRESH) { sFL += -p; sFR += -p; }
                else if (p > THRESH) { sBL += p; sBR += p; }

                // Roll: r > 0 means left up, r < 0 means right up
                if (r > THRESH) { sFL += r; sBL += r; }
                else if (r < -THRESH) { sFR += -r; sBR += -r; }

                // Yaw: anticlockwise (y > THRESH) -> FR and BL; clockwise (y < -THRESH) -> FL and BR
                if (y > THRESH) { sFR += y; sBL += y; sYaw += y; }
                else if (y < -THRESH) { sFL += -y; sBR += -y; sYaw += -y; }

                const now = Date.now();
                const updateBlink = (id, speed, color) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (speed < THRESH) {
                        el.style.backgroundColor = '#333';
                        el.style.boxShadow = 'none';
                        return;
                    }
                    const period = Math.max(80, 800 - Math.abs(speed) * 15);
                    const isOn = Math.floor(now / period) % 2 === 0;
                    if (isOn) {
                        el.style.backgroundColor = color;
                        el.style.boxShadow = `0 0 12px ${color}`;
                    } else {
                        el.style.backgroundColor = '#333';
                        el.style.boxShadow = 'none';
                    }
                };

                updateBlink('led-fl', sFL, '#10b981'); // Green
                updateBlink('led-fr', sFR, '#10b981'); // Green
                updateBlink('led-bl', sBL, '#ef4444'); // Red
                updateBlink('led-br', sBR, '#ef4444'); // Red
                updateBlink('led-yaw', sYaw, '#3b82f6'); // Blue

            } else if (this.latestSensorData && this.latestSensorData.error) {
                document.getElementById('lblPwm').textContent = "ERR";
            }

            this.dataHistory.push({ ...this.latestTelemetry });
            this.dataHistory.shift();

            if (this.chart) {
                this.chart.data.datasets[0].data = this.dataHistory.map(d => d.i);
                this.chart.data.datasets[1].data = this.dataHistory.map(d => d.v);
                this.chart.update();
            }
        }, 100);
    }
};
