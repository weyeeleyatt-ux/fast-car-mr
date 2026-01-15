// Fast Car MR (GitHub Pages Version)
// يعمل بالكامل بدون سيرفر (LocalStorage)
// - Admin: إنشاء مشوار + خريطة + مسافة + سعر + كورسات اليوم
// - Captain: رؤية الطلبات + قبول/رفض + بدأ/انتهى + خريطة

const STORAGE_KEY = "fastcar_mr_trips_v1";
const FIXED_PRICE_OLD = 900; // أوقية قديمة (ثابت)

// حالات الرحلة
const STATUS = {
  PENDING: "قيد الانتظار",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  STARTED: "بدأ",
  FINISHED: "انتهى",
};

// ---------- Helpers ----------
function $(id){ return document.getElementById(id); }

function loadTrips(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveTrips(trips){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fmtCoord(latlng){
  if (!latlng) return "غير محدد";
  return `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function haversineKm(a, b){
  // حساب مسافة تقريبية بين نقطتين (كم)
  const R = 6371;
  const toRad = (v)=> (v * Math.PI)/180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  return R * c;
}

function nowISO(){ return new Date().toISOString(); }
function niceTime(iso){
  try{ return new Date(iso).toLocaleString("ar", { hour12: true }); }
  catch{ return ""; }
}

// ---------- ADMIN PAGE ----------
let adminMap, pickupMarker, dropoffMarker, lineLayer;
let pickupLatLng = null;
let dropoffLatLng = null;

function initAdmin(){
  // عناصر الصفحة
  const createBtn = $("createTripBtn");
  const resetBtn = $("resetMapBtn");
  const clearAllBtn = $("clearAllBtn");
  const exportBtn = $("exportBtn");

  // خريطة
  adminMap = L.map("mapAdmin").setView([18.1, -15.9], 12); // نواكشوط تقريباً
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(adminMap);

  adminMap.on("click", (e)=>{
    // أول ضغط = Pickup
    if (!pickupLatLng){
      pickupLatLng = e.latlng;
      if (pickupMarker) pickupMarker.remove();
      pickupMarker = L.marker(pickupLatLng).addTo(adminMap).bindPopup("الانطلاق").openPopup();
      $("pickupTxt").textContent = fmtCoord(pickupLatLng);
      return;
    }

    // ثاني ضغط = Dropoff
    if (!dropoffLatLng){
      dropoffLatLng = e.latlng;
      if (dropoffMarker) dropoffMarker.remove();
      dropoffMarker = L.marker(dropoffLatLng).addTo(adminMap).bindPopup("الوجهة").openPopup();
      $("dropoffTxt").textContent = fmtCoord(dropoffLatLng);

      drawAdminLineAndDistance();
      return;
    }

    // إذا الاثنين محددين، أي ضغط جديد: نعيد تعيين الوجهة فقط
    dropoffLatLng = e.latlng;
    if (dropoffMarker) dropoffMarker.remove();
    dropoffMarker = L.marker(dropoffLatLng).addTo(adminMap).bindPopup("الوجهة").openPopup();
    $("dropoffTxt").textContent = fmtCoord(dropoffLatLng);
    drawAdminLineAndDistance();
  });

  function drawAdminLineAndDistance(){
    if (!pickupLatLng || !dropoffLatLng) return;
    const km = haversineKm(pickupLatLng, dropoffLatLng);
    $("distanceTxt").textContent = `${km.toFixed(2)} كم`;

    // السعر: ثابت 900 (تقدر تعدل لاحقاً لمسافة)
    $("priceTxt").textContent = `${FIXED_PRICE_OLD} أوقية قديمة`;

    // رسم خط
    if (lineLayer) lineLayer.remove();
    lineLayer = L.polyline([pickupLatLng, dropoffLatLng]).addTo(adminMap);
    adminMap.fitBounds(lineLayer.getBounds(), { padding: [20, 20] });
  }

  resetBtn.addEventListener("click", ()=>{
    pickupLatLng = null;
    dropoffLatLng = null;
    $("pickupTxt").textContent = "غير محدد";
    $("dropoffTxt").textContent = "غير محدد";
    $("distanceTxt").textContent = "—";
    $("priceTxt").textContent = `${FIXED_PRICE_OLD} أوقية قديمة`;

    if (pickupMarker) pickupMarker.remove();
    if (dropoffMarker) dropoffMarker.remove();
    if (lineLayer) lineLayer.remove();
    pickupMarker = dropoffMarker = lineLayer = null;
  });

  createBtn.addEventListener("click", ()=>{
    const name = ($("custName").value || "").trim();
    const phone = ($("custPhone").value || "").trim();

    if (!name || !phone){
      alert("⚠️ لازم تكتب اسم الزبون ورقمه");
      return;
    }
    if (!pickupLatLng || !dropoffLatLng){
      alert("⚠️ لازم تحدد الانطلاق والوجهة على الخريطة");
      return;
    }

    const km = haversineKm(pickupLatLng, dropoffLatLng);
    const trip = {
      id: Date.now().toString(),
      customerName: name,
      customerPhone: phone,
      pickup: { lat: pickupLatLng.lat, lng: pickupLatLng.lng },
      dropoff: { lat: dropoffLatLng.lat, lng: dropoffLatLng.lng },
      distanceKm: Number(km.toFixed(2)),
      priceOld: FIXED_PRICE_OLD,
      status: STATUS.PENDING,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      captainNote: ""
    };

    const trips = loadTrips();
    trips.push(trip);
    saveTrips(trips);

    alert("✅ تم إرسال الطلب (محلياً) — افتح واجهة الكابتن لتجرب القبول/الرفض");
    $("custName").value = "";
    $("custPhone").value = "";

    renderAdminTrips();
  });

  clearAllBtn.addEventListener("click", ()=>{
    if (!confirm("هل تريد حذف كل الطلبات؟")) return;
    saveTrips([]);
    renderAdminTrips();
  });

  exportBtn.addEventListener("click", ()=>{
    const trips = loadTrips();
    const blob = new Blob([JSON.stringify(trips, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fast-car-mr-trips.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  renderAdminTrips();
}

function renderAdminTrips(){
  const wrap = $("tripsAdmin");
  const empty = $("emptyAdmin");
  const trips = loadTrips().sort((a,b)=> Number(b.id) - Number(a.id));

  wrap.innerHTML = "";
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
          <b>${escapeHtml(t.customerName)}</b> • ${escapeHtml(t.customerPhone)}
          <div class="meta">السعر: <b>${t.priceOld}</b> أوقية قديمة • المسافة: <b>${t.distanceKm}</b> كم</div>
          <div class="meta">الوقت: ${niceTime(t.createdAt)}</div>
        </div>
        <span class="badge">${escapeHtml(t.status)}</span>
      </div>

      <div class="meta">الانطلاق: ${escapeHtml(fmtCoord(t.pickup))}</div>
      <div class="meta">الوجهة: ${escapeHtml(fmtCoord(t.dropoff))}</div>

      <div class="itemActions">
        <button class="primary" data-action="accept" data-id="${t.id}">مقبول</button>
        <button data-action="start" data-id="${t.id}">بدأ</button>
        <button data-action="finish" data-id="${t.id}">انتهى</button>
        <button class="danger" data-action="reject" data-id="${t.id}">مرفوض</button>
        <button class="danger" data-action="delete" data-id="${t.id}">حذف</button>
      </div>
    `;

    div.addEventListener("click", (e)=>{
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      handleTripAction(id, action);
      e.stopPropagation();
    });

    wrap.appendChild(div);
  });
}

function handleTripAction(id, action){
  let trips = loadTrips();
  const idx = trips.findIndex(t=> t.id === id);
  if (idx === -1) return;

  if (action === "delete"){
    trips = trips.filter(t=> t.id !== id);
    saveTrips(trips);
    renderAdminTrips();
    return;
  }

  if (action === "accept") trips[idx].status = STATUS.ACCEPTED;
  if (action === "reject") trips[idx].status = STATUS.REJECTED;
  if (action === "start") trips[idx].status = STATUS.STARTED;
  if (action === "finish") trips[idx].status = STATUS.FINISHED;

  trips[idx].updatedAt = nowISO();
  saveTrips(trips);

  // تحديث حسب الصفحة
  if ($("tripsAdmin")) renderAdminTrips();
  if ($("tripsCaptain")) renderCaptainTrips();
}

// ---------- CAPTAIN PAGE ----------
let captainMap, capPickupMarker, capDropoffMarker, capLine;

function initCaptain(){
  captainMap = L.map("mapCaptain").setView([18.1, -15.9], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(captainMap);

  $("refreshCaptainBtn").addEventListener("click", ()=>{
    renderCaptainTrips();
  });

  renderCaptainTrips();
}

function renderCaptainTrips(){
  const wrap = $("tripsCaptain");
  const empty = $("emptyCaptain");
  const trips = loadTrips().sort((a,b)=> Number(b.id) - Number(a.id));

  wrap.innerHTML = "";
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
          <b>${escapeHtml(t.customerName)}</b> • ${escapeHtml(t.customerPhone)}
          <div class="meta">السعر: <b>${t.priceOld}</b> أوقية قديمة • المسافة: <b>${t.distanceKm}</b> كم</div>
          <div class="meta">الوقت: ${niceTime(t.createdAt)}</div>
        </div>
        <span class="badge">${escapeHtml(t.status)}</span>
      </div>

      <div class="itemActions">
        <button class="primary" data-action="accept" data-id="${t.id}">قبول</button>
        <button class="danger" data-action="reject" data-id="${t.id}">رفض</button>
        <button data-action="start" data-id="${t.id}">بدء</button>
        <button data-action="finish" data-id="${t.id}">إنهاء</button>
      </div>

      <div class="meta">اضغط على البطاقة لعرضها على الخريطة</div>
    `;

    // أزرار
    div.addEventListener("click", (e)=>{
      const btn = e.target.closest("button");
      if (btn){
        handleTripAction(btn.dataset.id, btn.dataset.action);
        e.stopPropagation();
        return;
      }
      // عرض على الخريطة
      showTripOnCaptainMap(t);
    });

    wrap.appendChild(div);
  });
}

function showTripOnCaptainMap(t){
  const pickup = L.latLng(t.pickup.lat, t.pickup.lng);
  const dropoff = L.latLng(t.dropoff.lat, t.dropoff.lng);

  if (capPickupMarker) capPickupMarker.remove();
  if (capDropoffMarker) capDropoffMarker.remove();
  if (capLine) capLine.remove();

  capPickupMarker = L.marker(pickup).addTo(captainMap).bindPopup("الانطلاق").openPopup();
  capDropoffMarker = L.marker(dropoff).addTo(captainMap).bindPopup("الوجهة").openPopup();
  capLine = L.polyline([pickup, dropoff]).addTo(captainMap);

  captainMap.fitBounds(capLine.getBounds(), { padding: [20, 20] });
}

// ---------- Boot ----------
window.addEventListener("DOMContentLoaded", ()=>{
  // لو صفحة الإدارة موجودة
  if (document.getElementById("mapAdmin")){
    initAdmin();
  }
  // لو صفحة الكابتن موجودة
  if (document.getElementById("mapCaptain")){
    initCaptain();
  }
});
