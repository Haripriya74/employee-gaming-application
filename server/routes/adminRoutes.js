const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Question = require("../models/Question");
const Quiz = require("../models/Quiz");
const Participation = require("../models/Participation");
const EmployeeCode = require("../models/EmployeeCode");
const Score = require("../models/Score");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || "secret123";
const jwtExpires = "12h";
const fixedAdminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
const fixedAdminPassword = process.env.ADMIN_PASSWORD || "Tekno_Admin12";
const fixedAdminName = process.env.ADMIN_NAME || "Admin";

const liveClients = new Set();

function generateQuizCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function sendLiveEvent(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  liveClients.forEach(res => {
    try {
      res.write(payload);
    } catch (error) {
      liveClients.delete(res);
    }
  });
}

async function emitParticipantState(quizId) {
  const participants = await Participation.find({ quizId });
  const quiz = await Quiz.findById(quizId);
  const players = participants.map(p => ({
    employeeName: p.employeeName,
    employeeCode: p.employeeCode,
    answeredCount: p.answeredCount || 0,
    score: p.score || 0,
    currentQuestion: p.currentQuestion || 0,
    status: p.status || "waiting",
    isFinished: !!p.isFinished
  }));
  sendLiveEvent("participant", {
    quizId,
    participants: participants.length,
    answered: participants.reduce((sum, p) => sum + (p.answeredCount || 0), 0),
    currentQuestionIndex: quiz?.currentQuestionIndex || 0,
    quizStatus: quiz?.status || "waiting",
    players
  });
}

// Authentication routes
router.post("/signup", async (req, res) => {
  return res.status(403).json({ message: "Admin signup is disabled. Use the configured admin login credentials." });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (password !== fixedAdminPassword) {
      return res.status(401).json({ message: "Invalid login credentials." });
    }

    const token = jwt.sign({ email, name: fixedAdminName }, jwtSecret, {
      expiresIn: jwtExpires
    });

    return res.json({ token, email, name: fixedAdminName });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed." });
  }
});

router.get("/profile", auth, async (req, res) => {
  return res.json({ email: req.admin.email, name: req.admin.name });
});

// Quiz and question management routes
router.get("/questions", auth, async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  res.json(questions);
});

router.post("/questions", auth, async (req, res) => {
  const { quizId, type, question, options, answer, points, difficulty, image } = req.body;
  if (!quizId || !type || !question || !answer) {
    return res.status(400).json({ message: "Quiz, question type, text and answer are required." });
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found." });
  }

  const record = await Question.create({
    quizId,
    type,
    question,
    options: options || [],
    answer,
    points: Math.min(Math.max(Number(points) || 1, 1), 20),
    difficulty: difficulty || "easy",
    image: image || undefined
  });

  quiz.questions.push(record._id);
  quiz.updatedAt = new Date();
  await quiz.save();

  res.status(201).json(record);
});

router.get("/questions/:id", auth, async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    return res.status(404).json({ message: "Question not found." });
  }
  res.json(question);
});

router.post("/quizzes", auth, async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Quiz title is required." });
  }

  let code;
  let exists;
  do {
    code = generateQuizCode();
    exists = await Quiz.findOne({ code });
  } while (exists);

  const quiz = await Quiz.create({
    title,
    code,
    questions: [],
    currentQuestionIndex: 0,
    status: "waiting",
    timer: 0,
    participants: 0,
    createdAt: new Date(),
    updatedAt: new Date()
});
  res.status(201).json(quiz);
});

router.get("/quizzes", auth, async (req, res) => {
  const quizzes = await Quiz.find()
    .sort({ createdAt: -1 })
    .populate({ path: "questions", options: { sort: { createdAt: 1 } } });
  res.json(quizzes.map(quiz => ({
    ...quiz.toObject(),
    questionCount: quiz.questions.length
  })));
});

router.get("/quizzes/:id/questions", auth, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate("questions");
  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found." });
  }
  res.json({
    quiz: quiz.toObject(),
    questions: quiz.questions
  });
});

router.delete("/quizzes/:id", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found."
      });
    }

    await Question.deleteMany({
      quizId: quiz._id
    });

    await Participation.deleteMany({
      quizId: quiz._id
    });

    await Quiz.findByIdAndDelete(req.params.id);

    res.json({
      message: "Quiz deleted successfully."
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }
});

router.put("/questions/:id", auth, async (req, res) => {
  const { type, question, options, answer, difficulty, image } = req.body;
  const updated = await Question.findByIdAndUpdate(
    req.params.id,
    {
      type,
      question,
      options: options || [],
      answer,
      difficulty: difficulty || "easy",
      image: image || undefined,
      updatedAt: new Date()
    },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ message: "Question not found." });
  }
  res.json(updated);
});

router.delete("/questions/:id", auth, async (req, res) => {

  try {

    const deleted = await Question.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Question not found."
      });
    }

    await Quiz.updateMany(
      {},
      {
        $pull: {
          questions: req.params.id
        }
      }
    );

    res.json({
      message: "Question deleted."
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

router.get("/previous-questions", auth, async (req, res) => {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const questions = await Question.find({ createdAt: { $gte: lastWeek } }).sort({ createdAt: -1 });
  res.json(questions);
});

router.get("/history", auth, async (req, res) => {
  const quizzes = await Quiz.find()
    .populate({ path: "questions", options: { sort: { createdAt: 1 } } })
    .sort({ endedAt: -1, createdAt: -1 });

  const result = await Promise.all(
    quizzes.map(async (quiz) => {
      const participants = await Participation.find({ quizId: quiz._id });

      return {
        _id: quiz._id,
        title: quiz.title,
        code: quiz.code,
        status: quiz.status,
        players: participants.length,
        games: quiz.questions.length,
        questions: (quiz.questions || []).map((question) => ({
          _id: question._id,
          question: question.question,
          type: question.type,
          answer: question.answer,
          options: question.options || [],
          points: question.points || 1,
          difficulty: question.difficulty || "easy"
        })),
        progress: participants.map(p => ({
          employee: p.employeeName,
          score: p.score || 0,
          answeredCount: p.answeredCount || 0,
          status: p.status || "waiting",
          isFinished: !!p.isFinished
        }))
      };
    })
  );

  res.json(result);
});
router.get("/codes", auth, async (req, res) => {
  const codes = await EmployeeCode.find().sort({ createdAt: -1 });
  res.json(codes);
});

router.post("/codes", auth, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: "Code is required." });
  }

  const exists = await EmployeeCode.findOne({ code });
  if (exists) {
    return res.status(400).json({ message: "This code already exists." });
  }

  const record = await EmployeeCode.create({ code });
  res.status(201).json(record);
});

router.get("/scores", auth, async (req, res) => {
  const scores = await Score.find().sort({ score: -1, date: 1 });
  res.json(scores);
});

router.delete("/scores/:id", auth, async (req, res) => {
  const deleted = await Score.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Score not found." });
  }
  res.json({ message: "Score deleted." });
});

router.get("/leaderboard", auth, async (req, res) => {
  const scores = await Score.find().sort({ score: -1, date: 1 });
  res.json(scores);
});

// Live quiz routes
router.get("/live/active", auth, async (req, res) => {
  const quiz = await Quiz.findOne({
    $or: [{ status: { $in: ["live", "paused"] } }, { active: true }]
  }).populate("questions");
  if (!quiz) {
    return res.status(404).json({ message: "No live quiz active." });
  }

  const participants = await Participation.find({ quizId: quiz._id });
  const players = participants.map(p => ({
    employeeName: p.employeeName,
    employeeCode: p.employeeCode,
    answeredCount: p.answeredCount,
    score: p.score,
    isFinished: p.isFinished
  }));

  res.json({
    quiz: quiz.toObject(),
    participants: participants.length,
    answered: participants.reduce((sum, p) => sum + (p.answeredCount || 0), 0),
    players
  });
});

router.get("/live/stream", auth, (req, res) => {
  res.set({
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream"
  });
  res.flushHeaders();
  res.write("retry: 10000\n\n");

  liveClients.add(res);
  req.on("close", () => {
    liveClients.delete(res);
  });
});

router.post("/live/start", auth, async (req, res) => {

    const { quizId } = req.body;

    if (!quizId) {

        return res.status(400).json({
            message: "Quiz ID is required."
        });

    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {

        return res.status(404).json({
            message: "Quiz not found."
        });

    }

    quiz.status = "live";
    quiz.active = true;
    quiz.startedAt = new Date();
    quiz.currentQuestionIndex = 0;

    await quiz.save();

    sendLiveEvent("quiz_started", quiz);

    res.json({
        success: true,
        quiz
    });

});
router.post("/live/next", auth, async (req, res) => {

    const quiz = await Quiz.findOne({
        status: "live"
    }).populate("questions");

    if (!quiz) {
        return res.status(404).json({
            message: "No live quiz."
        });
    }

    if (quiz.currentQuestionIndex < quiz.questions.length - 1) {

        quiz.currentQuestionIndex++;

        await quiz.save();

        await emitParticipantState(quiz._id);

        return res.json({
            success: true,
            quiz
        });

    }

    quiz.status = "completed";
    quiz.active = false;
    quiz.endedAt = new Date();

    await quiz.save();

    sendLiveEvent("quiz_completed", quiz);

    res.json({
        success: true,
        quiz
    });

});
router.post("/live/stop", auth, async (req, res) => {

    const quiz = await Quiz.findOne({ status: "live" });

    if (!quiz) {
        return res.status(404).json({
            message: "No live quiz."
        });
    }

    quiz.status = "stopped";
    quiz.active = false;
    quiz.endedAt = new Date();

    await quiz.save();

    sendLiveEvent("quiz_stopped", quiz);

    res.json({
        success: true
    });

});

router.post("/live/pause", auth, async (req, res) => {

    const quiz = await Quiz.findOne({ status: "live" });

    if (!quiz) {
        return res.status(404).json({
            message: "No live quiz."
        });
    }

    quiz.status = "paused";
    quiz.active = true;

    await quiz.save();

    sendLiveEvent("quiz_paused", quiz);

    res.json({
        success: true
    });

});

router.post("/live/resume", auth, async (req, res) => {

    const quiz = await Quiz.findOne({ status: "paused" });

    if (!quiz) {
        return res.status(404).json({
            message: "No paused quiz."
        });
    }

    quiz.status = "live";
    quiz.active = true;

    await quiz.save();

    sendLiveEvent("quiz_resumed", quiz);

    res.json({
        success: true
    });

});

router.post("/live/end", auth, async (req, res) => {

    const quiz = await Quiz.findOne({
        status: { $in: ["live", "paused"] }
    });

    if (!quiz) {
        return res.status(404).json({
            message: "No active quiz."
        });
    }

    quiz.status = "completed";
    quiz.active = false;
    quiz.endedAt = new Date();

    await quiz.save();

    sendLiveEvent("quiz_completed", quiz);

    res.json({
        success: true
    });

});

// Public participant routes
router.get("/public/questions", async (req, res) => {
  const { quizCode } = req.query;
  if (quizCode) {
    const quiz = await Quiz.findOne({ code: quizCode }).populate({ path: "questions", options: { sort: { createdAt: 1 } } });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }
    return res.json(quiz.questions || []);
  }

  const questions = await Question.find().sort({ createdAt: -1 });
  res.json(questions);
});

router.post("/public/validate-code", async (req, res) => {
  const { quizCode } = req.body;

  if (!quizCode) {
    return res.status(400).json({ valid: false, message: "Quiz code is required." });
  }

  const quiz = await Quiz.findOne({ code: quizCode });
  if (!quiz) {
    return res.json({ valid: false, message: "Invalid quiz link." });
  }

  res.json({ valid: true });
});

router.post("/public/join", async (req, res) => {
  const { quizCode, employeeName, employeeCode = "" } = req.body;
  if (!quizCode || !employeeName) {
    return res.status(400).json({ message: "Quiz code and employee name are required." });
  }

  const quiz = await Quiz.findOne({ code: quizCode });
  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found." });
  }

  if (!(["live", "paused"].includes(quiz.status)) && !quiz.active) {
    quiz.status = "live";
    quiz.active = true;
    quiz.startedAt = new Date();
    quiz.currentQuestionIndex = 0;
    await quiz.save();
    sendLiveEvent("quiz_started", quiz);
  }

  const identityCode = String(employeeCode || "").trim() || employeeName.trim();
  const existingParticipation = await Participation.findOne({
    quizId: quiz._id,
    $or: [{ employeeCode: identityCode }, { employeeName: employeeName.trim() }]
  });

  const participation = await Participation.findOneAndUpdate(
    {
      quizId: quiz._id,
      $or: [{ employeeCode: identityCode }, { employeeName: employeeName.trim() }]
    },
    {
      quizId: quiz._id,
      quizCode,
      employeeName: employeeName.trim(),
      employeeCode: identityCode,
      status: "playing",
      isFinished: false,
      updatedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await emitParticipantState(quiz._id);
  if (!existingParticipation) {
    quiz.participants = (quiz.participants || 0) + 1;
    await quiz.save();
  }
  res.json({ joined: true, participationId: participation._id.toString(), quizId: quiz._id, employeeName: participation.employeeName });
});

router.get("/public/participant", async (req, res) => {
  const { participationId } = req.query;
  if (!participationId) {
    return res.status(400).json({ message: "Participation ID is required." });
  }

  const participation = await Participation.findById(participationId);
  if (!participation) {
    return res.status(404).json({ message: "Participation not found." });
  }

  if ((!participation.quizCode || participation.quizCode.trim() === "") && participation.quizId) {
    const quiz = await Quiz.findById(participation.quizId);
    if (quiz) {
      participation.quizCode = quiz.code;
      await participation.save();
    }
  }

  res.json({ participation });
});

router.post("/public/progress", async (req, res) => {
  const { participationId, score, answeredCount, currentQuestion } = req.body;
  if (!participationId || score == null || answeredCount == null) {
    return res.status(400).json({ message: "Participation ID, score, and answered count are required." });
  }

  const participation = await Participation.findById(participationId);
  if (!participation) {
    return res.status(404).json({ message: "Participation not found." });
  }

  participation.score = Number(score);
  participation.answeredCount = Number(answeredCount);
  participation.currentQuestion = Number(currentQuestion || participation.currentQuestion || 0);
  participation.status = "playing";
  participation.isFinished = false;
  participation.updatedAt = new Date();
  await participation.save();

  await emitParticipantState(participation.quizId);
  res.json({ updated: true, participation });
});

router.post("/public/finish", async (req, res) => {
  const { participationId, score } = req.body;
  if (!participationId || score == null) {
    return res.status(400).json({ message: "Participation ID and score are required." });
  }

  const participation = await Participation.findById(participationId);
  if (!participation) {
    return res.status(404).json({ message: "Participation not found." });
  }

  participation.score = Number(score);
  participation.isFinished = true;
  participation.status = "finished";
  participation.answeredCount = participation.answeredCount || 0;
  participation.updatedAt = new Date();
  await participation.save();

  await Score.create({
    employeeName: participation.employeeName,
    employeeCode: participation.employeeCode,
    score: participation.score
  });

  await emitParticipantState(participation.quizId);
  res.json({ saved: true, participation });
});

router.post("/public/scores", async (req, res) => {
  const { employeeName, employeeCode, score } = req.body;
  if (!employeeName || !employeeCode || score == null) {
    return res.status(400).json({ message: "Name, code and score are required." });
  }

  const exists = await EmployeeCode.findOne({ code: employeeCode });
  if (!exists) {
    return res.status(400).json({ message: "Employee code is invalid." });
  }

  const record = await Score.create({ employeeName, employeeCode, score });
  res.status(201).json(record);
});

router.get("/public/leaderboard", async (req, res) => {
  const scores = await Score.find().sort({ score: -1, date: 1 });
  res.json(scores);
});

router.get("/public/full-scores", async (req, res) => {
  const scores = await Score.find().sort({ score: -1, date: 1 });
  res.json(scores);
});

router.get("/test", (req, res) => {
  res.json({ message: "Test route works" });
});

module.exports = router;