const API_BASE = `${window.location.origin}/api/admin`;
const urlParams = new URLSearchParams(window.location.search);
const quizCodeParam = urlParams.get("quizCode");
const quizCodeInput = document.getElementById("quizCodeInput");
const quizCodeHidden = document.getElementById("quizCode");
const form = document.getElementById("employeeForm");

function syncQuizCode(value) {
    const normalized = (value || "").trim().toUpperCase();
    if (quizCodeInput) quizCodeInput.value = normalized;
    if (quizCodeHidden) quizCodeHidden.value = normalized;
    return normalized;
}

if (quizCodeParam) {
    syncQuizCode(quizCodeParam);
}

if (quizCodeInput) {
    quizCodeInput.addEventListener("input", (event) => {
        syncQuizCode(event.target.value);
    });
}

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    const employeeName = document.getElementById("employeeName").value.trim();
    const quizCode = syncQuizCode(quizCodeHidden?.value || quizCodeInput?.value || "");

    if (!employeeName) {
        alert("Please enter your name.");
        return;
    }

    if (!quizCode) {
        alert("Please enter a quiz code to join.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/public/validate-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quizCode })
        });
        const data = await response.json();

        if (!response.ok || !data.valid) {
            alert(data.message || "Invalid quiz link. Ask your admin for a valid code.");
            return;
        }

        const joinResponse = await fetch(`${API_BASE}/public/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quizCode, employeeName, employeeCode: "" })
        });
        const joinData = await joinResponse.json();
        if (!joinResponse.ok) {
            alert(joinData.message || "Unable to join the live quiz. Please try again.");
            return;
        }

        window.location.href = `game.html?participationId=${encodeURIComponent(joinData.participationId)}`;
    } catch (error) {
        alert(error.message || "Unable to validate code. Try again later.");
    }
});
