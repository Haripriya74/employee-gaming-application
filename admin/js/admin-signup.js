document.getElementById("adminSignupForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("adminName").value.trim();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!name || !email || !password) {
        alert("Please fill all fields.");
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/api/admin/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to create admin account.");
        }
        alert("Admin account created. Please login.");
        window.location.href = "admin-login.html";
    } catch (error) {
        alert(error.message);
    }
});
