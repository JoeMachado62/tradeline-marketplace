<template>
  <div id="tl-checkout-root" class="tl-modal-overlay" @click.self="$emit('close')">
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
              v-model="store.checkoutForm.name"
              type="text"
              required
              placeholder="John Doe"
            />
          </div>

          <div class="tl-form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="store.checkoutForm.email"
              type="email"
              required
              placeholder="john@example.com"
            />
          </div>

          <div class="tl-form-group">
            <label for="phone">Phone Number</label>
            <input
              id="phone"
              v-model="store.checkoutForm.phone"
              type="tel"
              required
              placeholder="(555) 123-4567"
            />
          </div>

          <div class="tl-form-group">
            <label for="dob">Date of Birth</label>
            <input
              id="dob"
              v-model="store.checkoutForm.date_of_birth"
              type="date"
              required
            />
          </div>

          <div class="tl-form-group">
            <label for="address">Full Address</label>
            <textarea
              id="address"
              v-model="store.checkoutForm.address"
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
                v-model="store.checkoutForm.password"
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
            <div class="tl-upload-box" :class="{ 'has-file': idDocument }" style="position: relative;">
              <div class="tl-upload-icon" style="pointer-events: none;">{{ idDocument ? '✓' : '📄' }}</div>
              <span class="tl-upload-label" style="pointer-events: none;">Driver's License / Passport / State ID</span>
              <span class="tl-upload-filename" v-if="idDocument" style="pointer-events: none;">{{ idDocument.name }}</span>
              <span class="tl-upload-hint" v-else style="pointer-events: none;">Click to upload (Color copy required)</span>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                @change="handleIdUpload"
                class="tl-file-input"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 100; pointer-events: auto;"
              />
            </div>

            <div class="tl-upload-box" :class="{ 'has-file': ssnDocument }" style="position: relative;">
              <div class="tl-upload-icon" style="pointer-events: none;">{{ ssnDocument ? '✓' : '📄' }}</div>
              <span class="tl-upload-label" style="pointer-events: none;">Social Security Card</span>
              <span class="tl-upload-filename" v-if="ssnDocument" style="pointer-events: none;">{{ ssnDocument.name }}</span>
              <span class="tl-upload-hint" v-else style="pointer-events: none;">Click to upload (Color copy required)</span>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                @change="handleSsnUpload"
                class="tl-file-input"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 100; pointer-events: auto;"
              />
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
            Please read the entire agreement below. You must scroll to the bottom to proceed.
          </p>

          <!-- Scroll Progress Indicator -->
          <div class="tl-scroll-progress">
            <div class="tl-progress-bar" :style="{ width: scrollProgress + '%' }"></div>
            <span class="tl-progress-text">{{ hasScrolledToBottom ? '✓ Fully Read' : Math.round(scrollProgress) + '% read' }}</span>
          </div>

          <!-- Full Agreement Container -->
          <div 
            class="tl-agreement-scroll" 
            @scroll="handleAgreementScroll"
          >
            <div class="tl-agreement-content">
              <h3>TRADELINE USER AGREEMENT</h3>
              
              <h4>PARTIES</h4>
              <p>This agreement is between Credit Services US, LLC, dba TradeLineRental.com (hereinafter "TLR") and the undersigned client (hereinafter "Client"). By signing this agreement, Client certifies that he/she is at least 18 years of age, that the information he/she has provided to TLR is true and complete, that he/she is legally authorized to enter into this agreement and authorize the actions of TLR as set forth herein, and that he/she will not use any of the products of TLR or any information provided by TLR for any unlawful or deceptive purpose.</p>

              <h4>DEFINITION OF TRADELINE</h4>
              <p>The term "tradeline" refers to the line-item for a credit account on a credit bureau report. As used throughout this agreement the term refers to a line of revolving credit, such as a credit card, which forms the basis of the credit bureau report. Client will be added as an "Authorized User" onto the purchased line of credit, resulting in the tradeline also appearing on Client's credit bureau report.</p>

              <h4>TRADELINE PRODUCT</h4>
              <p>TLR agrees to use its best efforts to perform all functions necessary to have Client added as an "Authorized User" to the tradelines he/she selected to report to his/her credit report by the last day in the advertised Reporting Period. It is understood and agreed by both parties that Client will maintain "Authorized User" status on those tradelines for two (2) billing/posting cycles for each tradeline after being added thereto, after which he/she will be removed therefrom. Accordingly, it is the understanding and intent of the parties that Client will receive two consecutive postings of each tradeline to his/her credit bureau report and this "Authorized User" status shall be reported by two (2) or more credit bureaus.</p>
              <p>The parties further understand and agree that Client will only be added to tradelines with the full advance knowledge, consent and participation of the primary account holder of the account to which that tradeline pertains. TLR shall coordinate with the primary account holder of the account(s) ("TLR Credit Sponsors") to ensure the Client is added as an authorized user. While TLR does not have direct control over such, TLR Credit Sponsors are expected to maintain low balances on their accounts (15% or less of the total credit limit) while a client is an active authorized user and they are expected to keep their accounts in good standing with on time payments.</p>

              <h4>FEES</h4>
              <p>Client agrees to pay the non-refundable fee specified on the selected tradelines for purchase during checkout. Client understands and agrees that this fee is to be paid in full prior to the delivery of tradeline product. Client understands and agrees that the tradeline order will not be processed until TLR has received the entire fee, and that all fee payments received are to be considered earned upon receipt and non-refundable, unless a non-posting or non-performance by TLR occurs.</p>

              <h4 class="tl-warning-heading">⚠️ ABSENCE OF GUARANTEE</h4>
              <p class="tl-warning-text">Client understands and agrees that TLR cannot, and does not, make any predictions, promises, guarantees, warranties or assurances of any kind with regard to the result or effect of its product on Client's credit score or other component of credit worthiness. TLR does not make any claims as to the improvement of the Client's credit rating or the removal or correction of any items appearing on the Client's credit report(s). TLR is not a credit repair company. <strong>Client understands that by using TLR's website platform and products, the Client's credit rating may in fact decline.</strong></p>

              <h4>WARRANTIES</h4>
              <p>THERE ARE NO OTHER WARRANTIES EXPRESS OR IMPLIED. No other promise, other than what is stated in the PROOF OF NON-PERFORMANCE clause, has been made to the client, and the client specifically agrees that no additional promises, representations, or express and/or implied warranties other than those terms spelled out in this Agreement were made with respect to the services to be rendered or outcome to be achieved.</p>

              <h4>PROOF OF NON-PERFORMANCE / NON-POSTING FOR REFUND OR EXCHANGE</h4>
              <p>The parties acknowledge and agree that non-postings may occur and, in this event, we offer a "money back guarantee" and not an "absolute guarantee" of a tradeline posting. Therefore, in the event Client's authorized user status has not posted to two (2) of the credit bureaus within the reporting period, and the Client has not requested they be removed from a given tradeline, TLR shall per the Client's choice either provide a full refund of the Client's fees, a full refund in the form of a store credit, or an exchange for another tradeline.</p>
              <p>TLR will be obligated to provide the Client with the refund, store credit, or exchange within ten (10) days of the date it receives written proof from the Client of TLR's non-performance, provided such written proof is received by TLR via email within twenty-one (21) days of the date by which Client's tradeline should have been reported.</p>

              <h4>CLIENT RESPONSIBILITIES</h4>
              <p>Client agrees, understands, and certifies that they must remove any credit freezes and/or fraud alerts from each of the three major bureaus in order for a tradeline to post. Also, Client understands that if they have engaged in any credit sweeps, have ever had any derogatory accounts with any of the banks they are buying a tradeline from, including 90 day or more late payments, collections, or charge offs due to bankruptcy, in any of these events, the tradeline likely will not post. Client understands that they must have an up to date address that can be verified within the bank's verification systems.</p>

              <h4>AUTHORIZATION/USE OF PERSONAL INFORMATION</h4>
              <p>Client hereby grants to TLR full authority to use his/her information for the sole purpose of adding him/her to the selected tradeline. Client authorizes TLR to verify and validate through a professional third-party verification service all information provided including but not limited to driver's license information, social security number, date of birth, full legal name, address, and phone number. If Client does not provide TLR with any documents it may request from Client within 48 hours, Client's order may be cancelled.</p>

              <h4>USE OF FALSE OR UNAUTHORIZED INFORMATION</h4>
              <p>Client agrees that he/she will not use, provide, or submit to TLR, any alternate Social Security Number (SSN), Credit Protection Number (CPN), Employer Identification Number (EIN), Taxpayer Identification Number (TIN), or any information that is false, fraudulent, illegal or unauthorized. Upon the discovery of such false, fraudulent, illegal or unauthorized information, TLR shall have the absolute right to terminate this agreement and remove the Client from any tradelines to which he/she has been added by TLR and contact law enforcement authorities as necessary. Client agrees that in that event, any and all fees paid to TLR shall not be refunded to Client.</p>

              <h4>INDEMNIFICATION</h4>
              <p>Client shall fully indemnify, hold harmless and defend TLR and its directors, officers, employees, agents, stockholders, representatives and affiliates from and against any and all claims, actions, suits, demands, damages, liabilities, obligations, losses, settlements, judgments, costs and expenses including but not limited to attorney's fees and costs, which arise out of, result from, or in any way relate to any breach of this agreement or of any legal duty owed to TLR, any misrepresentation made to TLR, or the providing of any false, fraudulent, illegal or unauthorized information to TLR.</p>

              <h4>LIMITATION OF LIABILITY</h4>
              <p>Client agrees that any liability on the part of TLR for any damage of any kind that may result from any alleged breach of any part of this agreement or any other act or omission alleged on the part of TLR, whether in contract, tort or otherwise, shall be limited to the amount of any fees actually paid by Client to TLR under this agreement.</p>

              <h4>GOVERNING LAW</h4>
              <p>This Agreement and the rights of the parties hereunder shall be governed by and construed in accordance with the laws of the State of Florida, exclusive of conflict or choice of law rules. The parties acknowledge that this Agreement is evidence of a transaction involving interstate commerce. Any arbitration conducted pursuant to this Agreement shall be governed by the Federal Arbitration Act (9 U.S.C., Secs. 1-16). <strong>Both Parties to this Agreement waive their right to bring or to participate in class proceedings against one another.</strong></p>

              <h4>DISPUTE RESOLUTION</h4>
              <p><strong>THE FOLLOWING PROVISIONS RESTRICT AND ELIMINATE YOUR RIGHTS TO SUE IN COURT AND HAVE A JURY TRIAL FOR DISPUTES ARISING UNDER THESE TERMS AND CONDITIONS.</strong></p>
              <p>If the Parties are unable to resolve a Dispute through negotiations, the Dispute shall be determined by binding arbitration in San Diego County, State of California, before one (1) arbitrator. The arbitration shall be administered by JAMS pursuant to its Comprehensive Arbitration Rules and Procedures.</p>

              <h4>FORCE MAJEURE</h4>
              <p>In the event of interruption of TLR's business in whole or in part by reason of fire, flood, wind, storm, earthquake, war, strike, embargo, pandemic, epidemic, acts of God, governmental action, or any cause beyond TLR's control, TLR shall have the option of cancelling or extending terms of this Agreement.</p>

              <h4>ENTIRE AGREEMENT</h4>
              <p>It is understood and agreed that this document sets forth the entire agreement and understanding of the parties, and supersedes all other verbal or written agreements made prior to or concurrent with this agreement.</p>

              <h4>ELECTRONIC SIGNATURES</h4>
              <p>In 2000, the U.S. Electronic Signatures in Global and National Commerce (ESIGN) Act established electronic records and signatures as legally binding, having the same legal effects as traditional paper documents and handwritten signatures. By typing your full legal name below, you are executing this agreement with the same legal effect as a handwritten signature.</p>

              <div class="tl-agreement-end">
                <p>— END OF AGREEMENT —</p>
              </div>
            </div>
          </div>

          <!-- Agreement Checkboxes (only enabled after scrolling) -->
          <div class="tl-agreement-checkboxes" :class="{ 'disabled': !hasScrolledToBottom }">
            <div class="tl-checkbox-row">
              <label class="tl-checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="agreementAccepted" 
                  :disabled="!hasScrolledToBottom"
                />
                <span>I have read and agree to the complete Authorized User Agreement above, including all terms regarding fees, refund policy, limitations of liability, and dispute resolution.</span>
              </label>
            </div>
            <div class="tl-checkbox-row">
              <label class="tl-checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="esignConsent" 
                  :disabled="!hasScrolledToBottom"
                />
                <span>I consent to sign this agreement electronically. I understand that my typed name below constitutes a legally binding signature under the ESIGN Act.</span>
              </label>
            </div>
          </div>

          <!-- Typed Signature -->
          <div class="tl-signature-section" :class="{ 'disabled': !agreementAccepted || !esignConsent }">
            <label>Type Your Full Legal Name to Sign:</label>
            <input 
              type="text" 
              v-model="typedSignature" 
              placeholder="Enter your full legal name exactly as it appears on your ID"
              class="tl-signature-input"
              :disabled="!agreementAccepted || !esignConsent"
            />
            
            <!-- Signature Preview -->
            <div v-if="typedSignature && agreementAccepted && esignConsent" class="tl-signature-preview">
              <span class="tl-signature-text">{{ typedSignature }}</span>
              <span class="tl-signature-date">Date: {{ new Date().toLocaleDateString() }}</span>
            </div>
          </div>

          <div class="tl-actions">
            <button @click="step = 2" class="tl-btn tl-btn-secondary">Back</button>
            <button 
              @click="goToReview" 
              class="tl-btn tl-btn-primary"
              :disabled="!hasScrolledToBottom || !agreementAccepted || !esignConsent || !typedSignature.trim()"
            >
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
            <p><strong>Name:</strong> {{ store.checkoutForm.name }}</p>
            <p><strong>Email:</strong> {{ store.checkoutForm.email }}</p>
            <p><strong>Phone:</strong> {{ store.checkoutForm.phone }}</p>
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
import { ref, computed, onMounted } from "vue";
import { useWidgetStore } from "../stores/widget";

const emit = defineEmits(["close"]);
const store = useWidgetStore();
const step = ref(1);
const showPassword = ref(false);
const showSsnAlternative = ref(false);

const idDocument = ref<File | null>(null);
const ssnDocument = ref<File | null>(null);

// Agreement scroll tracking
const scrollProgress = ref(0);
const hasScrolledToBottom = ref(false);
const agreementAccepted = ref(false);
const esignConsent = ref(false);
const typedSignature = ref("");

const handleAgreementScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target) return;
  
  const scrollTop = target.scrollTop;
  const scrollHeight = target.scrollHeight - target.clientHeight;
  
  // Calculate progress percentage
  if (scrollHeight > 0) {
    scrollProgress.value = Math.min((scrollTop / scrollHeight) * 100, 100);
  }
  
  // Check if scrolled to bottom (within 50px tolerance)
  if (scrollHeight - scrollTop <= 50) {
    hasScrolledToBottom.value = true;
  }
};

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

const goToReview = () => {
  if (!hasScrolledToBottom.value) {
    alert("Please scroll to the bottom of the agreement to read the full terms.");
    return;
  }
  
  if (!agreementAccepted.value) {
    alert("Please check the box to acknowledge you have read and agree to the terms.");
    return;
  }
  
  if (!esignConsent.value) {
    alert("Please check the box to consent to electronic signature.");
    return;
  }
  
  if (!typedSignature.value.trim()) {
    alert("Please type your full legal name to sign the agreement.");
    return;
  }
  
  step.value = 4;
};

const submitOrder = async () => {
  await store.checkoutWithDocuments({
    ...store.checkoutForm,
    signature: typedSignature.value.trim(), // Send typed name as signature
    idDocument: idDocument.value,
    ssnDocument: ssnDocument.value
  });
};

onMounted(() => {
  // Inject critical CSS for the Checkout Modal
  const styleId = 'tl-checkout-critical-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      #tl-checkout-root.tl-modal-overlay {
        position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5); display: flex !important;
        justify-content: center !important; align-items: center !important;
        z-index: 2147483647 !important;
      }
      #tl-checkout-root * { box-sizing: border-box; font-family: 'Roboto', sans-serif, system-ui; }
      
      #tl-checkout-root .tl-modal {
        background: white; width: 95%; max-width: 700px; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); display: flex !important;
        flex-direction: column !important; max-height: 90vh; overflow-y: auto !important;
        position: relative;
      }
      #tl-checkout-root .tl-modal-lg { max-width: 900px; }
      
      #tl-checkout-root .tl-modal-header {
        padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex !important;
        justify-content: space-between !important; align-items: center !important;
        background: #f8fafc; border-radius: 8px 8px 0 0;
      }
      #tl-checkout-root .tl-modal-header h3 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
      
      #tl-checkout-root .tl-steps-indicator { display: flex; gap: 8px; }
      #tl-checkout-root .tl-steps-indicator span {
        width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 600; color: #64748b;
      }
      #tl-checkout-root .tl-steps-indicator span.active { background: #051b41; color: white; }
      #tl-checkout-root .tl-steps-indicator span.complete { background: #16a34a; color: white; }
      
      #tl-checkout-root .tl-close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
      #tl-checkout-root .tl-close-btn:hover { color: #0f172a; }

      #tl-checkout-root .tl-modal-body { padding: 30px; }
      #tl-checkout-root .tl-modal-desc { margin-bottom: 25px; color: #475569; font-size: 15px; }

      #tl-checkout-root .tl-form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
      #tl-checkout-root .tl-form-group label { font-size: 14px; font-weight: 600; color: #334155; }
      #tl-checkout-root .tl-form-group input, 
      #tl-checkout-root .tl-form-group textarea {
        padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px;
        font-size: 16px; outline: none; transition: border-color 0.2s; width: 100%;
      }
      #tl-checkout-root .tl-form-group input:focus,
      #tl-checkout-root .tl-form-group textarea:focus { border-color: #051b41; box-shadow: 0 0 0 2px rgba(5,27,65,0.1); }

      #tl-checkout-root .tl-btn {
        padding: 14px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;
        cursor: pointer; border: none; transition: all 0.2s;
      }
      #tl-checkout-root .tl-btn-primary { background: #051b41; color: white; width: 100%; }
      #tl-checkout-root .tl-btn-primary:hover { background: #020f26; }
      #tl-checkout-root .tl-btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
      #tl-checkout-root .tl-btn-secondary:hover { background: #e2e8f0; }

      #tl-checkout-root .tl-password-wrapper { position: relative; }
      #tl-checkout-root .tl-toggle-password {
        position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
        background: none; border: none; cursor: pointer; font-size: 18px;
      }
      
      #tl-checkout-root .tl-actions { display: flex; gap: 15px; margin-top: 30px; }
      #tl-checkout-root .tl-actions button { flex: 1; }

      /* Upload Boxes */
      #tl-checkout-root .tl-upload-box {
        border: 2px dashed #cbd5e1; border-radius: 8px; padding: 25px;
        text-align: center; cursor: pointer; margin-bottom: 15px; transition: all 0.2s;
        background: #f8fafc; position: relative; /* For absolute input */
      }
      #tl-checkout-root .tl-upload-box:hover { border-color: #051b41; background: #f1f5f9; }
      #tl-checkout-root .tl-upload-box.has-file { border-color: #16a34a; background: #f0fdf4; }
      #tl-checkout-root .tl-upload-box { user-select: none; }
      #tl-checkout-root .tl-upload-icon { font-size: 28px; margin-bottom: 10px; }
      #tl-checkout-root .tl-upload-label { font-weight: 600; display: block; margin-bottom: 5px; color: #334155; }
      #tl-checkout-root .tl-upload-hint { font-size: 13px; color: #64748b; }
      #tl-checkout-root .tl-file-input { 
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
        opacity: 0; cursor: pointer; z-index: 10;
      }

      /* Scroll Progress Bar */
      #tl-checkout-root .tl-scroll-progress {
        background: #e2e8f0; border-radius: 10px; height: 24px; margin-bottom: 15px;
        position: relative; overflow: hidden;
      }
      #tl-checkout-root .tl-progress-bar {
        background: linear-gradient(90deg, #f59e0b 0%, #22c55e 100%);
        height: 100%; border-radius: 10px; transition: width 0.1s ease-out;
      }
      #tl-checkout-root .tl-progress-text {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 12px; font-weight: 600; color: #334155;
      }

      /* Agreement Scroll Container */
      #tl-checkout-root .tl-agreement-scroll {
        height: 350px; overflow-y: auto; border: 2px solid #e2e8f0; padding: 25px;
        border-radius: 8px; background: white; margin-bottom: 20px;
      }
      #tl-checkout-root .tl-agreement-content h3 {
        text-align: center; color: #1e3a5f; margin: 0 0 25px 0; font-size: 18px;
        border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;
      }
      #tl-checkout-root .tl-agreement-content h4 {
        color: #1e3a5f; margin: 25px 0 10px 0; font-size: 14px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      #tl-checkout-root .tl-agreement-content p {
        margin-bottom: 15px; line-height: 1.6; font-size: 14px; color: #334155;
      }
      #tl-checkout-root .tl-warning-heading {
        color: #92400e !important; background: #fef3c7; padding: 8px 12px;
        border-radius: 6px; display: inline-block;
      }
      #tl-checkout-root .tl-warning-text {
        background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;
      }
      #tl-checkout-root .tl-agreement-end {
        text-align: center; padding: 30px 0; margin-top: 30px;
        border-top: 2px solid #e2e8f0;
      }
      #tl-checkout-root .tl-agreement-end p {
        color: #64748b; font-weight: 600; font-style: italic;
      }
      
      /* Agreement Checkboxes */
      #tl-checkout-root .tl-agreement-checkboxes {
        background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px;
        padding: 15px; margin-bottom: 20px;
      }
      #tl-checkout-root .tl-agreement-checkboxes.disabled {
        background: #f8fafc; border-color: #cbd5e1; opacity: 0.6;
      }
      #tl-checkout-root .tl-checkbox-row {
        margin-bottom: 12px;
      }
      #tl-checkout-root .tl-checkbox-row:last-child {
        margin-bottom: 0;
      }
      #tl-checkout-root .tl-checkbox-label {
        display: flex; align-items: flex-start; gap: 12px; cursor: pointer;
      }
      #tl-checkout-root .tl-checkbox-label input[type="checkbox"] {
        width: 20px; height: 20px; margin-top: 2px; cursor: pointer;
        accent-color: #22c55e; flex-shrink: 0;
      }
      #tl-checkout-root .tl-checkbox-label input[type="checkbox"]:disabled {
        cursor: not-allowed;
      }
      #tl-checkout-root .tl-checkbox-label span {
        font-size: 13px; color: #166534; line-height: 1.5;
      }
      #tl-checkout-root .tl-agreement-checkboxes.disabled .tl-checkbox-label span {
        color: #64748b;
      }
      
      /* Typed Signature */
      #tl-checkout-root .tl-signature-section { margin-bottom: 20px; }
      #tl-checkout-root .tl-signature-section.disabled { opacity: 0.6; }
      #tl-checkout-root .tl-signature-section label { 
        font-weight: 600; display: block; margin-bottom: 10px; color: #334155; 
      }
      #tl-checkout-root .tl-signature-input {
        width: 100%; padding: 14px; border: 1px solid #cbd5e1; border-radius: 6px;
        font-size: 16px; margin-bottom: 15px;
      }
      #tl-checkout-root .tl-signature-input:focus {
        border-color: #051b41; outline: none; box-shadow: 0 0 0 2px rgba(5,27,65,0.1);
      }
      #tl-checkout-root .tl-signature-input:disabled {
        background: #f8fafc; cursor: not-allowed;
      }
      #tl-checkout-root .tl-signature-preview {
        background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px;
        padding: 20px; text-align: center;
      }
      #tl-checkout-root .tl-signature-text {
        display: block; font-family: 'Brush Script MT', 'Segoe Script', cursive;
        font-size: 32px; color: #1e3a5f; margin-bottom: 5px;
      }
      #tl-checkout-root .tl-signature-date {
        display: block; font-size: 12px; color: #64748b;
      }
      
      /* Summary */
      #tl-checkout-root .tl-order-summary,
      #tl-checkout-root .tl-customer-summary,
      #tl-checkout-root .tl-payment-notice {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        padding: 20px; margin-bottom: 20px;
      }
      #tl-checkout-root .tl-summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
      #tl-checkout-root .tl-summary-total { border-top: 1px solid #cbd5e1; margin-top: 15px; padding-top: 15px; display: flex; justify-content: space-between; font-size: 18px; }
    `;
    document.head.appendChild(styleEl);
  }
});
</script>

