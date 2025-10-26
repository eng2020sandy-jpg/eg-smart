// ===== إعداد عنوان الـ API (Vercel Functions) =====
const API_URL = "/api/egsmart";

// إرسال أوامر للـ API مع حماية من الأخطاء
async function send(action, data = {}) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data })
    });
    return await res.json();
  } catch (e) {
    console.error("API error:", e);
    alert("⚠️ خطأ في الاتصال بالسيرفر");
    return null;
  }
}

// ===== تسجيل الدخول البسيط (بدون DB) =====
document.getElementById("loginBtn")?.addEventListener("click", () => {
  const user = document.getElementById("loginUser")?.value?.trim() || "";
  const pass = document.getElementById("loginPass")?.value?.trim() || "";
  if (user === "admin" && pass === "123") {
    document.getElementById("loginView").classList.remove("active");
    document.getElementById("dashboard").classList.add("active");
    // أول ما ندخل، نحمل الكافيهات
    loadCafes();
  } else {
    document.getElementById("loginError").style.display = "block";
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  document.getElementById("dashboard").classList.remove("active");
  document.getElementById("loginView").classList.add("active");
});

// ===== الكافيهات =====
async function loadCafes() {
  const tbody = document.getElementById("cafesTable");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">⏳ جاري التحميل...</td></tr>`;

  const cafes = await send("getCafes") || [];
  tbody.innerHTML = "";

  cafes.forEach((c, i) => {
    const isActive = (c.status || "active") === "active";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${c.name || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${c.owner || "-"}</td>
      <td>${c.phone || "-"}</td>
      <td><button class="btn install" data-id="${c._id}">🔧 تركيب</button></td>
      <td>
        <button class="btn ${isActive ? "danger" : "success"} toggle"
                data-id="${c._id}" data-next="${isActive ? "paused" : "active"}">
          ${isActive ? "إيقاف مؤقت" : "تشغيل"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // تفويض أحداث الجدول للأزرار
  tbody.onclick = async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // تركيب
    if (btn.classList.contains("install")) {
      const id = btn.dataset.id;
      const data = await send("installCafe", { id });
      if (!data) return;
      const text = `--- MikroTik ---\n${data.mikrotik}\n\n--- OpenWrt ---\n${data.openwrt}\n\nTOKEN: ${data.token}`;
      const w = window.open("", "_blank");
      w.document.write(`<pre style="white-space:pre-wrap">${text}</pre>`);
      return;
    }

    // تشغيل/إيقاف
    if (btn.classList.contains("toggle")) {
      const id = btn.dataset.id;
      const next = btn.dataset.next;
      await send("toggleCafe", { id, status: next });
      await loadCafes();
    }
  };
}

// حفظ كافيه جديد
document.getElementById("cafeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("cafeName").value,
    address: document.getElementById("cafeAddr").value,
    owner: document.getElementById("cafeOwner").value,
    phone: document.getElementById("cafePhone").value,
    landline: document.getElementById("cafeLand").value,
  };
  const r = await send("addCafe", payload);
  if (r?.insertedId) {
    alert("✅ تم إضافة الكافيه بنجاح");
    e.target.reset();
    loadCafes();
  } else {
    alert("⚠️ لم يتم الحفظ. تأكد من البيانات.");
  }
});

// لوج بسيط للتأكد من تحميل السكربت
console.log("EG SMART: script.js is loaded");
