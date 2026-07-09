const API_BASE = `${window.location.origin}/api/admin`;
const STATS_REFRESH_MS = 5000;

async function loadHomeStats() {
    try {
        const [leaderboardResp, questionsResp] = await Promise.all([
            fetch(`${API_BASE}/public/leaderboard`),
            fetch(`${API_BASE}/public/questions`)
        ]);

        const leaderboardData = await leaderboardResp.json();
        const questionsData = await questionsResp.json();

        if (!leaderboardResp.ok) {
            throw new Error(leaderboardData.message || "Unable to load leaderboard data.");
        }
        if (!questionsResp.ok) {
            throw new Error(questionsData.message || "Unable to load question data.");
        }

        const leaderboard = Array.isArray(leaderboardData) ? leaderboardData : [];
        const questions = Array.isArray(questionsData) ? questionsData : [];

        const uniquePlayers = new Set(leaderboard.map(entry => entry.employeeCode || entry.employeeName || JSON.stringify(entry)));
        document.getElementById("players").innerText = uniquePlayers.size;
        document.getElementById("games").innerText = questions.length;
    } catch (error) {
        console.error(error);
        document.getElementById("players").innerText = "0";
        document.getElementById("games").innerText = "0";
    }
}

loadHomeStats();
setInterval(loadHomeStats, STATS_REFRESH_MS);
