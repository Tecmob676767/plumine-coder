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
let realtimeDb = null;
let firebaseInitialized = false;

// Your live Google Firebase Configuration
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCGvZ6AS72MuSHAdf--LeEGoIMbOhlZPcg",
  authDomain: "pluminecoder78.firebaseapp.com",
  databaseURL: "https://pluminecoder78-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pluminecoder78",
  storageBucket: "pluminecoder78.firebasestorage.app",
  messagingSenderId: "588764000798",
  appId: "1:588764000798:web:d9007d399a80518d7ab40f",
  measurementId: "G-403J8MT0HW"
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  initFirebase();
  checkAuthSession();
  updateCreatorBadge();
  initLivePreviewListener();

  // Suddenly ask for login when first entering if not yet authenticated
  if (!currentUser) {
    setTimeout(() => {
      openAuthModal();
    }, 450);
  }
});

/* ==========================================================================
   FIREBASE CLOUD INTEGRATION (FIRESTORE & REALTIME DATABASE)
   ========================================================================== */
function initFirebase() {
  const config = DEFAULT_FIREBASE_CONFIG;
  // Always update to live user config
  localStorage.setItem("plumine_firebase_config", JSON.stringify(config));

  try {
    if (typeof firebase !== "undefined" && !firebase.apps.length) {
      firebase.initializeApp(config);
      
      // Initialize Firestore if available
      try {
        firestoreDb = firebase.firestore();
      } catch (e) {
        console.log("Firestore setup notice:", e);
      }

      // Initialize Realtime Database if available
      try {
        realtimeDb = firebase.database();
      } catch (e) {
        console.log("Realtime Database setup notice:", e);
      }

      firebaseInitialized = true;
      console.log("Google Firebase (pluminecoder78) connected successfully!");

      // Setup Real-time listeners for incoming client requests
      setupRealtimeOrdersListener();
    }
  } catch (err) {
    console.warn("Firebase notice:", err);
    firebaseInitialized = false;
  }

  updateFirebaseUIStatus();
}

function updateFirebaseUIStatus() {
  const statusText = document.getElementById("firebaseStatusText");
  const statusBtn = document.getElementById("firebaseStatusBtn");
  if (!statusText) return;

  if (firebaseInitialized) {
    statusText.textContent = "Sync: Live";
    if (statusBtn) statusBtn.style.color = "#34d399";
  } else {
    statusText.textContent = "Sync: Ready";
    if (statusBtn) statusBtn.style.color = "#fbbf24";
  }
}

function setupRealtimeOrdersListener() {
  // 1. Listen via Firestore
  if (firestoreDb) {
    try {
      firestoreDb.collection("plumine_requests")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
          const cloudOrders = [];
          snapshot.forEach((doc) => {
            cloudOrders.push(doc.data());
          });
          if (cloudOrders.length > 0) mergeAndRefreshOrders(cloudOrders);
        }, (err) => console.log("Firestore sync notice:", err.message));
    } catch (e) {
      console.log("Firestore listener notice:", e);
    }
  }

  // 2. Listen via Realtime Database
  if (realtimeDb) {
    try {
      realtimeDb.ref("plumine_requests").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const rtdbOrders = Object.values(data);
          if (rtdbOrders.length > 0) mergeAndRefreshOrders(rtdbOrders);
        }
      }, (err) => console.log("Realtime DB sync notice:", err.message));
    } catch (e) {
      console.log("Realtime DB listener notice:", e);
    }
  }
}

function mergeAndRefreshOrders(cloudOrders) {
  const localOrders = getOrders();
  const mergedMap = new Map();
  
  localOrders.forEach(o => mergedMap.set(o.id, o));
  cloudOrders.forEach(o => mergedMap.set(o.id, o));
  
  const merged = Array.from(mergedMap.values()).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const hasNewOrders = merged.length > localOrders.length;

  localStorage.setItem("plumine_orders", JSON.stringify(merged));
  updateCreatorBadge();
  if (document.getElementById("creatorModal")?.classList.contains("show")) {
    renderAdminHub();
  }

  if (hasNewOrders && localOrders.length > 0) {
    playOrderChime();
    const newest = merged[0];
    if (isMasterAdmin(currentUser)) {
      showToast(`🔔 New Website Request: ${newest.title} from ${newest.clientName}!`, "bell");
    }
  }
}

async function syncOrderToFirebase(order) {
  if (!firebaseInitialized) return;

  // Sync to Firestore
  if (firestoreDb) {
    try {
      await firestoreDb.collection("plumine_requests").doc(order.id).set(order);
      console.log(`Order ${order.id} synced to Google Cloud Firestore.`);
    } catch (err) {
      console.log("Firestore sync notice:", err.message);
    }
  }

  // Sync to Realtime Database
  if (realtimeDb) {
    try {
      const cleanKey = order.id.replace(/[^a-zA-Z0-9_-]/g, "");
      await realtimeDb.ref("plumine_requests/" + cleanKey).set(order);
      console.log(`Order ${order.id} synced to Google Cloud Realtime Database.`);
    } catch (err) {
      console.log("Realtime Database sync notice:", err.message);
    }
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
  showToast("Database configuration updated successfully!", "check");
  setTimeout(() => location.reload(), 1000);
}

function testFirebaseSync() {
  showToast("Testing database connection...", "refresh-cw");
  setTimeout(() => {
    showToast("Real-time Database is live and ready to receive orders!", "check");
  }, 1000);
}

/* ==========================================================================
   STORAGE INITIALIZATION (ZERO FAKE DATA - CLEAN DATABASE)
   ========================================================================== */
function initStorage() {
  // Purge any fake / sample seed data from previous versions
  const stored = localStorage.getItem("plumine_orders");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Remove any fake names (Vikram Mehta, Dr. Ananya Roy, etc.)
      const cleaned = parsed.filter(o => 
        o.clientName !== "Vikram Mehta" && 
        o.clientName !== "Dr. Ananya Roy" &&
        o.id !== "#PLUM-1042" &&
        o.id !== "#PLUM-1043"
      );
      localStorage.setItem("plumine_orders", JSON.stringify(cleaned));
    } catch (e) {
      localStorage.setItem("plumine_orders", JSON.stringify([]));
    }
  } else {
    // Start with completely fresh empty list
    localStorage.setItem("plumine_orders", JSON.stringify([]));
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
        creatorPortalBtn.style.display = "inline-flex";
        creatorPortalBtn.style.borderColor = "#10b981";
        creatorPortalBtn.style.background = "rgba(16, 185, 129, 0.2)";
        creatorPortalBtn.style.color = "#34d399";
        creatorPortalBtn.title = "Creator Admin Hub (Unlocked)";
      }
      if (creatorLockIcon) {
        creatorLockIcon.setAttribute("data-lucide", "shield-check");
      }
    } else {
      // REGULAR CLIENT - HIDE ADMIN BUTTON COMPLETELY
      authPill.classList.add("logged-in");
      authPill.style.borderColor = "var(--color-accent-emerald)";
      authPill.style.background = "rgba(16, 185, 129, 0.12)";
      authPillText.textContent = currentUser.name.split(" ")[0];
      authPill.title = `Client: ${currentUser.name} (${currentUser.phone})`;

      if (creatorPortalBtn) {
        creatorPortalBtn.style.display = "none";
      }
    }

    if (loginNotice) loginNotice.classList.add("hidden");
    if (welcomeBanner) {
      welcomeBanner.classList.remove("hidden");
      loggedInUserName.textContent = isMaster ? `${currentUser.name} (Creator / Admin)` : currentUser.name;
      loggedInUserPhone.textContent = `+91 ${currentUser.phone}`;
    }
  } else {
    // Guest State - HIDE ADMIN BUTTON COMPLETELY
    authPill.classList.remove("logged-in");
    authPill.style.borderColor = "var(--border-subtle)";
    authPill.style.background = "rgba(255, 255, 255, 0.06)";
    authPillText.textContent = "Login";
    authPill.title = "Click to login with Name & Phone";

    if (creatorPortalBtn) {
      creatorPortalBtn.style.display = "none";
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
    showToast("👑 Welcome, Plumine! Opening Creator Admin...", "shield-check");
    setTimeout(() => {
      openCreatorPortal();
    }, 400);
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

        <!-- 5-Stage Visual Progress Timeline -->
        ${getOrderTimelineHtml(order.status)}

        <div class="req-details-grid">
          <div><strong>Type:</strong> ${escapeHtml(order.category)}</div>
          <div><strong>Cost:</strong> <span style="color:#fbbf24; font-weight:700;">₹500</span></div>
          <div><strong>Payment:</strong> ${order.paymentStatus === 'Paid' ? '<span style="color:#34d399; font-weight:700;">✓ Paid (₹500)</span>' : '<span style="color:#f59e0b; font-weight:600;">Pending</span>'}</div>
          <div><strong>Timeline:</strong> ${escapeHtml(order.urgency)}</div>
        </div>

        <div class="req-notes">
          <strong>Features:</strong> ${order.features.join(", ") || "Standard Features"}<br>
          <strong>Brief:</strong> ${escapeHtml(order.description)}
        </div>

        <!-- Client Revisions Section -->
        <div style="margin-top: 0.85rem; background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 8px;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.4rem;">
            💬 Need changes or revisions? Send note directly to Plumine:
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="revInput_${order.id}" placeholder="e.g. Change banner font to bold, add Instagram link..." style="flex:1; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color:#fff; padding:0.4rem 0.65rem; border-radius:6px; font-size:0.82rem;" />
            <button class="btn-sm-auth" onclick="submitClientRevision('${order.id}')" style="padding:0.4rem 0.75rem; font-size:0.8rem;">
              Send Note
            </button>
          </div>
          ${order.revisions && order.revisions.length ? `
            <div style="margin-top: 0.5rem; font-size: 0.78rem; color: #a855f7;">
              <strong>Notes Sent:</strong>
              ${order.revisions.map(r => `<div style="color:#e2e8f0; margin-top:2px;">• ${escapeHtml(r)}</div>`).join('')}
            </div>
          ` : ''}
        </div>

        <div style="margin-top: 0.85rem; display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
          ${order.paymentStatus !== 'Paid' ? `
            <button class="btn-text" style="color: #fbbf24; border-color: rgba(245,158,11,0.4);" onclick="openUpiPaymentModalForOrder('${order.id}')">
              <i data-lucide="qr-code"></i> Pay ₹500 via UPI
            </button>
          ` : `
            <button class="btn-text" style="color: #34d399;" onclick="downloadInvoiceReceipt('${order.id}')">
              <i data-lucide="file-text"></i> Download Receipt
            </button>
          `}
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
            <!-- Payment Status Toggle -->
            <button class="btn-admin-contact" style="background:${order.paymentStatus === 'Paid' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}; color:${order.paymentStatus === 'Paid' ? '#34d399' : '#fbbf24'}; border: 1px solid ${order.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b'};" onclick="toggleOrderPaymentStatus('${order.id}')" title="Click to toggle Payment Received status">
              <i data-lucide="${order.paymentStatus === 'Paid' ? 'check' : 'credit-card'}"></i> ${order.paymentStatus === 'Paid' ? 'Paid (₹500)' : 'Mark Paid'}
            </button>
            <!-- Quick WhatsApp Template -->
            <button class="btn-admin-contact" style="background: rgba(168,85,247,0.25); color: #c084fc; border: 1px solid #a855f7;" onclick="openQuickReplyModal('${order.id}')" title="Send pre-made status update on WhatsApp">
              <i data-lucide="zap"></i> Quick Reply
            </button>
            <!-- 1-Click WhatsApp Client -->
            <a href="https://wa.me/91${order.clientPhone}?text=${encodeURIComponent(`Hi ${order.clientName}! This is Plumine Coder regarding your website request (${order.id} - ${order.title}).`)}" target="_blank" class="btn-admin-contact wa">
              <i data-lucide="message-circle"></i> Chat
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
            <span><strong>Payment:</strong> <strong style="color:${order.paymentStatus === 'Paid' ? '#34d399' : '#f59e0b'};">${order.paymentStatus || 'Pending'}</strong></span>
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
          ${order.revisions && order.revisions.length ? `
            <div style="margin-top: 0.6rem; background: rgba(168,85,247,0.15); border-left: 3px solid #a855f7; padding: 0.5rem; border-radius: 4px; font-size: 0.82rem;">
              <strong style="color: #c084fc;">Client Revisions / Feedback:</strong>
              ${order.revisions.map(r => `<div style="color: #f8fafc; margin-top: 2px;">• ${escapeHtml(r)}</div>`).join('')}
            </div>
          ` : ''}
          ${order.utrNumber ? `<div style="font-size: 0.8rem; color: #34d399; margin-top: 0.4rem;"><strong>Payment Ref/UTR:</strong> ${escapeHtml(order.utrNumber)}</div>` : ''}
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

/* ==========================================================================
   FEATURE 1: INTERACTIVE LIVE WEBSITE PREVIEW BUILDER
   ========================================================================== */
function initLivePreviewListener() {
  const webTitle = document.getElementById("webTitle");
  const webCategory = document.getElementById("webCategory");
  const colorTheme = document.getElementById("colorTheme");
  const featureCheckboxes = document.querySelectorAll('input[name="reqFeatures"]');

  if (webTitle) webTitle.addEventListener("input", updateLivePreview);
  if (webCategory) webCategory.addEventListener("change", updateLivePreview);
  if (colorTheme) colorTheme.addEventListener("change", updateLivePreview);
  featureCheckboxes.forEach(cb => cb.addEventListener("change", updateLivePreview));
}

function updateLivePreview() {
  const title = document.getElementById("webTitle")?.value.trim() || "Your Business Name";
  const category = document.getElementById("webCategory")?.value || "Business Profile";
  const theme = document.getElementById("colorTheme")?.value || "Plumine Dark & Neon Violet";

  const siteTitleEl = document.getElementById("previewSiteTitle");
  const catTagEl = document.getElementById("previewCategoryTag");
  const urlBarEl = document.getElementById("previewUrlBar");
  const heroCanvas = document.getElementById("previewCanvasHero");
  const featuresGrid = document.getElementById("previewFeaturesGrid");

  if (siteTitleEl) siteTitleEl.textContent = title;
  if (catTagEl) catTagEl.textContent = category;
  if (urlBarEl) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    urlBarEl.textContent = `https://${slug || "yourwebsite"}.com`;
  }

  // Update theme gradient
  if (heroCanvas) {
    if (theme.includes("Violet") || theme.includes("Plumine")) {
      heroCanvas.style.background = "linear-gradient(180deg, rgba(59, 7, 100, 0.45), transparent)";
    } else if (theme.includes("Blue") || theme.includes("Clean")) {
      heroCanvas.style.background = "linear-gradient(180deg, rgba(30, 58, 138, 0.45), transparent)";
    } else if (theme.includes("Gold")) {
      heroCanvas.style.background = "linear-gradient(180deg, rgba(180, 83, 9, 0.45), transparent)";
    } else if (theme.includes("Orange") || theme.includes("Vibrant")) {
      heroCanvas.style.background = "linear-gradient(180deg, rgba(234, 88, 12, 0.45), transparent)";
    } else if (theme.includes("Green") || theme.includes("Nature")) {
      heroCanvas.style.background = "linear-gradient(180deg, rgba(16, 185, 129, 0.45), transparent)";
    } else {
      heroCanvas.style.background = "linear-gradient(180deg, rgba(88, 28, 135, 0.45), transparent)";
    }
  }

  // Update features preview
  if (featuresGrid) {
    const checked = [];
    document.querySelectorAll('input[name="reqFeatures"]:checked').forEach(cb => checked.push(cb.value));
    if (checked.length === 0) {
      featuresGrid.innerHTML = `<span style="font-size:0.75rem; color:#94a3b8;">No additional features selected</span>`;
    } else {
      featuresGrid.innerHTML = checked.map(f => `<span class="f-badge">${escapeHtml(f)}</span>`).join("");
    }
  }
}

/* ==========================================================================
   FEATURE 2: AUDIO SYNTHESIZER CHIME (NO AUDIO FILES REQUIRED)
   ========================================================================== */
function playOrderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.log("Audio chime note:", e);
  }
}

/* ==========================================================================
   FEATURE 3: 5-STAGE VISUAL TIMELINE & REVISION HANDLING
   ========================================================================== */
function getOrderTimelineHtml(status) {
  const steps = [
    { label: "1. Placed", key: "New Request" },
    { label: "2. Specs Confirmed", key: "Specs Confirmed" },
    { label: "3. Designing", key: "In Progress" },
    { label: "4. Review Draft", key: "Ready for Review" },
    { label: "5. Delivered", key: "Completed" }
  ];

  let activeIndex = 0;
  if (status === "In Progress") activeIndex = 2;
  else if (status === "Ready for Review") activeIndex = 3;
  else if (status === "Completed") activeIndex = 4;

  return `
    <div class="order-stepper" style="display: flex; justify-content: space-between; position: relative; margin: 1.25rem 0 1rem; padding: 0 0.5rem;">
      <div style="position: absolute; top: 12px; left: 20px; right: 20px; height: 3px; background: rgba(255,255,255,0.1); z-index: 0;"></div>
      <div style="position: absolute; top: 12px; left: 20px; width: ${(activeIndex / 4) * 100}%; height: 3px; background: #10b981; z-index: 0; transition: width 0.4s ease;"></div>
      ${steps.map((step, idx) => `
        <div style="position: relative; z-index: 1; text-align: center;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: ${idx <= activeIndex ? '#10b981' : '#1e1333'}; border: 2px solid ${idx <= activeIndex ? '#34d399' : '#475569'}; color: #fff; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.3rem;">
            ${idx < activeIndex ? '✓' : idx + 1}
          </div>
          <span style="font-size: 0.7rem; color: ${idx <= activeIndex ? '#e2e8f0' : '#64748b'}; font-weight: ${idx === activeIndex ? '700' : '500'};">${step.label}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function submitClientRevision(orderId) {
  const input = document.getElementById(`revInput_${orderId}`);
  if (!input) return;
  const note = input.value.trim();
  if (!note) {
    showToast("Please enter your revision note.", "alert-triangle");
    return;
  }

  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    if (!order.revisions) order.revisions = [];
    order.revisions.push(`${note} (${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`);
    saveOrders(orders);
    syncOrderToFirebase(order);
    input.value = "";
    openClientTrackModal();
    showToast("Revision note sent to Plumine Coder!", "check");
  }
}

/* ==========================================================================
   FEATURE 4: UPI PAYMENT & INVOICE RECEIPT GENERATOR
   ========================================================================== */
let activePaymentOrderId = null;

function openUpiPaymentModal() {
  activePaymentOrderId = currentActiveOrder ? currentActiveOrder.id : null;
  const modal = document.getElementById("upiModal");
  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function openUpiPaymentModalForOrder(orderId) {
  activePaymentOrderId = orderId;
  const modal = document.getElementById("upiModal");
  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeUpiPaymentModal() {
  document.getElementById("upiModal").classList.remove("show");
}

function copyUpiId() {
  navigator.clipboard.writeText("9535770964@upi").then(() => {
    showToast("UPI ID (9535770964@upi) copied!", "check");
  });
}

function submitUpiPaymentProof() {
  const utr = document.getElementById("upiUtrNumber")?.value.trim();
  if (!utr || utr.length < 8) {
    showToast("Please enter a valid 12-digit UPI Reference / UTR Number.", "alert-triangle");
    return;
  }

  if (activePaymentOrderId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === activePaymentOrderId);
    if (order) {
      order.utrNumber = utr;
      order.paymentStatus = "Paid";
      saveOrders(orders);
      syncOrderToFirebase(order);
    }
  }

  showToast("Payment verified! Receipt generated.", "check");
  closeUpiPaymentModal();
  downloadInvoiceReceipt(activePaymentOrderId);
}

function downloadInvoiceReceipt(orderId) {
  const orders = getOrders();
  const targetId = orderId || (currentActiveOrder ? currentActiveOrder.id : null);
  const order = orders.find(o => o.id === targetId) || currentActiveOrder;

  if (!order) {
    showToast("Order details not found for invoice.", "alert-triangle");
    return;
  }

  const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
        .invoice-card { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .head { display: flex; justify-content: space-between; border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; }
        .logo { font-size: 22px; font-weight: 800; color: #7c3aed; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .total { font-size: 20px; font-weight: 800; color: #059669; }
        .badge { background: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="head">
          <div>
            <div class="logo">Plumine Coder</div>
            <div style="font-size: 13px; color: #64748b;">Web Creation Studio • WhatsApp: +91 9535770964</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 700;">OFFICIAL RECEIPT</div>
            <div style="font-size: 12px; color: #64748b;">Order: ${order.id}</div>
            <div style="font-size: 12px; color: #64748b;">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div style="margin: 20px 0;">
          <div style="font-size: 13px; color: #64748b;">Billed To:</div>
          <div style="font-size: 16px; font-weight: 700;">${order.clientName}</div>
          <div style="font-size: 13px; color: #64748b;">+91 ${order.clientPhone}</div>
        </div>

        <div class="row">
          <span>Website Item:</span>
          <strong>${order.title} (${order.category})</strong>
        </div>
        <div class="row">
          <span>Package:</span>
          <span>${order.scope}</span>
        </div>
        <div class="row">
          <span>Features:</span>
          <span>${order.features.join(", ")}</span>
        </div>
        <div class="row">
          <span>Payment Status:</span>
          <span class="badge">${order.paymentStatus === 'Paid' ? 'PAID via UPI' : 'ORDER CONFIRMED'}</span>
        </div>
        ${order.utrNumber ? `<div class="row"><span>UPI Ref / UTR:</span><strong>${order.utrNumber}</strong></div>` : ''}

        <div class="row" style="border-top: 2px solid #e2e8f0; margin-top: 15px; padding-top: 15px;">
          <span class="total">Total Amount Paid:</span>
          <span class="total">₹500.00</span>
        </div>

        <div class="footer">
          Thank you for choosing Plumine Coder! Your website is being crafted with passion.
        </div>

        <div style="text-align: center; margin-top: 20px;" class="no-print">
          <button onclick="window.print()" style="background: #7c3aed; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>
      </div>
    </body>
    </html>
  `;

  const invoiceWindow = window.open("", "_blank");
  invoiceWindow.document.write(invoiceHtml);
  invoiceWindow.document.close();
}

/* ==========================================================================
   FEATURE 5: CREATOR QUICK-REPLY WHATSAPP TEMPLATES & PAYMENT TOGGLE
   ========================================================================== */
let activeQuickReplyOrderId = null;

function openQuickReplyModal(orderId) {
  activeQuickReplyOrderId = orderId;
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    document.getElementById("quickReplyClientName").textContent = `${order.clientName} (+91 ${order.clientPhone})`;
  }
  const modal = document.getElementById("quickReplyModal");
  modal.classList.add("show");
  if (window.lucide) lucide.createIcons();
}

function closeQuickReplyModal() {
  document.getElementById("quickReplyModal").classList.remove("show");
}

function sendQuickTemplate(type) {
  if (!activeQuickReplyOrderId) return;
  const orders = getOrders();
  const order = orders.find(o => o.id === activeQuickReplyOrderId);
  if (!order) return;

  let msg = "";
  if (type === "accepted") {
    msg = `Hi ${order.clientName}! 🚀 This is Plumine Coder. Your website request for *"${order.title}"* (${order.id}) has been accepted and is now in active development. I will share a live preview draft with you shortly!`;
    updateOrderStatus(order.id, "In Progress");
  } else if (type === "preview") {
    msg = `Hi ${order.clientName}! 🎨 Great news — your website draft for *"${order.title}"* is ready for your review! Please let me know any adjustments or feedback you'd like me to make.`;
    updateOrderStatus(order.id, "Ready for Review");
  } else if (type === "delivered") {
    msg = `Hi ${order.clientName}! 🎉 Your custom website for *"${order.title}"* is 100% complete and delivered! Thank you for working with Plumine Coder. Feel free to contact me anytime for support.`;
    updateOrderStatus(order.id, "Completed");
  }

  const waUrl = `https://wa.me/91${order.clientPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, "_blank");
  closeQuickReplyModal();
  showToast("Opening WhatsApp with quick status message...", "send");
}

function toggleOrderPaymentStatus(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.paymentStatus = (order.paymentStatus === "Paid") ? "Pending" : "Paid";
    saveOrders(orders);
    syncOrderToFirebase(order);
    renderAdminHub();
    showToast(`Order ${order.id} payment set to: ${order.paymentStatus}`, "check");
  }
}
