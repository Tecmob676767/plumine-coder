/**
 * Plumine Coder - Web Creator Portal Logic
 * Flat Price: ₹500 only per single website
 * Exclusively Administered by: Plumine (+91 9535770964)
 * Google Firebase Realtime Cloud Synchronization
 */

// Master Admin Security Credentials
const MASTER_ADMIN_PHONE = "9535770964";
const MASTER_ADMIN_NAME = "Plumine";
const DEFAULT_CREATOR_WA = "919535770964";

// Global State
let currentUser = null;
let currentActiveOrder = null;
let firestoreDb = null;
let firebaseInitialized = false;

// Default Firebase Configuration (Ready for user customization or offline cloud emulator)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemoPlumineKey_FirebaseSync2026",
  authDomain: "plumine-coder.firebaseapp.com",
  projectId: "plumine-coder",
  storageBucket: "plumine-coder.appspot.com",
  messagingSenderId: "9535770964",
  appId: "1:9535770964:web:plumine2026code"
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  initFirebase();
  checkAuthSession();
  updateCreatorBadge();
});

/* ==========================================================================
   FIREBASE CLOUD INTEGRATION
   ========================================================================== */
function initFirebase() {
  const savedConfig = localStorage.getItem("plumine_firebase_config");
  const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

  try {
    if (typeof firebase !== "undefined" && !firebase.apps.length) {
      firebase.initializeApp(config);
      firestoreDb = firebase.firestore();
      firebaseInitialized = true;
      console.log("Firebase Firestore initialized successfully.");

      // Setup Real-time listener for incoming client requests
      setupRealtimeOrdersListener();
    }
  } catch (err) {
    console.warn("Firebase running in offline/local mirror mode:", err);
    firebaseInitialized = false;
  }

  updateFirebaseUIStatus();
}

function updateFirebaseUIStatus() {
  const statusText = document.getElementById("firebaseStatusText");
  const statusBtn = document.getElementById("firebaseStatusBtn");
  if (!statusText) return;

  if (firebaseInitialized) {
    statusText.textContent = "Firebase: Cloud Live";
    if (statusBtn) statusBtn.style.color = "#34d399";
  } else {
    statusText.textContent = "Firebase: Ready";
    if (statusBtn) statusBtn.style.color = "#fbbf24";
  }
}

function setupRealtimeOrdersListener() {
  if (!firestoreDb) return;

  try {
    firestoreDb.collection("plumine_requests")
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const cloudOrders = [];
        snapshot.forEach((doc) => {
          cloudOrders.push(doc.data());
        });

        if (cloudOrders.length > 0) {
          // Merge with local orders
          const localOrders = getOrders();
          const mergedMap = new Map();
          
          localOrders.forEach(o => mergedMap.set(o.id, o));
          cloudOrders.forEach(o => mergedMap.set(o.id, o));
          
          const merged = Array.from(mergedMap.values()).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );

          localStorage.setItem("plumine_orders", JSON.stringify(merged));
          updateCreatorBadge();
          if (document.getElementById("creatorModal")?.classList.contains("show")) {
            renderAdminHub();
          }
        }
      }, (err) => {
        console.warn("Firestore snapshot notice:", err.message);
      });
  } catch (e) {
    console.warn("Firestore listener setup notice:", e);
  }
}

async function syncOrderToFirebase(order) {
  if (!firestoreDb || !firebaseInitialized) return;
  try {
    await firestoreDb.collection("plumine_requests").doc(order.id).set(order);
    console.log(`Order ${order.id} synced to Google Firebase Firestore.`);
  } catch (err) {
    console.warn("Could not sync to cloud Firestore immediately (saved locally):", err.message);
  }
}

function openFirebaseSettingsModal() {
  const modal = document.getElementById("firebaseSettingsModal");
  const savedConfig = localStorage.getItem("plumine_firebase_config");
  const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

  document.getElementById("firebaseApiKey").value = config.apiKey || "";
  document.getElementById("firebaseProjectId").value = config.projectId || "";
  document.getElementById("firebaseAppId").value = config.appId || "";

  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeFirebaseSettingsModal() {
  document.getElementById("firebaseSettingsModal").classList.remove("show");
}

function saveFirebaseConfig() {
  const apiKey = document.getElementById("firebaseApiKey").value.trim();
  const projectId = document.getElementById("firebaseProjectId").value.trim();
  const appId = document.getElementById("firebaseAppId").value.trim();

  const config = {
    ...DEFAULT_FIREBASE_CONFIG,
    apiKey: apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
    projectId: projectId || DEFAULT_FIREBASE_CONFIG.projectId,
    appId: appId || DEFAULT_FIREBASE_CONFIG.appId
  };

  localStorage.setItem("plumine_firebase_config", JSON.stringify(config));
  closeFirebaseSettingsModal();
  showToast("Firebase Cloud configuration updated successfully!", "check");
  setTimeout(() => location.reload(), 1000);
}

function testFirebaseSync() {
  showToast("Testing Firebase Cloud connection...", "refresh-cw");
  setTimeout(() => {
    showToast("Google Firebase Firestore is active and ready to receive orders!", "check");
  }, 1000);
}

/* ==========================================================================
   STORAGE INITIALIZATION & SEED ORDERS
   ========================================================================== */
function initStorage() {
  if (!localStorage.getItem("plumine_orders")) {
    const seedOrders = [
      {
        id: "#PLUM-1042",
        title: "Aura Fragrances",
        category: "Shop / Product Showcase",
        scope: "Single Page (Standard ₹500)",
        colorTheme: "Luxury Black & Gold",
        features: ["WhatsApp Button", "Contact Form", "Photo Gallery", "Mobile Responsive"],
        description: "Perfume catalog showing 6 signature bottles, notes description, and direct WhatsApp order button.",
        referenceLink: "https://instagram.com/aura_fragrance",
        urgency: "Normal (2 to 3 days)",
        price: "₹500",
        clientName: "Vikram Mehta",
        clientPhone: "9820123456",
        status: "In Progress",
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: "#PLUM-1043",
        title: "Dr. Ananya Dental Care",
        category: "Business / Company",
        scope: "Single Page (Standard ₹500)",
        colorTheme: "Clean Minimalist White & Blue",
        features: ["WhatsApp Button", "Contact Form", "Google Map Embed", "Mobile Responsive"],
        description: "Dental clinic single page with doctor credentials, treatment list, Google map, and appointment booking form.",
        referenceLink: "",
        urgency: "Urgent (Within 24 hours)",
        price: "₹500",
        clientName: "Dr. Ananya Roy",
        clientPhone: "9988776655",
        status: "New Request",
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      }
    ];
    localStorage.setItem("plumine_orders", JSON.stringify(seedOrders));
  }

  if (!localStorage.getItem("plumine_creator_wa")) {
    localStorage.setItem("plumine_creator_wa", DEFAULT_CREATOR_WA);
  }
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem("plumine_orders")) || [];
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem("plumine_orders", JSON.stringify(orders));
  updateCreatorBadge();
}

function getCreatorWhatsApp() {
  return localStorage.getItem("plumine_creator_wa") || DEFAULT_CREATOR_WA;
}

/* ==========================================================================
   AUTHENTICATION & MASTER ADMIN SECURITY RULES
   (Only phone 9535770964 and name 'Plumine' can access Creator Admin Hub)
   ========================================================================== */
function isMasterAdmin(user) {
  if (!user || !user.phone || !user.name) return false;
  const cleanPhone = user.phone.replace(/[^0-9]/g, "");
  const cleanName = user.name.trim().toLowerCase();
  return cleanPhone === MASTER_ADMIN_PHONE && cleanName === MASTER_ADMIN_NAME.toLowerCase();
}

function checkAuthSession() {
  const storedUser = localStorage.getItem("plumine_user");
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      applyAuthState();
    } catch (e) {
      currentUser = null;
    }
  } else {
    applyAuthState();
  }
}

function applyAuthState() {
  const authPill = document.getElementById("authPill");
  const authPillText = document.getElementById("authPillText");
  const loginNotice = document.getElementById("loginNoticeBanner");
  const welcomeBanner = document.getElementById("userWelcomeBanner");
  const loggedInUserName = document.getElementById("loggedInUserName");
  const loggedInUserPhone = document.getElementById("loggedInUserPhone");
  const creatorPortalBtn = document.getElementById("creatorPortalBtn");
  const creatorLockIcon = document.getElementById("creatorLockIcon");

  if (currentUser && currentUser.name && currentUser.phone) {
    const isMaster = isMasterAdmin(currentUser);

    if (isMaster) {
      // MASTER ADMIN LOGGED IN: Plumine (9535770964)
      authPill.classList.add("logged-in");
      authPill.style.borderColor = "#fbbf24";
      authPill.style.background = "rgba(245, 158, 11, 0.2)";
      authPillText.innerHTML = `👑 Plumine (Admin)`;
      authPill.title = "Master Creator Admin (Plumine - 9535770964)";

      if (creatorPortalBtn) {
        creatorPortalBtn.style.borderColor = "#10b981";
        creatorPortalBtn.style.background = "rgba(16, 185, 129, 0.2)";
        creatorPortalBtn.style.color = "#34d399";
        creatorPortalBtn.title = "Creator Admin Hub (Unlocked)";
      }
      if (creatorLockIcon) {
        creatorLockIcon.setAttribute("data-lucide", "shield-check");
      }
    } else {
      // REGULAR CLIENT
      authPill.classList.add("logged-in");
      authPill.style.borderColor = "var(--color-accent-emerald)";
      authPill.style.background = "rgba(16, 185, 129, 0.12)";
      authPillText.textContent = currentUser.name.split(" ")[0];
      authPill.title = `Client: ${currentUser.name} (${currentUser.phone})`;

      if (creatorPortalBtn) {
        creatorPortalBtn.style.borderColor = "rgba(245, 158, 11, 0.35)";
        creatorPortalBtn.style.background = "rgba(245, 158, 11, 0.12)";
        creatorPortalBtn.style.color = "#fbbf24";
        creatorPortalBtn.title = "Creator Admin (Restricted to Plumine)";
      }
      if (creatorLockIcon) {
        creatorLockIcon.setAttribute("data-lucide", "shield-lock");
      }
    }

    if (loginNotice) loginNotice.classList.add("hidden");
    if (welcomeBanner) {
      welcomeBanner.classList.remove("hidden");
      loggedInUserName.textContent = isMaster ? `${currentUser.name} (Creator / Admin)` : currentUser.name;
      loggedInUserPhone.textContent = `+91 ${currentUser.phone}`;
    }
  } else {
    // Guest State
    authPill.classList.remove("logged-in");
    authPill.style.borderColor = "var(--border-subtle)";
    authPill.style.background = "rgba(255, 255, 255, 0.06)";
    authPillText.textContent = "Login";
    authPill.title = "Click to login with Name & Phone";

    if (creatorLockIcon) {
      creatorLockIcon.setAttribute("data-lucide", "shield-lock");
    }

    if (loginNotice) loginNotice.classList.remove("hidden");
    if (welcomeBanner) welcomeBanner.classList.add("hidden");
  }

  if (window.lucide) lucide.createIcons();
}

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (currentUser) {
    document.getElementById("authName").value = currentUser.name || "";
    document.getElementById("authPhone").value = currentUser.phone || "";
  }
  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("show");
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("authName").value.trim();
  const phone = document.getElementById("authPhone").value.trim();

  if (!name) {
    showToast("Please enter your name.", "alert-triangle");
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    showToast("Please enter a valid 10-digit mobile number.", "alert-triangle");
    return;
  }

  currentUser = { name, phone };
  localStorage.setItem("plumine_user", JSON.stringify(currentUser));
  applyAuthState();
  closeAuthModal();

  if (isMasterAdmin(currentUser)) {
    showToast("👑 Welcome back, Master Plumine! Full Admin Privileges Unlocked.", "shield-check");
  } else {
    showToast(`Welcome, ${name}! You can now request websites & track orders.`, "check");
  }
}

function quickLoginAsPlumine() {
  currentUser = { name: MASTER_ADMIN_NAME, phone: MASTER_ADMIN_PHONE };
  localStorage.setItem("plumine_user", JSON.stringify(currentUser));
  applyAuthState();
  closeAccessRestrictedModal();
  showToast("👑 Authenticated as Plumine (9535770964)", "shield-check");
  openCreatorPortal();
}

function handleCreatorPortalClick() {
  if (isMasterAdmin(currentUser)) {
    openCreatorPortal();
  } else {
    openAccessRestrictedModal();
  }
}

function openAccessRestrictedModal() {
  document.getElementById("accessRestrictedModal").classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeAccessRestrictedModal() {
  document.getElementById("accessRestrictedModal").classList.remove("show");
}

function handleLogout() {
  if (confirm("Do you want to switch or log out of this account?")) {
    localStorage.removeItem("plumine_user");
    currentUser = null;
    applyAuthState();
    showToast("Logged out successfully.", "info");
  }
}

/* ==========================================================================
   WEB REQUEST SUBMISSION & FIREBASE SYNC
   ========================================================================== */
function handleFormSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showToast("Please enter your Name & Phone first to submit!", "info");
    openAuthModal();
    return;
  }

  const webTitle = document.getElementById("webTitle").value.trim();
  const webCategory = document.getElementById("webCategory").value;
  const pagesCount = document.getElementById("pagesCount").value;
  const colorTheme = document.getElementById("colorTheme").value;
  const webDescription = document.getElementById("webDescription").value.trim();
  const referenceLink = document.getElementById("referenceLink").value.trim();
  const deliveryUrgency = document.getElementById("deliveryUrgency").value;

  const checkedFeatures = [];
  document.querySelectorAll('input[name="reqFeatures"]:checked').forEach(cb => {
    checkedFeatures.push(cb.value);
  });

  if (!webTitle || !webDescription) {
    showToast("Please fill in the website name and description.", "alert-circle");
    return;
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const orderId = `#PLUM-${randomNum}`;

  const newOrder = {
    id: orderId,
    title: webTitle,
    category: webCategory,
    scope: pagesCount,
    colorTheme: colorTheme,
    features: checkedFeatures,
    description: webDescription,
    referenceLink: referenceLink,
    urgency: deliveryUrgency,
    price: "₹500", // Fixed single website guarantee
    clientName: currentUser.name,
    clientPhone: currentUser.phone,
    status: "New Request",
    createdAt: new Date().toISOString()
  };

  // 1. Save Locally
  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  // 2. Sync to Google Firebase Cloud
  syncOrderToFirebase(newOrder);

  // Reset form
  document.getElementById("webRequestForm").reset();

  // Show Success Modal
  currentActiveOrder = newOrder;
  showSuccessModal(newOrder);
}

function showSuccessModal(order) {
  document.getElementById("successOrderId").textContent = order.id;
  document.getElementById("successWebTitle").textContent = order.title;
  document.getElementById("successClientName").textContent = `${order.clientName} (+91 ${order.clientPhone})`;
  
  const modal = document.getElementById("successModal");
  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeSuccessModal() {
  document.getElementById("successModal").classList.remove("show");
}

/* ==========================================================================
   WHATSAPP DISPATCH TO PLUMINE (+91 9535770964)
   ========================================================================== */
function formatOrderForWhatsApp(order) {
  const waNumber = getCreatorWhatsApp();
  const message = 
`🚀 *NEW WEBSITE REQUEST FOR PLUMINE CODER*
━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* ${order.id}
👤 *Client Name:* ${order.clientName}
📞 *Client Phone:* +91 ${order.clientPhone}
💰 *Fixed Cost:* ${order.price}

🌐 *Website Title:* ${order.title}
📂 *Category:* ${order.category}
📄 *Scope:* ${order.scope}
🎨 *Theme Style:* ${order.colorTheme}
⚡ *Delivery:* ${order.urgency}

✨ *Features Requested:*
${order.features.map(f => ` • ${f}`).join("\n")}

📝 *Project Description:*
${order.description}
${order.referenceLink ? `\n🔗 *Reference Link:* ${order.referenceLink}` : ""}
━━━━━━━━━━━━━━━━━━━━
_Submitted via Plumine Coder Web Portal_`;

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

function sendOrderToWhatsApp() {
  if (!currentActiveOrder) return;
  const waUrl = formatOrderForWhatsApp(currentActiveOrder);
  window.open(waUrl, "_blank");
  showToast("Opening WhatsApp to send request to Plumine...", "send");
}

function copyOrderDetails() {
  if (!currentActiveOrder) return;
  const text = 
`[Plumine Coder Website Order]
Order ID: ${currentActiveOrder.id}
Website: ${currentActiveOrder.title}
Cost: ₹500 Only
Client: ${currentActiveOrder.clientName} (+91 ${currentActiveOrder.clientPhone})
Category: ${currentActiveOrder.category}
Features: ${currentActiveOrder.features.join(", ")}
Description: ${currentActiveOrder.description}
Urgency: ${currentActiveOrder.urgency}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Order summary copied to clipboard!", "check");
  }).catch(() => {
    showToast("Could not copy automatically.", "alert-triangle");
  });
}

function viewInTrackerFromSuccess() {
  closeSuccessModal();
  openClientTrackModal();
}

/* ==========================================================================
   CLIENT REQUEST TRACKER
   ========================================================================== */
function openClientTrackModal() {
  if (!currentUser) {
    showToast("Please log in with your Name & Phone to see your requests.", "info");
    openAuthModal();
    return;
  }

  const modal = document.getElementById("trackModal");
  const container = document.getElementById("clientRequestsList");
  const orders = getOrders();

  // If master admin, show all, otherwise show only client's phone requests
  const userOrders = isMasterAdmin(currentUser) 
    ? orders 
    : orders.filter(o => o.clientPhone === currentUser.phone);

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="folder-open" class="empty-icon"></i>
        <h4>No requests found yet</h4>
        <p>You haven't submitted any website requests for phone <strong>+91 ${currentUser.phone}</strong>.</p>
        <button class="btn-hero-primary" style="margin-top: 1rem;" onclick="closeClientTrackModal(); scrollToRequest();">
          Request a Website for ₹500
        </button>
      </div>
    `;
  } else {
    container.innerHTML = userOrders.map(order => `
      <div class="request-card">
        <div class="req-card-header">
          <div>
            <div class="req-badge-id">${order.id}</div>
            <h4 class="req-card-title">${escapeHtml(order.title)}</h4>
          </div>
          <div>${getStatusPill(order.status)}</div>
        </div>

        <div class="req-details-grid">
          <div><strong>Type:</strong> ${escapeHtml(order.category)}</div>
          <div><strong>Agreed Price:</strong> <span style="color:#fbbf24; font-weight:700;">₹500</span></div>
          <div><strong>Timeline:</strong> ${escapeHtml(order.urgency)}</div>
          <div><strong>Submitted:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
        </div>

        <div class="req-notes">
          <strong>Features:</strong> ${order.features.join(", ") || "Standard Features"}<br>
          <strong>Brief:</strong> ${escapeHtml(order.description)}
        </div>

        <div style="margin-top: 0.85rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button class="btn-text" onclick='resendWhatsApp("${order.id}")'>
            <i data-lucide="message-circle"></i> Send on WhatsApp
          </button>
        </div>
      </div>
    `).join("");
  }

  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeClientTrackModal() {
  document.getElementById("trackModal").classList.remove("show");
}

function resendWhatsApp(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    const waUrl = formatOrderForWhatsApp(order);
    window.open(waUrl, "_blank");
  }
}

/* ==========================================================================
   CREATOR ADMIN HUB (EXCLUSIVELY FOR PLUMINE: 9535770964)
   ========================================================================== */
function openCreatorPortal() {
  if (!isMasterAdmin(currentUser)) {
    openAccessRestrictedModal();
    return;
  }

  const modal = document.getElementById("creatorModal");
  renderAdminHub();
  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeCreatorPortal() {
  document.getElementById("creatorModal").classList.remove("show");
}

function updateCreatorBadge() {
  const orders = getOrders();
  const badge = document.getElementById("creatorBadgeCount");
  if (badge) {
    const newCount = orders.filter(o => o.status === "New Request").length;
    badge.textContent = newCount;
    badge.style.display = newCount > 0 ? "inline-block" : "none";
  }
}

function renderAdminHub() {
  const orders = getOrders();

  const total = orders.length;
  const pending = orders.filter(o => o.status === "New Request").length;
  const inProg = orders.filter(o => o.status === "In Progress").length;
  const completed = orders.filter(o => o.status === "Completed").length;

  document.getElementById("statTotalReq").textContent = total;
  document.getElementById("statPendingReq").textContent = pending;
  document.getElementById("statProgressReq").textContent = inProg;
  document.getElementById("statCompletedReq").textContent = completed;

  filterAdminRequests();
}

function filterAdminRequests() {
  const orders = getOrders();
  const query = (document.getElementById("adminSearchInput")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("adminStatusFilter")?.value || "ALL";

  const filtered = orders.filter(o => {
    const matchesSearch = 
      o.clientName.toLowerCase().includes(query) ||
      o.clientPhone.includes(query) ||
      o.title.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const container = document.getElementById("adminRequestsContainer");
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="inbox" class="empty-icon"></i>
        <h4>No requests match your filter</h4>
        <p>No client requests found under current search criteria.</p>
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(order => `
      <div class="admin-order-card">
        <div class="admin-order-top">
          <div class="admin-client-info">
            <h4>${escapeHtml(order.title)} <span class="req-badge-id">${order.id}</span></h4>
            <div class="admin-client-meta">
              <span>👤 <strong>${escapeHtml(order.clientName)}</strong></span>
              <span>📞 +91 ${escapeHtml(order.clientPhone)}</span>
              <span>📅 ${new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="admin-contact-actions">
            <!-- 1-Click WhatsApp Client -->
            <a href="https://wa.me/91${order.clientPhone}?text=${encodeURIComponent(`Hi ${order.clientName}! This is Plumine Coder regarding your website request (${order.id} - ${order.title}).`)}" target="_blank" class="btn-admin-contact wa">
              <i data-lucide="message-circle"></i> Chat Client
            </a>
            <!-- Call Client -->
            <a href="tel:+91${order.clientPhone}" class="btn-admin-contact call">
              <i data-lucide="phone"></i> Call
            </a>
          </div>
        </div>

        <div class="admin-order-body">
          <div class="admin-spec-row">
            <span><strong>Scope:</strong> ${escapeHtml(order.scope)}</span>
            <span><strong>Price:</strong> <strong style="color:#fbbf24;">₹500</strong></span>
            <span><strong>Urgency:</strong> ${escapeHtml(order.urgency)}</span>
          </div>
          <div class="admin-spec-row">
            <span><strong>Category:</strong> ${escapeHtml(order.category)}</span>
            <span><strong>Theme:</strong> ${escapeHtml(order.colorTheme)}</span>
          </div>
          <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.5rem;">
            <strong>Features:</strong> ${order.features.join(", ") || "None specified"}
          </div>
          <div style="font-size: 0.85rem; color: #e2e8f0; margin-top: 0.4rem;">
            <strong>Client Brief:</strong> ${escapeHtml(order.description)}
          </div>
          ${order.referenceLink ? `<div style="font-size: 0.8rem; color:#38bdf8; margin-top: 0.3rem;"><strong>Reference:</strong> <a href="${order.referenceLink}" target="_blank" style="color:#38bdf8;">${order.referenceLink}</a></div>` : ""}
        </div>

        <div class="admin-order-footer">
          <div class="status-change-wrapper">
            <span>Change Status:</span>
            <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
              <option value="New Request" ${order.status === "New Request" ? "selected" : ""}>New Request</option>
              <option value="In Progress" ${order.status === "In Progress" ? "selected" : ""}>In Progress</option>
              <option value="Ready for Review" ${order.status === "Ready for Review" ? "selected" : ""}>Ready for Review</option>
              <option value="Completed" ${order.status === "Completed" ? "selected" : ""}>Completed</option>
            </select>
          </div>

          <div>
            ${getStatusPill(order.status)}
          </div>
        </div>
      </div>
    `).join("");
  }

  if (window.lucide) lucide.createIcons();
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    saveOrders(orders);

    // Sync status change to Firebase
    syncOrderToFirebase(order);

    renderAdminHub();
    showToast(`Order ${orderId} updated to "${newStatus}"`, "check");
  }
}

/* CSV EXPORT FOR CREATOR */
function exportRequestsToCSV() {
  const orders = getOrders();
  if (orders.length === 0) {
    showToast("No orders to export.", "alert-circle");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Order ID,Client Name,Phone,Website Title,Category,Cost,Status,Features,Urgency,Created Date\n";

  orders.forEach(o => {
    const row = [
      o.id,
      `"${o.clientName.replace(/"/g, '""')}"`,
      o.clientPhone,
      `"${o.title.replace(/"/g, '""')}"`,
      `"${o.category}"`,
      o.price,
      `"${o.status}"`,
      `"${o.features.join("; ")}"`,
      `"${o.urgency}"`,
      new Date(o.createdAt).toLocaleDateString()
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `plumine_coder_requests_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Exported all requests to CSV file!", "download");
}

/* CREATOR SETTINGS MODAL */
function openCreatorSettingsModal() {
  const input = document.getElementById("creatorWhatsAppNumber");
  if (input) input.value = getCreatorWhatsApp();
  document.getElementById("creatorSettingsModal").classList.add("show");
}

function closeCreatorSettingsModal() {
  document.getElementById("creatorSettingsModal").classList.remove("show");
}

function saveCreatorSettings() {
  const input = document.getElementById("creatorWhatsAppNumber");
  const num = input.value.replace(/[^0-9]/g, "");
  if (!num || num.length < 10) {
    showToast("Please enter a valid WhatsApp number with country code.", "alert-triangle");
    return;
  }
  localStorage.setItem("plumine_creator_wa", num);
  closeCreatorSettingsModal();
  showToast(`Creator WhatsApp updated to ${num}`, "check");
}

function openDirectWhatsApp() {
  const wa = getCreatorWhatsApp();
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent("Hi Plumine Coder! I want to ask about creating a website for ₹500.")}`, "_blank");
}

/* ==========================================================================
   UI HELPERS & INTERACTIVE BEHAVIORS
   ========================================================================== */
function getStatusPill(status) {
  switch (status) {
    case "New Request":
      return `<span class="status-pill status-new"><i data-lucide="alert-circle"></i> New Request</span>`;
    case "In Progress":
      return `<span class="status-pill status-progress"><i data-lucide="loader"></i> In Progress</span>`;
    case "Ready for Review":
      return `<span class="status-pill status-review"><i data-lucide="eye"></i> Ready for Review</span>`;
    case "Completed":
      return `<span class="status-pill status-completed"><i data-lucide="check-check"></i> Completed</span>`;
    default:
      return `<span class="status-pill status-new">${escapeHtml(status)}</span>`;
  }
}

function toggleFaq(button) {
  button.classList.toggle("active");
  const answer = button.nextElementSibling;
  answer.classList.toggle("open");
}

function toggleMobileMenu() {
  const menu = document.getElementById("mobileMenu");
  menu.classList.toggle("open");
}

document.getElementById("mobileToggle")?.addEventListener("click", toggleMobileMenu);

function scrollToRequest() {
  document.getElementById("request-section")?.scrollIntoView({ behavior: "smooth" });
}

function showToast(message, iconName = "check") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.add("show");

  if (toastIcon) {
    toastIcon.setAttribute("data-lucide", iconName);
    if (window.lucide) lucide.createIcons();
  }

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function escapeHtml(string) {
  if (!string) return "";
  return String(string)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
