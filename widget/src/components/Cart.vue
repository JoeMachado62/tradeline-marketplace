<template>
  <div id="tl-cart-root" class="tl-cart" :style="computedRootStyles" :class="{ 'tl-view-checkout': currentView === 'checkout' }">
    <div class="tl-cart-header">
      <h3 v-if="currentView === 'cart'">Your Cart ({{ store.cartItemCount }})</h3>
      <h3 v-else>
         <button @click="backToCart" class="tl-back-nav-btn">← Back</button>
         Checkout
      </h3>
      <button class="tl-close-btn" @click="$emit('close')">&times;</button>
    </div>

    <!-- CART VIEW -->
    <div v-if="currentView === 'cart'" class="tl-view-container">
      <div v-if="store.cart.length === 0" class="tl-empty-cart">
        <span style="font-size: 48px">🛒</span>
        <p>Your cart is empty</p>
        <button class="tl-btn tl-btn-outline" @click="$emit('close')">
          Browse Tradelines
        </button>
      </div>

      <div v-else class="tl-cart-content">
        <div class="tl-cart-items">
          <div v-for="item in store.cart" :key="item.tradeline.card_id" class="tl-cart-item">
            <div class="tl-item-info">
              <h4>{{ item.tradeline.bank_name }}</h4>
              <span class="tl-item-meta"
                >Limit: ${{ item.tradeline.credit_limit.toLocaleString() }}</span
              >
            </div>
            <div class="tl-item-price">
              ${{ (item.tradeline.price * item.quantity).toLocaleString() }}
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

        <div class="tl-cart-footer">
        <div v-if="store.cartItemCount >= 2 && store.promoCode !== '10-30OFF' && showPromoCodeFunc" class="tl-discount-badge">
            🎁 Add 2+ lines? Use code "10-30OFF" for Package Discounts!
          </div>

          <div class="tl-promo-group" v-if="showPromoCodeFunc">
            <input 
              v-model="store.promoCode" 
              class="tl-promo-input" 
              placeholder="Promo Code" 
              @input="store.calculateTotals"
            />
          </div>
          
          <div v-if="store.promoCode === '10-30OFF' && store.calculationResult?.multi_line_discount" style="color: #16a34a; font-size: 13px; margin-top: -15px; margin-bottom: 15px; font-weight: 500;">
            ✓ Package Deal Discount Applied!
          </div>
          <div v-else-if="store.promoCode && store.promoCode !== '10-30OFF'" style="color: #ef4444; font-size: 12px; margin-top: -15px; margin-bottom: 15px;">
            Invalid promo code
          </div>

          <div class="tl-total-row">
            <span>Subtotal</span>
            <span>${{ (store.calculationResult?.subtotal ?? store.cartSubtotal).toLocaleString() }}</span>
          </div>
          
          <div v-if="store.calculationResult?.multi_line_discount" class="tl-total-row tl-discount-row">
            <span>Multi-Line Discount</span>
            <span>-${{ store.calculationResult.multi_line_discount.toLocaleString() }}</span>
          </div>

          <div class="tl-total-row tl-grand-total">
            <span>Total</span>
            <span>${{ (store.calculationResult?.total ?? store.cartSubtotal).toLocaleString() }}</span>
          </div>

          <button class="tl-btn tl-btn-primary" @click="startCheckout">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>

    <!-- CHECKOUT VIEW -->
    <div v-else class="tl-view-container tl-checkout-container">
        <!-- Step Indicator -->
        <div class="tl-checkout-steps">
           <div class="tl-step" :class="{ active: checkoutStep >= 1, completed: checkoutStep > 1 }">1. Info</div>
           <div class="tl-step-line"></div>
           <div class="tl-step" :class="{ active: checkoutStep >= 2, completed: checkoutStep > 2 }">2. Docs</div>
           <div class="tl-step-line"></div>
           <div class="tl-step" :class="{ active: checkoutStep >= 3, completed: checkoutStep > 3 }">3. Sign</div>
           <div class="tl-step-line"></div>
           <div class="tl-step" :class="{ active: checkoutStep >= 4, completed: checkoutStep > 4 }">4. Review</div>
        </div>

        <div class="tl-checkout-scroll-area">
          <!-- Step 1: User Details -->
          <form v-if="checkoutStep === 1" @submit.prevent="nextStep" class="tl-checkout-form">
            <div class="tl-form-group">
              <label>Full Name</label>
              <input v-model="store.checkoutForm.name" type="text" required placeholder="Legal Name" />
            </div>
            <div class="tl-form-group">
              <label>Email</label>
              <input v-model="store.checkoutForm.email" type="email" required placeholder="john@example.com" />
            </div>
            <div class="tl-form-group">
              <label>Phone</label>
              <input v-model="store.checkoutForm.phone" type="tel" required />
            </div>
            <div class="tl-form-group">
              <label>Date of Birth</label>
              <input v-model="store.checkoutForm.date_of_birth" type="date" required />
            </div>
             <div class="tl-form-group">
              <label>Street Address</label>
              <input v-model="streetAddress" type="text" required placeholder="123 Main St" />
            </div>

            <div class="tl-form-group-row">
              <div class="tl-form-group" style="flex: 1">
                 <label>Zip Code</label>
                 <input 
                    v-model="zipCode" 
                    type="text" 
                    required 
                    placeholder="12345" 
                    maxlength="5" 
                    @input="lookupZip"
                 />
              </div>
              <div class="tl-form-group" style="flex: 2">
                 <label>City</label>
                  <select v-model="city" :disabled="availableCities.length === 0" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px;">
                     <option value="" disabled>Select City</option>
                     <option v-for="c in availableCities" :key="c" :value="c">{{ c }}</option>
                  </select>
              </div>
               <div class="tl-form-group" style="flex: 0.5">
                 <label>State</label>
                 <input v-model="state" type="text" readonly style="background: #f1f5f9; cursor: not-allowed;" />
              </div>
            </div>
            <div class="tl-form-group">
              <label>Password</label>
              <div class="tl-password-wrapper">
                <input 
                  v-model="store.checkoutForm.password" 
                  :type="showPassword ? 'text' : 'password'" 
                  required 
                  minlength="8" 
                  placeholder="Create account password" 
                />
                <button type="button" class="tl-password-toggle" @click="showPassword = !showPassword">
                  {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>

            <!-- Validation Errors -->
            <div v-if="validationErrors.length > 0" class="tl-error-msg">
                <div v-for="(err, index) in validationErrors" :key="index">• {{ err }}</div>
            </div>

            <button type="submit" class="tl-btn tl-btn-primary">Next: Documents</button>
          </form>

          <!-- Step 2: Documents -->
          <div v-else-if="checkoutStep === 2" class="tl-checkout-form">
            <p style="margin-bottom: 20px; font-size: 14px; color: #64748b;">Upload copies of your ID and SSN card. Files are encrypted and used only for verification. These are required to add the tradelines to your credit reports.</p>
            
            <div 
              class="tl-upload-box" 
              :class="{ 'has-file': idDocument }"
              @click="triggerIdUpload"
              style="cursor: pointer;"
            >
              <input 
                ref="idFileInput"
                type="file" 
                accept="image/*,.pdf" 
                @change="handleIdUpload" 
                style="display: none;"
              />
              <span style="font-size: 24px;">{{ idDocument ? '✅' : '📄' }}</span>
              <p style="margin: 10px 0 0 0; font-weight: 600;">{{ idDocument ? idDocument.name : 'Upload ID (Driver License/Passport)' }}</p>
              <p v-if="!idDocument" style="font-size: 12px; color: #94a3b8; margin-top: 5px;">Click to select file</p>
            </div>
            
            <div 
              class="tl-upload-box" 
              :class="{ 'has-file': ssnDocument }"
              @click="triggerSsnUpload"
              style="cursor: pointer;"
            >
              <input 
                ref="ssnFileInput"
                type="file" 
                accept="image/*,.pdf" 
                @change="handleSsnUpload" 
                style="display: none;"
              />
              <span style="font-size: 24px;">{{ ssnDocument ? '✅' : '📄' }}</span>
              <p style="margin: 10px 0 0 0; font-weight: 600;">{{ ssnDocument ? ssnDocument.name : 'Upload SSN Card' }}</p>
              <p v-if="!ssnDocument" style="font-size: 12px; color: #94a3b8; margin-top: 5px;">Click to select file</p>
            </div>
            
             <div class="tl-actions-row">
                <button @click="checkoutStep = 1" class="tl-btn tl-btn-secondary">Back</button>
                <button @click="checkoutStep = 3" class="tl-btn tl-btn-primary" :disabled="!idDocument">Next: Agreement</button>
             </div>
          </div>

           <!-- Step 3: Agreement -->
          <div v-else-if="checkoutStep === 3" class="tl-checkout-form">
             <!-- Scroll Progress -->
             <div style="background: #e2e8f0; border-radius: 10px; height: 24px; margin-bottom: 15px; position: relative; overflow: hidden;">
               <div :style="{ width: scrollProgress + '%', background: 'linear-gradient(90deg, #f59e0b 0%, #22c55e 100%)', height: '100%', borderRadius: '10px', transition: 'width 0.1s ease-out' }"></div>
               <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: 600; color: #334155;">{{ hasScrolledToBottom ? '✓ Fully Read' : Math.round(scrollProgress) + '% read' }}</span>
             </div>

             <div class="tl-agreement-box" @scroll="handleAgreementScroll" style="height: 300px; overflow-y: auto;">
                <h4>TRADELINE USER AGREEMENT</h4>
                
                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">PARTIES</h5>
                <p>This agreement is between Credit Services US, LLC 1479 SW 18 TERR FORT LAUDERDALE, FL 33312 (hereinafter "TLR") and the undersigned client (hereinafter "Client"). By signing this agreement, Client certifies that he/she is at least 18 years of age, that the information he/she has provided to TLR is true and complete, that he/she is legally authorized to enter into this agreement, and that he/she will not use any of the products of TLR for any unlawful or deceptive purpose.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">DEFINITION OF TRADELINE</h5>
                <p>The term "tradeline" refers to the line-item for a credit account on a credit bureau report. Client will be added as an "Authorized User" onto the purchased line of credit, resulting in the tradeline also appearing on Client's credit bureau report.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">TRADELINE PRODUCT</h5>
                <p>TLR agrees to use its best efforts to have Client added as an "Authorized User" to the selected tradelines by the last day in the advertised Reporting Period. Client will maintain "Authorized User" status for two (2) billing/posting cycles. This status shall be reported by two (2) or more credit bureaus.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">FEES</h5>
                <p>Client agrees to pay the non-refundable fee specified on the selected tradelines. All fee payments are earned upon receipt and non-refundable, unless a non-posting or non-performance by TLR occurs.</p>

                <h5 style="color: #92400e; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase; background: #fef3c7; padding: 8px; border-radius: 4px;">⚠️ ABSENCE OF GUARANTEE</h5>
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">TLR cannot, and does not, make any predictions, promises, guarantees, warranties or assurances of any kind with regard to the result or effect of its product on Client's credit score. TLR is not a credit repair company. <strong>Client understands that by using TLR's products, the Client's credit rating may in fact decline.</strong></p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">WARRANTIES</h5>
                <p>THERE ARE NO OTHER WARRANTIES EXPRESS OR IMPLIED beyond those explicitly stated in this Agreement.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">PROOF OF NON-PERFORMANCE / NON-POSTING FOR REFUND OR EXCHANGE</h5>
                <p>If Client's authorized user status has not posted to two (2) of the credit bureaus within the reporting period, TLR shall provide a full refund, store credit, or exchange. Written proof must be received within twenty-one (21) days of the reporting period.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">CLIENT RESPONSIBILITIES</h5>
                <p>Client must remove any credit freezes and/or fraud alerts from each of the three major bureaus. If Client has derogatory accounts or has engaged in credit sweeps, the tradeline likely will not post. Failure to comply voids refund eligibility.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">AUTHORIZATION/USE OF PERSONAL INFORMATION</h5>
                <p>Client authorizes TLR to use personal information for adding tradelines and to verify identity via third-party services. If documents are not provided within 48 hours, the order may be cancelled.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">USE OF FALSE OR UNAUTHORIZED INFORMATION</h5>
                <p>Client agrees NOT to use CPNs, alternate SSNs, or any false information. Violations result in immediate termination, no refunds, and possible law enforcement referral.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">INDEMNIFICATION</h5>
                <p>Client shall fully indemnify and defend TLR against all claims arising from breach of agreement, misrepresentation, or fraudulent conduct.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">LIMITATION OF LIABILITY</h5>
                <p>TLR's liability shall be limited to the amount of fees actually paid by Client.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">GOVERNING LAW</h5>
                <p>This Agreement shall be governed by the laws of the State of Florida. Any arbitration shall be governed by the Federal Arbitration Act. <strong>Both Parties waive their right to participate in class proceedings.</strong></p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">DISPUTE RESOLUTION</h5>
                <p><strong>THE FOLLOWING PROVISIONS RESTRICT AND ELIMINATE YOUR RIGHTS TO SUE IN COURT AND HAVE A JURY TRIAL.</strong> Disputes shall be determined by binding arbitration in San Diego County, California.</p>

                <h5 style="color: #1e3a5f; margin: 20px 0 8px 0; font-size: 13px; text-transform: uppercase;">ELECTRONIC SIGNATURES</h5>
                <p>Electronic signatures are legally binding under the ESIGN Act (2000). By typing your full legal name below, you are executing this agreement with the same legal effect as a handwritten signature.</p>

                <div style="text-align: center; padding: 25px 0; margin-top: 20px; border-top: 2px solid #e2e8f0;">
                  <p style="color: #64748b; font-weight: 600; font-style: italic;">— END OF AGREEMENT —</p>
                </div>
             </div>
             
             <!-- Checkboxes (disabled until scrolled) -->
             <div :style="{ marginTop: '15px', background: hasScrolledToBottom ? '#f0fdf4' : '#f8fafc', padding: '12px', border: '1px solid ' + (hasScrolledToBottom ? '#22c55e' : '#cbd5e1'), borderRadius: '8px', opacity: hasScrolledToBottom ? 1 : 0.6 }">
               <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-bottom: 12px;">
                 <input type="checkbox" v-model="agreeToTerms" :disabled="!hasScrolledToBottom" style="width: 20px; height: 20px; margin-top: 2px; accent-color: #22c55e;" />
                 <span :style="{ fontSize: '13px', color: hasScrolledToBottom ? '#166534' : '#64748b', lineHeight: '1.5' }">
                   I have read and agree to the complete Authorized User Agreement above, including all terms regarding fees, refund policy, limitations of liability, and dispute resolution.
                 </span>
               </label>
               <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                 <input type="checkbox" v-model="esignConsent" :disabled="!hasScrolledToBottom" style="width: 20px; height: 20px; margin-top: 2px; accent-color: #22c55e;" />
                 <span :style="{ fontSize: '13px', color: hasScrolledToBottom ? '#166534' : '#64748b', lineHeight: '1.5' }">
                   I consent to sign this agreement electronically. I understand that my typed name below constitutes a legally binding signature under the ESIGN Act.
                 </span>
               </label>
             </div>

             <div class="tl-signature-area" :style="{ marginTop: '15px', opacity: (agreeToTerms && esignConsent) ? 1 : 0.5 }">
                <label>Type Your Full Legal Name to Sign:</label>
                <input 
                  type="text" 
                  v-model="typedSignature" 
                  :disabled="!agreeToTerms || !esignConsent"
                  placeholder="Enter your full legal name exactly as it appears on your ID"
                  style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 16px; margin-bottom: 10px;"
                />
                
                <!-- Signature Preview -->
                <div v-if="typedSignature && agreeToTerms && esignConsent" style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 10px;">
                  <span style="display: block; font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 28px; color: #1e3a5f;">{{ typedSignature }}</span>
                  <span style="display: block; font-size: 12px; color: #64748b;">Date: {{ new Date().toLocaleDateString() }}</span>
                </div>
             </div>
             <div class="tl-actions-row">
                <button @click="checkoutStep = 2" class="tl-btn tl-btn-secondary">Back</button>
                <button @click="goToReview" class="tl-btn tl-btn-primary" :disabled="!hasScrolledToBottom || !agreeToTerms || !esignConsent || !typedSignature.trim()">Next: Review</button>
             </div>
          </div>

          <!-- Step 4: Review -->
           <div v-else-if="checkoutStep === 4" class="tl-checkout-form">
             <div class="tl-review-summary">
                <h4>Order Summary</h4>
                <div v-for="item in store.cart" :key="item.tradeline.card_id" class="tl-review-item">
                   <span>{{ item.tradeline.bank_name }}</span>
                   <span>${{ item.tradeline.price * item.quantity }}</span>
                </div>
                <div class="tl-review-total">
                   Total: ${{ store.cartSubtotal }}
                </div>
             </div>
              <div v-if="store.error" class="tl-error-msg">{{ store.error }}</div>
              
              <div class="tl-actions-row">
                <button @click="checkoutStep = 3" class="tl-btn tl-btn-secondary">Back</button>
                <button @click="submitOrder" class="tl-btn tl-btn-primary" :disabled="store.loading">
                  {{ store.loading ? 'Processing...' : 'Submit Order' }}
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

// REMOVE external CheckoutModal import
// import CheckoutModal from "./CheckoutModal.vue"; 

const emit = defineEmits(["close"]);
const store = useWidgetStore();

// View State
const currentView = ref<'cart' | 'checkout'>('cart');
const checkoutStep = ref(1);
const showPassword = ref(false);

// Promo Code Visibility Logic
const showPromoCodeFunc = computed(() => {
  // Check explicit feature flag from config
  const features = store.config?.features;
  // If undefined, default to true (backward compatibility), otherwise use the flag
  // The backend sends 'allow_promo_codes', so we check exactly that.
  return features?.allow_promo_codes !== false;
});

// Files & Typed Signature
const idDocument = ref<File | null>(null);
const ssnDocument = ref<File | null>(null);
const typedSignature = ref("");

// File input refs for programmatic triggering
const idFileInput = ref<HTMLInputElement | null>(null);
const ssnFileInput = ref<HTMLInputElement | null>(null);

const triggerIdUpload = () => {
  idFileInput.value?.click();
};

const triggerSsnUpload = () => {
  ssnFileInput.value?.click();
};

// Agreement scroll tracking
const scrollProgress = ref(0);
const hasScrolledToBottom = ref(false);
const esignConsent = ref(false);

const handleAgreementScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target) return;
  
  const scrollTop = target.scrollTop;
  const scrollHeight = target.scrollHeight - target.clientHeight;
  
  if (scrollHeight > 0) {
    scrollProgress.value = Math.min((scrollTop / scrollHeight) * 100, 100);
  }
  
  // Check if scrolled to bottom (within 50px tolerance)
  if (scrollHeight - scrollTop <= 50) {
    hasScrolledToBottom.value = true;
  }
};


const backToCart = () => {
    currentView.value = 'cart';
    checkoutStep.value = 1;
};

const startCheckout = () => {
    currentView.value = 'checkout';
};

// Address Split Fields
const streetAddress = ref("");
const zipCode = ref("");
const city = ref("");
const state = ref("");
const availableCities = ref<string[]>([]);
const isZipLoading = ref(false);

const lookupZip = async () => {
  if (zipCode.value.length !== 5) return;
  
  isZipLoading.value = true;
  availableCities.value = [];
  city.value = "";
  state.value = "";

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zipCode.value}`);
    if (!res.ok) throw new Error("Invalid Zip");
    const data = await res.json();
    
    // Populate State
    state.value = data.places[0]["state abbreviation"];
    
    // Populate Cities (Zip can cover multiple)
    availableCities.value = data.places.map((p: any) => p["place name"]);
    
    // Auto-select first city
    if (availableCities.value.length > 0) {
      city.value = availableCities.value[0] || "";
    }
  } catch (e) {
    validationErrors.value.push("Invalid Zip Code or lookup failed.");
  } finally {
    isZipLoading.value = false;
  }
};


const validationErrors = ref<string[]>([]);

const validateStep1 = () => {
    validationErrors.value = [];
    const form = store.checkoutForm;

    // 1. Age Validation (18+)
    const birthDate = new Date(form.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    if (age < 18) {
        validationErrors.value.push("You must be at least 18 years old to proceed.");
    }

    // 2. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
        validationErrors.value.push("Please enter a valid email address.");
    }

    // 3. Phone Validation (Simple check for at least 10 digits)
    const phoneClean = form.phone.replace(/\D/g, ''); // Remove non-digits
    if (phoneClean.length < 10) {
        validationErrors.value.push("Please enter a valid phone number with area code.");
    }

    // 4. Address Validation (Split fields)
    if(!streetAddress.value || streetAddress.value.length < 5 || !/^\d+/.test(streetAddress.value)) {
       validationErrors.value.push("Please enter a valid Street Address (starting with number).");
    }
    if(!zipCode.value || zipCode.value.length !== 5) {
       validationErrors.value.push("Please enter a valid 5-digit Zip Code.");
    }
    if(!city.value || !state.value) {
       validationErrors.value.push("Please enter a valid Zip Code to auto-select City and State.");
    }

    // Sync back to store for backend compatibility
    if(validationErrors.value.length === 0) {
       store.checkoutForm.address = `${streetAddress.value}, ${city.value}, ${state.value} ${zipCode.value}`;
    }

    return validationErrors.value.length === 0;
};

const nextStep = () => {
    if (checkoutStep.value === 1) {
        if (!validateStep1()) return; // Stop if invalid
    }
    checkoutStep.value++;
};

const handleIdUpload = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if(t.files?.[0]) idDocument.value = t.files[0];
};

const handleSsnUpload = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if(t.files?.[0]) ssnDocument.value = t.files[0];
};
// Agreement State
const agreeToTerms = ref(false);

const goToReview = () => {
    // Scroll validation
    if (!hasScrolledToBottom.value) {
        alert("Please scroll to the bottom of the agreement to read the full terms.");
        return;
    }
    
    // Checkbox validation
    if (!agreeToTerms.value) {
        alert("You must check the box agreeing to the terms.");
        return;
    }
    
    // E-Sign consent validation
    if (!esignConsent.value) {
        alert("You must consent to electronic signature.");
        return;
    }

    if (!typedSignature.value.trim()) {
        alert("Please type your full legal name to sign.");
        return;
    }
    
    checkoutStep.value = 4;
};

const submitOrder = async () => {
    // Ensure address is synced (just in case)
    if (streetAddress.value && zipCode.value && city.value && state.value) {
        store.checkoutForm.address = `${streetAddress.value}, ${city.value}, ${state.value} ${zipCode.value}`;
    }

    console.log('[Cart] Submitting Order Payload:', {
        ...store.checkoutForm,
        signature: typedSignature.value ? '(Typed Name Present)' : '(No Signature)',
        idDoc: idDocument.value ? idDocument.value.name : '(No file)',
        ssnDoc: ssnDocument.value ? ssnDocument.value.name : '(No file)'
    });

    await store.checkoutWithDocuments({
    ...store.checkoutForm,
    signature: typedSignature.value.trim(), // Send typed name as signature
    idDocument: idDocument.value,
    ssnDocument: ssnDocument.value
  });
};


const computedRootStyles = computed(() => {
   // Dynamic width and height based on view
   // Cart: 600px width
   // Checkout Step 1/2/4: 800px width
   // Checkout Step 3 (Agreement): 1000px width (or 90vw)
   
   let width = '600px';
   if (currentView.value === 'checkout') {
       width = checkoutStep.value === 3 ? '1000px' : '800px';
   }
   
   return {
        position: 'fixed' as const,
        top: '100px', // Raised higher for better view of tall contract
        right: '0',
        zIndex: '2147483647',
        height: 'calc(100vh - 100px)',
        width: width,
        maxWidth: '100vw',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        borderTopLeftRadius: '8px',
        borderBottomLeftRadius: '8px',
        backgroundColor: 'white',
        transition: 'width 0.3s ease, height 0.3s ease', // Smooth resize
        boxShadow: '-4px 0 20px rgba(0,0,0,0.2)'
   };
});

onMounted(() => {
  // Inject CSS - updated to include checkout styles inside the panel
  const styleId = 'tl-cart-critical-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      #tl-cart-root { font-family: 'Roboto', sans-serif, system-ui; color: #333; }
      #tl-cart-root * { box-sizing: border-box; }
      
      /* Headers & Nav */
      #tl-cart-root .tl-cart-header { padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex !important; justify-content: space-between !important; align-items: center !important; border-top-left-radius: 8px; }
      #tl-cart-root h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; display: flex !important; align-items: center !important; gap: 10px; }
      #tl-cart-root .tl-back-nav-btn { background: none; border: none; font-size: 14px; text-decoration: underline; color: #64748b; cursor: pointer; }

      #tl-cart-root .tl-close-btn { background: transparent; border: none; font-size: 24px; color: #64748b; cursor: pointer; } 

      /* Containers */
      #tl-cart-root .tl-view-container { flex: 1; display: flex !important; flex-direction: column !important; overflow: hidden; }
      #tl-cart-root .tl-cart-content { flex: 1; display: flex !important; flex-direction: column !important; overflow: hidden; }
      #tl-cart-root .tl-cart-items { flex: 1; overflow-y: auto; padding: 20px; }
      #tl-cart-root .tl-cart-footer { padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom-left-radius: 8px; }

      /* Cart Items */
      #tl-cart-root .tl-cart-item { display: grid !important; grid-template-columns: 1fr auto !important; gap: 15px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; }
      #tl-cart-root .tl-item-price { font-weight: bold; color: #051b41; }

      /* Checkout Specifics */
      #tl-cart-root .tl-checkout-steps { display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 15px 20px; background: #fff; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; }
      #tl-cart-root .tl-step.active { color: #051b41; font-weight: bold; }
      #tl-cart-root .tl-step.completed { color: #16a34a; }
      #tl-cart-root .tl-step-line { flex: 1; height: 1px; background: #e2e8f0; margin: 0 10px; }
      
      #tl-cart-root .tl-checkout-scroll-area { flex: 1; overflow-y: auto; padding: 20px; }
      #tl-cart-root .tl-form-group { margin-bottom: 15px; }
      #tl-cart-root label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 5px; color: #475569; }
      #tl-cart-root input, #tl-cart-root textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 15px; }
      
      #tl-cart-root .tl-form-group-row { display: flex; gap: 10px; margin-bottom: 15px; }
      
      /* Password Toggle */
      #tl-cart-root .tl-password-wrapper { position: relative; }
      #tl-cart-root .tl-password-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; width: auto !important; padding: 0 !important; margin: 0 !important; }
      
      #tl-cart-root .tl-btn { width: 100%; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; text-align: center; }
      #tl-cart-root .tl-btn-primary { background: #051b41; color: white; }
      #tl-cart-root .tl-btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
      #tl-cart-root .tl-btn-outline { background: white; border: 1px solid #cbd5e1; color: #334155; }
      
      #tl-cart-root .tl-actions-row { display: flex !important; gap: 15px; margin-top: 20px; }
      #tl-cart-root .tl-actions-row button { flex: 1; }
      
      #tl-cart-root .tl-upload-box { border: 2px dashed #cbd5e1; padding: 20px; text-align: center; border-radius: 6px; margin-bottom: 15px; cursor: pointer; }
      #tl-cart-root .tl-upload-box.has-file { border-color: #16a34a; background: #f0fdf4; }
      #tl-cart-root .tl-hidden-input { display: none; }
      
      #tl-cart-root .tl-agreement-box { height: 350px; overflow-y: auto; border: 1px solid #e2e8f0; padding: 20px; background: #fff; font-size: 13px; margin-bottom: 20px; border-radius: 6px; }
      #tl-cart-root .tl-agreement-box h4 { text-align: center; margin-bottom: 15px; font-size: 16px; text-decoration: underline; }
      #tl-cart-root .tl-agreement-box p { margin-bottom: 10px; line-height: 1.5; color: #334155; }
      
      #tl-cart-root .tl-review-summary { background: #f8fafc; padding: 15px; border-radius: 6px; }
      #tl-cart-root .tl-review-item { display: flex !important; justify-content: space-between !important; margin-bottom: 5px; font-size: 14px; }
      #tl-cart-root .tl-review-total { border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px; font-size: 16px; font-weight: bold; text-align: right; }
      
      /* Reused Cart Styles for Quantity, Remove, etc. */
      #tl-cart-root .tl-quantity-selector { display: flex !important; align-items: center !important; border: 1px solid #cbd5e1; border-radius: 4px; }
      #tl-cart-root .tl-quantity-selector button { padding: 5px 10px; border: none; background: #f1f5f9; cursor: pointer; }
      #tl-cart-root .tl-quantity-selector span { padding: 0 10px; min-width: 20px; text-align: center; }
      #tl-cart-root .tl-remove-btn { border: none; background: none; color: #ef4444; font-size: 12px; cursor: pointer; text-decoration: underline; }
      #tl-cart-root .tl-total-row { display: flex !important; justify-content: space-between !important; margin-bottom: 10px; font-size: 15px; }
      #tl-cart-root .tl-discount-row { color: #16a34a; font-weight: 600; }
      #tl-cart-root .tl-promo-group { margin-bottom: 20px; display: flex !important; gap: 10px; }
      #tl-cart-root .tl-promo-input { flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; }
      #tl-cart-root .tl-discount-badge { display: block; background: #fef08a; color: #854d0e; padding: 8px; border-radius: 6px; font-size: 13px; font-weight: bold; margin-bottom: 15px; text-align: center; border: 1px solid #fde047; }
      #tl-cart-root .tl-grand-total { font-size: 18px; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 15px; margin-top: 10px; color: #0f172a; }
      #tl-cart-root .tl-text-btn { background: none; border: none; text-decoration: underline; cursor: pointer; color: #64748b; font-size: 12px; }
      #tl-cart-root .tl-error-msg { background: #fee2e2; color: #b91c1c; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 13px; }
    `;
    document.head.appendChild(styleEl);
  }
});
</script>

<style>
/* Reset style block */
</style>
