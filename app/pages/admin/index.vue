<template>
  <UContainer class="min-h-screen py-8">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-highlighted mb-4">
        🎄 LEGO December Calendar
      </h1>
      <p class="text-lg text-muted mb-6">
        Choose your model to start building day by day!
      </p>
      <div class="mb-6">
        <UCard>
          <div class="flex items-center justify-between gap-4">
            <div class="text-sm">
              <span class="text-muted">Base URL:</span>
              <code class="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">{{ baseUrl }}</code>
            </div>
            <UButton
              @click="regenerateAllQRCodes"
              :disabled="isRegeneratingAll"
              color="warning"
              variant="outline"
              leading-icon="i-heroicons-arrow-path"
            >
              {{ isRegeneratingAll ? "Regenerating..." : "Regenerate All QR Codes" }}
            </UButton>
          </div>
        </UCard>
      </div>
      <UButton
        @click="isUploadModalOpen = true"
        color="primary"
        size="lg"
        leading-icon="i-heroicons-plus"
      >
        Add New Model
      </UButton>
    </div>

    <div v-if="models.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📦</div>
      <h2 class="text-2xl font-semibold text-highlighted mb-2">
        No models available
      </h2>
      <p class="text-muted mb-6">Upload your first model to get started!</p>
      <UButton
        @click="isUploadModalOpen = true"
        color="primary"
        size="lg"
        leading-icon="i-heroicons-plus"
      >
        Add Your First Model
      </UButton>
    </div>

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <ModelCard
        v-for="model in models"
        :key="model.name"
        :model="model"
        :is-deleting="isDeleting"
        @download-qr="downloadQRCodes"
        @view-days="navigateToModel"
        @download-pdf="downloadPDFBackup"
        @delete="deleteModel"
      />
    </div>

    <!-- Upload Modal -->
    <UModal
      v-model:open="isUploadModalOpen"
      title="Add New Model"
      @update:open="handleModalClose"
    >
      <template #body>
        <UForm
          ref="form"
          :state="formState"
          :schema="formSchema"
          @submit="onSubmit"
          class="w-full"
        >
          <div class="space-y-4">
            <UFormField label="Model Name" name="modelName" required>
              <UInput
                v-model="formState.modelName"
                placeholder="Enter model name (e.g., weasley)"
                :loading="isCheckingName"
              />
              <template #help>
                <span
                  v-if="nameCheckResult === 'available'"
                  class="text-success"
                >
                  ✓ Name is available
                </span>
                <span
                  v-else-if="nameCheckResult === 'taken'"
                  class="text-error"
                >
                  ✗ Name is already taken
                </span>
              </template>
            </UFormField>

            <UFormField label="PDF File" name="pdf" required>
              <UFileUpload
                v-model="formState.pdf"
                accept=".pdf"
                label="Drop PDF file here"
                description="PDF file (max. 100MB)"
                class="min-h-32"
              />
            </UFormField>

            <UFormField label="CSV File" name="csv" required>
              <UFileUpload
                v-model="formState.csv"
                accept=".csv"
                label="Drop CSV file here"
                description="CSV file (max. 1MB)"
                class="min-h-32"
              />
            </UFormField>
          </div>
        </UForm>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton @click="close()" variant="outline" :disabled="isUploading">
            Cancel
          </UButton>
          <UButton
            @click="form?.submit()"
            :loading="isUploading"
            :disabled="nameCheckResult !== 'available'"
          >
            {{ isUploading ? "Processing..." : "Upload Model" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Success/Error Alerts -->
    <UToaster />
  </UContainer>
</template>

<script setup>
import { z } from "zod";

// Apply admin auth middleware for client-side navigation protection
definePageMeta({
  middleware: "admin-auth",
});

// Get runtime config
const config = useRuntimeConfig();
const baseUrl = computed(() => config.public.baseUrl);

// Reactive state
const models = ref([]);
const isDeleting = ref(false);
const isRegeneratingAll = ref(false);
const isUploadModalOpen = ref(false);
const isUploading = ref(false);
const isCheckingName = ref(false);
const nameCheckResult = ref(null);
const form = useTemplateRef("form");

// Form state
const formState = reactive({
  modelName: "",
  pdf: null,
  csv: null,
});

// Form validation schema
const formSchema = z.object({
  modelName: z
    .string()
    .min(1, "Model name is required")
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      "Model name can only contain letters, numbers, hyphens, and underscores"
    ),
  pdf: z
    .any()
    .refine((file) => file instanceof File, { message: "PDF file is required" })
    .refine((file) => file instanceof File && file.size <= 100 * 1024 * 1024, {
      message: "PDF file must be less than 100MB",
    })
    .refine(
      (file) =>
        file instanceof File &&
        (file.type === "application/pdf" || file.name.endsWith(".pdf")),
      {
        message: "File must be a PDF",
      }
    ),
  csv: z
    .any()
    .refine((file) => file instanceof File, { message: "CSV file is required" })
    .refine((file) => file instanceof File && file.size <= 1024 * 1024, {
      message: "CSV file must be less than 1MB",
    })
    .refine(
      (file) =>
        file instanceof File &&
        (file.type === "text/csv" || file.name.endsWith(".csv")),
      {
        message: "File must be a CSV",
      }
    ),
});

// Load models on mount
onMounted(async () => {
  await loadModels();
});

// Watch for model name changes to check availability
watch(
  () => formState.modelName,
  async (newName) => {
    if (newName && newName.length > 0) {
      await checkNameAvailability(newName);
    } else {
      nameCheckResult.value = null;
    }
  }
);

// Handle modal close - reset form
function handleModalClose(value) {
  if (!value) {
    formState.modelName = "";
    formState.pdf = null;
    formState.csv = null;
    nameCheckResult.value = null;
    form?.clear();
  }
}

async function loadModels() {
  try {
    const data = await $fetch("/api/models");
    models.value = data || [];
  } catch (error) {
    console.error("Error loading models:", error);
    models.value = [];
  }
}

async function checkNameAvailability(modelName) {
  if (!modelName) return;

  isCheckingName.value = true;
  try {
    // Check if model already exists by trying to fetch it
    await $fetch(`/api/models/${modelName}`);
    nameCheckResult.value = "taken";
  } catch (error) {
    if (error.statusCode === 404) {
      nameCheckResult.value = "available";
    } else {
      nameCheckResult.value = null;
    }
  } finally {
    isCheckingName.value = false;
  }
}

async function onSubmit() {
  if (nameCheckResult.value !== "available") {
    return;
  }

  isUploading.value = true;

  try {
    const formData = new FormData();
    formData.append("modelName", formState.modelName);
    formData.append("pdf", formState.pdf);
    formData.append("csv", formState.csv);

    const result = await $fetch("/api/models/upload", {
      method: "POST",
      body: formData,
    });

    // Show success notification
    const toast = useToast();
    toast.add({
      title: "Success!",
      description: `Model "${formState.modelName}" created successfully`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    // Reset form and close modal
    formState.modelName = "";
    formState.pdf = null;
    formState.csv = null;
    nameCheckResult.value = null;
    isUploadModalOpen.value = false;

    // Reload models
    await loadModels();
  } catch (error) {
    console.error("Error uploading model:", error);
    const toast = useToast();
    toast.add({
      title: "Upload Failed",
      description:
        error.data?.message || "Failed to upload model. Please try again.",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
  } finally {
    isUploading.value = false;
  }
}

async function regenerateAllQRCodes() {
  const toast = useToast();
  isRegeneratingAll.value = true;

  try {
    const results = await Promise.allSettled(
      models.value.map((model) =>
        $fetch(`/api/models/${model.name}/regenerate-qr-codes`, {
          method: "POST",
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.add({
        title: "Success!",
        description: `QR codes for all ${successful} model(s) regenerated successfully`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else {
      toast.add({
        title: "Partial Success",
        description: `Regenerated QR codes for ${successful} model(s), ${failed} failed`,
        color: "warning",
        icon: "i-heroicons-exclamation-triangle",
      });
    }
  } catch (error) {
    console.error("Error regenerating QR codes:", error);
    toast.add({
      title: "Regeneration Failed",
      description: "Failed to regenerate QR codes. Please try again.",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
  } finally {
    isRegeneratingAll.value = false;
  }
}

async function deleteModel(modelName) {
  const toast = useToast();

  try {
    await $fetch(`/api/models/${modelName}/delete`, {
      method: "DELETE",
    });

    toast.add({
      title: "Success!",
      description: `Model "${modelName}" deleted successfully`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    await loadModels();
  } catch (error) {
    console.error("Error deleting model:", error);
    toast.add({
      title: "Delete Failed",
      description: `Failed to delete model "${modelName}". Please try again.`,
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
  }
}

function downloadQRCodes(modelName) {
  window.open(`/api/models/${modelName}/qr-codes`, "_blank");
}

function downloadPDFBackup(modelName) {
  window.open(`/api/models/${modelName}/pdf-backup`, "_blank");
}

function navigateToModel(modelName) {
  navigateTo(`/models/${modelName}`);
}
</script>
