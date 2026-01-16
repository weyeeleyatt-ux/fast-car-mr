// Fast Car MR - Admin UI (Local Demo)
// كلمة سر الإدارة:
const ADMIN_PASSWORD = "Fastcaradmin2026";

// نفس مفتاح التخزين المستخدم مع captain.js
const STORE_KEY = "fastcar_trips_v1";

// حالات الرحلة
const STATUS = {
  AVAILABLE: "متوفر",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  STARTED: "بدأ",
  FINISHED: "انتهى",
};

// Auth key للإدارة فقط
const AUTH_KEY_ADMIN = "fastcar_auth_admin";

let adminFilter = "all";

function $(id){ return document.getElementById(id); }

function toast(msg){
  const t = $("toast");
  if(!t){ alert(msg); return; }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTO);
  window.__toastTO = setTimeout(()=> t.style.display = "none", 2200);
}

function esc(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function loadTrips(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}

function saveTrips(trips){
  localStorage.setItem(STORE_KEY, JSON.stringify(trips));
}

function nowISO(){ return new Date().toISOString(); }
function niceTime(iso){
  try { return new Date(iso).toLocaleString("ar", { hour12: true }); }
  catch { return ""; }
}

// -------- Auth Admin --------
function isAuthed(){
  return sessionStorage.getItem(AUTH_KEY_ADMIN) === "1";
}

function setAuthed(ok){
  sessionStorage.setItem(AUTH_KEY_ADMIN, ok ? "1" : "0");
}

function setupAuth(){
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

  if (isAuthed()){
    if(lockBox) lockBox.style.display = "none";
    return;
  }

  if(!loginBtn || !passInput) return;

  loginBtn.addEventListener("click", ()=>{
    const p = (passInput.value || "").trim();
    if (p === ADMIN_PASSWORD){
      setAuthed(true);
      toast("✅ تم الدخول");
      location.reload();
    } else {
      showLockMsg("❌ كلمة السر غير صحيحة");
    }
  });
}

// -------- Admin Logic --------
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
  const list = $("adminTrips");
  const empty = $("emptyAdmin");

  if(!adminApp || !adminListBox || !list || !empty) return;
  if(!isAuthed()) return;

  adminApp.style.display = "block";
  adminListBox.style.display = "block";

  const trips = loadTrips()
    .sort((a,b)=> Number(b.id) - Number(a.id))
    .filter(adminMatchesFilter);

  list.innerHTML = "";
  if(trips.length === 0){
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
          ${t.note ? `<div class="meta">ملاحظة: ${esc(t.note)}</div>` : ``}
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
      handleAction(b.dataset.id, b.dataset.a);
    });

    list.appendChild(div);
  });
}

function handleAction(id, action){
  const trips = loadTrips();
  const i = trips.findIndex(t => t.id === id);
  if(i === -1) return;

  if(action === "del"){
    trips.splice(i,1);
    saveTrips(trips);
    toast("🗑️ تم حذف المشوار");
    renderAdmin();
    return;
  }

  if(action === "accept") trips[i].status = STATUS.ACCEPTED;
  if(action === "reject") trips[i].status = STATUS.REJECTED;
  if(action === "start"){
    if(![STATUS.ACCEPTED, STATUS.STARTED].includes(trips[i].status)){
      toast("⚠️ لازم يكون مقبول أولاً");
      return;
    }
    trips[i].status = STATUS.STARTED;
  }
  if(action === "finish"){
    if(trips[i].status !== STATUS.STARTED){
      toast("⚠️ لازم يكون بدأ أولاً");
      return;
    }
    trips[i].status = STATUS.FINISHED;
  }

  trips[i].updatedAt = nowISO();
  saveTrips(trips);
  toast("✅ تم تحديث الحالة");
  renderAdmin();
}

function createTrip(){
  const name = ($("custName")?.value || "").trim();
  const phone = ($("custPhone")?.value || "").trim();
  const pickupText = ($("pickupText")?.value || "").trim();
  const dropoffText = ($("dropoffText")?.value || "").trim();
  const priceOld = Number(($("priceOld")?.value || "900").trim()) || 900;
  const note = ($("note")?.value || "").trim();

  if(!name || !phone || !pickupText || !dropoffText){
    toast("⚠️ عبّي كل الحقول");
    return;
  }

  const trip = {
    id: Date.now().toString(),
    customer
