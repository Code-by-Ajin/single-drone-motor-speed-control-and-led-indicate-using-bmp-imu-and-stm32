const mongoose = require('mongoose');

const testSessionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  motorName: { type: String, required: true },
  propellerName: { type: String, required: true },
  batteryVoltage: { type: Number },
  notes: { type: String },
  dataPoints: [{
    throttle: { type: Number, required: true }, // 0 to 100
    thrust_g: { type: Number, required: true },
    voltage: { type: Number },
    current: { type: Number },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String }
  }]
});

module.exports = mongoose.model('TestSession', testSessionSchema);
