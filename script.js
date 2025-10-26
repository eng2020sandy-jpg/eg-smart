// ✅ إعداد عنوان الـ API
const API_URL = "/api/egsmart";

// 🧩 دالة عامة لإرسال الأوامر إلى السيرفر
async function send(action, data = {}) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data })
    });
    return await res.json();
  } catch (e) {
    console.error("❌ خطأ في الاتصال بالسيرفر:", e);
    alert("حدث خطأ أثناء الاتصال بالسيرفر!");
    return {};
  }
}

// ==================== 🏪 الكافيهات ====================
async function loadCafes() {
  const cafes = await send("getCafes");
  const tbody = document.getElementById("cafesTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  (cafes || []).forEach((c, i) => {
    const isActive = (c.status || "active") === "active";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${c.name || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${c.owner || "-"}</td>
      <td>${c.phone || "-"}</td>
      <td>
        <button class="btn install" data-id="${c._id}">🔧 تركيب</button>
      </td>
      <td>
        <button class="btn ${isActive ? "danger" : "success"} toggle" data-id="${c._id}" data-next="${isActive ? "paused" : "active"}">
          ${isActive ? "إيقاف مؤقت" : "تشغيل"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 🧠 زر التركيب
  document.querySelectorAll(".install").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const data = await send("installCafe", { id });
      if (data?.mikrotik) {
        const text = `
--- MikroTik ---
${data.mikrotik}

--- OpenWrt ---
${data.openwrt}

TOKEN: ${data.token}`;
        const win = window.open("", "_blank");
        win.document.write(`<pre style="white-space:pre-wrap">${text}</pre>`);
      } else {
        alert("⚠️ لم يتم توليد سكربت التركيب");
      }
    };
  });

  // 🔘 زر التشغيل/الإيقاف
  document.querySelectorAll(".toggle").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const next = btn.dataset.next;
      await send("toggleCafe", { id, status: next });
      await loadCafes();
    };
  });
}

// ➕ إضافة كافيه جديد
document.getElementById("cafeForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("cafeName").value,
    address: document.getElementById("cafeAddr").value,
    owner: document.getElementById("cafeOwner").value,
    phone: document.getElementById("cafePhone").value,
    landline: document.getElementById("cafeLand").value
  };
  await send("addCafe", payload);
  alert("✅ تم إضافة الكافيه بنجاح");
  e.target.reset();
  loadCafes();
});

// ==================== 💳 الباقات ====================
async function loadPlans() {
  const plans = await send("getPlans");
  const tbody = document.getElementById("plansTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  (plans || []).forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.price} ج.م</td>
      <td>${p.quota} ${p.quotaUnit}</td>
      <td>${p.downloadKbps}/${p.uploadKbps}</td>
      <td>${p.duration} ${p.durationType}</td>
      <td>—</td>`;
    tbody.appendChild(tr);
  });

  // تحديث قائمة الباقات في نموذج الكروت
  const sel = document.getElementById("cardPlan");
  if (sel) {
    sel.innerHTML = "";
    (plans || []).forEach(p => {
      const opt = document.createElement("option");
      opt.value = p._id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }
}

// ➕ حفظ / تعديل باقة
document.getElementById("planForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("planName").value,
    price: document.getElementById("planPrice").value,
    quota: document.getElementById("planQuota").value,
    quotaUnit: document.getElementById("planQuotaUnit")?.value || "GB",
    uploadKbps: document.getElementById("planUp")?.value || 0,
    downloadKbps: document.getElementById("planDown")?.value || 0,
    duration: document.getElementById("planDuration").value,
    durationType: document.getElementById("planDurType")?.value || "days",
  };
  await send("upsertPlan", payload);
  alert("✅ تم حفظ الباقة بنجاح");
  loadPlans();
});

// ==================== 🧾 الكروت ====================
async function loadCards() {
  const cards = await send("getCards");
  const tbody = document.getElementById("cardsTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  (cards || []).forEach((k, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${k.cafeId || "-"}</td>
      <td>${k.code}</td>
      <td>${k.planId || "-"}</td>
      <td>${k.status}</td>
      <td>—</td>`;
    tbody.appendChild(tr);
  });
}

// ➕ إنشاء مجموعة كروت دفعة واحدة
document.getElementById("cardForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const cafeName = document.getElementById("cardCafe").value.trim();
  if (!cafeName) return alert("⚠️ اكتب اسم الكافيه أولًا");

  const cafes = await send("getCafes");
  const cafe = cafes.find(c => (c.name || "").trim() === cafeName);
  if (!cafe) return alert("❌ الكافيه غير موجود بالاسم المكتوب");

  const payload = {
    cafeId: cafe._id,
    planId: document.getElementById("cardPlan").value,
    count: Number(document.getElementById("cardCount")?.value || 1),
    codeLength: Number(document.getElementById("cardCodeLen")?.value || 8),
  };

  await send("createCardsBatch", payload);
  alert("✅ تم إنشاء الكروت بنجاح");
  loadCards();
});

// ==================== 🚀 تشغيل تلقائي عند الفتح ====================
document.addEventListener("DOMContentLoaded", () => {
  loadCafes();
  loadPlans();
  loadCards();
});
