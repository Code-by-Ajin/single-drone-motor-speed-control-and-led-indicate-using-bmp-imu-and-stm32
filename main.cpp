#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BMP3XX.h>
#include <Servo.h> // Required for ESC/Motor PWM control

Adafruit_BMP3XX bmp;
Servo myESC; 

// ESC Pin (PA3 maps to TIM2 Channel 4)
#define ESC_PIN  PA3

// LED Indicator Pins (Change these to match your actual wiring)
#define LED_FL PA4
#define LED_FR PA5
#define LED_BL PA6
#define LED_BR PA7

// I2C Addresses
#define BMP388_ADDR  0x77
uint8_t active_imu_addr = 0x6B; // Default ISM330DHCX address (will auto-detect 0x6A if grounded)

// IMU Scale Constants
const float ACCEL_SCALE = 16384.0f; // For ±2g range
const float IMU_GYRO_SCALE  = 114.28f;  // For ±250 dps (8.75 mdps/LSB)

// Noise Filter Coefficients
const float IMU_LPF_BETA  = 0.08f;  // Decreased from 0.15f to filter out more vibration noise
const float GYRO_LPF_BETA = 0.10f;  // New LPF coefficient for raw gyroscope data

// Sensor Offsets (Calculated during startup)
float gyroBiasX = 0.0f, gyroBiasY = 0.0f, gyroBiasZ = 0.0f;
float groundPressure = 1013.25; 
const float SEA_LEVEL_PRESSURE = 1013.25; 

// IMU Filter States
float ax_filtered = 0.0f, ay_filtered = 0.0f, az_filtered = 1.0f;
float gx_filtered = 0.0f, gy_filtered = 0.0f, gz_filtered = 0.0f;
float roll = 0.0f, pitch = 0.0f, yaw = 0.0f;

// IMU Raw States 
float ax = 0.0f, ay = 0.0f, az = 0.0f;
float gx = 0.0f, gy = 0.0f, gz = 0.0f;

// Barometer Physical States
float temperature_c = 0.0f;
float pressure_hpa = 0.0f;
float relativeAltitude = 0.0f;

// Flight Control State
int userThrottle = 0; // 0 to 100%
int pwm = 1000;

// Stabilizing Gain Multipliers
const float ROLL_GAIN = 2.0f;   
const float PITCH_GAIN = 2.0f;  

// Timing Control (100 Hz non-blocking loop rate)
uint32_t lastLoopTime = 0;

/* =========================================
   I2C HELPER FUNCTIONS FOR IMU
   ========================================= */

void writeIMUReg(uint8_t reg, uint8_t val) {
    Wire.beginTransmission(active_imu_addr);
    Wire.write(reg);
    Wire.write(val);
    Wire.endTransmission();
}

bool readIMUBytes(uint8_t reg, uint8_t *buffer, uint8_t len) {
    Wire.beginTransmission(active_imu_addr);
    Wire.write(reg);
    if (Wire.endTransmission(false) != 0) {
        return false;
    }
    uint8_t readLen = Wire.requestFrom(active_imu_addr, len);
    if (readLen == len) {
        for (uint8_t i = 0; i < len; i++) {
            buffer[i] = Wire.read();
        }
        return true;
    }
    return false;
}

void Recover_IMU_Bus(void) {
    Wire.end();
    delay(10);
    Wire.setSDA(PB9);
    Wire.setSCL(PB8);
    Wire.begin();
    delay(10);
    writeIMUReg(0x12, 0x04); // Re-enable auto-increment
    writeIMUReg(0x10, 0x60); // Re-enable Accel
    writeIMUReg(0x11, 0x60); // Re-enable Gyro
}

// Calculates Gyro offsets over I2C
void Calibrate_Gyroscope() {
    long sum_x = 0, sum_y = 0, sum_z = 0;
    uint8_t d[6];
    int samples = 0;

    while (samples < 200) {
        if (readIMUBytes(0x22, d, 6)) { 
            sum_x += (int16_t)((d[1] << 8) | d[0]);
            sum_y += (int16_t)((d[3] << 8) | d[2]);
            sum_z += (int16_t)((d[5] << 8) | d[4]);
            samples++;
        }
        delay(5);
    }
    gyroBiasX = sum_x / 200.0f;
    gyroBiasY = sum_y / 200.0f;
    gyroBiasZ = sum_z / 200.0f;
}

/* =========================================
   SETUP AND INITIALIZATION
   ========================================= */

void setup()
{
    Serial.begin(115200);
    delay(2000);

    Serial.println();
    Serial.println("BMP388 + IMU Filtered Front-Left Motor Control System");

    /* ESC ARMING SEQUENCE */
    myESC.attach(ESC_PIN); 

    // Configure LED Pins as Output
    pinMode(LED_FL, OUTPUT);
    pinMode(LED_FR, OUTPUT);
    pinMode(LED_BL, OUTPUT);
    pinMode(LED_BR, OUTPUT);

    Serial.println("Arming ESC... Keep clear of propellers!");
    myESC.writeMicroseconds(1000); 
    delay(8000); 
    Serial.println("ESC Armed.");

    // Start I2C bus on specific pins (SDA=PB9, SCL=PB8)
    Wire.setSDA(PB9);
    Wire.setSCL(PB8);
    Wire.begin();
    
    // Slow down I2C clock to 100 kHz (Standard Mode) for noise immunity
    Wire.setClock(100000); 

    /* INITIALIZE IMU */
    Serial.print("Auto-detecting IMU address...");
    active_imu_addr = 0x6B; 
    Wire.beginTransmission(active_imu_addr);
    if (Wire.endTransmission() != 0) {
        active_imu_addr = 0x6A; 
        Wire.beginTransmission(active_imu_addr);
        if (Wire.endTransmission() != 0) {
            Serial.println(" FAILED. Check SDA/SCL wiring.");
            while (1) { delay(100); }
        }
    }
    Serial.print(" Detected at 0x");
    Serial.println(active_imu_addr, HEX);

    // Configure IMU registers:
    writeIMUReg(0x12, 0x04); // Enable auto-increment (IF_INC)
    writeIMUReg(0x10, 0x60); // Accel 104 Hz, ±2g FS (CTRL1_XL)
    writeIMUReg(0x11, 0x60); // Gyro 104 Hz, ±250 dps FS (CTRL2_G)

    /* INITIALIZE BAROMETER */
    if (!bmp.begin_I2C(BMP388_ADDR, &Wire))
    {
        Serial.println("BMP388 NOT detected on I2C bus!");
        while (1) { delay(100); }
    }
    Serial.println("BMP388 detected via I2C!");

    bmp.setTemperatureOversampling(BMP3_OVERSAMPLING_8X);
    bmp.setPressureOversampling(BMP3_OVERSAMPLING_8X);
    bmp.setIIRFilterCoeff(BMP3_IIR_FILTER_COEFF_15); // Increased from COEFF_3 to eliminate altitude jitter
    bmp.setOutputDataRate(BMP3_ODR_50_HZ);

    delay(1000); // Let hardware settle

    // Let Barometer IIR filter stabilize
    Serial.print("Stabilizing barometer IIR filter...");
    for (int i = 0; i < 30; i++) {
        bmp.performReading();
        delay(20);
    }
    Serial.println(" Stabilized.");

    /* CALIBRATION PHASE */
    Serial.print("Calibrating Gyroscope...");
    Calibrate_Gyroscope();
    Serial.println(" Calibrated.");

    Serial.print("Calculating ground pressure baseline...");
    double pressureSum = 0;
    int successfulSamples = 0;

    while (successfulSamples < 100)
    {
        if (bmp.performReading())
        {
            pressureSum += (bmp.pressure / 100.0); 
            successfulSamples++;
        }
        delay(20);
    }
    groundPressure = (float)(pressureSum / 100.0);
    Serial.print(" Done. Baseline: ");
    Serial.print(groundPressure);
    Serial.println(" hPa");

    // Initialize Accel LPF starting states
    uint8_t imu_buf[6];
    if (readIMUBytes(0x28, imu_buf, 6)) {
        int16_t rx = (int16_t)((imu_buf[1] << 8) | imu_buf[0]);
        int16_t ry = (int16_t)((imu_buf[3] << 8) | imu_buf[2]);
        int16_t rz = (int16_t)((imu_buf[5] << 8) | imu_buf[4]);
        ax_filtered = rx / ACCEL_SCALE;
        ay_filtered = ry / ACCEL_SCALE;
        az_filtered = rz / ACCEL_SCALE;
    }

    lastLoopTime = millis();
}

void loop()
{
    // Process incoming serial commands
    while (Serial.available()) {
        String input = Serial.readStringUntil('\n');
        input.trim();
        if (input.startsWith("T:")) {
            userThrottle = input.substring(2).toInt();
            if (userThrottle < 0) userThrottle = 0;
            if (userThrottle > 100) userThrottle = 100;
        }
    }

    uint32_t currentTime = millis();

    // Highly precise 100 Hz Loop (Execution every 10ms)
    if (currentTime - lastLoopTime >= 10) {
        float dt = 0.01f; // Standardized 10ms timestep for 100Hz Complementary Filter
        lastLoopTime = currentTime;

        uint8_t imu_buf[6];
        bool imu_ok = false;

        /* =========================================
           1. READ IMU DATA (With Error Checking)
           ========================================= */
        if (readIMUBytes(0x28, imu_buf, 6)) {
            int16_t raw_ax = (int16_t)((imu_buf[1] << 8) | imu_buf[0]);
            int16_t raw_ay = (int16_t)((imu_buf[3] << 8) | imu_buf[2]);
            int16_t raw_az = (int16_t)((imu_buf[5] << 8) | imu_buf[4]);

            ax = raw_ax / ACCEL_SCALE;
            ay = raw_ay / ACCEL_SCALE;
            az = raw_az / ACCEL_SCALE;

            if (readIMUBytes(0x22, imu_buf, 6)) {
                int16_t raw_gx = (int16_t)((imu_buf[1] << 8) | imu_buf[0]);
                int16_t raw_gy = (int16_t)((imu_buf[3] << 8) | imu_buf[2]);
                int16_t raw_gz = (int16_t)((imu_buf[5] << 8) | imu_buf[4]);

                gx = (raw_gx - gyroBiasX) / IMU_GYRO_SCALE;
                gy = (raw_gy - gyroBiasY) / IMU_GYRO_SCALE;
                gz = (raw_gz - gyroBiasZ) / IMU_GYRO_SCALE;
                
                // Aggressive Deadband ONLY on Yaw to prevent any stationary drift
                if (abs(gz) < 2.0f) gz = 0.0f;

                imu_ok = true; 
            }
        }

        /* =========================================
           2. SENSOR PROCESSING & AUTO-RECOVERY
           ========================================= */
        if (imu_ok) {
            // Apply Low-Pass Filter on raw accelerometer data
            ax_filtered = (ax_filtered * (1.0f - IMU_LPF_BETA)) + (ax * IMU_LPF_BETA);
            ay_filtered = (ay_filtered * (1.0f - IMU_LPF_BETA)) + (ay * IMU_LPF_BETA);
            az_filtered = (az_filtered * (1.0f - IMU_LPF_BETA)) + (az * IMU_LPF_BETA);

            // Apply Low-Pass Filter on raw gyroscope data
            gx_filtered = (gx_filtered * (1.0f - GYRO_LPF_BETA)) + (gx * GYRO_LPF_BETA);
            gy_filtered = (gy_filtered * (1.0f - GYRO_LPF_BETA)) + (gy * GYRO_LPF_BETA);
            gz_filtered = (gz_filtered * (1.0f - GYRO_LPF_BETA)) + (gz * GYRO_LPF_BETA);

            // Calculate tilt angles from filtered accelerometer data
            float accRoll  = atan2f(ay_filtered, az_filtered) * 57.2958f;
            float accPitch = atan2f(-ax_filtered, sqrtf(ay_filtered * ay_filtered + az_filtered * az_filtered)) * 57.2958f;

            // Complementary Filter: Strengthened to 0.99 and 0.01 to eliminate accelerometer vibration noise
            roll  = 0.99f * (roll + gx_filtered * dt) + 0.01f * accRoll;
            pitch = 0.99f * (pitch + gy_filtered * dt) + 0.01f * accPitch;

            // Integrate Z-axis gyro
            yaw += gz_filtered * dt;
            if (yaw > 180.0f)  yaw -= 360.0f;
            if (yaw < -180.0f) yaw += 360.0f;
        } 
        else 
        {
            // EMERGENCY SAFETY WARNING & AUTOMATIC BUS RECOVERY
            static uint32_t last_imu_error = 0;
            if (currentTime - last_imu_error > 1000) {
                last_imu_error = currentTime;
                Serial.println("[EMERGENCY] IMU Connection Lost! Re-initializing Bus...");
            }
            Recover_IMU_Bus(); 
        }

        /* =========================================
           3. READ BAROMETER (Altitude)
           ========================================= */
        if (bmp.performReading()) {
            pressure_hpa = bmp.pressure / 100.0f; 
            temperature_c = bmp.temperature;
            
            float rawAltitude = 44330.0f * (1.0f - powf((pressure_hpa / groundPressure), 0.190295f));

            // Low Pass Filter to smooth out altitude noise
            relativeAltitude = (relativeAltitude * 0.90f) + (rawAltitude * 0.10f);

            // Prevent negative altitude readings near ground
            if (relativeAltitude < -0.2f && relativeAltitude > -1.0f) {
                relativeAltitude = 0.0f; 
            }
        }

        /* =========================================
           4. CLOSED-LOOP FLIGHT MIXER & EMERGENCY SHUTDOWN
           ========================================= */
        if (imu_ok) {
            // Map 0-100% throttle to 1000-2000us base PWM
            int baseThrottle = 1000 + (userThrottle * 10);

            float rollCorrection  = roll * ROLL_GAIN;     
            float pitchCorrection = -pitch * PITCH_GAIN;  

            // Front-Left Motor Mixer Formula
            pwm = baseThrottle + (int)rollCorrection + (int)pitchCorrection;

            // Apply standard output limits
            if (pwm < 1000) pwm = 1000;
            if (pwm > 2000) pwm = 2000;

            // --- PHYSICAL LED BLINKING LOGIC ---
            const float THRESH = 5.0f;
            float sFL = 0, sFR = 0, sBL = 0, sBR = 0;
            
            // Pitch: tilt down front -> back LEDs blink; tilt up front -> front LEDs blink.
            if (pitch < -THRESH) { sFL += -pitch; sFR += -pitch; }
            else if (pitch > THRESH) { sBL += pitch; sBR += pitch; }

            // Roll: roll > 0 means left up
            if (roll > THRESH) { sFL += roll; sBL += roll; }
            else if (roll < -THRESH) { sFR += -roll; sBR += -roll; }

            // Yaw: anticlockwise (yaw > THRESH) -> FR and BL blink; clockwise (yaw < -THRESH) -> FL and BR blink
            if (yaw > THRESH) { sFR += yaw; sBL += yaw; }
            else if (yaw < -THRESH) { sFL += -yaw; sBR += -yaw; }

            // Toggle logic based on tilt intensity
            auto updateBlink = [](int pin, float speed, uint32_t current_time) {
                if (speed < 5.0f) {
                    digitalWrite(pin, LOW);
                } else {
                    if (speed > 50.0f) speed = 50.0f;
                    uint32_t period = 800 - (uint32_t)(speed * 14.0f);
                    if (period < 80) period = 80;
                    if ((current_time / period) % 2 == 0) digitalWrite(pin, HIGH);
                    else digitalWrite(pin, LOW);
                }
            };

            updateBlink(LED_FL, sFL, currentTime);
            updateBlink(LED_FR, sFR, currentTime);
            updateBlink(LED_BL, sBL, currentTime);
            updateBlink(LED_BR, sBR, currentTime);

        } 
        else 
        {
            // CRITICAL: Shut down the motor completely if IMU fails
            pwm = 1000; 
            
            // Turn off LEDs
            digitalWrite(LED_FL, LOW);
            digitalWrite(LED_FR, LOW);
            digitalWrite(LED_BL, LOW);
            digitalWrite(LED_BR, LOW);
        }

        // Send PWM speed to the ESC
        myESC.writeMicroseconds(pwm);

        /* =========================================
           5. PRINT TO SERIAL MONITOR (Every 200ms)
           ========================================= */
        static uint32_t lastPrint = 0;
        if (currentTime - lastPrint > 200) {
            lastPrint = currentTime;

            if (imu_ok) {
                Serial.print("{\"roll\":"); Serial.print(roll, 3);
                Serial.print(",\"pitch\":"); Serial.print(pitch, 3);
                Serial.print(",\"yaw\":"); Serial.print(yaw, 3);
                Serial.print(",\"alt\":"); Serial.print(relativeAltitude, 3);
                Serial.print(",\"press\":"); Serial.print(pressure_hpa, 2);
                Serial.print(",\"temp\":"); Serial.print(temperature_c, 2);
                Serial.print(",\"pwm\":"); Serial.print(pwm);
                Serial.println("}");
            } else {
                Serial.println("{\"error\":\"IMU_FAIL\"}");
            }
        }
    }
}