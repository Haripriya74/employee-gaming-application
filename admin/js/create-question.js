const API_BASE = window.location.protocol === "file:"
    ? "http://localhost:5000/api/admin"
    : `${window.location.protocol}//${window.location.host}/api/admin`;
const token = localStorage.getItem("adminToken");
console.log("create-question.js loaded", { API_BASE, token: !!token, location: window.location.href });
if (window.location.protocol === "file:") {
    alert("Please open this page through the local server, not directly from the file system. Use http://localhost:5000/admin/create-question.html");
}
if (!token) {
    window.location.href = "admin-login.html";
}

const quizForm = document.getElementById("quizForm");
const questionForm = document.getElementById("questionForm");
const quizSetupCard = document.getElementById("quizSetupCard");
const questionSection = document.getElementById("questionSection");
const currentQuizTitle = document.getElementById("currentQuizTitle");
const currentQuizCode = document.getElementById("currentQuizCode");
const whatsappShare = document.getElementById("whatsappShare");
const telegramShare = document.getElementById("telegramShare");
const directQuizLink = document.getElementById("directQuizLink");
const previousQuestionButton = document.getElementById("loadPreviousQuestionBtn");
const questionSubmitButton = document.getElementById("questionSubmitBtn");

let currentQuiz = null;
let editingQuestionId = null;

async function parseJsonOrText(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return { text };
    }
}

function getAppOrigin() {
    return window.location.protocol === "file:"
        ? "http://localhost:5000"
        : window.location.origin;
}

function buildShareLinks(code) {
    const url = `${getAppOrigin()}/login.html?quizCode=${encodeURIComponent(code)}`;
    whatsappShare.href = `https://wa.me/?text=Join%20this%20quiz%20using%20code%20${encodeURIComponent(code)}%20or%20open%20${encodeURIComponent(url)}`;
    telegramShare.href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=Join%20this%20live%20quiz%20with%20code%20${encodeURIComponent(code)}`;
    if (directQuizLink) {
        directQuizLink.href = url;
        directQuizLink.innerText = url;
    }
}

function resetQuestionForm() {
    questionForm.reset();
    document.getElementById("points").value = "1";
    document.getElementById("difficulty").value = "easy";
    editingQuestionId = null;
    questionSubmitButton.textContent = "Add Question";
}

function populateQuestionForm(question) {
    if (!question) return;

    document.getElementById("questionType").value = question.type || "";
    document.getElementById("question").value = question.question || "";
    document.getElementById("questionImageUrl").value = question.image || "";
    document.getElementById("answer").value = question.answer || "";
    document.getElementById("points").value = question.points ? String(question.points) : "1";
    document.getElementById("difficulty").value = question.difficulty || "easy";

    const options = Array.isArray(question.options) ? question.options : [];
    document.getElementById("option1").value = options[0] || "";
    document.getElementById("option2").value = options[1] || "";
    document.getElementById("option3").value = options[2] || "";
    document.getElementById("option4").value = options[3] || "";
}

async function loadPreviousQuestion() {
    if (!currentQuiz) {
        alert("Please create a quiz first.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/questions`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const questions = await parseJsonOrText(response);
        if (!response.ok) {
            throw new Error(questions.message || "Unable to load previous questions.");
        }

        const quizQuestions = (Array.isArray(questions) ? questions : []).filter((question) => String(question.quizId) === String(currentQuiz._id));
        const previousQuestion = quizQuestions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

        if (!previousQuestion) {
            alert("No previous question found for this quiz yet.");
            return;
        }

        populateQuestionForm(previousQuestion);
        editingQuestionId = previousQuestion._id;
        questionSubmitButton.textContent = "Add Question";
        previousQuestionButton.textContent = "Previous Question";
    } catch (error) {
        alert(error.message);
    }
}

previousQuestionButton.addEventListener("click", loadPreviousQuestion);

quizForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const title = document.getElementById("quizTitle").value.trim();
    if (!title) {
        alert("Enter a quiz title before continuing.");
        return;
    }

    try {
        const url = `${API_BASE}/quizzes`;
        const payload = { title };
        console.log("POST quiz create", url, payload);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const quiz = await parseJsonOrText(response);
        if (!response.ok) {
            console.error("Quiz create failed", response.status, quiz);
            const message = quiz.message || quiz.text || `Unable to create quiz. Server returned ${response.status}`;
            throw new Error(message);
        }

        currentQuiz = quiz;
        quizSetupCard.hidden = true;
        questionSection.hidden = false;
        currentQuizTitle.innerText = quiz.title;
        currentQuizCode.innerText = quiz.code;
        buildShareLinks(quiz.code);
        previousQuestionButton.disabled = false;
        resetQuestionForm();
        
    } catch (error) {
        alert(error.message);
    }
});

questionForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!currentQuiz) {
        alert("Please create a quiz first.");
        return;
    }

    const type = document.getElementById("questionType").value;
    const questionText = document.getElementById("question").value.trim();
    const answer = document.getElementById("answer").value.trim();
    const points = document.getElementById("points").value;
    const difficulty = document.getElementById("difficulty").value;
    const imageUrl = document.getElementById("questionImageUrl").value.trim();
    const option1 = document.getElementById("option1").value.trim();
    const option2 = document.getElementById("option2").value.trim();
    const option3 = document.getElementById("option3").value.trim();
    const option4 = document.getElementById("option4").value.trim();

    if (!type || !questionText || !answer) {
        alert("Please fill in the question type, text, and answer.");
        return;
    }

    const options = (type === "mcq" || type === "image")
        ? [option1, option2, option3, option4].filter(Boolean)
        : [];

    if ((type === "mcq" || type === "image") && options.length < 2) {
        alert("Please enter at least two options.");
        return;
    }

    try {
        const payload = {
            quizId: currentQuiz._id,
            type,
            question: questionText,
            options,
            answer,
            points,
            difficulty,
            image: imageUrl
        };

        const url = editingQuestionId
            ? `${API_BASE}/questions/${editingQuestionId}`
            : `${API_BASE}/questions`;
        const method = editingQuestionId ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await parseJsonOrText(response);
        if (!response.ok) {
            console.error("Question save failed", response.status, data);
            const message = data.message || data.text || `Unable to save the question. Server returned ${response.status}`;
            throw new Error(message);
        }

        previousQuestionButton.disabled = false;
        previousQuestionButton.textContent = "Previous Question";
        resetQuestionForm();
    } catch (error) {
        alert(error.message);
    }
});
