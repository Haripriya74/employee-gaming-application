const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["mcq", "fill", "image", "puzzle"]
  },
  question: {
    type: String,
    required: true
  },
  options: [String],
  answer: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    min: 1,
    max: 20,
    default: 1
  },
  difficulty: {
    type: String,
    enum: ["easy", "hard"],
    default: "easy"
  },
  image: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

module.exports = mongoose.model("Question", QuestionSchema);
