const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");
const scoreList = document.getElementById("scoreList");

if (!token) {
    window.location.href = "admin-login.html";
}

async function loadScores() {
    try {
        const response = await fetch(`${API_BASE}/scores`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const scores = await response.json();

        if (!response.ok) {
            throw new Error(scores.message || "Unable to load scores.");
        }

        if (!scores.length) {
            scoreList.innerHTML = "<p>No employee scores recorded yet.</p>";
            return;
        }

        // Statistics
        document.getElementById("totalEmployees").textContent = scores.length;

        document.getElementById("totalGames").textContent = scores.length;

        const highest = Math.max(...scores.map(s => s.score));
        document.getElementById("highestScore").textContent = highest;

        const average =
            (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1);

        document.getElementById("averageScore").textContent = average;

        let html = `
        <table class="score-table">

            <thead>

                <tr>

                    <th>No</th>
                    <th>Employee Name</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>

                </tr>

            </thead>

            <tbody>
        `;

        scores.forEach((player, index) => {

            let rankClass = "";

            if(index===0) rankClass="rank1";
            else if(index===1) rankClass="rank2";
            else if(index===2) rankClass="rank3";

            html += `

                <tr>

                    <td class="${rankClass}">${index+1}</td>

                    <td>${player.employeeName}</td>

                    <td>${player.score}</td>

                    <td><span class="status completed">Completed</span></td>

                    <td>${new Date(player.date).toLocaleDateString()}</td>

                    <td>

                        <button
                        class="icon-btn deleteScoreBtn"
                        data-id="${player._id}">

                        🗑️

                        </button>

                    </td>

                </tr>

            `;

        });

        html += `
            </tbody>

        </table>
        `;

        scoreList.innerHTML = html;

    } catch (error) {

        scoreList.innerHTML = `<p>${error.message}</p>`;

    }
}
scoreList.addEventListener("click", async function(event) {
    const target = event.target;
    if (!target.matches(".deleteScoreBtn")) return;

    const id = target.dataset.id;
    

    try {
        const response = await fetch(`${API_BASE}/scores/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to delete score.");
        }
        await loadScores();
    } catch (error) {
        alert(error.message);
    }
});

loadScores();
