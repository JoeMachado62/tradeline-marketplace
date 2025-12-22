<template>
  <div class="tlm-onboarding p-6 bg-white rounded-lg shadow-sm">
    <div class="mb-6 text-center">
      <h2 class="text-2xl font-bold mb-2">Let's Get Started</h2>
      <p class="text-gray-600">
        Upload your credit report to see tradelines that match your needs. We'll
        automatically filter out banks you already have.
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
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

      <!-- File Upload -->
      <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700"
          >Credit Report (PDF/Image)</label
        >
        <div
          class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors"
          :class="{ 'border-blue-500 bg-blue-50': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <div class="space-y-1 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="flex text-sm text-gray-600 justify-center">
              <label
                for="file-upload"
                class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  class="sr-only"
                  @change="handleFileSelect"
                  accept=".pdf,image/*"
                />
              </label>
              <p class="pl-1">or drag and drop</p>
            </div>
            <p class="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
            <p
              v-if="form.file"
              class="text-sm font-semibold text-blue-600 mt-2"
            >
              Selected: {{ form.file.name }}
            </p>
          </div>
        </div>
      </div>

      <div class="pt-4">
        <button
          type="submit"
          :disabled="store.loading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <span v-if="store.loading">
            Processing... {{ store.uploadProgress }}%
          </span>
          <span v-else> Analyze & View Tradelines </span>
        </button>
      </div>

      <div v-if="store.error" class="text-red-600 text-sm text-center mt-2">
        {{ store.error }}
      </div>
    </form>

    <div class="mt-4 text-center">
      <button
        @click="skipOnboarding"
        class="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Skip for now (View all lines)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useWidgetStore } from "../stores/widget";

const store = useWidgetStore();
const isDragging = ref(false);

const form = reactive({
  email: "",
  name: "",
  phone: "",
  file: null as File | null,
});

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    form.file = input.files[0];
  }
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer?.files[0]) {
    form.file = e.dataTransfer.files[0];
  }
};

const handleSubmit = async () => {
  if (!form.email) return;

  await store.onboardClient(
    form.email,
    form.name,
    form.phone,
    form.file || undefined
  );
};

const skipOnboarding = () => {
  store.onboardingStep = "complete";
};
</script>
