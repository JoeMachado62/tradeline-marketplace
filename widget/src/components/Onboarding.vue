<template>
  <div class="tlm-onboarding p-6 bg-white rounded-lg shadow-sm">
    <div class="mb-6 text-center">
      <h2 class="text-2xl font-bold mb-2">Let's Get Started</h2>
      <p class="text-gray-600">
        Enter your details to view available tradelines.
      </p>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- Contact Info -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700"
            >Email Address</label
          >
          <input
            v-model="form.email"
            type="email"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            placeholder="you@example.com"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Name (Optional)</label
            >
            <input
              v-model="form.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Phone (Optional)</label
            >
            <input
              v-model="form.phone"
              type="tel"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <!-- Moved to be centered with more spacing, replacing the old full-width bar -->
      <div class="mt-8 flex justify-center">
        <button
          type="submit"
          :disabled="store.loading"
          class="tl-btn-primary px-8 py-3 text-base font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
        >
          <span v-if="store.loading"> Processing... </span>
          <span v-else> View Tradelines </span>
        </button>
      </div>

      <div v-if="store.error" class="text-red-600 text-sm text-center mt-4">
        {{ store.error }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useWidgetStore } from "../stores/widget";

const store = useWidgetStore();

const form = reactive({
  email: "",
  name: "",
  phone: "",
});

const handleSubmit = async () => {
  if (!form.email) return;

  // Pass undefined for file to avoid processing
  await store.onboardClient(form.email, form.name, form.phone, undefined);
};
</script>

<style scoped>
.tl-btn-primary {
  background-color: var(--tl-primary-color, #01061c) !important;
  color: white !important;
  transition: all 0.2s;
}
.tl-btn-primary:hover {
  filter: brightness(120%);
  transform: translateY(-1px);
}
</style>
