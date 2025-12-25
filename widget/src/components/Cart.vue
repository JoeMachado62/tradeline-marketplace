<template>
  <div class="tl-cart">
    <div class="tl-cart-header">
      <h3>Your Cart ({{ store.cartItemCount }})</h3>
      <button class="tl-close-btn" @click="$emit('close')">&times;</button>
    </div>

    <div v-if="store.cart.length === 0" class="tl-empty-cart">
      <p>Your cart is empty.</p>
      <button class="tl-btn tl-btn-outline" @click="$emit('close')">
        Continue Shopping
      </button>
    </div>

    <div v-else class="tl-cart-items">
      <div
        v-for="item in store.cart"
        :key="item.tradeline.card_id"
        class="tl-cart-item"
      >
        <div class="tl-item-info">
          <h4>{{ item.tradeline.bank_name }}</h4>
          <span class="tl-item-meta"
            >Limit: ${{ formatNumber(item.tradeline.credit_limit) }}</span
          >
        </div>

        <div class="tl-item-price">
          ${{ formatNumber(item.tradeline.price) }}
        </div>

        <div class="tl-item-actions">
          <div class="tl-quantity-selector">
            <button
              @click="
                store.updateQuantity(item.tradeline.card_id, item.quantity - 1)
              "
            >
              -
            </button>
            <span>{{ item.quantity }}</span>
            <button
              :disabled="item.quantity >= item.tradeline.stock"
              @click="
                store.updateQuantity(item.tradeline.card_id, item.quantity + 1)
              "
            >
              +
            </button>
          </div>
          <button
            class="tl-remove-btn"
            @click="store.removeFromCart(item.tradeline.card_id)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.cart.length > 0" class="tl-cart-footer">
      <div class="tl-totals" v-if="store.calculationResult">
        <div class="tl-total-row">
          <span>Subtotal</span>
          <span>${{ formatNumber(store.calculationResult.subtotal) }}</span>
        </div>
        <div class="tl-total-row tl-grand-total">
          <span>Total</span>
          <span>${{ formatNumber(store.calculationResult.total) }}</span>
        </div>
      </div>
      <div class="tl-totals" v-else>
        <div class="tl-total-row tl-grand-total">
          <span>Total</span>
          <span>${{ formatNumber(store.cartSubtotal) }}</span>
        </div>
      </div>

      <button
        class="tl-btn tl-btn-primary tl-checkout-btn"
        :disabled="store.isCalculating"
        @click="handleCheckout"
      >
        {{ store.isCalculating ? "Calculating..." : "Proceed to Checkout" }}
      </button>
    </div>
  </div>
  <CheckoutModal v-if="showCheckoutModal" @close="showCheckoutModal = false" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useWidgetStore } from "../stores/widget";
import CheckoutModal from "./CheckoutModal.vue";

defineEmits(["close"]);

const store = useWidgetStore();
const showCheckoutModal = ref(false);

const formatNumber = (num: number) => num.toLocaleString("en-US");

const handleCheckout = () => {
  showCheckoutModal.value = true;
};
</script>

<style scoped>
.tl-cart {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  max-width: 400px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.tl-cart-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tl-cart-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.tl-close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6b7280;
}

.tl-empty-cart {
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
}

.tl-cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tl-cart-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f3f4f6;
}

.tl-item-info h4 {
  margin: 0 0 4px;
  font-size: 16px;
}

.tl-item-meta {
  font-size: 13px;
  color: #6b7280;
}

.tl-item-price {
  font-weight: 600;
  font-size: 16px;
}

.tl-item-actions {
  grid-column: 1 / span 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tl-quantity-selector {
  display: flex;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.tl-quantity-selector button {
  padding: 2px 10px;
  border: none;
  background: none;
  cursor: pointer;
}

.tl-quantity-selector button:hover {
  background: #f9fafb;
}

.tl-quantity-selector span {
  padding: 0 10px;
  font-weight: 500;
  min-width: 30px;
  text-align: center;
}

.tl-remove-btn {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.tl-cart-footer {
  padding: 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.tl-total-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 15px;
}

.tl-grand-total {
  font-weight: 700;
  font-size: 18px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.tl-checkout-btn {
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  font-size: 16px;
}

.tl-btn-outline {
  border: 1px solid #e5e7eb;
  background: white;
  color: #374151;
}

.tl-btn-outline:hover {
  background: #f9fafb;
}
</style>
