const mongoose = require("mongoose");

const EmployeeCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("EmployeeCode", EmployeeCodeSchema);
