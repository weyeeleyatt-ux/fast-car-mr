// Fast Car MR - Captain UI (Local Demo)
// كلمة سر الكباتن:
const CAPTAIN_PASSWORD = "fastcarcaptain20032026";

// التخزين المحلي (نفس المفتاح اللي يستخدمه admin.js أو app.js)
const STORE_KEY = "fastcar_trips_v1";

// حالات الرحلة
const STATUS = {
  AVAILABLE: "متوفر",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  STARTED: "بدأ",
  FINISHED: "انتهى",
};

// Auth key للكابتن فقط
const AUTH_KEY_CAPTAIN = "fastcar_auth_captain";

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

function isAuthed(){
  return sessionStorage.getItem(AUTH_KEY_CAPTAIN) === "1";
}

function setAuthed(ok){
  sessionStorage.setItem(AUTH_KEY_CAPTAIN, ok ? "1" : "0");
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
    if (p === CAPTAIN_PASSWORD){
      setAuthed(true);
      toast("✅ تم الدخول");
      location.reload();
    } else {
      showLockMsg("❌ كلمة السر غير صحيحة");
    }
  });
}

// -------- Captain UI --------
function captainMatchesView(t, view, captainName){
  if(view === "available") return t.status === STATUS.AVAILABLE;
  if(view === "mine") return t.captainName && captainName && t.captainName === captainName;
  return true;
}

function renderCaptain(){
  const captainApp = $("captainApp");
  const list = $("captainTrips");
  const empty = $("emptyCaptain");

  if(!captainApp || !list || !empty) return;
  if(!isAuthed()) return;

  captainApp.style.display = "block";

  const capName = ($("captainName")?.value || "").trim();
  const view = ($("capView")?.value || "available");

  const trips = loadTrips()
    .sort((a,b)=> Number(b.id) - Number(a.id))
    .filter(t => captainMatchesView(t, view, capName));

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
          <div class="meta">السعر: <b>${esc(t.priceOld)}</b> أوقية قديمة</div>
          ${t.note ? `<div class="meta">ملاحظة: ${esc(t.note)}</div>` : ``}
          ${t.captainName ? `<div class="meta">الكابتن: <b>${esc(t.captainName)}</b></div>` : ``}
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
      handleAction(b.dataset.id, b.dataset.a);
    });

    list.appendChild(div);
  });
}

function handleAction(id, action){
  const trips = loadTrips();
  const i = trips.findIndex(t => t.id === id);
  if(i === -1) return;

  const capName = ($("captainName")?.value || "").trim();

  if(action === "accept"){
    if(!capName){
      toast("⚠️ اكتب اسمك أولاً");
      return;
    }
    if(trips[i].status !== STATUS.AVAILABLE){
      toast("⚠️ هذا المشوار ليس متوفر");
      return;
    }
    trips[i].status = STATUS.ACCEPTED;
    trips[i].captainName = capName;
  }

  if(action === "reject"){
    if(trips[i].status !== STATUS.AVAILABLE){
      toast("⚠️ لا يمكن رفض مشوار غير متوفر");
      return;
    }
    trips[i].status = STATUS.REJECTED;
  }

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

  trips[i].updatedAt = new Date().toISOString();
  saveTrips(trips);

  toast("✅ تم تحديث الحالة");
  renderCaptain();
}

// -------- Boot --------
window.addEventListener("DOMContentLoaded", ()=>{
  setupAuth();

  // إذا دخل
  if(isAuthed()){
    renderCaptain();

    $("refreshBtn")?.addEventListener("click", renderCaptain);
    $("capView")?.addEventListener("change", renderCaptain);
    $("captainName")?.addEventListener("input", ()=>{
      if(($("capView")?.value || "available") === "mine") renderCaptain();
    });
  }
});
