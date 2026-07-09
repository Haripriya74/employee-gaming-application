const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true
  },
  employeeCode: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Score", ScoreSchema);
