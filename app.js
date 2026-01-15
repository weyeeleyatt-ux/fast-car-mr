// Fast Car MR - إرسال طلب (نسخة بسيطة)

const btn = document.querySelector("button");
const nameInput = document.querySelector('input[type="text"]');
const phoneInput = document.querySelector('input[type="tel"]');

btn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const price = 900; // أوقية قديمة

  if (!name || !phone) {
    alert("⚠️ لازم تكتب اسم الزبون ورقمه");
    return;
  }

  // نحفظ الطلب مؤقتًا في الجهاز (LocalStorage)
  const orders = JSON.parse(localStorage.getItem("fastcar_orders") || "[]");
  orders.push({
    id: Date.now(),
    name,
    phone,
    price,
    status: "قيد الانتظار",
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("fastcar_orders", JSON.stringify(orders));

  alert(`✅ تم إرسال الطلب\nالزبون: ${name}\nالرقم: ${phone}\nالسعر: ${price} أوقية قديمة`);

  // تفريغ الحقول
  nameInput.value = "";
  phoneInput.value = "";
});
