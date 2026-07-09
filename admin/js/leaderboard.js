const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");

if (!token) {
    window.location.href = "admin-login.html";
}

const firstName = document.getElementById("firstName");
const secondName = document.getElementById("secondName");
const thirdName = document.getElementById("thirdName");
const tbody = document.querySelector("#scoreTable tbody");
const adminLeaderboardMusic = document.getElementById("adminLeaderboardMusic");
let musicStarted = false;

function startAdminLeaderboardMusic(forceRestart = false) {
    if (!adminLeaderboardMusic) return;

    adminLeaderboardMusic.muted = false;
    adminLeaderboardMusic.volume = 0.28;
    adminLeaderboardMusic.preload = "auto";

    if (forceRestart) {
        adminLeaderboardMusic.currentTime = 0;
    }

    adminLeaderboardMusic.load();

    const playPromise = adminLeaderboardMusic.play();

    if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(() => {
            musicStarted = true;
        }).catch(() => {
            musicStarted = false;
            setTimeout(() => {
                adminLeaderboardMusic.currentTime = 0;
                adminLeaderboardMusic.play().catch(() => {});
            }, 150);
        });
    }
}

window.addEventListener("load", () => setTimeout(() => startAdminLeaderboardMusic(true), 300));
document.addEventListener("pointerup", () => startAdminLeaderboardMusic(true), { passive: true });
document.addEventListener("touchend", () => startAdminLeaderboardMusic(true), { passive: true });
document.addEventListener("keydown", () => startAdminLeaderboardMusic(true), { passive: true });
window.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        startAdminLeaderboardMusic(false);
    }
});

function revealTopPlayers(players) {
    const topPlayers = players.slice(0, 3);
    const elements = [
        { element: firstName, player: topPlayers[0] },
        { element: secondName, player: topPlayers[1] },
        { element: thirdName, player: topPlayers[2] }
    ];

    elements.forEach((entry, index) => {
        setTimeout(() => {
            if (entry.element) {
                entry.element.innerText = entry.player
                    ? `${entry.player.employeeName} — ${entry.player.score}`
                    : "";
                entry.element.parentElement?.classList.add("revealed");
            }
        }, index * 900);
    });
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/leaderboard`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const scores = await response.json();
        if (!response.ok) {
            throw new Error(scores.message || "Unable to load leaderboard.");
        }

        const sorted = [...scores].sort((a, b) => b.score - a.score);
        revealTopPlayers(sorted);

        startAdminLeaderboardMusic(false);

        tbody.innerHTML = "";
        sorted.forEach((player, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${player.employeeName}</td>
                    <td>${player.score}</td>
                </tr>
            `;
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3">Error loading leaderboard: ${error.message}</td></tr>`;
    }
}

loadLeaderboard();
