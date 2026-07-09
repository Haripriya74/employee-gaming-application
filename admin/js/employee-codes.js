const API_BASE = `${window.location.origin}/api/admin`;
const token = localStorage.getItem("adminToken");
const codeForm = document.getElementById("codeForm");
const codeList = document.getElementById("codeList");

if (!token) {
    window.location.href = "admin-login.html";
}

async function renderCodes() {
    try {
        const response = await fetch(`${API_BASE}/codes`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const codes = await response.json();
        if (!response.ok) {
            throw new Error(codes.message || "Unable to load codes.");
        }

        if (!codes.length) {
            codeList.innerHTML = "<p>No employee codes created yet.</p>";
            return;
        }

        codeList.innerHTML = codes.map(c => {
            const message = encodeURIComponent(`Your Employee Gaming Portal access code is: ${c.code}`);
            const whatsappLink = `https://wa.me/?text=${message}`;
            const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${message}`;
            return `
                <div class="card code-card">
                    <p>Code: <strong>${c.code}</strong></p>
                    <p>Created: ${new Date(c.createdAt).toLocaleString()}</p>
                    <p class="share-label">Share the code via</p>
                    <div class="share-buttons">
                        <div class="share-item">
                            <a href="${whatsappLink}" target="_blank" rel="noreferrer" class="share-button whatsapp" aria-label="Share via WhatsApp">
                                <svg viewBox="0 0 24 24" class="share-icon" aria-hidden="true">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.149-.671.15-.198.297-.768.966-.941 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.671-1.611-.92-2.205-.242-.579-.487-.5-.671-.51l-.572-.01c-.198 0-.52.075-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.693.626.712.227 1.36.195 1.872.119.571-.085 1.758-.719 2.006-1.412.248-.694.248-1.289.173-1.412-.075-.124-.272-.198-.57-.347zm-5.472 7.618h-.001c-4.418 0-8-3.582-8-8 0-4.418 3.582-8 8-8s8 3.582 8 8c0 4.418-3.582 8-8 8zm0-18c-5.523 0-10 4.477-10 10 0 1.787.523 3.444 1.422 4.834l-1.503 5.491 5.636-1.481c1.333.729 2.87 1.156 4.445 1.156 5.523 0 10-4.477 10-10s-4.477-10-10-10z" />
                                </svg>
                            </a>
                            <span class="share-text">WhatsApp</span>
                        </div>
                        <div class="share-item">
                            <a href="${telegramLink}" target="_blank" rel="noreferrer" class="share-button telegram" aria-label="Share via Telegram">
                                <svg viewBox="0 0 24 24" class="share-icon" aria-hidden="true">
                                    <path d="M21.999 3.973c0-.331-.246-.567-.567-.567-.165 0-.271.082-.371.214L2.226 18.736c-.224.2-.267.348-.267.47 0 .314.269.454.518.454.224 0 .366-.082.548-.239l4.163-3.21 2.045 2.059-1.033 4.902c-.045.246.173.35.346.35.165 0 .269-.051.367-.161l2.717-2.961 3.001 2.219c.551.302.969.144 1.12-.496l3.84-17.41c.09-.417-.157-.617-.459-.617zm-6.236 10.044l-1.356 1.395-1.383-1.379 2.739-.016zm-3.332 2.163l1.413 1.476-5.01 2.326 3.597-3.802zm-3.303 3.564l-1.448-1.503 1.622-6.734 2.813 3.256-2.987 2.981zm5.913-8.003l-1.834 4.235 5.349-2.627-3.515-1.608zm4.729-3.66l-12.969 8.092 10.167-6.422 2.802-1.67z" />
                                </svg>
                            </a>
                            <span class="share-text">Telegram</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (error) {
        codeList.innerHTML = `<p>Error loading codes: ${error.message}</p>`;
    }
}

codeForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const code = document.getElementById("employeeCode").value.trim();
    if (!code) {
        alert("Enter a code.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/codes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Unable to create code.");
        }

        document.getElementById("employeeCode").value = "";
        await renderCodes();
    } catch (error) {
        alert(error.message);
    }
});

renderCodes();
