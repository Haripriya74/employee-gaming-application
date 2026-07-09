const API_BASE = `${window.location.origin}/api/admin`;
const urlParams = new URLSearchParams(window.location.search);
const participationId = urlParams.get("participationId");

const scoreText = document.getElementById("scoreText");
const playerInfo = document.getElementById("playerInfo");

async function loadResult() {
    if (!participationId) {
        scoreText.innerText = "Unable to load results.";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/public/participant?participationId=${encodeURIComponent(participationId)}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to load result data.");
        }

        const participation = data.participation;
        scoreText.innerText = `Your Score: ${participation.score}`;
        if (playerInfo) {
            playerInfo.innerText = `Player: ${participation.employeeName} (${participation.employeeCode})`;
        }
    } catch (error) {
        scoreText.innerText = error.message;
    }
}

function goLeaderboard() {
    window.location.href = "leaderboard.html";
}

loadResult();
