const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");
const editId = localStorage.getItem("editQuestionId");

const questionForm = document.getElementById("editQuestionForm");
const questionType = document.getElementById("questionType");
const questionText = document.getElementById("question");
const questionImageUrl = document.getElementById("questionImageUrl");
const option1 = document.getElementById("option1");
const option2 = document.getElementById("option2");
const option3 = document.getElementById("option3");
const option4 = document.getElementById("option4");
const answerField = document.getElementById("answer");
const difficulty = document.getElementById("difficulty");

if (!token || !editId) {
    window.location.href = "view-questions.html";
}

async function loadQuestion() {
    try {
        const response = await fetch(`${API_BASE}/questions/${editId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const question = await response.json();
        if (!response.ok) {
            throw new Error(question.message || "Question not found.");
        }

        questionType.value = question.type;
        questionText.value = question.question;
        questionImageUrl.value = question.image || "";
        answerField.value = question.answer;
        difficulty.value = question.difficulty || "easy";

        if (question.type === "mcq" || question.type === "image") {
            [option1, option2, option3, option4].forEach((input, index) => {
                input.value = question.options[index] || "";
            });
        }
    } catch (error) {
        alert(error.message);
        window.location.href = "view-questions.html";
    }
}

questionForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const type = questionType.value;
    const text = questionText.value.trim();
    const answer = answerField.value.trim();
    const image = questionImageUrl.value.trim();
    const options = (type === "mcq" || type === "image")
        ? [option1.value.trim(), option2.value.trim(), option3.value.trim(), option4.value.trim()].filter(Boolean)
        : [];

    if (!type || !text || !answer) {
        alert("Please fill in the required fields.");
        return;
    }
    if ((type === "mcq" || type === "image") && options.length < 2) {
        alert("Please enter at least two options.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/questions/${editId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                type,
                question: text,
                options,
                answer,
                difficulty: difficulty.value,
                image
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to update question.");
        }

        alert("Question updated successfully.");
        window.location.href = "view-questions.html";
    } catch (error) {
        alert(error.message);
    }
});

loadQuestion();
