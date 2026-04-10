const vouchers = [
  {
    id: 0,
    title: "$20 gift card",
    merchant: "Amazon.sg",
    category: "shopping",
    tokens: 11300,
    validity: "11 Mar 2026 to 30 Sep 2026",
    accentA: "#14213d",
    accentB: "#2a5ea8",
    shortCode: "AZ",
    highlight:
      "Redeem your data tokens for an Amazon.sg gift card. This consumer flow mirrors the on-chain voucher catalogue, where users spend reward tokens to mint a voucher.",
    steps: [
      "Browse the catalogue and select a live voucher campaign.",
      "Review the token cost, available stock, and validity period.",
      "Tap Redeem to confirm the mock flow and simulate a token-based redemption."
    ],
    terms: [
      "Wireframe only. This button does not call the smart contracts.",
      "Real implementation should require sufficient token balance and prior spending approval.",
      "Voucher availability should reflect remaining campaign supply from VoucherRedemption."
    ],
    featured: true,
    owned: true
  },
  {
    id: 1,
    title: "$5 coffee bundle",
    merchant: "BrewLab",
    category: "food",
    tokens: 2900,
    validity: "01 Apr 2026 to 31 Aug 2026",
    accentA: "#ff8a3d",
    accentB: "#ff3d54",
    shortCode: "BL",
    highlight:
      "A lower-cost food reward that shows how smaller voucher campaigns can still feel premium inside the app.",
    steps: [
      "User enters the catalogue from the rewards home screen.",
      "The list can later be filtered by category, activity status, or popularity.",
      "The merchant eventually validates the voucher through the merchant-side redemption flow."
    ],
    terms: [
      "Mock voucher based on token cost and campaign logic from your contracts.",
      "A future functional screen can show max-per-user and remaining supply dynamically.",
      "Merchant verification is intentionally not connected here."
    ],
    featured: true,
    owned: true
  },
  {
    id: 2,
    title: "$12 supermarket voucher",
    merchant: "FreshMart",
    category: "shopping",
    tokens: 6800,
    validity: "09 Apr 2026 to 31 Dec 2026",
    accentA: "#21a66d",
    accentB: "#9dde4f",
    shortCode: "FM",
    highlight:
      "Designed for household-use rewards, this card keeps the familiar marketplace pattern from the reference images while replacing points with tokens.",
    steps: [
      "Catalogue cards emphasize merchant, reward value, and token requirement.",
      "Detail view focuses on trust, validity, and redemption steps.",
      "Sticky action keeps the redeem call-to-action visible near the bottom."
    ],
    terms: [
      "Ideal for shopping category demos.",
      "Visual inventory can be bound to your active voucher list later.",
      "Token language replaces GrabCoins across the interface."
    ],
    featured: false,
    owned: false
  },
  {
    id: 3,
    title: "$10 ride credit",
    merchant: "MetroGo",
    category: "transport",
    tokens: 5400,
    validity: "20 Apr 2026 to 30 Sep 2026",
    accentA: "#0a7485",
    accentB: "#49d2db",
    shortCode: "MG",
    highlight:
      "Transport rewards give the catalogue more range and help demonstrate how categories can scale once your backend is connected.",
    steps: [
      "Open a voucher from the category listing.",
      "Review the reward summary and token requirement.",
      "Redeem with an allowance and burn flow in the real app."
    ],
    terms: [
      "Transport category is included for wireframe breadth.",
      "Can later be mapped to a live merchant wallet address.",
      "Expiry copy is mock content for demo purposes."
    ],
    featured: true,
    owned: false
  },
  {
    id: 4,
    title: "$8 movie pass",
    merchant: "CineWave",
    category: "lifestyle",
    tokens: 4700,
    validity: "05 May 2026 to 30 Nov 2026",
    accentA: "#6b37ff",
    accentB: "#d76df6",
    shortCode: "CW",
    highlight:
      "Lifestyle cards add variety and make the home screen feel closer to a real consumer marketplace instead of an admin dashboard.",
    steps: [
      "Users discover the campaign in the catalogue.",
      "They redeem using accumulated reward tokens.",
      "The voucher is later visible under My Vouchers."
    ],
    terms: [
      "Static demo content only.",
      "Reward catalogue should eventually hide inactive or sold-out campaigns.",
      "This layout is ready to receive real contract data later."
    ],
    featured: false,
    owned: false
  }
];

const screens = [...document.querySelectorAll("[data-screen]")];
const phoneScreen = document.querySelector(".phone-screen");
const featuredRow = document.querySelector("#featured-row");
const voucherList = document.querySelector("#voucher-list");
const ownedList = document.querySelector("#owned-list");
const historyList = document.querySelector("#history-list");
const tokenHistoryTrigger = document.querySelector("#token-history-trigger");
const catalogueTitle = document.querySelector("#catalogue-title");
const catalogueCategory = document.querySelector("#catalogue-category");

const detailName = document.querySelector("#detail-name");
const detailCost = document.querySelector("#detail-cost");
const detailValidity = document.querySelector("#detail-validity");
const detailHighlight = document.querySelector("#detail-highlight");
const detailSteps = document.querySelector("#detail-steps");
const detailTerms = document.querySelector("#detail-terms");
const detailHero = document.querySelector("#detail-hero");
const detailBadge = document.querySelector("#detail-badge");
const navLinks = [...document.querySelectorAll(".nav-item")];

const monthlyConversions = [
  { month: "Mar 2026", unusedMb: 1200, mintedTokens: 120, expires: "31 Jul 2026", status: "Active" },
  { month: "Feb 2026", unusedMb: 980, mintedTokens: 98, expires: "30 Jun 2026", status: "Active" },
  { month: "Jan 2026", unusedMb: 1540, mintedTokens: 154, expires: "31 May 2026", status: "Active" },
  { month: "Dec 2025", unusedMb: 860, mintedTokens: 86, expires: "30 Apr 2026", status: "Active" }
];

let currentScreen = "home";
let currentFilter = "all";
let selectedVoucherId = 0;
let screenHistory = [];

function setScreen(nextScreen, options = {}) {
  const { recordHistory = true } = options;
  if (nextScreen === currentScreen) return;

  if (recordHistory) {
    screenHistory.push(currentScreen);
  }

  currentScreen = nextScreen;

  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === nextScreen);
  });

  phoneScreen.classList.toggle("detail-mode", nextScreen === "detail");

  navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.action === nextScreen);
  });
}

function goBack() {
  const previousScreen = screenHistory.pop() || "home";
  setScreen(previousScreen, { recordHistory: false });
}

function formatTokens(value) {
  return `${value.toLocaleString()} Tokens`;
}

function filteredVouchers() {
  if (currentFilter === "all") {
    return vouchers;
  }

  return vouchers.filter((voucher) => voucher.category === currentFilter);
}

function buildBrandOrb(shortCode) {
  return `<div class="brand-orb">${shortCode}</div>`;
}

function renderFeatured() {
  featuredRow.innerHTML = vouchers
    .filter((voucher) => voucher.featured)
    .map(
      (voucher) => `
        <article class="featured-card" style="--accent-a:${voucher.accentA};--accent-b:${voucher.accentB}" data-voucher-id="${voucher.id}">
          <div class="featured-art">
            ${buildBrandOrb(voucher.shortCode)}
          </div>
          <div class="featured-copy">
            <h4>${voucher.title}</h4>
            <p>${voucher.merchant}</p>
            <strong>${voucher.tokens.toLocaleString()} <span>Tokens</span></strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderVoucherList() {
  const title = currentFilter === "all" ? "All vouchers" : `${capitalize(currentFilter)}`;
  catalogueTitle.textContent = title;
  catalogueCategory.textContent = currentFilter === "all" ? "All" : capitalize(currentFilter);

  voucherList.innerHTML = filteredVouchers()
    .map(
      (voucher) => `
        <article class="voucher-row" style="--accent-a:${voucher.accentA};--accent-b:${voucher.accentB}" data-voucher-id="${voucher.id}">
          <div class="voucher-art">
            ${buildBrandOrb(voucher.shortCode)}
          </div>
          <div class="voucher-copy">
            <h4>${voucher.title}</h4>
            <p>${voucher.merchant}</p>
            <div class="voucher-meta">
              <span>Category: ${capitalize(voucher.category)}</span>
              <span>Validity: ${voucher.validity}</span>
            </div>
            <strong>${voucher.tokens.toLocaleString()} <span>Tokens</span></strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderOwnedVouchers() {
  ownedList.innerHTML = vouchers
    .filter((voucher) => voucher.owned)
    .map(
      (voucher) => `
        <article class="owned-row" style="--accent-a:${voucher.accentA};--accent-b:${voucher.accentB}">
          <div class="voucher-art">
            ${buildBrandOrb(voucher.shortCode)}
          </div>
          <div class="owned-copy">
            <h4>${voucher.title}</h4>
            <p>${voucher.merchant}</p>
            <div class="owned-meta">
              <span>Redeemed with ${formatTokens(voucher.tokens)}</span>
              <span>Valid until ${voucher.validity.split(" to ")[1]}</span>
            </div>
            <span class="owned-token">Voucher token held</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHistory() {
  historyList.innerHTML = monthlyConversions
    .map(
      (item) => `
        <article class="history-item">
          <div>
            <strong>${item.month}</strong>
            <span>Reward period</span>
          </div>
          <div>
            <strong>${item.mintedTokens.toLocaleString()} Tokens</strong>
            <span>Still unexpired</span>
          </div>
          <div>
            <strong>${item.unusedMb.toLocaleString()} MB</strong>
            <span>Unused data converted</span>
          </div>
          <div>
            <strong>${item.expires}</strong>
            <span>Expiry date</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDetail(voucherId) {
  const voucher = vouchers.find((item) => item.id === voucherId);
  if (!voucher) return;

  selectedVoucherId = voucherId;
  detailName.textContent = `${voucher.title}`;
  detailCost.textContent = formatTokens(voucher.tokens);
  detailValidity.textContent = voucher.validity;
  detailHighlight.textContent = voucher.highlight;
  detailBadge.textContent = voucher.shortCode;
  detailHero.style.setProperty("--accent-a", voucher.accentA);
  detailHero.style.setProperty("--accent-b", voucher.accentB);

  detailSteps.innerHTML = voucher.steps.map((step) => `<li>${step}</li>`).join("");
  detailTerms.innerHTML = voucher.terms.map((term) => `<li>${term}</li>`).join("");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

document.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "back") {
      goBack();
      return;
    }

    if (
      action === "catalogue" ||
      action === "home" ||
      action === "wallet" ||
      action === "month-summary" ||
      action === "conversion-history"
    ) {
      setScreen(action);
    }
  }

  const filterTarget = event.target.closest("[data-filter]");
  if (filterTarget) {
    currentFilter = filterTarget.dataset.filter;
    document.querySelectorAll(".category-pill").forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.filter === currentFilter);
    });
    renderVoucherList();
    setScreen("catalogue");
  }

  const voucherTarget = event.target.closest("[data-voucher-id]");
  if (voucherTarget) {
    renderDetail(Number(voucherTarget.dataset.voucherId));
    setScreen("detail");
  }
});

tokenHistoryTrigger.addEventListener("click", () => setScreen("conversion-history"));
tokenHistoryTrigger.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    setScreen("conversion-history");
  }
});

renderFeatured();
renderVoucherList();
renderOwnedVouchers();
renderHistory();
renderDetail(selectedVoucherId);
