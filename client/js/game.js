const questionContainer = document.getElementById("questionContainer");
const submitBtn = document.getElementById("submitBtn");
const skipBtn = document.getElementById("skipBtn");
const timerLabel = document.getElementById("timer");
const timerText = document.getElementById("timerText");
const bgMusic = document.getElementById("bgMusic");
const correctSound = document.getElementById("correctSound");
const wrongSound = document.getElementById("wrongSound");
const clockSound = document.getElementById("clockSound");
const scoreValue = document.getElementById("scoreValue");
const totalQuestions = document.getElementById("totalQuestions");
const playerNameDisplay = document.getElementById("playerName");
const employeeCodeDisplay = document.getElementById("employeeCodeDisplay");
const API_BASE = "/api/admin";
const urlParams = new URLSearchParams(window.location.search);
const participationId = urlParams.get("participationId");
let eventSource = null;
let currentParticipant = null;
let questions = [];
let currentQuestion = 0;
let score = 0;
let selectedAnswer = "";
let answered = false;
let timer;
let timeLeft = 0;
let progressInterval = null;

async function fetchParticipant() {
    if (!participationId) {
        throw new Error("Missing participation information.");
    }

    const response = await fetch(`${API_BASE}/public/participant?participationId=${encodeURIComponent(participationId)}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Unable to load participant information.");
    }

    currentParticipant = data.participation;
    currentParticipant.answeredCount = currentParticipant.answeredCount || 0;
    currentParticipant.score = currentParticipant.score || 0;

    if (playerNameDisplay) playerNameDisplay.innerText = currentParticipant.employeeName;
    if (employeeCodeDisplay) employeeCodeDisplay.innerText = currentParticipant.employeeCode;
}

async function updateProgress() {
    if (!currentParticipant || !participationId) return;

    try {
        await fetch(`${API_BASE}/public/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                participationId,
                score: currentParticipant.score,
                answeredCount: currentParticipant.answeredCount,
                currentQuestion
            })
        });
    } catch (error) {
        console.warn("Unable to update progress:", error);
    }
}

function startProgressSync() {
    if (progressInterval) clearInterval(progressInterval);
    updateProgress();
    progressInterval = setInterval(() => {
        if (currentParticipant && !currentParticipant.isFinished && participationId) {
            updateProgress();
        }
    }, 5000);
}

function stopProgressSync() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function playBackgroundMusic() {

    if (!bgMusic) return;

    bgMusic.volume = 0.25;

    bgMusic.play().catch(() => {
        console.log("Background music blocked until user interaction.");
    });

}

if (!participationId) {
    alert("Please join through the quiz link.");
    window.location.href = "login.html";
} else {
    fetchParticipant()
    .then(() => {
        playBackgroundMusic();
        loadQuestions();
        startProgressSync();
    })
        .catch(error => {
            alert(error.message);
            window.location.href = "login.html";
        });
}

async function waitForQuizToStart() {

    questionContainer.innerHTML = `
        <div style="text-align:center;padding:60px">
            <h2>⏳ Waiting for Admin...</h2>
            <p>The quiz will start once the admin clicks <b>Start Quiz</b>.</p>
        </div>
    `;

    submitBtn.disabled = true;
    skipBtn.disabled = true;

    const interval = setInterval(async () => {

        try {

            const response = await fetch(`${API_BASE}/live/active`);

            if (!response.ok) return;

            const data = await response.json();

            if (
                data.quiz &&
                data.quiz.code === currentParticipant.quizCode &&
                data.quiz.status === "live"
            ) {

                clearInterval(interval);

                submitBtn.disabled = false;
                skipBtn.disabled = false;

                loadQuestions();
                connectLiveStream();

            }

        } catch (err) {
            console.log(err);
        }

    }, 2000);

}

function connectLiveStream() {

    eventSource = new EventSource(`${API_BASE}/live/stream`);

    eventSource.addEventListener("participant", e => {

        const data = JSON.parse(e.data);

        if (!activeQuiz) return;

        if (data.quizId !== activeQuiz._id) return;

        if (data.currentQuestionIndex !== currentQuestion) {

            currentQuestion = data.currentQuestionIndex;

            loadQuestion();

        }

    });

    eventSource.addEventListener("quiz_completed", () => {

        finishGame();

    });

}

async function loadQuestions() {
    try {
        const quizCode = currentParticipant?.quizCode;
        const response = await fetch(`${API_BASE}/public/questions?quizCode=${encodeURIComponent(quizCode || "")}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to load questions.");
        }
        questions = Array.isArray(data) ? data : [];
        if (totalQuestions) totalQuestions.innerText = questions.length;
        if (scoreValue) scoreValue.innerText = score;
        if (questions.length === 0) {
            questionContainer.innerHTML = "<p>No questions are available yet. Ask the admin to add questions.</p>";
            if (submitBtn) submitBtn.disabled = true;
            if (skipBtn) skipBtn.disabled = true;
            if (timerLabel) timerLabel.innerText = "0";
            if (timerText) timerText.innerText = "No questions";
            return;
        }
        currentQuestion = 0;
        loadQuestion();
    } catch (error) {
        questionContainer.innerHTML = `<p>Error loading questions: ${error.message}</p>`;
        if (submitBtn) submitBtn.disabled = true;
        if (skipBtn) skipBtn.disabled = true;
        if (timerLabel) timerLabel.innerText = "0";
        if (timerText) timerText.innerText = "Error";
    }
}

function loadQuestion() {
    answered = false;
    selectedAnswer = "";
    const q = questions[currentQuestion];
    if (!q) return finishGame();

    currentParticipant.currentQuestion = currentQuestion;
    updateProgress();

    timeLeft = q.difficulty === "easy" ? 15 : 30;
    if (timerLabel) timerLabel.innerText = timeLeft;
    if (timerText) timerText.innerText = `${timeLeft} sec`;

    clearInterval(timer);
    startTimer();

    let html = `<h2>${q.question}</h2>`;
    if (q.image) {
        html += `<img src="${q.image}" width="300" style="margin-bottom:20px; border-radius:12px;">`;
    }

    if (q.type === "mcq" || q.type === "image") {
        const buttonHtml = (q.options || []).map(opt => `<button class="option">${opt}</button>`).join("");
        html += `<div class="options">${buttonHtml}</div>`;
    } else {
        html += `<div class="answer-block"><input type="text" id="answerInput" placeholder="Enter your answer" autocomplete="off" /></div>`;
    }

    if (questionContainer) questionContainer.innerHTML = html;

    document.querySelectorAll(".option").forEach(btn => {
        btn.addEventListener("click", () => {
            if (answered) return;
            document.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedAnswer = btn.innerText;
        });
    });

    if (scoreValue) scoreValue.innerText = score;
    if (submitBtn) submitBtn.disabled = false;
    if (skipBtn) skipBtn.disabled = false;
}

function moveToNextQuestion() {
    currentQuestion += 1;
    if (currentQuestion < questions.length) {
        loadQuestion();
    } else {
        finishGame();
    }
}

if (submitBtn) {
    submitBtn.addEventListener("click", () => {
        if (answered) return;
        const q = questions[currentQuestion];
        if (!q) return finishGame();

        if (q.type === "mcq" || q.type === "image") {
            if (!selectedAnswer) {
                alert("Select an answer.");
                return;
            }
        } else {
            const input = document.getElementById("answerInput");
            if (!input || !input.value.trim()) {
                alert("Enter your answer.");
                return;
            }
            selectedAnswer = input.value.trim();
            input.disabled = true;
        }

        answered = true;
        submitBtn.disabled = true;
        if (skipBtn) skipBtn.disabled = true;
        if(clockSound){

        clockSound.pause();
        clockSound.currentTime = 0;

        }
        clearInterval(timer);

        const normalizedAnswer = selectedAnswer.trim().toLowerCase();
        const normalizedCorrect = q.answer.trim().toLowerCase();
        const correct = normalizedAnswer === normalizedCorrect;

        if (q.type === "mcq" || q.type === "image") {
            document.querySelectorAll(".option").forEach(btn => {
                const text = btn.innerText.trim().toLowerCase();
                if (text === normalizedCorrect) btn.style.background = "green";
                if (!correct && text === normalizedAnswer) btn.style.background = "red";
                btn.disabled = true;
            });
        } else if (questionContainer) {
            questionContainer.insertAdjacentHTML("beforeend", `
                <div class="answer-result">
                    <p>Your Answer: <span class="${correct ? "correct" : "wrong"}">${selectedAnswer}</span></p>
                    <p>Correct Answer: <span class="correct">${q.answer}</span></p>
                </div>
            `);
        }

        if (correct) {
            const points = Number(q.points || 1);
            currentParticipant.score = (currentParticipant.score || 0) + points;
            score = currentParticipant.score;
            if (scoreValue) scoreValue.innerText = score;
            const correctSound = document.getElementById("correctSound");
            if (correctSound) {
                correctSound.pause();
                correctSound.currentTime = 0;
                correctSound.play();
            }
        } else {
            const wrongSound = document.getElementById("wrongSound");
            if (wrongSound) {
                wrongSound.pause();
                wrongSound.currentTime = 0;
                wrongSound.play();
            }
        }

        currentParticipant.answeredCount = (currentParticipant.answeredCount || 0) + 1;
        currentParticipant.currentQuestion = currentQuestion;
        updateProgress();

        setTimeout(() => {
            moveToNextQuestion();
        }, 1400);
    });
}

if (skipBtn) {
    skipBtn.addEventListener("click", () => {
        if (answered) return;
        if(clockSound){

        clockSound.pause();
        clockSound.currentTime = 0;

        }
        clearInterval(timer);
        currentParticipant.answeredCount = (currentParticipant.answeredCount || 0) + 1;
        currentParticipant.currentQuestion = currentQuestion;
        updateProgress();
        moveToNextQuestion();
    });
}

function startTimer(){
    clearInterval(timer);

    const q = questions[currentQuestion];
    if (!q) return;

    const total = q.difficulty === "easy" ? 15 : 30;
    timeLeft = total;

    if (timerLabel) timerLabel.innerText = timeLeft;
    if (timerText) timerText.innerText = `${timeLeft} sec`;

    if (clockSound) {
        clockSound.pause();
        clockSound.currentTime = 0;
    }

    timer = setInterval(() => {
        timeLeft -= 1;

        if (timerLabel) timerLabel.innerText = timeLeft;
        if (timerText) timerText.innerText = `${timeLeft} sec`;

        if (timeLeft <= 5 && timeLeft > 0 && clockSound && clockSound.paused) {
            clockSound.play().catch(() => {});
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            if (clockSound) {
                clockSound.pause();
                clockSound.currentTime = 0;
            }
            currentParticipant.answeredCount = (currentParticipant.answeredCount || 0) + 1;
            currentParticipant.currentQuestion = currentQuestion;
            updateProgress();
            moveToNextQuestion();
        }
    }, 1000);
}

async function finishGame() {
    try {
        stopProgressSync();
        const response = await fetch(`${API_BASE}/public/finish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participationId, score })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to submit final score.");
        }

        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }

        window.location.href = `result.html?participationId=${encodeURIComponent(participationId)}`;
    } catch (error) {
        alert(error.message);
    }
}
