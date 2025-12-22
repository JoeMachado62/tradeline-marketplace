<template>
  <div class="tl-card">
    <div class="tl-card-image">
      <img :src="tradeline.image" :alt="tradeline.bank_name" />
    </div>

    <div class="tl-card-content">
      <h3 class="tl-card-title">{{ tradeline.bank_name }}</h3>

      <div class="tl-card-details">
        <div class="tl-detail">
          <span class="tl-detail-label">Credit Limit:</span>
          <span class="tl-detail-value"
            >${{ formatNumber(tradeline.credit_limit) }}</span
          >
        </div>

        <div class="tl-detail">
          <span class="tl-detail-label">Age:</span>
          <span class="tl-detail-value">{{
            calculateAge(tradeline.date_opened)
          }}</span>
        </div>

        <div class="tl-detail" v-if="showPurchaseDeadline">
          <span class="tl-detail-label">Purchase By:</span>
          <span class="tl-detail-value">{{
            formatDate(tradeline.purchase_deadline)
          }}</span>
        </div>

        <div class="tl-detail" v-if="showStock">
          <span class="tl-detail-label">Available:</span>
          <span
            class="tl-detail-value"
            :class="{ 'tl-low-stock': tradeline.stock <= 2 }"
          >
            {{ tradeline.stock }} left
          </span>
        </div>
      </div>

      <div class="tl-card-footer">
        <div class="tl-price">${{ formatNumber(tradeline.price) }}</div>

        <button
          class="tl-btn tl-btn-primary"
          :disabled="tradeline.stock === 0 || isInCart"
          @click="handleAddToCart"
        >
          {{ buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useWidgetStore } from "../stores/widget";
import type { Tradeline } from "../types";

const props = defineProps<{
  tradeline: Tradeline;
  showStock?: boolean;
  showPurchaseDeadline?: boolean;
}>();

const store = useWidgetStore();

const isInCart = computed(() =>
  store.cart.some((item) => item.tradeline.card_id === props.tradeline.card_id)
);

const buttonText = computed(() => {
  if (props.tradeline.stock === 0) return "Out of Stock";
  if (isInCart.value) return "In Cart";
  return "Add to Cart";
});

const handleAddToCart = () => {
  if (!isInCart.value && props.tradeline.stock > 0) {
    store.addToCart(props.tradeline);
  }
};

const formatNumber = (num: number) => num.toLocaleString("en-US");

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const calculateAge = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const years = Math.floor(
    (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  const months =
    Math.floor(
      (now.getTime() - date.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
    ) % 12;

  if (years > 0) {
    return `${years}y ${months}m`;
  }
  return `${months}m`;
};
</script>

<style scoped>
.tl-card {
  border: 1px solid var(--tl-border-color, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  background: var(--tl-card-bg, white);
  transition: transform 0.2s, box-shadow 0.2s;
}

.tl-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tl-card-image {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tl-image-bg, #f9fafb);
  padding: 12px;
}

.tl-card-image img {
  max-height: 56px;
  max-width: 180px;
  object-fit: contain;
}

.tl-card-content {
  padding: 16px;
}

.tl-card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--tl-text-primary, #111827);
}

.tl-card-details {
  margin-bottom: 16px;
}

.tl-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 14px;
}

.tl-detail-label {
  color: var(--tl-text-secondary, #6b7280);
}

.tl-detail-value {
  font-weight: 500;
  color: var(--tl-text-primary, #111827);
}

.tl-low-stock {
  color: #dc2626;
  font-weight: 600;
}

.tl-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
}

.tl-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--tl-primary, #2563eb);
}

.tl-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.tl-btn-primary {
  background: var(--tl-primary, #2563eb);
  color: white;
}

.tl-btn-primary:hover:not(:disabled) {
  background: var(--tl-primary-hover, #1d4ed8);
}

.tl-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
