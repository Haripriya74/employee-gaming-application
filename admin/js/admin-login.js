const API_BASE = window.location.protocol === "file:"
    ? "http://localhost:5000/api/admin"
    : `${window.location.protocol}//${window.location.host}/api/admin`;

document.getElementById("adminLoginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Invalid login. Please check your credentials.");
        }

        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminSession", JSON.stringify({ email: data.email, name: data.name }));
        window.location.href = "dashboard.html";
    } catch (error) {
        alert(error.message);
    }
});
