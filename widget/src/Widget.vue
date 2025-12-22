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
        <!-- Header -->
        <div class="tl-header" v-if="store.broker">
          <h2>
            Tradelines Available
            <span
              v-if="store.client?.excluded_banks?.length"
              class="text-sm font-normal text-green-600 block mt-1"
            >
              ✓ Smart Filtered for You
            </span>
          </h2>
          <div class="tl-cart-summary" @click="showCart = !showCart">
            <span class="tl-cart-icon">🛒</span>
            <span class="tl-cart-count" v-if="store.cartItemCount > 0">
              {{ store.cartItemCount }}
            </span>
          </div>
        </div>

        <!-- Tradelines Grid -->
        <div class="tl-grid" v-show="!showCart">
          <TradelineCard
            v-for="tradeline in store.filteredTradelines"
            :key="tradeline.card_id"
            :tradeline="tradeline"
            :show-stock="true"
            :show-purchase-deadline="true"
          />
        </div>

        <!-- Cart View -->
        <Cart v-if="showCart" @close="showCart = false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useWidgetStore } from "./stores/widget";
import TradelineCard from "./components/TradelineCard.vue";
import Cart from "./components/Cart.vue";
import Onboarding from "./components/Onboarding.vue";

const store = useWidgetStore();
const showCart = ref(false);

const cssVariables = computed(() => {
  const theme = store.config?.theme as any;
  if (!theme) return {};

  return {
    "--tl-primary-color": theme.primaryColor || theme.primary_color,
    "--tl-secondary-color": theme.secondaryColor || theme.secondary_color,
    "--tl-success-color": theme.successColor || theme.success_color,
    "--tl-error-color": theme.errorColor || theme.error_color,
    "--tl-font-family": theme.fontFamily || theme.font_family,
  };
});
</script>

<style>
#tradeline-widget {
  font-family: var(--tl-font-family, Inter, system-ui, sans-serif);
  color: var(--tl-text-primary, #111827);
  line-height: 1.5;
  padding: 20px;
}

.tl-loading,
.tl-error {
  padding: 40px;
  text-align: center;
}

.tl-error {
  color: var(--tl-error-color, #dc2626);
}

.tl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 20px;
  border-bottom: 2px solid var(--tl-border-color, #e5e7eb);
  margin-bottom: 24px;
}

.tl-cart-summary {
  position: relative;
  cursor: pointer;
  padding: 8px 16px;
  background: var(--tl-primary-color, #2563eb);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-cart-count {
  background: white;
  color: var(--tl-primary-color, #2563eb);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.tl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

* {
  box-sizing: border-box;
}
</style>
