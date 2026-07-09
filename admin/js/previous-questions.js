const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");

if (!token) {
    window.location.href = "admin-login.html";
}

async function loadQuizzes() {

    try {

        const response = await fetch(`${API_BASE}/history`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const quizzes = await response.json();

        const container = document.getElementById("questionList");
        container.innerHTML = "";

        if (!response.ok) {
            const message = quizzes?.message || "Unable to load quiz history.";
            container.innerHTML = `<p>${message}</p>`;
            return;
        }

        if (!Array.isArray(quizzes) || !quizzes.length) {
            container.innerHTML = "<p>No quizzes found.</p>";
            return;
        }

        quizzes.forEach((quiz, index) => {

            const card = document.createElement("div");
            card.className = "card quiz-card";

            card.innerHTML = `

                <div class="quiz-card-header">

                    <button class="toggleQuizBtn">
                        📚 ${index + 1}. ${quiz.title}
                    </button>

                </div>

                <div class="details" style="display:none;">

                    <p><strong>� Status :</strong> ${quiz.status || "waiting"}</p>
                    <p><strong>👥 Players :</strong> ${quiz.players}</p>
                    <p><strong>🎮 Questions :</strong> ${quiz.games}</p>

                    <h3 style="margin-top:20px;">Questions in this Quiz</h3>

                    <div class="question-list">
                        ${
                            (quiz.questions || []).length
                                ? (quiz.questions || []).map((question, i) => `
                                <div class="card question-card">
                                    <p><strong>${i + 1}. ${question.question}</strong></p>
                                    <p><strong>Type:</strong> ${question.type || "mcq"}</p>
                                    <p><strong>Answer:</strong> ${question.answer || "—"}</p>
                                    ${question.options && question.options.length ? `<p><strong>Options:</strong> ${question.options.join(", ")}</p>` : ""}
                                </div>
                            `).join("")
                                : `<p>No questions added to this quiz yet.</p>`
                        }
                    </div>

                    <h3 style="margin-top:20px;">Employee Progress</h3>

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

                            ${
                                (quiz.progress || []).length
                                    ? quiz.progress.map((p,i)=>`
                                <tr>
                                    <td>${i+1}</td>
                                    <td>${p.employee}</td>
                                    <td>${p.score}</td>
                                    <td>${p.answeredCount || 0}</td>
                                    <td>${p.isFinished ? "Finished" : (p.status || "Playing")}</td>
                                </tr>
                                `).join("")
                                    : `<tr><td colspan="5">No employee progress available for this quiz yet.</td></tr>`
                            }

                        </tbody>

                    </table>

                </div>

            `;

            const btn = card.querySelector(".toggleQuizBtn");
            const details = card.querySelector(".details");

            btn.onclick = () => {

                document.querySelectorAll(".details").forEach(d => {
                    if (d !== details) d.style.display = "none";
                });

                details.style.display =
                    details.style.display === "none"
                    ? "block"
                    : "none";

            };

            container.appendChild(card);

        });

    } catch (err) {

        console.log(err);

        document.getElementById("questionList").innerHTML =
            "<p>Error loading quizzes.</p>";

    }

}

loadQuizzes();