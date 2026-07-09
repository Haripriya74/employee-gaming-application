const API_BASE = `${window.location.origin}/api/admin`;
const tbody = document.querySelector("#scoreTable tbody");

async function loadFullScores() {
    try {
        const response = await fetch(`${API_BASE}/public/full-scores`);
        const scores = await response.json();
        if (!response.ok) {
            throw new Error(scores.message || "Unable to load scores.");
        }

        const sorted = [...scores].sort((a, b) => b.score - a.score);
        if (!sorted.length) {
            tbody.innerHTML = '<tr><td colspan="4">No scores have been submitted yet.</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        sorted.forEach((player, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${player.employeeName}</td>
                    <td>${player.score}</td>
                    <td>${new Date(player.date).toLocaleString()}</td>
                </tr>
            `;
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4">Error loading scores: ${error.message}</td></tr>`;
    }
}

loadFullScores();

