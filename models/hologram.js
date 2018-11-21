const mongoose = require('mongoose');

const HologramSchema = new mongoose.Schema({
  name: String,
  price: {
    type: Number,
    default: 100
  }
});

module.exports = mongoose.model('Hologram', HologramSchema);