<template>
  <UCard class="hover:shadow-xl transition-shadow duration-300">
    <template #header>
      <div class="text-center">
        <h3 class="text-xl font-semibold text-highlighted capitalize">
          {{ model.name }}
        </h3>
        <p class="text-muted">{{ model.days }} days available</p>
      </div>
    </template>

    <div class="space-y-3">
      <UButton
        @click="$emit('download-qr', model.name)"
        color="info"
        variant="outline"
        block
        leading-icon="i-heroicons-qr-code"
      >
        Download QR Codes
      </UButton>

      <UButton
        @click="$emit('view-days', model.name)"
        color="success"
        variant="outline"
        block
        leading-icon="i-heroicons-calendar-days"
      >
        View All Days
      </UButton>

      <UButton
        @click="$emit('download-pdf', model.name)"
        color="primary"
        variant="outline"
        block
        leading-icon="i-heroicons-document-arrow-down"
      >
        Download PDF Backup
      </UButton>

      <UButton
        @click="$emit('delete', model.name)"
        :disabled="isDeleting"
        color="error"
        variant="outline"
        block
        leading-icon="i-heroicons-trash"
      >
        {{ isDeleting ? "Deleting..." : "Delete Model" }}
      </UButton>
    </div>
  </UCard>
</template>

<script setup>
defineProps({
  model: {
    type: Object,
    required: true,
    validator: (value) => {
      return (
        value &&
        typeof value.name === "string" &&
        typeof value.days === "number"
      );
    },
  },
  isDeleting: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["download-qr", "view-days", "download-pdf", "delete"]);
</script>
