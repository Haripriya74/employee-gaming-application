const adminSession = JSON.parse(localStorage.getItem("adminSession"));
const adminToken = localStorage.getItem("adminToken");
if (!adminSession || !adminToken) {
    window.location.href = "admin-login.html";
}

const logoutLinks = document.querySelectorAll(".logout");
logoutLinks.forEach(link => {
    link.addEventListener("click", () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminSession");
        localStorage.removeItem("editQuestionId");
    });
});
