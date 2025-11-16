// ----- CONFIG -----
const TEACHER_PIN = "0908";
const STORAGE_KEY = "tigerTreatsOrders_v2";

// Fallback default (used only if no CSV yet)
const defaultOrders = [
  {
    staffName: "Mrs. Kipp",
    items: ["Cherry Coke", "Alani", "Ruffles"]
  },
  {
    staffName: "Mr. Kipp",
    items: ["Diet Coke", "Nutter Butter", "Doritos"]
  }
];

// ----- STATE -----
let orders = [];
let currentOrderIndex = null;

// ----- DOM ELEMENTS -----
const staffListView = document.getElementById("staffListView");
const orderDetailView = document.getElementById("orderDetailView");

const staffCardsContainer = document.getElementById("staffCards");
const itemsGrid = document.getElementById("itemsGrid");
const detailStaffName = document.getElementById("detailStaffName");

const backButton = document.getElementById("backButton");
const resetButton = document.getElementById("resetButton");
const teacherButton = document.getElementById("teacherButton");
const teacherPanel = document.getElementById("teacherPanel");
const csvInput = document.getElementById("csvInput");

const confettiContainer = document.getElementById("confettiContainer");
const completedBanner = document.getElementById("completedBanner");
const dingSound = document.getElementById("dingSound");

// ----- INIT -----
init();

function init() {
  loadOrders();
  renderStaffList();
  setupHandlers();
}

// Load from localStorage or defaults
function loadOrders() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      orders = JSON.parse(saved);
      return;
    } catch (e) {
      console.error("Failed to parse saved data, using defaults", e);
    }
  }

  // fallback
  orders = defaultOrders.map(o => ({
    staffName: o.staffName,
    items: o.items,
    itemsCompleted: o.items.map(() => false),
    isCompleted: false
  }));
  saveOrders();
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

// ----- STAFF LIST RENDERING -----
function renderStaffList() {
  staffCardsContainer.innerHTML = "";

  orders.forEach((order, index) => {
    const card = document.createElement("div");
    card.className = "staff-card" + (order.isCompleted ? " completed" : "");
    card.addEventListener("click", () => openOrderDetail(index));

    const nameEl = document.createElement("div");
    nameEl.className = "staff-name";
    nameEl.textContent = order.staffName;

    const subtitleEl = document.createElement("div");
    subtitleEl.className = "staff-subtitle";
    subtitleEl.textContent = `${order.items.length} item(s)`;

    const statusEl = document.createElement("div");
    statusEl.className = "staff-status";
    statusEl.textContent = order.isCompleted ? "Completed ✅" : "Tap to start order";

    card.appendChild(nameEl);
    card.appendChild(subtitleEl);
    card.appendChild(statusEl);

    staffCardsContainer.appendChild(card);
  });
}

// ----- DETAIL VIEW -----
function openOrderDetail(index) {
  currentOrderIndex = index;
  const order = orders[index];

  detailStaffName.textContent = order.staffName;
  renderItemsGrid(order);

  staffListView.classList.add("hidden");
  orderDetailView.classList.remove("hidden");
}

function renderItemsGrid(order) {
  itemsGrid.innerHTML = "";

  order.items.forEach((itemName, idx) => {
    const tile = document.createElement("div");
    tile.className = "item-tile" + (order.itemsCompleted[idx] ? " selected" : "");

    const img = document.createElement("img");
    img.className = "item-image";

    const imageName = itemName.toLowerCase().replace(/\s+/g, "");
    img.src = `images/${imageName}.png`;
    img.alt = itemName;

    const label = document.createElement("div");
    label.className = "item-name";
    label.textContent = itemName;

    tile.appendChild(img);
    tile.appendChild(label);

    tile.addEventListener("click", () => {
      order.itemsCompleted[idx] = !order.itemsCompleted[idx];
      playDing();
      renderItemsGrid(order);
      checkOrderCompletion(order);
      saveOrders();
    });

    itemsGrid.appendChild(tile);
  });
}

function checkOrderCompletion(order) {
  if (order.itemsCompleted.every(Boolean)) {
    order.isCompleted = true;
    saveOrders();
    showCompletionEffects();
    renderStaffList();
  }
}

// ----- HANDLERS -----
function setupHandlers() {
  backButton.addEventListener("click", () => {
    orderDetailView.classList.add("hidden");
    staffListView.classList.remove("hidden");
  });

  teacherButton.addEventListener("click", () => {
    requireTeacherPin(() => {
      teacherPanel.classList.toggle("hidden");
    });
  });

  resetButton.addEventListener("click", () => {
    requireTeacherPin(() => {
      if (!confirm("Reset all orders?")) return;
      localStorage.removeItem(STORAGE_KEY);
      loadOrders();
      renderStaffList();
      orderDetailView.classList.add("hidden");
      staffListView.classList.remove("hidden");
      csvInput.value = "";
    });
  });

  csvInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    requireTeacherPin(() => {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target.result;
        const parsed = parseCsvToOrders(text);
        if (!parsed.length) {
          alert("No valid rows found in CSV. Make sure the first column is Staff and the rest are items.");
          return;
        }
        orders = parsed;
        saveOrders();
        renderStaffList();
        orderDetailView.classList.add("hidden");
        staffListView.classList.remove("hidden");
      };
      reader.readAsText(file);
    });
  });
}

// ----- TEACHER PIN -----
function requireTeacherPin(onSuccess) {
  const entered = window.prompt("Enter teacher PIN:");
  if (entered === null) return; // cancelled
  if (entered === TEACHER_PIN) {
    onSuccess();
  } else {
    alert("Incorrect PIN.");
  }
}

// ----- CSV PARSING -----
// Expects rows like: Staff,Item1,Item2,Item3,...
function parseCsvToOrders(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (!lines.length) return [];

  const rows = lines.map(line => line.split(","));
  let startIndex = 0;

  // skip header if first cell is "staff"
  if (rows[0][0] && rows[0][0].toLowerCase() === "staff") {
    startIndex = 1;
  }

  const result = [];

  for (let i = startIndex; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols.length) continue;

    const staffName = (cols[0] || "").trim();
    if (!staffName) continue;

    const items = cols.slice(1).map(c => c.trim()).filter(Boolean);
    if (!items.length) continue;

    result.push({
      staffName,
      items,
      itemsCompleted: items.map(() => false),
      isCompleted: false
    });
  }

  return result;
}

// ----- SOUND -----
function playDing() {
  if (!dingSound) return;
  dingSound.currentTime = 0;
  dingSound.play().catch(() => {});
}

// ----- CONFETTI & BANNER -----
function showCompletionEffects() {
  showConfetti();
  showBanner();
}

function showConfetti() {
  confettiContainer.innerHTML = "";
  confettiContainer.classList.remove("hidden");

  const colors = ["#ff9800", "#ffeb3b", "#4caf50", "#ff4081"];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.animationDuration = 2 + Math.random() * 2 + "s";
    piece.style.animationDelay = Math.random() * 0.5 + "s";

    confettiContainer.appendChild(piece);
  }

  setTimeout(() => {
    confettiContainer.classList.add("hidden");
    confettiContainer.innerHTML = "";
  }, 3500);
}

function showBanner() {
  completedBanner.classList.remove("hidden");
  setTimeout(() => {
    completedBanner.classList.add("hidden");
  }, 2500);
}
