const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let port;
let ioInstance;

function initSerial(io) {
  ioInstance = io;

  // We are keeping it simple for now, connecting to a default port if available,
  // or you can configure this to auto-detect.
  const portPath = process.env.SERIAL_PORT || '/dev/ttyACM0'; // Common for Nucleo boards on Linux

  try {
    port = new SerialPort({
      path: portPath,
      baudRate: 115200,
      autoOpen: false
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    port.open((err) => {
      if (err) {
        console.error('Serial port error:', err.message);
        // We do not crash the server if no STM32 is connected
      } else {
        console.log(`✅ Serial port connected on ${portPath}`);
      }
    });

    parser.on('data', (data) => {
      // Example expected format from STM32: "THROTTLE:50,STATUS:ARMED"
      try {
        const parts = data.split(',');
        const telemetry = {};
        parts.forEach(part => {
          const [key, value] = part.split(':');
          if (key && value) {
            telemetry[key.trim()] = value.trim();
          }
        });
        
        // Broadcast telemetry to connected web clients
        if (ioInstance) {
          ioInstance.emit('telemetry', telemetry);
        }
      } catch (e) {
        console.error('Error parsing serial data:', e);
      }
    });

    port.on('close', () => {
      console.log('Serial port closed');
      if (ioInstance) ioInstance.emit('serial_status', { connected: false });
    });

    port.on('error', (err) => {
      console.error('Serial port error:', err.message);
    });
    
  } catch (e) {
    console.error('Failed to initialize serial port:', e);
  }
}

function sendCommand(command) {
  if (port && port.isOpen) {
    port.write(`${command}\n`, (err) => {
      if (err) {
        console.error('Error writing to serial port:', err.message);
      }
    });
  } else {
    console.warn(`Serial port not open, couldn't send command: ${command}`);
  }
}

module.exports = {
  initSerial,
  sendCommand
};
