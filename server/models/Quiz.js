const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true
    },

    code: {
        type: String,
        required: true,
        unique: true
    },

    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
    }],

    status: {
        type: String,
        enum: [
            "waiting",
            "live",
            "paused",
            "completed",
            "stopped"
        ],
        default: "waiting"
    },

    currentQuestionIndex: {
        type: Number,
        default: 0
    },

    timer: {
        type: Number,
        default: 0
    },

    startedAt: Date,

    endedAt: Date,

    participants: {
        type: Number,
        default: 0
    },

    active: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Quiz", quizSchema);