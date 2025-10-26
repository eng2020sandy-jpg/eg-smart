// ===== إعداد عنوان الـ API (Vercel Functions) =====
const API_URL = "/api/egsmart";

// إرسال أوامر للـ API مع حماية من الأخطاء + Authorization
async function send(action, data = {}, includeToken = true) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (includeToken) {
      const token = localStorage.getItem("eg_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, data })
    });
    if (res.status === 401) {
      logoutLocal();
      return { error: "unauthorized" };
    }
    return await res.json();
  } catch (e) {
    console.error("API error:", e);
    alert("⚠️ خطأ في الاتصال بالسيرفر");
    return null;
  }
}

// ===== واجهة التبويبات =====
const tabsNav = document.querySelector(".tabs");
if (tabsNav) {
  tabsNav.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById("tab-" + id).classList.add("active");
  });
}

function showDashboard(){
  document.getElementById("loginView").classList.remove("active");
  document.getElementById("dashboard").classList.remove("hidden");
}
function logoutLocal(){
  localStorage.removeItem("eg_token");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("loginView").classList.add("active");
}

// ===== تسجيل الدخول عبر الـ API =====
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const spinner = document.getElementById("spinner");
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";

  btn.disabled = true;
  spinner.style.display = "inline-block";
  btn.querySelector("span").textContent = "جارٍ التحقق...";

  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const res = await send("login", { user, pass }, false);

  spinner.style.display = "none";
  btn.disabled = false;
  btn.querySelector("span").textContent = "دخول";

  if (res?.token) {
    localStorage.setItem("eg_token", res.token);
    showDashboard();
    loadCafes();
    loadPlans();
  } else {
    errEl.style.display = "block";
    errEl.textContent = res?.error === "invalid" ? "❌ بيانات غير صحيحة" : "❌ خطأ غير متوقع";
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", logoutLocal);

// ===== الكافيهات =====
async function loadCafes() {
  const tbody = document.getElementById("cafesTable");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">⏳ جاري التحميل...</td></tr>`;
  const cafes = await send("getCafes") || [];
  tbody.innerHTML = "";
  if (!cafes.length) {
    tbody.innerHTML = `<tr><td colspan="7">لا توجد بيانات</td></tr>`;
    return;
  }
  cafes.forEach((c, i) => {
    const isActive = (c.status || "active") === "active";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${c.name || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${c.owner || "-"}</td>
      <td>${c.phone || "-"}</td>
      <td><button class="install" data-id="${c._id}">🔧 تركيب</button></td>
      <td>
        <button class="${isActive ? "danger" : "success"} toggle"
                data-id="${c._id}" data-next="${isActive ? "paused" : "active"}">
          ${isActive ? "إيقاف مؤقت" : "تشغيل"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Events
  tbody.onclick = async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.classList.contains("install")) {
      const id = btn.dataset.id;
      const data = await send("installCafe", { id });
      if (!data) return;
      const text = `--- MikroTik ---\n${data.mikrotik}\n\n--- OpenWrt ---\n${data.openwrt}\n\nTOKEN: ${data.token}`;
      const w = window.open("", "_blank");
      w.document.write(`<pre style="white-space:pre-wrap">${text}</pre>`);
      return;
    }
    if (btn.classList.contains("toggle")) {
      const id = btn.dataset.id;
      const next = btn.dataset.next;
      await send("toggleCafe", { id, status: next });
      await loadCafes();
    }
  };
}

// إضافة كافيه
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

// ===== الباقات =====
async function loadPlans() {
  const tbody = document.getElementById("plansTable");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7">⏳ جاري التحميل...</td></tr>`;
  const plans = await send("getPlans") || [];
  tbody.innerHTML = "";
  if (!plans.length) return tbody.innerHTML = `<tr><td colspan="7">لا توجد بيانات</td></tr>`;
  plans.forEach((p,i)=>{
    const dur = p.duration && p.duration.value ? `${p.duration.value} ${p.duration.unit}` : "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${p.name||"-"}</td>
      <td>${p.price||0}</td>
      <td>${p.quotaMB||0} MB</td>
      <td>${p.uploadMbps||0}/${p.downloadMbps||0}</td>
      <td>${dur}</td>
      <td><button class="danger del-plan" data-id="${p._id}">حذف</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.onclick = async (e)=>{
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.classList.contains("del-plan")){
      if (!confirm("تأكيد حذف الباقة؟")) return;
      await send("deletePlan",{ id: btn.dataset.id });
      await loadPlans();
    }
  }
}

document.getElementById("planForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    name: document.getElementById("planName").value.trim(),
    price: Number(document.getElementById("planPrice").value || 0),
    quotaMB: Number(document.getElementById("planQuota").value || 0),
    uploadMbps: Number(document.getElementById("planUpload").value || 0),
    downloadMbps: Number(document.getElementById("planDownload").value || 0),
    duration: {
      value: Number(document.getElementById("planDuration").value || 0),
      unit: document.getElementById("planDurationUnit").value
    }
  };
  const r = await send("addPlan", payload);
  if (r?.insertedId) {
    alert("✅ تم إضافة الباقة");
    e.target.reset();
    loadPlans();
  } else {
    alert("⚠️ لم يتم الحفظ");
  }
});

// ===== الكروت =====
document.getElementById("cardsGenForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    cafeId: document.getElementById("cardsCafeId").value.trim(),
    count: Number(document.getElementById("cardsCount").value || 0),
    length: Number(document.getElementById("cardsLength").value || 0),
    prefix: document.getElementById("cardsPrefix").value.trim(),
    planId: document.getElementById("cardsPlanId").value.trim(),
  };
  const r = await send("generateCards", payload);
  if (r?.inserted && r.inserted.length) {
    alert("✅ تم توليد " + r.inserted.length + " كروت");
    // عرض أول 20 كارت كمثال
    renderCards(r.preview || []);
  } else {
    alert("⚠️ لم يتم التوليد");
  }
});

document.getElementById("cardsSearchForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const q = {
    cafeId: document.getElementById("searchCafeId").value.trim(),
    code: document.getElementById("searchCode").value.trim(),
  };
  const r = await send("searchCards", q);
  renderCards(r || []);
});

function renderCards(list){
  const tbody = document.getElementById("cardsTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="6">لا نتائج</td></tr>`; return; }
  list.forEach((c,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${c.code}</td>
      <td>${c.cafeId}</td>
      <td>${c.planId}</td>
      <td>${c.status||"new"}</td>
      <td>${new Date(c.createdAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== التصاميم =====
async function loadDesigns(){
  const tbody = document.getElementById("designsTable");
  if (!tbody) return;
  const list = await send("getDesigns") || [];
  tbody.innerHTML = "";
  if (!list.length) return tbody.innerHTML = `<tr><td colspan="4">لا توجد تصاميم</td></tr>`;
  list.forEach((d,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${d.name}</td>
      <td>${d.cafeId || "-"}</td>
      <td><button data-id="${d._id}" class="ghost preview-design">معاينة</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.onclick = async (e)=>{
    const btn = e.target.closest("button.preview-design");
    if (!btn) return;
    const d = (await send("getDesign",{ id: btn.dataset.id })) || null;
    if (!d) return;
    const sample = (await send("searchCards",{ cafeId: d.cafeId, limit: 1 }))?.[0];
    const html = (d.template || "").replaceAll("{{CODE}}", sample?.code || "XXXXXX")
      .replaceAll("{{PLAN_NAME}}", sample?.planId || "PLAN")
      .replaceAll("{{CAFE_NAME}}", d.cafeName || "CAFE");
    const w = window.open("", "_blank"); w.document.write(html);
  }
}

document.getElementById("designForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    cafeId: document.getElementById("designCafeId").value.trim(),
    name: document.getElementById("designName").value.trim(),
    template: document.getElementById("designTemplate").value
  };
  const r = await send("addDesign", payload);
  if (r?.insertedId) {
    alert("✅ تم حفظ التصميم");
    e.target.reset(); loadDesigns();
  } else alert("⚠️ لم يتم الحفظ");
});

// تهيئة عند تحميل الصفحة
(function init(){
  const token = localStorage.getItem("eg_token");
  if (token) {
    send("me", {}, true).then(res => {
      if (res && !res.error) {
        showDashboard();
        loadCafes(); loadPlans(); loadDesigns();
      } else logoutLocal();
    }).catch(()=>logoutLocal());
  }
})();

console.log("EG SMART: frontend ready");
