const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");
if (!token) {
    window.location.href = "admin-login.html";
}

const startLiveBtn = document.getElementById("startLiveBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const endLiveBtn = document.getElementById("endLiveBtn");
const activeQuizTitle = document.getElementById("activeQuizTitle");
const activeQuizCode = document.getElementById("activeQuizCode");
const participantCount = document.getElementById("participantCount");
const answeredCount = document.getElementById("answeredCount");
const playerList = document.getElementById("playerList");
const whatsappShare = document.getElementById("whatsappShare");
const telegramShare = document.getElementById("telegramShare");
const directQuizLink = document.getElementById("directQuizLink");
const quizSelect = document.getElementById("quizSelect");

let liveSource;
let activeQuiz;

async function fetchLiveInfo() {
    try {
        const response = await fetch(`${API_BASE}/live/active`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Unable to fetch live quiz info.");
        const data = await response.json();
        activeQuiz = data.quiz;
        renderLiveInfo();
        startLiveStream();
    } catch (error) {
        console.error(error);
        startLiveStream();
    }
}

function getAppOrigin() {
    return window.location.protocol === "file:"
        ? "http://localhost:5000"
        : window.location.origin;
}

function renderLiveInfo() {
    if (activeQuiz && ["live", "paused"].includes(activeQuiz.status)) {
        activeQuizTitle.innerText = activeQuiz.title;
        activeQuizCode.innerText = activeQuiz.code;
        participantCount.innerText = activeQuiz.participants || 0;
        answeredCount.innerText = activeQuiz.answered || 0;
    } else {
        activeQuizTitle.innerText = "No live quiz active.";
        activeQuizCode.innerText = "—";
        participantCount.innerText = "0";
        answeredCount.innerText = "0";
    }
}

startLiveBtn.addEventListener("click", async () => {

    if (!quizSelect.value) {

        alert("Please select a quiz.");

        return;

    }

    try {

        const response = await fetch(`${API_BASE}/live/start`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json",

                Authorization: `Bearer ${token}`

            },

            body: JSON.stringify({

                quizId: quizSelect.value

            })

        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(data.message);

        }

        activeQuiz = data.quiz;

        renderLiveInfo();

        startLiveStream();

        alert("Quiz Started!");

    } catch (err) {

        alert(err.message);

    }

});
nextQuestionBtn.addEventListener("click", async () => {
    try {
        const response = await fetch(`${API_BASE}/live/next`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to advance question.");
        activeQuiz = data.quiz;
        renderLiveInfo();
    } catch (error) {
        alert(error.message);
    }
});

endLiveBtn.addEventListener("click", async () => {

    if (!confirm("Are you sure you want to end this quiz?")) return;

    try {

        const response = await fetch(`${API_BASE}/live/end`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to end quiz.");
        }

        alert("Quiz completed successfully!");

        activeQuiz = null;

        renderLiveInfo();

    } catch (error) {

        alert(error.message);

    }

});

function startLiveStream() {
    if (liveSource) return;
    liveSource = new EventSource(`${API_BASE}/live/stream`);
    liveSource.addEventListener("participant", e => {
        const payload = JSON.parse(e.data);
        participantCount.innerText = payload.participants;
        answeredCount.innerText = payload.answered;
        if (payload.quizStatus) {
            activeQuiz = { ...(activeQuiz || {}), status: payload.quizStatus, currentQuestionIndex: payload.currentQuestionIndex };
        }
        renderPlayers(payload.players);
    });
    liveSource.onopen = () => console.log("Live stream connected.");
    liveSource.onerror = () => console.log("Live stream disconnected.");
}

function renderPlayers(players) {
    if (!players || !players.length) {
        playerList.innerHTML = "No players joined yet.";
        return;
    }
    playerList.innerHTML = players.map(p => `
        <div class="player-card">
            <strong>${p.employeeName}</strong>
            <span>${p.employeeCode}</span>
            <span>${p.answeredCount} answers</span>
            <span>${p.score} pts</span>
            <span>Q${(p.currentQuestion || 0) + 1}</span>
            <span>${p.isFinished ? "Finished" : p.status || "Playing"}</span>
        </div>
    `).join("");
}

async function loadWaitingQuizzes() {

    try {

        const response = await fetch(`${API_BASE}/quizzes`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const quizzes = await response.json();

        quizSelect.innerHTML =
            '<option value="">Select a Quiz</option>';

        quizzes
            .filter(q => q.status === "waiting")
            .forEach(q => {

                quizSelect.innerHTML += `
                    <option value="${q._id}">
                        ${q.title}
                    </option>
                `;

            });

    } catch (err) {

        console.log(err);

    }

}

loadWaitingQuizzes();
fetchLiveInfo();
