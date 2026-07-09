const API_BASE = `${window.location.origin}/api/admin`;

const firstName = document.getElementById("firstName");
const secondName = document.getElementById("secondName");
const thirdName = document.getElementById("thirdName");
const podium = document.querySelector(".podium");
const leaderboardMusic = document.getElementById("leaderboardMusic");
const musicToggleBtn = document.getElementById("musicToggleBtn");

function updateMusicButtonState() {
    if (!musicToggleBtn) return;
    musicToggleBtn.textContent = leaderboardMusic && !leaderboardMusic.paused ? "🔊 Music playing" : "▶ Play music";
}

function playLeaderboardMusic(forceRestart = false) {
    if (!leaderboardMusic) return;

    leaderboardMusic.muted = false;
    leaderboardMusic.volume = 0.2;
    leaderboardMusic.preload = "auto";

    if (forceRestart) {
        leaderboardMusic.currentTime = 0;
    }

    leaderboardMusic.load();

    leaderboardMusic.play().then(() => {
        updateMusicButtonState();
    }).catch(() => {
        updateMusicButtonState();
        setTimeout(() => {
            leaderboardMusic.currentTime = 0;
            leaderboardMusic.play().catch(() => {});
        }, 150);
        console.log("Leaderboard music is waiting for a user interaction.");
    });
}

if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", () => playLeaderboardMusic(true));
}

window.addEventListener("pointerup", () => playLeaderboardMusic(true), { passive: true });
window.addEventListener("touchend", () => playLeaderboardMusic(true), { passive: true });
window.addEventListener("keydown", () => playLeaderboardMusic(true), { passive: true });
window.addEventListener("load", () => setTimeout(() => playLeaderboardMusic(true), 400));
window.addEventListener("visibilitychange", () => {
    if (!document.hidden && leaderboardMusic && leaderboardMusic.paused) {
        playLeaderboardMusic(false);
    }
});

if (leaderboardMusic) {
    leaderboardMusic.addEventListener("play", updateMusicButtonState);
    leaderboardMusic.addEventListener("pause", updateMusicButtonState);
    leaderboardMusic.addEventListener("ended", updateMusicButtonState);
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/public/leaderboard`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to load leaderboard.");
        }

        const sorted = Array.isArray(data) ? [...data].sort((a, b) => b.score - a.score) : [];
        firstName.innerText = sorted[0] ? `${sorted[0].employeeName} — ${sorted[0].score}` : "Player 1";
        secondName.innerText = sorted[1] ? `${sorted[1].employeeName} — ${sorted[1].score}` : "Player 2";
        thirdName.innerText = sorted[2] ? `${sorted[2].employeeName} — ${sorted[2].score}` : "Player 3";

        if (podium) {
            podium.classList.add("ready");
        }

        if (!sorted.length && podium) {
            podium.insertAdjacentHTML("afterend", "<p style='text-align:center; color:#fff;'>No scores are available yet.</p>");
        }

        playLeaderboardMusic(false);
    } catch (error) {
        firstName.innerText = "Error loading leaderboard";
        secondName.innerText = "";
        thirdName.innerText = "";
        console.error(error);
    }
}

loadLeaderboard();
