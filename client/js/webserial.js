// client/js/webSerial.js
const WebSerial = {
    port: null,
    writer: null,
    reader: null,
    keepReading: true,

    async connect() {
        try {
            // 1. Prompt user to select the STM32 COM port
            this.port = await navigator.serial.requestPort();

            // 2. Open port at 115200 baud (matching your STM32 config)
            await this.port.open({ baudRate: 115200 });
            
            // 2.5 ST-Link V3 requires DTR/RTS to be asserted to forward UART!
            await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });

            // 3. Setup Writer (to send commands)
            const textEncoder = new TextEncoderStream();
            textEncoder.readable.pipeTo(this.port.writable);
            this.writer = textEncoder.writable.getWriter();

            // 4. Setup Reader (to read ACKs/telemetry from STM32)
            this.keepReading = true;
            this.startReading();

            return true;
        } catch (err) {
            console.error('Error opening serial port:', err);
            return false;
        }
    },

    async disconnect() {
        this.keepReading = false;
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }
        if (this.writer) {
            this.writer.releaseLock();
            this.writer = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
    },

    // This is the function the slider will call!
    async sendThrottle(value) {
        if (!this.writer) {
            console.warn("Hardware not connected!");
            return;
        }
        console.log(`Sending to STM32: T:${value}\\n`);
        try {
            await this.writer.write(`T:${value}\n`);
        } catch(e) {
            console.error("Failed to write to serial port:", e);
        }
    },

    async startReading() {
        const textDecoder = new TextDecoderStream();
        this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();
        let buffer = '';

        try {
            while (this.keepReading) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) {
                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep incomplete line
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line.trim());
                            if (window.BenchPage && window.BenchPage.connected) {
                                window.BenchPage.latestSensorData = data;
                            }
                        } catch(e) {
                            console.log("STM32 Says:", line.trim());
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Serial read error:', error);
        } finally {
            this.reader.releaseLock();
        }
    }
};

window.WebSerial = WebSerial;
