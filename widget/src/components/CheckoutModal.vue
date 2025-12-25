<template>
  <div class="tl-modal-overlay" @click.self="$emit('close')">
    <div class="tl-modal" :class="{ 'tl-modal-lg': step === 2 }">
      <div class="tl-modal-header">
        <h3>{{ step === 1 ? 'Create Account' : 'Sign Agreement' }}</h3>
        <button class="tl-close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="tl-modal-body">
        <!-- Step 1: User Details -->
        <form v-if="step === 1" @submit.prevent="nextStep" class="tl-checkout-form">
          <p class="tl-modal-desc">
            Please enter your details to create an account. You will sign the client agreement in the next step.
          </p>

          <div class="tl-form-group">
            <label for="name">Full Name (Legal Name)</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              placeholder="John Doe"
            />
          </div>

          <div class="tl-form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="john@example.com"
            />
          </div>

          <div class="tl-form-group">
            <label for="phone">Phone Number</label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              required
              placeholder="(555) 123-4567"
            />
          </div>

          <div class="tl-form-group">
            <label for="password">Create Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              placeholder="Min. 8 characters"
              minlength="8"
            />
          </div>

          <button type="submit" class="tl-btn tl-btn-primary tl-submit-btn">
            Next: Review Agreement
          </button>
        </form>

        <!-- Step 2: Agreement & Signature -->
        <div v-else class="tl-agreement-step">
          <p class="tl-modal-desc">
            Please review and sign the agreement below to finalize your order.
          </p>

          <div class="tl-agreement-scroll">
            <div class="tl-agreement-content">
              <h4>TRADELINE USER AGREEMENT</h4>
              <p>PARTIES. This agreement is between Credit Services US, LLC (hereinafter “Company”) and the undersigned client (hereinafter “Client”). By signing this agreement, Client certifies that he/she is at least 18 years of age, that the information he/she has provided to Company is true and complete, and that he/she will not use any of the products of Company for any unlawful purpose.</p>
              
              <p>DEFINITION OF TRADELINE. The term “tradeline” refers to the line-item for a credit account on a credit bureau report. Client will be added as an "Authorized User" onto the purchased line of credit.</p>

              <p>FEES. Client agrees to pay the non-refundable fee specified on the selected tradelines. Client understands that the tradeline order will not be processed until Company has received the entire fee.</p>

              <p>ABSENCE OF GUARANTEE. Client understands and agrees that Company cannot make any predictions or guarantees regarding the result or effect of its product on Client’s credit score.</p>

              <p><strong>PROOF OF NON-PERFORMANCE.</strong> In the event Client’s authorized user status has not posted to two (2) of the credit bureaus within the reporting period, Company shall provide a full refund or exchange, provided proof is submitted within the allowed timeframe.</p>

              <p><i>(Scroll to read full agreement...)</i></p>
              
              <div class="tl-agreement-full-text">
                <p>AUTHORIZATION/USE OF PERSONAL INFORMATION. Client hereby grants to Company full authority to use his/her information for the sole purpose of adding him/her to the selected tradeline.</p>
                <p>USE OF FALSE OR UNAUTHORIZED INFORMATION. Client agrees that he/she will not use, provide, or submit to Company any false, fraudulent, illegal or unauthorized information (such as CPNs).</p>
                <p>INDEMNIFICATION. Client shall fully indemnify, hold harmless and defend Company from any claims arising out of Client's breach of this agreement.</p>
                <p>GOVERNING LAW. This Agreement shall be governed by the laws of the State of Florida.</p>
                <p>DIGITAL SIGNATURES. The parties agree that this agreement may be electronically signed and that such electronic signatures shall be legally binding.</p>
              </div>
            </div>
          </div>

          <div class="tl-signature-section">
            <label>Sign Below:</label>
            <div class="tl-signature-pad-wrapper">
              <VueSignaturePad
                width="100%"
                height="150px"
                ref="signaturePad"
                :options="{ penColor: '#000000' }"
              />
            </div>
            <button @click="clearSignature" class="tl-clear-sig-btn">Clear Signature</button>
          </div>

          <div v-if="store.error" class="tl-error-msg">
            {{ store.error }}
          </div>

          <div class="tl-actions">
            <button @click="step = 1" class="tl-btn tl-btn-secondary" :disabled="store.loading">Back</button>
            <button @click="submitOrder" class="tl-btn tl-btn-primary" :disabled="store.loading">
              {{ store.loading ? "Processing..." : "Sign & Submit Order" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useWidgetStore } from "../stores/widget";
import { VueSignaturePad } from 'vue-signature-pad';

const emit = defineEmits(["close"]);
const store = useWidgetStore();
const step = ref(1);
const signaturePad = ref<any>(null);

const form = reactive({
  name: "",
  email: "",
  phone: "",
  password: "",
});

const nextStep = () => {
    step.value = 2;
};

const clearSignature = () => {
    signaturePad.value?.clearSignature();
};

const submitOrder = async () => {
  const { isEmpty, data } = signaturePad.value.saveSignature();
  
  if (isEmpty) {
      alert("Please sign the agreement to proceed.");
      return;
  }

  await store.checkout({
      ...form,
      signature: data // Base64 signature image
  });
};
</script>

<style scoped>
.tl-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

.tl-modal {
  background: white;
  width: 90%;
  max-width: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.tl-modal-lg {
    max-width: 800px;
}

.tl-modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tl-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.tl-close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
}

.tl-modal-body {
  padding: 24px;
}

.tl-modal-desc {
  margin: 0 0 20px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.tl-checkout-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tl-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tl-form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.tl-form-group input {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 16px;
}

.tl-submit-btn {
  margin-top: 10px;
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

.tl-agreement-scroll {
    height: 300px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    background: #f9fafb;
}

.tl-agreement-content h4 {
    margin-top: 0;
    font-size: 16px;
    text-align: center;
    margin-bottom: 15px;
}

.tl-agreement-content p {
    font-size: 13px;
    line-height: 1.6;
    color: #374151;
    margin-bottom: 10px;
}

.tl-signature-section {
    margin-bottom: 20px;
}

.tl-signature-pad-wrapper {
    border: 1px dashed #9ca3af;
    background: #fff;
    border-radius: 4px;
    margin-top: 5px;
}

.tl-clear-sig-btn {
    font-size: 12px;
    color: #6b7280;
    background: none;
    border: none;
    text-decoration: underline;
    cursor: pointer;
    margin-top: 4px;
}

.tl-actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.tl-actions button {
    flex: 1;
    padding: 10px;
}

.tl-btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
}

.tl-error-msg {
  color: #dc2626;
  font-size: 14px;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
