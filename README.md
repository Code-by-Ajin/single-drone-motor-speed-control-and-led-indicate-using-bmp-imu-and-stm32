# Drone Propulsion Test Bench & Simulation Platform

This document provides a complete guide to the project's full-stack architecture. The platform consists of a **Single Page Application (SPA) frontend**, an **Express/MongoDB backend**, and custom **STM32 C/C++ firmware** that interfaces via Web Serial to control real-world brushless motors and read telemetry.

---

## 📂 Directory Structure

```text
thrust-calculator-main/
├── client/                      # Frontend SPA (Vanilla JS + CSS)
│   ├── css/
│   │   └── main.css             # Unified Design System & Styling
│   ├── js/
│   │   ├── pages/               # Page Views
│   │   │   ├── welcome.js       # Main landing view
│   │   │   ├── inputForm.js     # Engineering input configurations
│   │   │   ├── results.js       # Physics simulation results & sweeps
│   │   │   └── bench.js         # Physical STM32 Test Bench dashboard
│   │   ├── api.js               # Frontend REST client bindings
│   │   ├── droneAnimation.js    # 3D/2D responsive physics canvas mockup
│   │   ├── performanceChart.js  # Chart.js visualization for simulations
│   │   ├── propDiagram.js       # Interactive SVG propeller geometry diagram
│   │   ├── propellerDB.js       # Local fallback database of propellers
│   │   ├── router.js            # Custom SPA Router
│   │   ├── state.js             # Global Application State Manager
│   │   ├── thrustCalc.js        # BEM (Blade Element Momentum) physics engine
│   │   └── webserial.js         # Browser-native Web Serial hardware API
│   ├── index.html               # Frontend Entry Point
│   └── vercel.json              # Hosting configurations
│
├── server/                      # REST Backend (Node.js + Express)
│   ├── models/                  # Mongoose MongoDB Schemas
│   │   ├── Propeller.js         # Propeller details & physical attributes
│   │   └── TestSession.js       # Telemetry logging schema for physical tests
│   ├── routes/                  # Express Routing Layers
│   │   ├── calculate.js         # Triggers BEM calculations on the backend
│   │   ├── propellers.js        # Autocomplete and search APIs for database
│   │   ├── searchImage.js       # Auto-retrieves component pictures online
│   │   └── sessions.js          # CRUD operations for logging test bench runs
│   ├── seed/
│   │   └── seedProps.js         # Database seeding script for propellers
│   ├── utils/                   # Helpers
│   ├── .env                     # Server environment configurations
│   ├── index.js                 # Backend Server Entry Point
│   └── serial.js                # Server-side serial fallback utility
│
├── PROJECT_STRUCTURE.md         # This architectural documentation file
└── README.md                    # Quick-start guide
```

---

## 💻 1. Frontend Architecture (`client/`)

The frontend is a lightweight, responsive **Single-Page Application (SPA)** written in vanilla ES6 JavaScript and styled with clean, modern HSL dark-mode CSS.

### 🧭 Navigation & Core State
*   **[router.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/router.js):** Detects browser path changes (e.g., `/`, `/analyse`, `/bench`) and dynamically swaps the active view inside the container element without requiring full-page reloads.
*   **[state.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/state.js):** Operates as the central state hub. When a user inputs prop sizes, motor specifications, or environmental conditions, `State.updateInput()` captures and stores them. This shared data ensures that the physical Test Bench operates on the exact physical measurements inputted during specification.

### 🧬 Physics & Visualization Engine
*   **[thrustCalc.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/thrustCalc.js):** Implements physics-based simulation algorithms (specifically **Blade Element Momentum Theory - BEM**). It takes physical values like blades, airfoil selection, density (calculated from elevation/temp), propeller dimensions, and RPM to dynamically approximate thrust outputs ($g$), shaft power ($W$), drag coefficients ($C_d$), torque, and electrical current.
*   **[propDiagram.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/propDiagram.js):** Dynamically draws an interactive SVG blade profile representing chord distribution and twist distribution based on physical selections in the form.
*   **[performanceChart.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/performanceChart.js):** Powers simulation results charts (such as Thrust vs. RPM, Efficiency vs. Throttle) using `Chart.js`.

### 🔌 Hardware Connection Hub (`/bench`)
*   **[bench.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/pages/bench.js):** The Test Bench dashboard control room. It maps a 3-step SPA flow inside the bench itself:
    1.  **Handshake Connection View:** Connects to the serial port.
    2.  **Configuration View:** Embeds the exact `InputFormPage` from the simulator to feed real physical attributes to the physics engine.
    3.  **Active Dashboard:** Provides real-time throttle sliders, an **Emergency Stop** switch, calculated thrust estimations, and active graphing.
*   **[webserial.js](file:///home/sanju/Downloads/thrust-calculator-main/client/js/webserial.js):** Wraps browser-native `navigator.serial` APIs. It requests user access to COM ports, opens the serial connection at `115200 baud`, asserts **DTR (Data Terminal Ready)** and **RTS (Request To Send)** to wake up the STM32's virtual USB COM, and pipes throttle streams securely in real time.

---

## 🗄️ 2. Backend Architecture (`server/`)

The backend is a **RESTful Node.js Express API** backed by a **MongoDB** database.

### 📂 Database Schemas & Data Model
*   **[Propeller.js](file:///home/sanju/Downloads/thrust-calculator-main/server/models/Propeller.js):** Stores database properties of verified propellers, including manufacturer, model, blades, pitch, diameter, chord scale, and custom aerodynamic weights. Used by the frontend autocomplete searches.
*   **[TestSession.js](file:///home/sanju/Downloads/thrust-calculator-main/server/models/TestSession.js):** A time-series document logging database model. When a user runs a physical test stand bench session, this maps logs containing timestamped entries for raw voltage, throttle percentages, current draws, and physical thrust.

### 🌐 Express API Endpoints
*   **`/api/calculate`:** Backend physics sweep calculation engine.
*   **`/api/propellers/search`:** Handles fast query lookups on MongoDB collections to autocomplete prop shapes.
*   **`/api/sessions`:** Stores logged telemetry results persistently into MongoDB collections.

---

## 🎛️ 3. Physical Hardware Firmware (`STM32`)

For complete system loops, the STM32 board runs bare-metal **STM32 HAL C code** (perfectly built and flashed using **STM32CubeIDE**).

### 🛠️ Hardware Mapping
*   **PWM Signal Output:** Pin **`PA3`** (physically wired to the **`A0`** pin on the black Nucleo Arduino Uno V3 headers). Driven by `TIM2 Channel 4`.
*   **Virtual COM Port:** Pins **`PD8 (TX)`** and **`PD9 (RX)`** mapped to `USART3` at `115200 Baud` (runs over the physical USB debugging cable).
*   **Wiring Scheme:**
    *   🟡 **Yellow ESC Signal wire:** Plugged into `A0` (`PA3`).
    *   🟤 **Brown ESC Ground wire:** Plugged into any `GND` pin.
    *   🔌 **ESC Main Power leads:** Connected directly to a LiPo Battery.
    *   🔌 **3 ESC Motor phases:** Connected directly to the Brushless motor.

### ⚙️ Firmware Execution Logic
1.  **Power On & Arming:** The STM32 boots up on its internal `64MHz HSI` oscillator. The timer prescaler is set to `63` ($64\text{MHz} / 64 = 1\text{MHz}$ clock tick, or $1\mu\text{s}$ per tick). It sets the period to `19999` ($20\text{ms}$ or $50\text{Hz}$) which is the standard RC PWM frequency.
2.  It outputs an arming pulse of exactly `1000us` ($1.0\text{ms}$) and pauses for 5 seconds. The ESC detects zero throttle and happily arms (`Da-Di-Doo` startup tune).
3.  **Command Parsing:** Inside `while(1)`, the STM32 bypasses slow HAL calls and queries the raw UART register flag `__HAL_UART_GET_FLAG(&huart3, UART_FLAG_RXNE)`.
4.  It extracts characters from `huart3.Instance->RDR` and reconstructs strings until it catches a newline (`\n`).
5.  If it detects `T:xx\n` (e.g., `T:50` for 50% throttle), it translates it to microsecond pulses using linear mapping:
    $$\text{Pulse} = 1000 + (\text{Throttle}\% \times 10)$$
6.  It writes this pulse directly to the PWM register `__HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_4, pulse)` to adjust motor speed instantly.
7.  **Overrun Mitigation:** Continually monitors and resets hardware overrun errors (`__HAL_UART_CLEAR_FLAG(&huart3, UART_CLEAR_OREF)`) to prevent high-speed serial inputs from crashing the MCU.
