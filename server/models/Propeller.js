const mongoose = require('mongoose');

const bladeGeometrySchema = new mongoose.Schema({
  maxChord: Number,
  fromHub: Number,
  overhang: Number,
  chord27: Number,
  thickness27: Number,
  trailingTip: Number,
});

const propellerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  imageUrl: String,
  brand: String,
  diameter: Number,   // inches
  pitch: Number,      // inches
  blades: Number,
  rootAirfoil: { type: String, default: 'NACA 4412' },
  tipAirfoil: { type: String, default: 'Clark Y' },
  bladeGeometry: bladeGeometrySchema,
  tags: [String],
}, { timestamps: true });

propellerSchema.index({ name: 'text', brand: 'text', tags: 'text' });

module.exports = mongoose.model('Propeller', propellerSchema);
