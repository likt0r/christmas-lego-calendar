<template>
  <UContainer class="min-h-screen flex items-center justify-center py-12">
    <div class="text-center max-w-2xl mx-auto">
      <div class="mb-8">
        <div class="text-9xl font-bold text-muted mb-4">
          {{ error?.statusCode || 404 }}
        </div>
        <h1 class="text-4xl font-bold text-highlighted mb-4">
          <span v-if="error?.statusCode === 404">Page Not Found</span>
          <span v-else>Something Went Wrong</span>
        </h1>
        <p class="text-xl text-muted mb-2">
          <span v-if="error?.statusCode === 404">
            Oops! The page you're looking for doesn't exist.
          </span>
          <span v-else>
            {{ error?.statusMessage || "An unexpected error occurred" }}
          </span>
        </p>
        <p v-if="error?.statusCode === 404" class="text-lg text-muted">
          It might have been moved, deleted, or you entered the wrong URL.
        </p>
      </div>
      <div class="flex gap-4 justify-center flex-wrap">
        <UButton
          @click="handleError"
          color="primary"
          size="lg"
          class="min-w-[200px]"
        >
          <UIcon name="i-heroicons-home" class="mr-2" />
          Go Home
        </UButton>
        <UButton
          v-if="error?.statusCode === 404"
          to="/admin"
          color="gray"
          variant="outline"
          size="lg"
          class="min-w-[200px]"
        >
          <UIcon name="i-heroicons-cog-6-tooth" class="mr-2" />
          Admin Panel
        </UButton>
      </div>
    </div>
  </UContainer>
</template>

<script setup>
const props = defineProps({
  error: {
    type: Object,
    required: true,
  },
});

const handleError = () => {
  clearError({ redirect: "/" });
};
</script>
