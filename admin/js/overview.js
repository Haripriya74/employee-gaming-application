const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");

if (!token) {
    window.location.href = "admin-login.html";
}

async function setOverviewSummary() {
    try {
        const [questionsResponse, scoresResponse, codesResponse] = await Promise.all([
            fetch(`${API_BASE}/questions`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE}/scores`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE}/codes`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

        if (!questionsResponse.ok || !scoresResponse.ok || !codesResponse.ok) {
            throw new Error("Unable to load overview data.");
        }

        const questions = await questionsResponse.json();
        const scores = await scoresResponse.json();
        const codes = await codesResponse.json();

        document.getElementById("questionCount").innerText = questions.length;
        document.getElementById("scoreCount").innerText = scores.length;
        document.getElementById("codeCount").innerText = codes.length;

        const averageScore = scores.length > 0 ? (scores.reduce((sum, score) => sum + score.score, 0) / scores.length).toFixed(1) : 0;
        document.getElementById("averageScore").innerText = averageScore;

        const topScore = scores.length > 0 ? Math.max(...scores.map((score) => score.score)) : 0;
        document.getElementById("topScore").innerText = topScore;
    } catch (error) {
        console.error(error);
        document.getElementById("questionCount").innerText = "-";
        document.getElementById("scoreCount").innerText = "-";
        document.getElementById("codeCount").innerText = "-";
        document.getElementById("averageScore").innerText = "-";
        document.getElementById("topScore").innerText = "-";
    }
}

setOverviewSummary();
