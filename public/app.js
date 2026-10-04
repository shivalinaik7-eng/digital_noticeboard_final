let allNotices = [];
let currentAdmin = null;
let noticeToDelete = null;
let noticeToPrint = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    loadTheme();

    const loggedIn = await checkSession();
    if (!loggedIn) {
        window.location.href = "/login.html";
        return;
    }

    bindEvents();
    await loadNotices();
}

async function checkSession() {
    try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return false;

        const data = await response.json();
        if (!data.success) return false;

        currentAdmin = data.admin;
        document.getElementById("adminName").textContent = currentAdmin.name;
        document.getElementById("welcomeName").textContent = currentAdmin.name;
        return true;
    } catch {
        return false;
    }
}

function bindEvents() {
    document.getElementById("searchInput").addEventListener("input", renderAllNotices);
    document.getElementById("categoryFilter").addEventListener("change", renderAllNotices);
    document.getElementById("priorityFilter").addEventListener("change", renderAllNotices);
    document.getElementById("noticeForm").addEventListener("submit", saveNotice);

    document.getElementById("noticeModal").addEventListener("click", event => {
        if (event.target.id === "noticeModal") closeNoticeModal();
    });

    document.getElementById("detailModal").addEventListener("click", event => {
        if (event.target.id === "detailModal") closeDetailModal();
    });

    document.getElementById("deleteModal").addEventListener("click", event => {
        if (event.target.id === "deleteModal") closeDeleteModal();
    });
}

async function loadNotices() {
    try {
        const response = await fetch("/api/notices");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to fetch notices");
        }

        allNotices = Array.isArray(data.notices) ? data.notices : [];
        updateStats();
        renderDashboard();
        renderAllNotices();
    } catch (error) {
        console.error("loadNotices:", error);
        showError("allNoticesContainer", error.message);
    }
}

function updateStats() {
    const active = allNotices.filter(n => getNoticeStatus(n) !== "Expired");
    const important = allNotices.filter(n => ["Important", "Urgent"].includes(n.priority));
    const pinned = allNotices.filter(n => truthy(n.is_pinned));

    document.getElementById("totalNotices").textContent = allNotices.length;
    document.getElementById("activeNotices").textContent = active.length;
    document.getElementById("importantNotices").textContent = important.length;
    document.getElementById("pinnedNotices").textContent = pinned.length;
}

function renderDashboard() {
    const pinned = allNotices.filter(n => truthy(n.is_pinned)).slice(0, 3);
    const recent = [...allNotices].sort(sortNewest).slice(0, 6);

    renderInto("pinnedContainer", pinned, "No pinned notices yet.");
    renderInto("recentContainer", recent, "No notices yet.");
}

function renderAllNotices() {
    const search = (document.getElementById("searchInput").value || "").trim().toLowerCase();
    const category = document.getElementById("categoryFilter").value;
    const priority = document.getElementById("priorityFilter").value;

    const filtered = allNotices.filter(notice => {
        const haystack = [
            notice.title,
            notice.description,
            notice.category,
            notice.posted_by
        ].filter(Boolean).join(" ").toLowerCase();

        return (
            haystack.includes(search) &&
            (category === "all" || notice.category === category) &&
            (priority === "all" || notice.priority === priority)
        );
    });

    renderInto("allNoticesContainer", filtered, "No notices match your search or filters.");
}

function renderInto(containerId, notices, emptyMessage) {
    const container = document.getElementById(containerId);

    if (!notices.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>📭</div>
                <h3>${escapeHTML(emptyMessage)}</h3>
                <p>Try changing your search or create a new notice.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notices.map(noticeCard).join("");
}

function noticeCard(notice) {
    const status = getNoticeStatus(notice);
    const pinned = truthy(notice.is_pinned);
    const priority = notice.priority || "Normal";

    return `
        <article class="notice-card">
            <div class="notice-top">
                <div class="badges">
                    <span class="badge category-badge">${escapeHTML(notice.category || "General")}</span>
                    <span class="badge priority-${priority.toLowerCase()}">${escapeHTML(priority)}</span>
                </div>
                ${pinned ? '<span class="pin" title="Pinned">📌</span>' : ""}
            </div>

            <h3>${escapeHTML(notice.title)}</h3>
            <p class="notice-description">${escapeHTML(notice.description)}</p>

            <div class="status-row">
                <span class="status ${status.toLowerCase().replaceAll(" ", "-")}">${status}</span>
            </div>

            <div class="notice-meta">
                <span class="posted-by">👤 ${escapeHTML(notice.posted_by || "Admin")}</span>
                <span class="notice-date">📅 ${formatDate(notice.created_at)}</span>
            </div>

            <div class="notice-actions">
                <button class="small-button" onclick="viewNotice(${Number(notice.id)})">View</button>
                <button class="small-button" onclick="openNoticeModal(${Number(notice.id)})">Edit</button>
                <button class="small-button delete" onclick="openDeleteModal(${Number(notice.id)})">Delete</button>
            </div>
        </article>
    `;
}

function getNoticeStatus(notice) {
    if (!notice.expiry_date) return "Active";

    const expiry = dateOnly(notice.expiry_date);
    const today = dateOnly(new Date());
    const diff = Math.ceil((expiry - today) / 86400000);

    if (diff < 0) return "Expired";
    if (diff <= 3) return "Expiring Soon";
    return "Active";
}

function dateOnly(value) {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sortNewest(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function truthy(value) {
    return value === true || value === 1 || value === "1" || value === "true";
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function showSection(sectionId, button) {
    document.querySelectorAll("main > section").forEach(section => {
        section.classList.add("hidden");
    });

    const section = document.getElementById(sectionId);
    if (section) section.classList.remove("hidden");

    document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
    if (button) button.classList.add("active");
}

function openNoticeModal(id = null) {
    const modal = document.getElementById("noticeModal");
    const form = document.getElementById("noticeForm");

    form.reset();
    document.getElementById("noticeId").value = "";
    document.getElementById("modalTitle").textContent = "Create New Notice";
    document.getElementById("postedBy").value = currentAdmin?.name || "Administrator";

    if (id !== null) {
        const notice = allNotices.find(n => Number(n.id) === Number(id));

        if (!notice) {
            showToast("Notice not found.", "error");
            return;
        }

        document.getElementById("modalTitle").textContent = "Edit Notice";
        document.getElementById("noticeId").value = notice.id;
        document.getElementById("title").value = notice.title || "";
        document.getElementById("category").value = notice.category || "";
        document.getElementById("priority").value = notice.priority || "Normal";
        document.getElementById("description").value = notice.description || "";
        document.getElementById("expiryDate").value = toDateInput(notice.expiry_date);
        document.getElementById("postedBy").value = notice.posted_by || currentAdmin?.name || "Administrator";
        document.getElementById("isPinned").checked = truthy(notice.is_pinned);
    }

    modal.classList.remove("hidden");
}

function closeNoticeModal() {
    document.getElementById("noticeModal").classList.add("hidden");
}

function toDateInput(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

async function saveNotice(event) {
    event.preventDefault();

    const id = document.getElementById("noticeId").value;
    const expiry = document.getElementById("expiryDate").value;

    if (expiry) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(`${expiry}T00:00:00`);

        if (expiryDate < today) {
            const proceed = confirm("The expiry date is in the past. Save this notice as expired?");
            if (!proceed) return;
        }
    }

    const payload = {
        title: document.getElementById("title").value.trim(),
        category: document.getElementById("category").value,
        priority: document.getElementById("priority").value,
        description: document.getElementById("description").value.trim(),
        expiry_date: expiry || null,
        posted_by: document.getElementById("postedBy").value.trim(),
        is_pinned: document.getElementById("isPinned").checked
    };

    if (!payload.title || !payload.description || !payload.category || !payload.posted_by) {
        showToast("Please fill all required fields.", "error");
        return;
    }

    try {
        const response = await fetch(id ? `/api/notices/${id}` : "/api/notices", {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to save notice");
        }

        closeNoticeModal();
        showToast(id ? "Notice updated successfully." : "Notice created successfully.");
        await loadNotices();
    } catch (error) {
        console.error("saveNotice:", error);
        showToast(error.message, "error");
    }
}

async function viewNotice(id) {
    const notice = allNotices.find(n => Number(n.id) === Number(id));
    if (!notice) return;

    noticeToPrint = notice;

    document.getElementById("detailTitle").textContent = notice.title;
    document.getElementById("detailBody").innerHTML = `
        <div class="detail-badges">
            <span class="badge category-badge">${escapeHTML(notice.category)}</span>
            <span class="badge priority-${(notice.priority || "Normal").toLowerCase()}">${escapeHTML(notice.priority || "Normal")}</span>
            ${truthy(notice.is_pinned) ? '<span class="badge pinned-badge">📌 Pinned</span>' : ""}
        </div>

        <p class="detail-description">${escapeHTML(notice.description)}</p>

        <div class="detail-grid">
            <div><strong>Posted By</strong><span>${escapeHTML(notice.posted_by || "Admin")}</span></div>
            <div><strong>Posted Date</strong><span>${formatDate(notice.created_at)}</span></div>
            <div><strong>Expiry Date</strong><span>${formatDate(notice.expiry_date)}</span></div>
            <div><strong>Status</strong><span>${getNoticeStatus(notice)}</span></div>
        </div>
    `;

    document.getElementById("detailModal").classList.remove("hidden");
}

function closeDetailModal() {
    document.getElementById("detailModal").classList.add("hidden");
}

function printNotice() {
    if (!noticeToPrint) return;

    const popup = window.open("", "_blank", "width=800,height=700");
    popup.document.write(`
        <!doctype html>
        <html>
        <head>
            <title>${escapeHTML(noticeToPrint.title)}</title>
            <style>
                body{font-family:Arial,sans-serif;padding:40px;line-height:1.6;color:#172033}
                h1{margin-bottom:10px}
                .meta{color:#667085;margin-bottom:25px}
            </style>
        </head>
        <body>
            <h1>${escapeHTML(noticeToPrint.title)}</h1>
            <div class="meta">
                ${escapeHTML(noticeToPrint.category)} · ${escapeHTML(noticeToPrint.priority)} ·
                Posted by ${escapeHTML(noticeToPrint.posted_by || "Admin")}
            </div>
            <p>${escapeHTML(noticeToPrint.description).replaceAll("\n", "<br>")}</p>
            <p><strong>Posted:</strong> ${formatDate(noticeToPrint.created_at)}</p>
            <p><strong>Expires:</strong> ${formatDate(noticeToPrint.expiry_date)}</p>
        </body>
        </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
}

function openDeleteModal(id) {
    noticeToDelete = id;
    document.getElementById("deleteModal").classList.remove("hidden");
}

function closeDeleteModal() {
    noticeToDelete = null;
    document.getElementById("deleteModal").classList.add("hidden");
}

async function confirmDelete() {
    if (noticeToDelete === null) return;

    try {
        const response = await fetch(`/api/notices/${noticeToDelete}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to delete notice");
        }

        closeDeleteModal();
        showToast("Notice deleted successfully.");
        await loadNotices();
    } catch (error) {
        console.error("confirmDelete:", error);
        showToast(error.message, "error");
    }
}

async function logout() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
    } finally {
        window.location.href = "/login.html";
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
}

function loadTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    document.getElementById("toastIcon").textContent = type === "error" ? "!" : "✓";
    document.getElementById("toastMessage").textContent = message;

    toast.className = `toast show ${type}`;

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 3200);
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state error-state">
            <div>⚠️</div>
            <h3>Unable to load notices</h3>
            <p>${escapeHTML(message)}</p>
            <button class="primary-button" onclick="loadNotices()">Try Again</button>
        </div>
    `;
}
