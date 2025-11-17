// ----- CONFIG -----
const TEACHER_PIN = "0908";
const STORAGE_KEY = "tigerTreatsOrders_v3";
const INVENTORY_KEY = "tigerTreatsInventory_v1";   // <-- NEW: inventory storage key

// IMAGE MAP: map CSV item names → image filenames
const IMAGE_MAP = {
    "Coke": "coke.webp",
  "Diet Coke": "dietcoke.webp",
  "Sprite": "sprite.webp",
  "Cherry Twist": "alani-cherrytwist.webp",
  "Orange Kiss": "alani-orangekiss.webp",
  "Pink Slush": "alani-pinkslush.webp",

  "Ruffles": "ruffles.webp",
  "Classic Lays": "lays-classic.webp",
  "Lays Sour Cream and Onion": "lays-sourcream.webp",
  "Fritos": "fritos.webp",
  "Nacho Cheese Doritos": "doritos.webp",
  "Cheetos": "cheetos.webp",
  "Munchies Snack Mix (sun chips, doritos, pretzels, cheetos)": "munchies.webp",

  "Oreos": "oreos.webp",
  "Chips Ahoy": "chipsahoy.webp",
  "Nutter Butter (peanut butter)": "nutterbutter.webp",
  
  "Beef Jerky Sticks (gluten free)": "beefstick.webp",

  // Fallback image if you want it (make sure default.webp exists)
  "DEFAULT": "default.webp"
};

// Fallback default (only used if no saved data AND no CSV yet)
const defaultOrders = [
  {
    staffName: "Mrs. Kipp",
    items: ["Coke", "Oreos", "Ruffles"]
  },
  {
    staffName: "Mr. Kipp",
    items: ["Diet Coke", "Nutter Butter", "Doritos"]
  }
];

// ----- STATE -----
let orders = [];
let currentOrderIndex = null;
let inventory = {};   // <-- NEW: holds weekly counts per itemName

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

// NEW inventory elements
const inventoryToggle = document.getElementById("inventoryToggle");
const inventoryView = document.getElementById("inventoryView");
const inventoryList = document.getElementById("inventoryList");

const confettiContainer = document.getElementById("confettiContainer");
const completedBanner = document.getElementById("completedBanner");
const dingSound = document.getElementById("dingSound");

// ----- INIT -----
init();

function init() {
  loadOrders();
  loadInventory();    // <-- NEW
  preloadImages();
  renderStaffList();
  setupHandlers();
}

// ----- LOCAL STORAGE (ORDERS) -----
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

  // fallback default
  orders = defaultOrders.map(o => ({
    staffName: o.staffName,
    items: o.items,
    itemsCompleted: o.items.map(() => false),
    isCompleted: false
  }));
  saveOrders();
}

function saveOrders() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn("Could not save orders to localStorage:", e);
  }
}

// ----- LOCAL STORAGE (INVENTORY) -----
function loadInventory() {
  const saved = localStorage.getItem(INVENTORY_KEY);
  if (saved) {
    try {
      inventory = JSON.parse(saved);
      return;
    } catch (e) {
      console.error("Failed to parse inventory, starting fresh", e);
    }
  }
  inventory = {};
}

function saveInventory() {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.warn("Could not save inventory to localStorage:", e);
  }
}

// Increment inventory usage for a given item (A2 behavior: only when it becomes selected)
function incrementInventory(itemName) {
  const key = itemName.trim();
  if (!key) return;
  inventory[key] = (inventory[key] || 0) + 1;
  saveInventory();
}

// Render the inventory view (auto-detected snack list)
function renderInventoryView() {
  inventoryList.innerHTML = "";

  const entries = Object.entries(inventory).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (!entries.length) {
    const msg = document.createElement("div");
    msg.textContent = "No usage recorded yet.";
    inventoryList.appendChild(msg);
    return;
  }

  entries.forEach(([itemName, count]) => {
    const row = document.createElement("div");
    row.className = "inventory-row";

    const nameEl = document.createElement("div");
    nameEl.className = "inventory-item-name";
    nameEl.textContent = itemName;

    const countEl = document.createElement("div");
    countEl.className = "inventory-item-count";
    countEl.textContent = count;

    row.appendChild(nameEl);
    row.appendChild(countEl);

    inventoryList.appendChild(row);
  });
}

// ----- IMAGE PRELOAD (WebP) -----
function preloadImages() {
  const loaded = new Set();

  orders.forEach(order => {
    order.items.forEach(item => {
      const keyName = item.trim();
      const mapped = IMAGE_MAP[keyName];
      let filename;

      if (mapped) {
        filename = mapped;
      } else {
        filename = keyName.toLowerCase().replace(/\s+/g, "") + ".webp";
      }

      if (!loaded.has(filename)) {
        loaded.add(filename);
        const img = new Image();
        img.src = `images/${filename}`;
      }
    });
  });
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

    const keyName = itemName.trim();
    const mapped = IMAGE_MAP[keyName];

    let filename;
    if (mapped) {
      filename = mapped;
    } else {
      filename = keyName.toLowerCase().replace(/\s+/g, "") + ".webp";
    }

    img.src = `images/${filename}`;
    img.alt = itemName;
    img.loading = "lazy";

    const label = document.createElement("div");
    label.className = "item-name";
    label.textContent = itemName;

    tile.appendChild(img);
    tile.appendChild(label);

    tile.addEventListener("click", () => {
      const wasSelected = order.itemsCompleted[idx];  // A2: check BEFORE toggle
      order.itemsCompleted[idx] = !order.itemsCompleted[idx];

      // If it just became selected, count it in inventory
      if (!wasSelected && order.itemsCompleted[idx]) {
        incrementInventory(itemName);
      }

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
      if (!confirm("Reset all orders AND inventory?")) return;
      // Reset orders
      localStorage.removeItem(STORAGE_KEY);
      loadOrders();
      // Reset inventory
      localStorage.removeItem(INVENTORY_KEY);
      loadInventory();
      // UI updates
      preloadImages();
      renderStaffList();
      if (inventoryView && !inventoryView.classList.contains("hidden")) {
        renderInventoryView();
      }
      orderDetailView.classList.add("hidden");
      staffListView.classList.remove("hidden");
      csvInput.value = "";
    });
  });

  if (inventoryToggle) {
    inventoryToggle.addEventListener("click", () => {
      if (inventoryView.classList.contains("hidden")) {
        renderInventoryView();
        inventoryView.classList.remove("hidden");
        inventoryToggle.textContent = "Hide Weekly Inventory";
      } else {
        inventoryView.classList.add("hidden");
        inventoryToggle.textContent = "Show Weekly Inventory";
      }
    });
  }

  csvInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    requireTeacherPin(() => {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target.result;
        const parsed = parseCsvToOrders(text);
        if (!parsed.length) {
          alert("No valid rows found in CSV. Make sure there is a 'Name' column and item columns after it.");
          return;
        }
        orders = parsed;
        saveOrders();
        preloadImages();
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
// Supports header with "Name" or "Staff" in ANY column; items follow after.
function parseCsvToOrders(text) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (!lines.length) return [];

  let headerRowIndex = null;
  let nameColIndex = null;

  // Find header row and "Name"/"Staff" column
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(",").map(x => x.trim());
    const lower = cols.map(c => c.toLowerCase());

    const idx = lower.findIndex(c => c === "name" || c === "staff");
    if (idx !== -1) {
      headerRowIndex = i;
      nameColIndex = idx;
      break;
    }
  }

  if (headerRowIndex === null || nameColIndex === null) {
    alert("CSV must contain a header row with a column named 'Name'.");
    return [];
  }

  const result = [];

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(x => x.trim());
    const staffName = cols[nameColIndex] || "";
    if (!staffName) continue;

    const items = cols.slice(nameColIndex + 1).filter(Boolean);
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
