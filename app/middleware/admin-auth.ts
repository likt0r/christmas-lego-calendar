export default defineNuxtRouteMiddleware((to, from) => {
  // Only run on client side
  if (process.server) return;

  // Check if navigating to admin route
  if (to.path.startsWith("/admin" || to.path.startsWith("/models"))) {
    // Check if this is a client-side navigation (not initial page load)
    // Initial load: from.path will be the same as to.path or from.name is null
    // Client-side nav: from.path will be different from to.path
    const isClientSideNavigation = from.path && from.path !== to.path;

    if (isClientSideNavigation) {
      // Force a full page reload to trigger server-side basic auth middleware
      // This ensures the basic auth prompt appears even during SPA navigation
      window.location.href = to.fullPath;
    }
  }
});
