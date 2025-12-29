<template>
  <div class="tl-modal-overlay" @click.self="$emit('close')">
    <div class="tl-modal" :class="{ 'tl-modal-lg': step >= 2 }">
      <div class="tl-modal-header">
        <h3>{{ stepTitle }}</h3>
        <div class="tl-steps-indicator">
          <span v-for="s in 4" :key="s" :class="{ active: s <= step, complete: s < step }">{{ s }}</span>
        </div>
        <button class="tl-close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="tl-modal-body">
        <!-- Step 1: User Details -->
        <form v-if="step === 1" @submit.prevent="nextStep" class="tl-checkout-form">
          <p class="tl-modal-desc">
            Please enter your details to create an account.
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
            <label for="dob">Date of Birth</label>
            <input
              id="dob"
              v-model="form.date_of_birth"
              type="date"
              required
            />
          </div>

          <div class="tl-form-group">
            <label for="address">Full Address</label>
            <textarea
              id="address"
              v-model="form.address"
              required
              placeholder="123 Main St, City, State ZIP"
              rows="2"
            ></textarea>
          </div>

          <div class="tl-form-group">
            <label for="password">Create Password</label>
            <div class="tl-password-wrapper">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder="Min. 8 characters"
                minlength="8"
              />
              <button type="button" class="tl-toggle-password" @click="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <button type="submit" class="tl-btn tl-btn-primary tl-submit-btn">
            Next: Upload Documents
          </button>
        </form>

        <!-- Step 2: Document Upload -->
        <div v-else-if="step === 2" class="tl-documents-step">
          <p class="tl-modal-desc">
            Please upload the following documents for identity verification:
          </p>

          <div class="tl-upload-section">
            <div class="tl-upload-box" :class="{ 'has-file': idDocument }">
              <label>
                <div class="tl-upload-icon">{{ idDocument ? '✓' : '📄' }}</div>
                <span class="tl-upload-label">Driver's License / Passport / State ID</span>
                <span class="tl-upload-filename" v-if="idDocument">{{ idDocument.name }}</span>
                <span class="tl-upload-hint" v-else>Click to upload (Color copy required)</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  @change="handleIdUpload"
                  class="tl-file-input"
                />
              </label>
            </div>

            <div class="tl-upload-box" :class="{ 'has-file': ssnDocument }">
              <label>
                <div class="tl-upload-icon">{{ ssnDocument ? '✓' : '📄' }}</div>
                <span class="tl-upload-label">Social Security Card</span>
                <span class="tl-upload-filename" v-if="ssnDocument">{{ ssnDocument.name }}</span>
                <span class="tl-upload-hint" v-else>Click to upload (Color copy required)</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  @change="handleSsnUpload"
                  class="tl-file-input"
                />
              </label>
            </div>
          </div>

          <p class="tl-upload-note">
            <strong>Note:</strong> If you don't have a social security card, 
            <a href="#" @click.prevent="showSsnAlternative = true">click here for an alternative</a>.
          </p>

          <div v-if="showSsnAlternative" class="tl-alternative-info">
            We can provide a special verification form to verify your SSN directly with the 
            Social Security Administration. After checkout, email us at 
            <strong>MyCreditServiceUS@gmail.com</strong> to request this form.
          </div>

          <div class="tl-actions">
            <button @click="step = 1" class="tl-btn tl-btn-secondary">Back</button>
            <button @click="step = 3" class="tl-btn tl-btn-primary" :disabled="!idDocument">
              Next: Review Agreement
            </button>
          </div>
        </div>

        <!-- Step 3: Agreement & Signature -->
        <div v-else-if="step === 3" class="tl-agreement-step">
          <p class="tl-modal-desc">
            Please review and sign the agreement below.
          </p>

          <div class="tl-agreement-scroll">
            <div class="tl-agreement-content">
              <h4>TRADELINE USER AGREEMENT</h4>
              <p>PARTIES. This agreement is between Credit Services US, LLC (hereinafter "Company") and the undersigned client (hereinafter "Client"). By signing this agreement, Client certifies that he/she is at least 18 years of age, that the information he/she has provided to Company is true and complete, and that he/she will not use any of the products of Company for any unlawful purpose.</p>
              
              <p>DEFINITION OF TRADELINE. The term "tradeline" refers to the line-item for a credit account on a credit bureau report. Client will be added as an "Authorized User" onto the purchased line of credit.</p>

              <p>FEES. Client agrees to pay the non-refundable fee specified on the selected tradelines. Client understands that the tradeline order will not be processed until Company has received the entire fee.</p>

              <p>ABSENCE OF GUARANTEE. Client understands and agrees that Company cannot make any predictions or guarantees regarding the result or effect of its product on Client's credit score.</p>

              <p><strong>PROOF OF NON-PERFORMANCE.</strong> In the event Client's authorized user status has not posted to two (2) of the credit bureaus within the reporting period, Company shall provide a full refund or exchange, provided proof is submitted within the allowed timeframe.</p>

              <p><i>(Scroll to read full agreement...)</i></p>
              
              <div class="tl-agreement-full-text">
                <p>AUTHORIZATION/USE OF PERSONAL INFORMATION. Client hereby grants to Company full authority to use his/her information for the sole purpose of adding him/her to the selected tradeline, including driver's license information, social security number, date of birth, full legal name, address, phone number.</p>
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

          <div class="tl-actions">
            <button @click="step = 2" class="tl-btn tl-btn-secondary">Back</button>
            <button @click="goToReview" class="tl-btn tl-btn-primary">
              Next: Review Order
            </button>
          </div>
        </div>

        <!-- Step 4: Review & Submit -->
        <div v-else-if="step === 4" class="tl-review-step">
          <p class="tl-modal-desc">
            Please review your order details before submitting.
          </p>

          <div class="tl-order-summary">
            <h4>Order Summary</h4>
            <div class="tl-summary-items">
              <div v-for="item in store.cart" :key="item.tradeline.card_id" class="tl-summary-item">
                <span>{{ item.tradeline.bank_name }} - ${{ item.tradeline.credit_limit.toLocaleString() }}</span>
                <span class="tl-item-price">${{ (item.tradeline.price * item.quantity).toLocaleString() }}</span>
              </div>
            </div>
            <div class="tl-summary-total">
              <strong>Total:</strong>
              <strong>${{ store.cartSubtotal.toLocaleString() }}</strong>
            </div>
          </div>

          <div class="tl-customer-summary">
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> {{ form.name }}</p>
            <p><strong>Email:</strong> {{ form.email }}</p>
            <p><strong>Phone:</strong> {{ form.phone }}</p>
          </div>

          <div class="tl-payment-notice">
            <h4>⚠️ Payment Instructions</h4>
            <p>After submitting, you will receive an email with payment instructions. We accept:</p>
            <ul>
              <li><strong>Zelle</strong> - Instant transfer</li>
              <li><strong>ACH Transfer</strong> - Bank-to-bank</li>
              <li><strong>Wire Transfer</strong> - For large orders</li>
            </ul>
            <p><em>Note: We do not accept credit cards.</em></p>
          </div>

          <div v-if="store.error" class="tl-error-msg">
            {{ store.error }}
          </div>

          <div class="tl-actions">
            <button @click="step = 3" class="tl-btn tl-btn-secondary" :disabled="store.loading">Back</button>
            <button @click="submitOrder" class="tl-btn tl-btn-primary" :disabled="store.loading">
              {{ store.loading ? "Submitting..." : "Submit Order" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { useWidgetStore } from "../stores/widget";
import { VueSignaturePad } from 'vue-signature-pad';

const emit = defineEmits(["close"]);
const store = useWidgetStore();
const step = ref(1);
const signaturePad = ref<any>(null);
const showPassword = ref(false);
const showSsnAlternative = ref(false);

const idDocument = ref<File | null>(null);
const ssnDocument = ref<File | null>(null);
const signatureData = ref<string>("");

const form = reactive({
  name: "",
  email: "",
  phone: "",
  password: "",
  date_of_birth: "",
  address: "",
});

const stepTitle = computed(() => {
  switch (step.value) {
    case 1: return "Step 1: Your Information";
    case 2: return "Step 2: Upload Documents";
    case 3: return "Step 3: Sign Agreement";
    case 4: return "Step 4: Review & Submit";
    default: return "Checkout";
  }
});

const nextStep = () => {
  step.value = 2;
};

const handleIdUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    idDocument.value = target.files[0];
  }
};

const handleSsnUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    ssnDocument.value = target.files[0];
  }
};

const clearSignature = () => {
  signaturePad.value?.clearSignature();
};

const goToReview = () => {
  const { isEmpty, data } = signaturePad.value.saveSignature();
  
  if (isEmpty) {
    alert("Please sign the agreement to proceed.");
    return;
  }
  
  signatureData.value = data;
  step.value = 4;
};

const submitOrder = async () => {
  await store.checkoutWithDocuments({
    ...form,
    signature: signatureData.value,
    idDocument: idDocument.value,
    ssnDocument: ssnDocument.value
  });
};
</script>

<style>
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
  max-width: 700px;
}

.tl-modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.tl-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.tl-steps-indicator {
  display: flex;
  gap: 8px;
}

.tl-steps-indicator span {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.tl-steps-indicator span.active {
  background: #2563eb;
  color: white;
}

.tl-steps-indicator span.complete {
  background: #16a34a;
  color: white;
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

.tl-form-group input,
.tl-form-group textarea {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 16px;
}

.tl-password-wrapper {
  position: relative;
}

.tl-password-wrapper input {
  width: 100%;
  padding-right: 40px;
}

.tl-toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.tl-submit-btn {
  margin-top: 10px;
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

/* Document Upload Styles */
.tl-upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.tl-upload-box {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.tl-upload-box:hover {
  border-color: #2563eb;
  background: #f0f9ff;
}

.tl-upload-box.has-file {
  border-color: #16a34a;
  background: #f0fdf4;
}

.tl-upload-box label {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tl-upload-icon {
  font-size: 32px;
}

.tl-upload-label {
  font-weight: 600;
  color: #374151;
}

.tl-upload-filename {
  color: #16a34a;
  font-size: 13px;
}

.tl-upload-hint {
  color: #6b7280;
  font-size: 12px;
}

.tl-file-input {
  display: none;
}

.tl-upload-note {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 15px;
}

.tl-upload-note a {
  color: #2563eb;
}

.tl-alternative-info {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  color: #92400e;
  margin-bottom: 15px;
}

/* Agreement Styles */
.tl-agreement-scroll {
  height: 250px;
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

/* Review Step Styles */
.tl-order-summary,
.tl-customer-summary,
.tl-payment-notice {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.tl-order-summary h4,
.tl-customer-summary h4,
.tl-payment-notice h4 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #1f2937;
}

.tl-summary-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tl-summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.tl-summary-total {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 16px;
}

.tl-customer-summary p {
  margin: 4px 0;
  font-size: 14px;
}

.tl-payment-notice {
  background: #fefce8;
  border-color: #fde047;
}

.tl-payment-notice ul {
  margin: 8px 0;
  padding-left: 20px;
}

.tl-payment-notice li {
  font-size: 14px;
  margin-bottom: 4px;
}

.tl-payment-notice em {
  color: #dc2626;
}

/* Actions */
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
