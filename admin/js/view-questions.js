const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");
const questionList = document.getElementById("questionList");

if (!token) {
    window.location.href = "admin-login.html";
}

function formatDate(dateValue) {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

async function loadQuestions() {
    try {
        const response = await fetch(`${API_BASE}/history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const quizzes = await response.json();

        if (!response.ok) {
            throw new Error(quizzes.message || "Unable to load quiz history.");
        }

        if (!Array.isArray(quizzes) || !quizzes.length) {
            questionList.innerHTML = "<p>No previous quizzes have been found yet.</p>";
            return;
        }

        questionList.innerHTML = "";
        quizzes.forEach((quiz, index) => {
            const quizCard = document.createElement("div");
            quizCard.className = "card quiz-card";
            quizCard.innerHTML = `
                <div class="quiz-card-header">
                    <div class="quiz-title-row">
                        <span class="quiz-number">${index + 1}.</span>
                        <button type="button" class="toggleQuizBtn" data-id="${quiz._id}">${quiz.title}</button>
                    </div>
                </div>
                <div class="quiz-meta">
                    <span><strong>${quiz.games || 0}</strong> questions</span>
                    <span><strong>${quiz.players || 0}</strong> players</span>
                    <span class="quiz-date">${formatDate(quiz.endedAt || quiz.createdAt)}</span>
                </div>
                <div class="quiz-questions" data-id="${quiz._id}" hidden></div>
            `;

            questionList.appendChild(quizCard);
        });
    } catch (error) {
        questionList.innerHTML = `<p>Error loading quiz history: ${error.message}</p>`;
    }
}

function renderQuizDetails(quizCard, quiz) {
    const questionGroup = quizCard.querySelector(".quiz-questions");
    questionGroup.innerHTML = "";

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const progress = Array.isArray(quiz.progress) ? quiz.progress : [];

    questionGroup.innerHTML = `
        <div class="detail-section">
            <h3>Questions & Answers</h3>
            ${questions.length
                ? questions.map((q, index) => `
                    <div class="question-view-card">
                        <div class="question-card-header">
                            <div>
                                <h3>Q${index + 1}. ${q.question}</h3>
                                <div class="question-info">⭐ ${q.points || 1} Points</div>
                            </div>
                        </div>
                        <div class="question-body">
                            <p class="answer-text">✅ <strong>Answer:</strong> ${q.answer || "—"}</p>
                            ${Array.isArray(q.options) && q.options.length ? `<p><strong>Options:</strong> ${q.options.join(", ")}</p>` : ""}
                        </div>
                    </div>
                `).join("")
                : "<p>No questions were added to this quiz.</p>"}
        </div>

        <div class="detail-section">
            <h3>Employee Progress</h3>
            <table class="score-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Employee Name</th>
                        <th>Score</th>
                        <th>Answered</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${progress.length
                        ? progress.map((person, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${person.employee || "Unknown employee"}</td>
                                <td>${person.score || 0}</td>
                                <td>${person.answeredCount || 0}</td>
                                <td>${person.isFinished ? "Finished" : (person.status || "Playing")}</td>
                            </tr>
                        `).join("")
                        : "<tr><td colspan=\"5\">No employee progress is available for this quiz yet.</td></tr>"}
                </tbody>
            </table>
        </div>
    `;
}

questionList.addEventListener("click", async function(event) {
    const target = event.target.closest(".toggleQuizBtn");
    if (!target) return;

    const quizCard = target.closest(".quiz-card");
    const questionGroup = quizCard.querySelector(".quiz-questions");
    const isHidden = questionGroup.hasAttribute("hidden");

    document.querySelectorAll(".quiz-questions").forEach((group) => {
        group.hidden = true;
    });

    if (isHidden) {
        const quizId = target.dataset.id;
        const quizDetails = await fetch(`${API_BASE}/history`, {
            headers: { "Authorization": `Bearer ${token}` }
        }).then((res) => res.json());

        const selectedQuiz = Array.isArray(quizDetails)
            ? quizDetails.find((item) => String(item._id) === String(quizId))
            : null;

        if (selectedQuiz) {
            renderQuizDetails(quizCard, selectedQuiz);
            questionGroup.hidden = false;
        }
    }
});

loadQuestions();
