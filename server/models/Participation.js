const mongoose = require("mongoose");

const participationSchema = new mongoose.Schema(
{
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz"
    },

    quizCode: {
        type: String,
        required: false
    },

    employeeName: String,

    employeeCode: String,

    score: {
        type: Number,
        default: 0
    },

    answeredCount: {
        type: Number,
        default: 0
    },

    currentQuestion: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: [
            "waiting",
            "playing",
            "finished",
            "disconnected"
        ],
        default: "waiting"
    },

    isFinished: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Participation", participationSchema);