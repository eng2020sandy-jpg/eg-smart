/* EG SMART - Netlify API wired */
(() => {
  "use strict";
  const $ = (sel, p=document) => p.querySelector(sel);
  const $$ = (sel, p=document) => Array.from(p.querySelectorAll(sel));
  const log = (msg) => addLog(msg);

  // API helper (Netlify Functions)
  async function api(action, data={}){
    const res = await fetch("/.netlify/functions/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data })
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok || json.error) throw new Error(json.error || "API error");
    return json;
  }

  // Login
  const loginView = $("#loginView");
  const loginBtn = $("#loginBtn");
  const userInput = $("#loginUser");
  const passInput = $("#loginPass");
  const loginError = $("#loginError");

  const dashboard = $("#dashboard");
  const menu = $("#menu");
  const sectionTitle = $("#sectionTitle");

  const sections = $$(".section");

  // Local store
  const store = {
    get(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };

  let cafes = store.get("eg_cafes", []);
  let cards = store.get("eg_cards", []);
  let plans = store.get("eg_plans", [
    { id: 1, name: "Basic", price: 15, quota: "2GB", speed: "10Mbps", duration: "يوم" },
  ]);
  let logs = store.get("eg_logs", []);
  let settings = store.get("eg_settings", { name: "EG SMART", theme: "dark" });

  function addLog(text){
    const entry = { ts: new Date().toISOString(), text };
    logs.unshift(entry); store.set("eg_logs", logs); renderLogs();
  }

  function applyTheme(){
    if (settings.theme === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }
  applyTheme();

  function showSection(id) {
    sections.forEach((sec) => sec.classList.remove("active"));
    const next = document.getElementById(id);
    if (next) {
      next.classList.add("active");
      sectionTitle.textContent = next.querySelector("h3")?.textContent || "القسم";
      next.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // counters
    $("#cafesCount").textContent = cafes.length;
    $("#cardsCount").textContent = cards.length;
    drawChart();
  }
  function setActiveMenu(btn){
    menu.querySelectorAll(".menu-item").forEach((i) => i.classList.remove("active"));
    btn.classList.add("active");
  }
  menu?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-section]"); if (!btn) return;
    e.preventDefault(); setActiveMenu(btn); showSection(btn.dataset.section);
  });

  // Quick jumps
  document.body.addEventListener("click", (e) => {
    const jump = e.target.getAttribute("data-jump"); if (!jump) return;
    setActiveMenu(menu.querySelector(`[data-section="${jump}"]`)); showSection(jump);
  });

  // ----- Cafes -----
  const cafesTable = $("#cafesTable");
  const cafesSearch = $("#cafesSearch");
  const cafeForm = $("#cafeForm");
  const cafeId = $("#cafeId");
  const cafeName = $("#cafeName");
  const cafeAddr = $("#cafeAddr");
  const cafeOwner = $("#cafeOwner");
  const cafePhone = $("#cafePhone");
  const cafeLand = $("#cafeLand");

  function renderCafes(){
    const q = (cafesSearch.value||"").trim();
    const list = q ? cafes.filter(c => c.name.includes(q)) : cafes;
    cafesTable.innerHTML = list.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.addr||""}</td>
        <td>${c.owner||""}</td>
        <td>${c.phone||""}</td>
        <td><button class="btn" data-install="${c.id}">تركيب</button></td>
        <td>
          <button class="btn" data-edit="${c.id}">تعديل</button>
          <button class="btn danger" data-del="${c.id}">حذف</button>
        </td>
      </tr>
    `).join("");
  }
  cafesTable?.addEventListener("click", async (e) => {
    const edit = e.target.getAttribute("data-edit");
    const del = e.target.getAttribute("data-del");
    const install = e.target.getAttribute("data-install");
    if (edit){
      const c = cafes.find(x=>x.id==edit); if (!c) return;
      cafeId.value = c.id; cafeName.value = c.name; cafeAddr.value = c.addr||"";
      cafeOwner.value = c.owner||""; cafePhone.value = c.phone||""; cafeLand.value = c.land||"";
    }
    if (del){
      cafes = cafes.filter(x=>x.id!=del); store.set("eg_cafes", cafes); renderCafes(); addLog(`حذف كافيه #${del}`);
    }
    if (install){
      const c = cafes.find(x=>x.id==install); if (!c) return;
      try{
        const res = await api("installCafe", { cafe: c });
        addLog(`تركيب للكافيه ${c.name}: ${res.message||'OK'}`);
        alert("تم إرسال طلب التركيب للباك-إند (placeholder).");
      }catch(err){ alert("فشل تركيب: " + err.message); }
    }
  });
  cafesSearch?.addEventListener("input", renderCafes);
  cafeForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = Number(cafeId.value);
    if (id){
      const c = cafes.find(x=>x.id===id); if (!c) return;
      c.name=cafeName.value.trim(); c.addr=cafeAddr.value.trim(); c.owner=cafeOwner.value.trim();
      c.phone=cafePhone.value.trim(); c.land=cafeLand.value.trim();
      addLog(`تعديل كافيه #${id}`);
    } else {
      const newId = (cafes.at(-1)?.id ?? 0) + 1;
      cafes.push({ id:newId, name:cafeName.value.trim(), addr:cafeAddr.value.trim(), owner:cafeOwner.value.trim(), phone:cafePhone.value.trim(), land:cafeLand.value.trim() });
      addLog(`إضافة كافيه "${cafeName.value.trim()}"`);
    }
    store.set("eg_cafes", cafes);
    cafeForm.reset(); cafeId.value="";
    renderCafes(); showSection("cafes");
  });

  // ----- Cards -----
  const cardsTable = $("#cardsTable");
  const cardForm = $("#cardForm");
  const cardCafe = $("#cardCafe");
  const cardPlan = $("#cardPlan");

  function renderCards(){
    cardsTable.innerHTML = cards.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.cafe}</td>
        <td><code>${c.code}</code></td>
        <td>${c.plan}</td>
        <td>${c.status}</td>
        <td><button class="btn danger" data-cdel="${c.id}">حذف</button></td>
      </tr>
    `).join("");
  }
  cardsTable?.addEventListener("click", (e) => {
    const del = e.target.getAttribute("data-cdel");
    if (del){
      cards = cards.filter(x=>x.id!=del); store.set("eg_cards", cards);
      renderCards(); addLog(`حذف كارت #${del}`);
    }
  });
  cardForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = { cafe: cardCafe.value.trim(), plan: cardPlan.value.trim() };
    try{
      const res = await api("createCard", payload); // expects {id, code}
      const id = (cards.at(-1)?.id ?? 0) + 1;
      cards.push({ id, cafe: payload.cafe, plan: payload.plan, code: res.code || ("CARD-" + Date.now()), status:"نشط" });
      store.set("eg_cards", cards);
      renderCards(); addLog(`إنشاء كارت للكافيه "${payload.cafe}"`);
      cardForm.reset();
    }catch(err){ alert("فشل إنشاء كارت: " + err.message); }
  });

  // ----- Plans -----
  const plansTable = $("#plansTable");
  const planForm = $("#planForm");
  const planId = $("#planId");
  const planName = $("#planName");
  const planPrice = $("#planPrice");
  const planQuota = $("#planQuota");
  const planSpeed = $("#planSpeed");
  const planDuration = $("#planDuration");

  function renderPlans(){
    plansTable.innerHTML = plans.map(p => `
      <tr>
        <td>${p.id}</td><td>${p.name}</td><td>${p.price}</td><td>${p.quota}</td><td>${p.speed||""}</td><td>${p.duration||""}</td>
        <td><button class="btn" data-pedit="${p.id}">تعديل</button><button class="btn danger" data-pdel="${p.id}">حذف</button></td>
      </tr>
    `).join("");
  }
  plansTable?.addEventListener("click", (e) => {
    const edit = e.target.getAttribute("data-pedit");
    const del = e.target.getAttribute("data-pdel");
    if (edit){
      const p = plans.find(x=>x.id==edit); if (!p) return;
      planId.value = p.id; planName.value=p.name; planPrice.value=p.price; planQuota.value=p.quota; planSpeed.value=p.speed||""; planDuration.value=p.duration||"";
    }
    if (del){
      plans = plans.filter(x=>x.id!=del); store.set("eg_plans", plans); renderPlans(); addLog(`حذف باقة #${del}`);
    }
  });
  planForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = Number(planId.value);
    if (id){
      const p = plans.find(x=>x.id===id); if (!p) return;
      p.name=planName.value.trim(); p.price=Number(planPrice.value); p.quota=planQuota.value.trim();
      p.speed=planSpeed.value.trim(); p.duration=planDuration.value.trim();
      addLog(`تعديل باقة #${id}`);
    } else {
      const newId = (plans.at(-1)?.id ?? 0) + 1;
      plans.push({ id:newId, name:planName.value.trim(), price:Number(planPrice.value), quota:planQuota.value.trim(), speed:planSpeed.value.trim(), duration:planDuration.value.trim() });
      addLog(`إضافة باقة "${planName.value.trim()}"`);
    }
    store.set("eg_plans", plans);
    planForm.reset(); planId.value="";
    renderPlans();
  });

  // ----- Logs -----
  const logsList = $("#logsList");
  const clearLogsBtn = $("#clearLogs");
  function renderLogs(){
    logsList.innerHTML = logs.map(l => `<div class="log-item">[${new Date(l.ts).toLocaleString()}] ${l.text}</div>`).join("");
  }
  clearLogsBtn?.addEventListener("click", () => { logs = []; store.set("eg_logs", logs); renderLogs(); });

  // ----- Reports (simple canvas) -----
  const chart = $("#reportChart"); const ctx = chart?.getContext?.("2d");
  function drawChart(){
    if (!ctx) return;
    const a = cafes.length, b = cards.length, c = plans.length;
    ctx.clearRect(0,0,chart.width,chart.height);
    const w = chart.width, h = chart.height;
    ctx.font = "14px sans-serif";
    const get = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    ctx.fillStyle = get("--text") || "#fff"; ctx.strokeStyle = get("--border") || "#888";
    ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(40, h-30); ctx.lineTo(w-10, h-30); ctx.stroke();
    const max = Math.max(a,b,c,5); const barW = 46; const gap = 24; const baseX = 80; const baseY = h-30;
    function bar(x, val, label){
      const barH = (val / max) * (h-60);
      ctx.fillRect(x, baseY - barH, barW, barH);
      ctx.fillText(String(val), x+barW/2-6, baseY - barH - 6);
      ctx.fillText(label, x, baseY + 18);
    }
    ctx.fillStyle = get("--primary") || "#3b82f6"; bar(baseX, a, "كافيهات");
    ctx.fillStyle = get("--muted") || "#8aa0c2";   bar(baseX + barW + gap, b, "كروت");
    ctx.fillStyle = get("--border") || "#223056";  bar(baseX + 2*(barW + gap), c, "باقات");
  }

  // ----- Settings -----
  const settingsForm = $("#settingsForm");
  const settingsSaved = $("#settingsSaved");
  const projectName = $("#projectName");
  const themeMode = $("#themeMode");
  settingsForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    settings.name = projectName.value.trim() || "EG SMART";
    settings.theme = themeMode.value;
    store.set("eg_settings", settings);
    applyTheme();
    settingsSaved?.classList.remove("hidden");
    setTimeout(()=>settingsSaved?.classList.add("hidden"), 1500);
    addLog("تحديث الإعدادات");
    drawChart();
  });

  // ----- Login / Logout -----
  function tryLogin(){
    const u = userInput.value.trim(), p = passInput.value.trim();
    if (u.length<3 || p.length<3){ loginError.classList.remove("hidden"); return; }
    loginError.classList.add("hidden");
    loginView.classList.add("hidden"); dashboard.classList.remove("hidden");
    renderAll(); showSection("home"); addLog(`دخول المستخدم "${u}"`);
  }
  function logout(){
    dashboard.classList.add("hidden");
    loginView.classList.remove("hidden");
    userInput.value=""; passInput.value="";
    addLog("تسجيل خروج");
  }
  loginBtn?.addEventListener("click", tryLogin);
  passInput?.addEventListener("keydown", (e)=>{ if (e.key==="Enter") tryLogin(); });
  $("#logoutBtn")?.addEventListener("click", logout);

  // Export/Import
  $("#exportBtn")?.addEventListener("click", () => {
    const payload = { cafes, cards, plans, logs, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="eg_smart_export.json"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    addLog("تصدير البيانات");
  });
  $("#importInput")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try{
        const data = JSON.parse(r.result);
        cafes = data.cafes ?? cafes; cards = data.cards ?? cards; plans = data.plans ?? plans;
        logs = data.logs ?? logs; settings = data.settings ?? settings;
        store.set("eg_cafes", cafes); store.set("eg_cards", cards); store.set("eg_plans", plans); store.set("eg_logs", logs); store.set("eg_settings", settings);
        renderAll(); addLog("استيراد البيانات");
      }catch{ alert("ملف غير صالح"); }
    };
    r.readAsText(f);
  });

  // Renderers
  function renderAll(){ renderCafes(); renderCards(); renderPlans(); renderLogs(); drawChart(); }
  renderAll();
})();