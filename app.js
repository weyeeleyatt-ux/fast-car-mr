// Fast Car MR (Local Demo for GitHub Pages)
// كلمة السر (قفل بسيط): fastcar20032026
// ملاحظة: LocalStorage => نفس الجهاز فقط

const PASSWORD = "fastcar20032026";
const AUTH_KEY = "fastcar_auth_ok";
const STORE_KEY = "fastcar_trips_v1";

const STATUS = {
  AVAILABLE: "متوفر",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  STARTED: "بدأ",
  FINISHED: "انتهى",
};

function $(id){ return document.getElementById(id); }

function toast(msg){
  const t = $("toast");
  if(!t) { alert(msg); return; }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__tTO);
  window.__tTO = setTimeout(()=> t.style.display = "none", 2200);
}

function loadTrips(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}

function saveTrips(trips){
  localStorage.setItem(STORE_KEY, JSON.stringify(trips));
}

function esc(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function nowISO(){ return new Date().toISOString(); }
function niceTime(iso){
  try { return new Date(iso).toLocaleString("ar", { hour12: true }); }
  catch { return ""; }
}

// -------- AUTH (قفل بسيط) --------
function isAuthed(){
  return sessionStorage.getItem(AUTH_KEY) === "1";
}
function setAuthed(ok){
  sessionStorage.setItem(AUTH_KEY, ok ? "1" : "0");
}
function setupAuthGate(){
  const lockBox = $("lockBox");
  const loginBtn = $("loginBtn");
  const passInput = $("passInput");
  const lockMsg = $("lockMsg");
  const logoutBtn = $("logoutBtn");

  function showLockMsg(msg){
    if(!lockMsg) return;
    lockMsg.style.display = "block";
    lockMsg.textContent = msg;
  }

  if (logoutBtn){
    logoutBtn.addEventListener("click", ()=>{
      setAuthed(false);
      location.reload();
    });
  }

  if (!lockBox || !loginBtn || !passInput) return;

  if (isAuthed()){
    lockBox.style.display = "none";
    return;
  }

  loginBtn.addEventListener("click", ()=>{
    const p = (passInput.value || "").trim();
    if (p === PASSWORD){
      setAuthed(true);
      toast("✅ تم الدخول");
      location.reload();
    } else {
      showLockMsg("❌ كلمة السر غير صحيحة");
    }
  });
}

// -------- ADMIN --------
let adminFilter = "all";

function adminMatchesFilter(t){
  if (adminFilter === "all") return true;
  if (adminFilter === "available") return t.status === STATUS.AVAILABLE;
  if (adminFilter === "accepted") return t.status === STATUS.ACCEPTED;
  if (adminFilter === "started") return t.status === STATUS.STARTED;
  if (adminFilter === "finished") return t.status === STATUS.FINISHED;
  if (adminFilter === "rejected") return t.status === STATUS.REJECTED;
  return true;
}

function renderAdmin(){
  const adminApp = $("adminApp");
  const adminListBox = $("adminListBox");
  if(!adminApp || !adminListBox) return;

  if (!isAuthed()) return; // stays hidden until login

  adminApp.style.display = "block";
  adminListBox.style.display = "block";

  const list = $("adminTrips");
  const empty = $("emptyAdmin");
  const trips = loadTrips().sort((a,b)=> Number(b.id) - Number(a.id)).filter(adminMatchesFilter);

  list.innerHTML = "";
  if (trips.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  trips.forEach(t=>{
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="itemTop">
        <div>
          <b>${esc(t.customerName)}</b> • ${esc(t.customerPhone)}
          <div class="meta">الانطلاق: ${esc(t.pickupText)}<br>الوجهة: ${esc(t.dropoffText)}</div>
          <div class="meta">السعر: <b>${esc(t.priceOld)}</b> أوقية قديمة • ${niceTime(t.createdAt)}</div>
          ${t.captainName ? `<div class="meta">الكابتن: <b>${esc(t.captainName)}</b></div>` : ``}
        </div>
        <span class="badge">${esc(t.status)}</span>
      </div>

      <div class="actions">
        <button class="ok" data-a="accept" data-id="${t.id}">مقبول</button>
        <button data-a="start" data-id="${t.id}">بدأ</button>
        <button data-a="finish" data-id="${t.id}">انتهى</button>
        <button class="bad" data-a="reject" data-id="${t.id}">مرفوض</button>
        <button class="bad" data-a="del" data-id="${t.id}">حذف</button>
      </div>
    `;

    div.addEventListener("click", (e)=>{
      const b = e.target.closest("button");
      if(!b) return;
      handleTripAction(b.dataset.id, b.dataset.a, {from:"admin"});
    });

    list.appendChild(div);
  });
}

function createTrip(){
  const name = ($("custName")?.value || "").trim();
  const phone = ($("custPhone")?.value || "").trim();
  const pickupText = ($("pickupText")?.value || "").trim();
  const dropoffText = ($("dropoffText")?.value || "").trim();
  const priceOld = Number(($("priceOld")?.value || "900").trim()) || 900;
  const note = ($("note")?.value || "").trim();

  if(!name || !phone || !pickupText || !dropoffText){
    toast("⚠️ عبّي كل الحقول (اسم/رقم/انطلاق/وجهة)");
    return;
  }

  const trip = {
    id: Date.now().toString(),
    customerName: name,
    customerPhone: phone,
    pickupText,
    dropoffText,
    priceOld,
    note,
    status: STATUS.AVAILABLE,
    captainName: "",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  const trips = loadTrips();
  trips.push(trip);
  saveTrips(trips);

  $("custName").value = "";
  $("custPhone").value = "";
  $("pickupText").value = "";
  $("dropoffText").value = "";
  $("priceOld").value = "900";
  $("note").value = "";

  toast("✅ تم إرسال المشوار للكباتن");
  renderAdmin();
}

// -------- CAPTAIN --------
function captainMatchesView(t, view, captainName){
  if(view === "available") return t.status === STATUS.AVAILABLE;
  if(view === "mine") return t.captainName && captainName && t.captainName === captainName;
  return true; // all
}

function renderCaptain(){
  const captainApp = $("captainApp");
  const list = $("captainTrips");
  const empty = $("emptyCaptain");
  const viewSel = $("capView");
  const capNameInput = $("captainName");

  if(!captainApp || !list || !empty) return;
  if (!isAuthed()) return;

  captainApp.style.display = "block";

  const captainName = (capNameInput?.value || "").trim();
  const view = (viewSel?.value || "available");
  const trips = loadTrips()
    .sort((a,b)=> Number(b.id) - Number(a.id))
    .filter(t => captainMatchesView(t, view, captainName));

  list.innerHTML = "";
  if (trips.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  trips.forEach(t=>{
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="itemTop">
        <div>
          <b>${esc(t.customerName)}</b> • ${esc(t.customerPhone)}
          <div class="meta">الانطلاق: ${esc(t.pickupText)}<br>الوجهة: ${esc(t.dropoffText)}</div>
          <div class="meta">السعر: <b>${esc(t.priceOld)}</b> أوقية قديمة</div>
          ${t.note ? `<div class="meta">ملاحظة: ${esc(t.note)}</div>` : ``}
        </div>
        <span class="badge">${esc(t.status)}</span>
      </div>

      <div class="actions">
        <button class="ok" data-a="accept" data-id="${t.id}">قبول</button>
        <button class="bad" data-a="reject" data-id="${t.id}">رفض</button>
        <button data-a="start" data-id="${t.id}">بدء</button>
        <button data-a="finish" data-id="${t.id}">إنهاء</button>
      </div>
    `;

    div.addEventListener("click", (e)=>{
      const b = e.target.closest("button");
      if(!b) return;
      handleTripAction(b.dataset.id, b.dataset.a, {from:"captain"});
    });

    list.appendChild(div);
  });
}

function handleTripAction(id, action, ctx){
  const trips = loadTrips();
  const i = trips.findIndex(t=> t.id === id);
  if(i === -1) return;

  const capName = ($("captainName")?.value || "").trim();

  // قواعد بسيطة
  if (ctx?.from === "captain" && action === "accept"){
    if (!capName){
      toast("⚠️ اكتب اسمك (اسم الكابتن) أولاً");
      return;
    }
    // يقبل فقط إذا متوفر
    if (trips[i].status !== STATUS.AVAILABLE){
      toast("⚠️ هذا المشوار ليس متوفر الآن");
      return;
    }
    trips[i].status = STATUS.ACCEPTED;
    trips[i].captainName = capName;
  }

  if (ctx?.from === "captain" && action === "reject"){
    // يرفض فقط إذا متوفر
    if (trips[i].status !== STATUS.AVAILABLE){
      toast("⚠️ لا يمكن رفض مشوار غير متوفر");
      return;
    }
    trips[i].status = STATUS.REJECTED;
  }

  if (action === "start"){
    // بدء فقط إذا مقبول أو بدأ
    if (![STATUS.ACCEPTED, STATUS.STARTED].includes(trips[i].status)){
      toast("⚠️ لازم يكون مقبول أولاً");
      return;
    }
    trips[i].status = STATUS.STARTED;
  }

  if (action === "finish"){
    // إنهاء فقط إذا بدأ
    if (trips[i].status !== STATUS.STARTED){
      toast("⚠️ لازم يكون بدأ أولاً");
      return;
    }
    trips[i].status = STATUS.FINISHED;
  }

  if (ctx?.from === "admin" && action === "accept"){
    trips[i].status = STATUS.ACCEPTED;
  }
  if (ctx?.from === "admin" && action === "reject"){
    trips[i].status = STATUS.REJECTED;
  }

  if (ctx?.from === "admin" && action === "del"){
    trips.splice(i,1);
    saveTrips(trips);
    toast("🗑️ تم حذف المشوار");
    renderAdmin();
    renderCaptain();
    return;
  }

  trips[i].updatedAt = nowISO();
  saveTrips(trips);

  toast("✅ تم تحديث الحالة");
  renderAdmin();
  renderCaptain();
}

// -------- UI WIRING --------
function setupAdminUI(){
  if(!$("adminApp")) return;

  $("createTripBtn")?.addEventListener("click", createTrip);
  $("clearAllBtn")?.addEventListener("click", ()=>{
    if(!confirm("حذف كل المشاوير؟")) return;
    saveTrips([]);
    toast("تم حذف الكل");
    renderAdmin();
  });
  $("refreshBtn")?.addEventListener("click", ()=> renderAdmin());

  // filter chips
  document.querySelectorAll(".chip").forEach(ch=>{
    ch.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      ch.classList.add("active");
      adminFilter = ch.dataset.filter || "all";
      renderAdmin();
    });
  });
}

function setupCaptainUI(){
  if(!$("captainApp")) return;

  $("refreshBtn")?.addEventListener("click", ()=> renderCaptain());
  $("capView")?.addEventListener("change", ()=> renderCaptain());
  $("captainName")?.addEventListener("input", ()=>{
    // render only if in mine view
    if(($("capView")?.value || "available") === "mine") renderCaptain();
  });
}

window.addEventListener("DOMContentLoaded", ()=>{
  setupAuthGate();

  // بعد الدخول فقط نفعّل
  if (isAuthed()){
    setupAdminUI();
    setupCaptainUI();
    renderAdmin();
    renderCaptain();
  }
});
