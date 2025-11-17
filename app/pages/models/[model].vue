<template>
  <div class="min-h-screen bg-gradient-to-br from-red-50 to-green-50">
    <UContainer class="py-8">
      <!-- Header Section -->
      <UCard class="mb-8" :ui="{ body: { padding: 'p-6' } }">
        <div class="flex items-start justify-between mb-6">
          <UButton
            @click="navigateTo('/admin')"
            variant="outline"
            color="gray"
            leading-icon="i-heroicons-arrow-left"
          >
            Back to Models
          </UButton>
          <UButton
            v-if="modelData?.days"
            @click="downloadQRCodes"
            color="primary"
            size="lg"
            leading-icon="i-heroicons-qr-code"
          >
            Download QR Codes
          </UButton>
        </div>

        <div class="text-center">
          <h1 class="text-5xl font-bold text-gray-900 mb-4">
            {{ formattedModelName }}
          </h1>
          <div class="flex items-center justify-center gap-3">
            <UBadge color="primary" size="lg" variant="soft">
              <UIcon name="i-heroicons-calendar-days" class="mr-1" />
              {{ modelData?.totalDays || 0 }} days available
            </UBadge>
          </div>
        </div>
      </UCard>

      <!-- Loading state -->
      <div v-if="pending" class="space-y-3">
        <UCard
          v-for="i in 8"
          :key="i"
          class="hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between">
            <USkeleton class="h-6 w-24" />
            <USkeleton class="h-10 w-32" />
          </div>
        </UCard>
      </div>

      <!-- Error state -->
      <UAlert
        v-else-if="error"
        color="red"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Model not found"
        :description="errorDescription"
        class="mb-6"
      >
        <template #actions>
          <UButton @click="navigateTo('/')" color="primary" size="sm">
            Back to Models
          </UButton>
        </template>
      </UAlert>

      <!-- Model days list -->
      <div v-else-if="modelData?.days" class="max-w-4xl mx-auto">
        <div class="space-y-3">
          <UCard
            v-for="day in modelData.days"
            :key="day.day"
            class="hover:shadow-md transition-shadow duration-300"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <UBadge color="red" size="lg"> Day {{ day.day }} </UBadge>
              </div>
              <UButton
                @click="openPDF(day.url)"
                color="primary"
                variant="outline"
                leading-icon="i-heroicons-document-text"
              >
                View PDF
              </UButton>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Empty state -->
      <UEmpty
        v-else
        icon="i-heroicons-inbox"
        title="No days available"
        description="This model doesn't have any days configured."
      />
    </UContainer>
  </div>
</template>

<script setup>
// Get model name from route params
const route = useRoute();
const modelName = route.params.model;
// Apply admin auth middleware for client-side navigation protection
definePageMeta({
  middleware: "admin-auth",
});
// Fetch model data
const {
  data: modelData,
  pending,
  error,
} = await useFetch(`/api/models/${modelName}`, {
  key: `model-${modelName}`,
});

// Computed properties
const errorDescription = computed(
  () => `The model "${modelName}" could not be found.`
);

const formattedModelName = computed(() => {
  if (typeof modelName === "string") {
    return modelName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return modelName;
});

// Functions
function openPDF(url) {
  window.open(url, "_blank");
}

function downloadQRCodes() {
  window.open(`/api/models/${modelName}/qr-codes`, "_blank");
}

// Set page title
useHead({
  title: `${modelName} - LEGO December Calendar`,
});
</script>
