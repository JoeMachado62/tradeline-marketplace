<template>
  <div id="tradeline-widget" :style="cssVariables">
    <div v-if="store.loading" class="tl-loading">Loading tradelines...</div>

    <div v-else-if="store.error" class="tl-error">
      {{ store.error }}
    </div>

    <div v-else class="tl-widget">
      <!-- Onboarding -->
      <Onboarding v-if="store.onboardingStep !== 'complete'" />

      <!-- Main Widget -->
      <div v-else>
        <!-- Top Toolbar -->
        <div class="tl-toolbar-row">
          <h2 class="tl-title">Available Tradelines</h2>

          <div class="tl-toolbar-actions">
            <div class="tl-search-wrapper">
              <span class="tl-search-icon">🔍</span>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search by bank, limit, or price..."
                class="tl-search-input"
              />
            </div>

            <button
              class="tl-filter-toggle-btn"
              @click="showFilters = !showFilters"
            >
              <span class="tl-filter-icon">⚙️</span> Filters
            </button>

            <div class="tl-cart-summary" @click="showCart = !showCart">
              <span>🛒</span>
              <span class="tl-badge" v-if="store.cartItemCount > 0">{{
                store.cartItemCount
              }}</span>
            </div>
          </div>
        </div>

        <!-- Filters Panel (Accordion) -->
        <div class="tl-filters-panel" v-if="showFilters">
          <div class="tl-filters-grid">
            <div class="tl-filter-group">
              <label>Age</label>
              <select v-model="filters.age" class="tl-select-input">
                <option value="">Any</option>
                <option value="0-2">0-2 years</option>
                <option value="2-5">2-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>
            <div class="tl-filter-group">
              <label>Credit Limit</label>
              <select v-model="filters.limit" class="tl-select-input">
                <option value="">Any</option>
                <option value="0-5000">$0 - $5,000</option>
                <option value="5000-10000">$5,000 - $10,000</option>
                <option value="10000-20000">$10,000 - $20,000</option>
                <option value="20000+">$20,000+</option>
              </select>
            </div>
            <div class="tl-filter-group">
              <label>Price</label>
              <select v-model="filters.price" class="tl-select-input">
                <option value="">Any</option>
                <option value="0-500">$0 - $500</option>
                <option value="500-1000">$500 - $1,000</option>
                <option value="1000+">$1,000+</option>
              </select>
            </div>

            <div class="tl-filter-group">
              <label>Bank Name</label>
              <input
                type="text"
                v-model="filters.bank"
                placeholder="e.g. Chase"
                class="tl-select-input"
              />
            </div>
            <div class="tl-filter-group">
              <label>Card ID</label>
              <input
                type="text"
                v-model="filters.cardId"
                placeholder="e.g. 22900"
                class="tl-select-input"
              />
            </div>
            <!-- Placeholder for Payment Method if needed -->
            <div class="tl-filter-group"></div>
          </div>

          <div class="tl-filters-actions">
            <!-- Logic for Apply is redundant since it reacts reactive, but buttons requested -->
            <button class="tl-btn-primary tl-btn-dark" @click="applyFilters">
              Apply Filters
            </button>
            <button class="tl-btn-primary tl-btn-dark" @click="clearFilters">
              Clear Filters
            </button>
            <button
              class="tl-btn-primary tl-btn-dark"
              @click="showFilters = false"
            >
              Hide Filters
            </button>
          </div>
        </div>

        <!-- Table View -->
        <div class="tl-table-container">
          <table class="tl-table">
            <thead>
              <tr>
                <th
                  @click="sortBy('bank_name')"
                  :class="{ active: sortField === 'bank_name' }"
                >
                  Bank Name <span class="tl-info-icon">?</span>
                  {{ getSortIcon("bank_name") }}
                </th>
                <th
                  @click="sortBy('card_id')"
                  :class="{ active: sortField === 'card_id' }"
                >
                  Card ID <span class="tl-info-icon">?</span>
                  {{ getSortIcon("card_id") }}
                </th>
                <th
                  @click="sortBy('credit_limit')"
                  :class="{ active: sortField === 'credit_limit' }"
                >
                  Credit Limit <span class="tl-info-icon">?</span>
                  {{ getSortIcon("credit_limit") }}
                </th>
                <th
                  @click="sortBy('date_opened')"
                  :class="{ active: sortField === 'date_opened' }"
                >
                  Date Opened <span class="tl-info-icon">?</span>
                  {{ getSortIcon("date_opened") }}
                </th>
                <th
                  @click="sortBy('purchase_deadline')"
                  :class="{ active: sortField === 'purchase_deadline' }"
                >
                  Purchase Deadline <span class="tl-info-icon">?</span>
                  {{ getSortIcon("purchase_deadline") }}
                </th>
                <th @click="sortBy('reporting_period')">
                  Reporting Period (+7) <span class="tl-info-icon">?</span>
                </th>
                <th @click="sortBy('stock')">
                  Availability <span class="tl-info-icon">?</span>
                </th>
                <th
                  @click="sortBy('price')"
                  :class="{ active: sortField === 'price' }"
                >
                  Price <span class="tl-info-icon">?</span>
                  {{ getSortIcon("price") }}
                </th>
                <th>Add Individual to Cart</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in paginatedTradelines"
                :key="t.card_id"
                :class="{ 'row-disabled': t.stock === 0 }"
              >
                <td class="font-bold">{{ t.bank_name }}</td>
                <td>{{ t.card_id }}</td>
                <td>${{ formatNumber(t.credit_limit) }}.00</td>
                <td>{{ formatDateOpened(t.date_opened) }}</td>
                <td>{{ formatDate(t.purchase_deadline, false) }}</td>
                <!-- Reporting Period Range -->
                <td>{{ formatReportingPeriod(t.reporting_period) }}</td>
                <!-- Availability -->
                <td>
                  <span
                    class="tl-stock-status"
                    :class="{ 'text-red': t.stock <= 0 }"
                  >
                    {{ t.stock > 0 ? t.stock + " in stock" : "Sold Out" }}
                  </span>
                </td>
                <td class="tl-price-cell">${{ formatNumber(t.price) }}</td>
                <td>
                  <button
                    class="tl-btn-add"
                    :disabled="t.stock === 0 || isInCart(t)"
                    @click="store.addToCart(t)"
                  >
                    {{ isInCart(t) ? "In Cart" : "Add to cart" }}
                  </button>
                </td>
              </tr>
              <tr v-if="paginatedTradelines.length === 0">
                <td colspan="9" class="text-center">
                  No tradelines match your search.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="tl-pagination" v-if="processedTradelines.length > 0">
          <div class="tl-pagination-left">
            <span>Rows per page:</span>
            <select v-model="itemsPerPage" class="tl-select">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="tl-pagination-right">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <div class="tl-pagination-arrows">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="tl-page-btn"
              >
                ←
              </button>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="tl-page-btn"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <!-- Cart Overlay & Slide-out Panel -->
        <div v-if="showCart" class="tl-cart-overlay" @click="showCart = false"></div>
        <Cart v-if="showCart" @close="showCart = false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from "vue";
import { useWidgetStore } from "./stores/widget";
import Cart from "./components/Cart.vue";
import Onboarding from "./components/Onboarding.vue";
import type { Tradeline } from "./types";

const store = useWidgetStore();
const showCart = ref(false);
const showFilters = ref(false);
const searchQuery = ref("");
const sortField = ref<keyof Tradeline | "date_opened">("price");
const sortDesc = ref(false);

const filters = reactive({
  age: "",
  limit: "",
  price: "",
  bank: "", // Not used in UI yet but part of new filter
  cardId: "",
});

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(20);

const sortBy = (field: any) => {
  if (sortField.value === field) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortField.value = field;
    sortDesc.value = false;
  }
};

const getSortIcon = (field: any) => {
  if (sortField.value !== field) return "↕";
  return sortDesc.value ? "↓" : "↑";
};

// Filter and Sort (Full List)
const processedTradelines = computed(() => {
  let items = [...store.filteredTradelines];

  // Global Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(
      (t) =>
        t.bank_name.toLowerCase().includes(q) ||
        t.credit_limit.toString().includes(q) ||
        t.price.toString().includes(q)
    );
  }

  // Specific Filters
  if (filters.bank) {
    const q = filters.bank.toLowerCase();
    items = items.filter((t) => t.bank_name.toLowerCase().includes(q));
  }
  if (filters.cardId) {
    items = items.filter((t) => t.card_id.toString().includes(filters.cardId));
  }
  if (filters.limit) {
    // Basic range parsing
    const [min, max] = parseRange(filters.limit);
    items = items.filter((t) => {
      if (max) return t.credit_limit >= min && t.credit_limit <= max;
      return t.credit_limit >= min;
    });
  }
  if (filters.price) {
    const [min, max] = parseRange(filters.price);
    items = items.filter((t) => {
      if (max) return t.price >= min && t.price <= max;
      return t.price >= min;
    });
  }
  if (filters.age) {
    // Age is tricky, we need to calculate age in years first
    // Implementation simplified for brevity
    const [min, max] = parseRange(
      filters.age.replace("years", "").replace("year", "")
    );
    items = items.filter((t) => {
      const ageY = calculateAgeYears(t.date_opened);
      if (max) return ageY >= min && ageY <= max;
      return ageY >= min;
    });
  }

  // Sort
  items.sort((a: any, b: any) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];

    // Helpers for specific fields
    if (sortField.value === "date_opened") {
      valA = new Date(a.date_opened).getTime();
      valB = new Date(b.date_opened).getTime();
    } else if (sortField.value === "purchase_deadline") {
      valA = a.purchase_deadline;
      valB = b.purchase_deadline;
    }

    if (valA < valB) return sortDesc.value ? 1 : -1;
    if (valA > valB) return sortDesc.value ? -1 : 1;
    return 0;
  });

  return items;
});

const applyFilters = () => {
  /* Logic is reactive, button purely visual/UX */
};
const clearFilters = () => {
  filters.age = "";
  filters.limit = "";
  filters.price = "";
  filters.bank = "";
  filters.cardId = "";
};

// Help helper
const parseRange = (val: string): [number, number | null] => {
  if (!val) return [0, null];
  const cleanVal = val.replace(/,/g, "").trim();

  if (cleanVal.includes("+")) {
    const num = parseFloat(cleanVal.replace("+", ""));
    return [isNaN(num) ? 0 : num, null];
  }
  const parts = cleanVal.split("-");
  if (parts.length >= 2) {
    const p0 = parts[0] || "";
    const p1 = parts[1] || "";
    const min = parseFloat(p0.trim());
    const max = parseFloat(p1.trim());
    return [isNaN(min) ? 0 : min, isNaN(max) ? null : max];
  }

  // Single number fallback
  const single = parseFloat(cleanVal);
  return [isNaN(single) ? 0 : single, null];
};

const calculateAgeYears = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return diffTime / (1000 * 60 * 60 * 24 * 365.25);
};

// Watch search to reset page
watch([searchQuery, filters], () => {
  currentPage.value = 1;
});

// Watch itemsPerPage to reset page if out of bounds
watch(itemsPerPage, () => {
  currentPage.value = 1;
});

const totalPages = computed(() =>
  Math.ceil(processedTradelines.value.length / itemsPerPage.value)
);

const paginatedTradelines = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return processedTradelines.value.slice(start, end);
});

const isInCart = (t: Tradeline) =>
  store.cart.some((i) => i.tradeline.card_id === t.card_id);

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-US");

const formatDate = (dateStr: string, withSuffix = true) => {
  if (dateStr.includes("<") || !dateStr.includes("/")) {
    return dateStr;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();

  if (!withSuffix) return `${month} ${day}`; // e.g., Jan 15

  // Suffix logic logic
  const j = day % 10,
    k = day % 100;
  let suffix = "th";
  if (j == 1 && k != 11) suffix = "st";
  if (j == 2 && k != 12) suffix = "nd";
  if (j == 3 && k != 13) suffix = "rd";

  return `${month} ${day}${suffix}`;
};

const formatDateOpened = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const year = date.getFullYear();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${year} ${month}`;
};

const formatReportingPeriod = (dateStr: string) => {
  // Expecting string like "01/15" or "Jan 15th"
  if (!dateStr) return "";

  // Try to parse relative to current year
  let date = new Date(dateStr);

  // If invalid (e.g., just "05" or "Jan 5"), try appending current year
  if (isNaN(date.getTime())) {
    const currentYear = new Date().getFullYear();
    date = new Date(`${dateStr} ${currentYear}`);
  }

  if (isNaN(date.getTime())) return dateStr;

  // Calculate End Date (+7 days)
  const endDate = new Date(date);
  endDate.setDate(date.getDate() + 7);

  // Manual suffix logic not needed for simple range, matching image "Jan 15th - Jan 22nd" style
  // The image format: Jan 15th - Jan 22nd
  const fWithSuffix = (d: Date) => {
    const m = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const j = day % 10,
      k = day % 100;
    let suffix = "th";
    if (j == 1 && k != 11) suffix = "st";
    if (j == 2 && k != 12) suffix = "nd";
    if (j == 3 && k != 13) suffix = "rd";
    return `${m} ${day}${suffix}`;
  };

  return `${fWithSuffix(date)} - ${fWithSuffix(endDate)}`;
};

const cssVariables = computed(() => {
  const theme = store.config?.theme as any;
  const defaultColor = "#051b41"; // UPDATED DEFAULT COLOR
  const defaultFont = "Roboto, sans-serif";

  if (!theme)
    return {
      "--tl-primary-color": defaultColor,
      "--tl-font-family": defaultFont,
    };

  return {
    "--tl-primary-color":
      theme.primaryColor || theme.primary_color || defaultColor,
    "--tl-font-family": theme.fontFamily || theme.font_family || defaultFont,
  };
});
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap");

#tradeline-widget {
  font-family: "Roboto", var(--tl-font-family), sans-serif !important;
  color: #111827;
  background-color: transparent;
}

/* Toolbar & Header */
.tl-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}
.tl-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #000;
}
.tl-toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Search */
.tl-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.tl-search-icon {
  position: absolute;
  left: 10px;
  z-index: 10;
  font-size: 16px;
  color: #6b7280;
}
.tl-search-input {
  padding: 8px 10px 8px 36px; /* Space for icon */
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  width: 250px;
  font-family: "Roboto", sans-serif !important;
}

/* Header Buttons */
.tl-filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  color: #111827;
}
.tl-filter-icon {
  font-size: 18px;
}

/* Cart Summary */
.tl-cart-summary {
  cursor: pointer;
  background: var(--tl-primary-color, #051b41); /* Use primary */
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 500;
}
.tl-badge {
  background: white;
  color: var(--tl-primary-color, #051b41);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.8em;
}

/* Filters Panel */
.tl-filters-panel {
  background: #ffffff;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
.tl-filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}
.tl-filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tl-filter-group label {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}
.tl-select-input {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  width: 100%;
  font-family: inherit;
}
.tl-filters-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}
.tl-btn-dark {
  background-color: #051b41 !important;
  color: white !important;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

/* Table */
.tl-table-container {
  overflow-x: auto;
  background: white;
  border-top: 1px solid #e5e7eb;
}
.tl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: white;
}
.tl-table th {
  text-align: left;
  padding: 8px 8px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 700;
  color: #111827;
  font-family: "Roboto", sans-serif !important;
}
.tl-info-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #000;
  color: white;
  font-size: 10px;
  margin-left: 4px;
  cursor: help;
}

.tl-table th.active {
  color: var(--tl-primary-color, #051b41);
}
.tl-table td {
  padding: 8px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
  font-family: "Roboto", sans-serif !important;
  color: #4b5563;
}
.tl-table .font-bold {
  font-weight: 700;
  color: #111827;
}

/* Stock Status */
.tl-stock-status {
  color: #16a34a; /* Green */
  font-weight: 500;
}
.tl-stock-status.text-red {
  color: #dc2626;
}

.tl-price-cell {
  color: #111827;
  font-weight: 500;
}

/* Add Button */
.tl-btn-add {
  background-color: #051b41 !important;
  color: #ffffff !important;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-family: "Roboto", sans-serif !important;
  min-width: 80px;
  width: 100%;
  text-align: center;
  font-size: 11px;
}
.tl-btn-add:hover {
  filter: brightness(120%);
}
.tl-btn-add:disabled {
  background-color: #e5e7eb !important;
  color: #9ca3af !important;
  cursor: not-allowed;
}

.row-disabled {
  opacity: 0.6;
}
.text-center {
  text-align: center;
}

/* Pagination Styles */
.tl-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  font-size: 0.9em;
  color: #374151;
  border-top: 1px solid #e5e7eb;
  background: white;
}
.tl-pagination-left,
.tl-pagination-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tl-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.tl-pagination-arrows {
  display: flex;
  gap: 5px;
}
.tl-page-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

/* Responsive */
@media (max-width: 768px) {
  .tl-filters-grid {
    grid-template-columns: 1fr;
  }
  .tl-toolbar-row {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Cart Overlay */
.tl-cart-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
