"use strict";

const KEY = "profile_web2_v1";
const BASE = window.PROFILE_DATA || {};
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const clone = (v) => JSON.parse(JSON.stringify(v));
const fmtDate = (d) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
const fmtBirth = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : (s || ""); };

function load() {
    const d = clone(BASE);
    try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s && (s.savedAt || 0) > (BASE.savedAt || 0)) Object.assign(d, s);
    } catch (e) { /* bỏ qua */ }
    return d;
}
let data = load();
let expanded = false, toastTimer;

function toast(t) {
    const el = $("toast"); el.textContent = t; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
function fallback(letter) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#fde8e2"/><text x="150" y="250" font-family="Arial" font-weight="700" font-size="190" fill="#ef6f5e" text-anchor="middle">' + letter + '</text></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function setImg(img, src) {
    const letter = ((data.name || "A").trim().split(/\s+/).pop() || "A").charAt(0).toUpperCase();
    img.onerror = () => { img.onerror = null; img.src = fallback(letter); };
    img.src = src;
}

/* ===== Hiển thị ===== */
function render() {
    document.querySelectorAll("[data-bind]").forEach((el) => {
        const k = el.dataset.bind;
        el.textContent = k === "birthDate" ? fmtBirth(data[k]) : (data[k] || "");
    });
    $("phoneLink").href = "tel:" + (data.phone || "").replace(/\s+/g, "");
    $("emailLink").href = "mailto:" + data.email;
    [["socFb", data.facebook], ["socZalo", data.zalo], ["socGit", data.github], ["socMail", data.email && "mailto:" + data.email]]
        .forEach(([id, url]) => { $(id).href = url || "#"; $(id).parentElement.classList.toggle("off", !url); });
    setImg($("logo"), data.logo); setImg($("avatar"), data.avatar); setImg($("modalImg"), data.avatar);
    document.title = data.name + " - Hồ sơ cá nhân";
    $("welcomeText").textContent = welcome();
    renderHobbies();
}
function renderHobbies() {
    const a = $("hobbyList"), b = $("moreHobbies");
    a.replaceChildren(); b.replaceChildren();
    data.hobbies.forEach((h, i) => {
        const li = document.createElement("li"), ico = document.createElement("div"),
            t = document.createElement("h3"), p = document.createElement("p");
        ico.className = "ico"; ico.textContent = h.icon || "⭐"; t.textContent = h.name; p.textContent = h.desc;
        li.append(ico, t, p); (i < 3 ? a : b).appendChild(li);
    });
    updateToggle();
}
function updateToggle() {
    const more = data.hobbies.length > 3, btn = $("toggleHobbies");
    btn.hidden = !more;
    $("moreHobbies").toggleAttribute("hidden", !(expanded && more));
    btn.textContent = expanded ? "Thu gọn" : "Xem thêm";
    btn.setAttribute("aria-expanded", String(expanded));
}

/* ===== 1. Thông báo chào mừng + ngày hệ thống ===== */
function welcome() { return "Hôm nay là ngày " + fmtDate(new Date()) + ", Chào mừng bạn đến với trang của " + data.name + "!"; }

/* ===== 2. Đồng hồ số (header + footer) ===== */
function tick() {
    const d = new Date(), s = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    $("clock").textContent = s; $("footerClock").textContent = s;
}

/* ===== 3. Popup phóng to ảnh đại diện ===== */
function initModal() {
    const m = $("modal");
    const open = () => { m.classList.add("open"); m.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; $("modalClose").focus(); };
    const close = () => { m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; $("avatarBtn").focus(); };
    $("avatarBtn").addEventListener("click", open);
    $("modalClose").addEventListener("click", close);
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && m.classList.contains("open")) close(); });
}

/* ===== Đọc ảnh từ máy (thu nhỏ để file nhẹ) ===== */
function readImage(file, max, mime, ok, fail) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return fail("Vui lòng chọn file ảnh.");
    const r = new FileReader();
    r.onload = () => {
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            const x = c.getContext("2d");
            if (mime === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); }
            x.drawImage(img, 0, 0, c.width, c.height);
            ok(c.toDataURL(mime, 0.88));
        };
        img.onerror = () => fail("Không đọc được ảnh này.");
        img.src = r.result;
    };
    r.readAsDataURL(file);
}

/* ===== Xuất data.js (dữ liệu cuối cùng, dùng cho mọi máy) ===== */
function exportData() {
    const text = "/* data.js - dữ liệu hồ sơ. Đặt cạnh index.html (ghi đè file cũ). */\nwindow.PROFILE_DATA = " + JSON.stringify(data, null, 2) + ";\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    a.download = "data.js"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ===== 4. Chỉnh sửa hồ sơ ===== */
const GROUPS = [
    ["Thông tin cá nhân", [["name", "Họ và tên"], ["studentId", "Mã sinh viên"], ["className", "Lớp"], ["gender", "Giới tính", "select"], ["birthDate", "Ngày sinh", "date"], ["phone", "Số điện thoại", "tel"], ["email", "Email", "email"], ["school", "Trường đang học"], ["address", "Địa chỉ"], ["headline", "Chức danh ngắn"], ["bio", "Giới thiệu bản thân", "area"]]],
    ["Công việc hiện tại", [["jobTitle", "Tên công việc"], ["jobOrg", "Cơ quan công tác"], ["jobPeriod", "Thời gian"], ["jobDesc", "Mô tả công việc", "area"]]],
    ["Mạng xã hội", [["facebook", "Facebook", "url"], ["zalo", "Zalo", "url"], ["github", "GitHub", "url"]]]
];
const FIELD_KEYS = GROUPS.flatMap((g) => g[1].map((f) => f[0]));
let draft = null;

function buildForm() {
    const box = $("fields");
    GROUPS.forEach(([title, fields]) => {
        const fs = document.createElement("fieldset"), lg = document.createElement("legend");
        lg.textContent = title; fs.appendChild(lg);
        fields.forEach(([key, label, type]) => {
            const l = document.createElement("label"); l.append(label);
            let el;
            if (type === "area") { el = document.createElement("textarea"); el.rows = 3; }
            else if (type === "select") { el = document.createElement("select"); ["Nam", "Nữ", "Khác"].forEach((o) => el.add(new Option(o, o))); }
            else { el = document.createElement("input"); el.type = type || "text"; }
            el.name = key; l.appendChild(el); fs.appendChild(l);
        });
        box.appendChild(fs);
    });
}

function initEditor() {
    buildForm();
    const form = $("form"), drawer = $("drawer"), bg = $("bg"), msg = $("msg");
    const say = (t) => { msg.textContent = t; };
    const prev = (img, src) => setImg(img, src);

    function openDrawer() {
        draft = { logo: data.logo, avatar: data.avatar, hobbies: clone(data.hobbies) };
        FIELD_KEYS.forEach((k) => { form.elements[k].value = data[k] || ""; });
        const showUrl = (el, v) => { el.value = v.startsWith("data:") ? "" : v; el.placeholder = v.startsWith("data:") ? "(ảnh đã chọn từ máy)" : "images/... hoặc https://..."; };
        showUrl($("urlLogo"), draft.logo); showUrl($("urlAvatar"), draft.avatar);
        prev($("prevLogo"), draft.logo); prev($("prevAvatar"), draft.avatar);
        hobbyEditor(); say("");
        drawer.classList.add("open"); bg.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden"; form.elements.name.focus();
    }
    function closeDrawer() {
        drawer.classList.remove("open"); bg.classList.remove("open"); drawer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = ""; $("editBtn").focus();
    }

    function hobbyEditor() {
        const box = $("hobbyEditor"); box.replaceChildren();
        draft.hobbies.forEach((h, i) => {
            const row = document.createElement("div"); row.className = "hobby-row";
            const ic = document.createElement("input"), nm = document.createElement("input"),
                del = document.createElement("button"), ds = document.createElement("textarea");
            ic.value = h.icon; ic.maxLength = 4; ic.setAttribute("aria-label", "Biểu tượng");
            nm.value = h.name; nm.placeholder = "Tên sở thích"; nm.setAttribute("aria-label", "Tên sở thích");
            ds.value = h.desc; ds.rows = 2; ds.placeholder = "Mô tả ngắn"; ds.setAttribute("aria-label", "Mô tả");
            del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", "Xóa sở thích");
            ic.oninput = () => { h.icon = ic.value; }; nm.oninput = () => { h.name = nm.value; }; ds.oninput = () => { h.desc = ds.value; };
            del.onclick = () => {
                if (draft.hobbies.length <= 3) return say("Cần giữ tối thiểu 3 sở thích.");
                draft.hobbies.splice(i, 1); say(""); hobbyEditor();
            };
            row.append(ic, nm, del, ds); box.appendChild(row);
        });
    }
    $("addHobby").onclick = () => {
        draft.hobbies.push({ icon: "⭐", name: "", desc: "" }); hobbyEditor();
        $("hobbyEditor").lastElementChild.children[1].focus();
    };


    [["Logo", "logo", 256, "image/png"], ["Avatar", "avatar", 900, "image/jpeg"]].forEach(([n, key, size, mime]) => {
        $("url" + n).addEventListener("input", (e) => { const v = e.target.value.trim(); if (v) { draft[key] = v; prev($("prev" + n), v); } });
        $("file" + n).addEventListener("change", (e) => {
            readImage(e.target.files[0], size, mime, (url) => {
                draft[key] = url; prev($("prev" + n), url); $("url" + n).value = ""; $("url" + n).placeholder = "(ảnh đã chọn từ máy)"; say("");
            }, say);
            e.target.value = "";
        });
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = (k) => form.elements[k].value.trim();
        if (!v("name")) { say("Vui lòng nhập họ và tên."); return form.elements.name.focus(); }
        if (!v("studentId")) { say("Vui lòng nhập mã sinh viên."); return form.elements.studentId.focus(); }
        if (v("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) { say("Email chưa đúng định dạng."); return form.elements.email.focus(); }
        if (v("phone") && !/^[0-9+\s.-]{8,15}$/.test(v("phone"))) { say("Số điện thoại chưa đúng (8-15 ký tự)."); return form.elements.phone.focus(); }
        for (const k of ["facebook", "zalo", "github"]) if (v(k) && !/^https?:\/\//i.test(v(k))) { say("Liên kết phải bắt đầu bằng http:// hoặc https://"); return form.elements[k].focus(); }
        const hobbies = draft.hobbies.map((h) => ({ icon: h.icon.trim() || "⭐", name: h.name.trim(), desc: h.desc.trim() })).filter((h) => h.name);
        if (hobbies.length < 3) return say("Cần ít nhất 3 sở thích có tên.");

        const backup = clone(data);
        FIELD_KEYS.forEach((k) => { data[k] = v(k); });
        data.logo = draft.logo || data.logo; data.avatar = draft.avatar || data.avatar; data.hobbies = hobbies;
        data.savedAt = Date.now();
        try { localStorage.setItem(KEY, JSON.stringify(data)); }
        catch (err) { data = backup; return say("Không lưu được (ảnh quá nặng?). Hãy chọn ảnh nhẹ hơn."); }
        render(); closeDrawer(); exportData();
        toast("Đã lưu! Chép file data.js vừa tải về đè lên data.js cũ để mọi máy đều thấy.");
    });

    $("exportBtn").onclick = () => { exportData(); toast("Đã tải data.js."); };
    $("resetBtn").onclick = () => {
        if (!confirm("Bỏ các chỉnh sửa trên trình duyệt này và quay về dữ liệu trong data.js?")) return;
        try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ }
        data = clone(BASE); render(); closeDrawer(); toast("Đã khôi phục theo data.js.");
    };
    $("editBtn").addEventListener("click", openDrawer);
    $("drawerClose").addEventListener("click", closeDrawer);
    bg.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer(); });
}


window.addEventListener("load", () => {
    render();
    $("year").textContent = new Date().getFullYear();
    $("welcomeClose").addEventListener("click", () => $("welcome").classList.add("gone"));
    setTimeout(() => alert(welcome()), 400);
    tick(); setInterval(tick, 1000);
    $("toggleHobbies").addEventListener("click", () => { expanded = !expanded; updateToggle(); });
    initModal(); initEditor();
});
