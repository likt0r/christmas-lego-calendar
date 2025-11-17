// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@kgierke/nuxt-basic-auth"],
  css: ["~/assets/css/main.css"],
  vite: {
    build: {
      target: "es2020",
    },
    esbuild: {
      target: "es2020",
    },
  },
  nitro: {
    esbuild: {
      options: {
        target: "es2020",
      },
    },
  },
  runtimeConfig: {
    // Private keys (only available on server-side)
    modelsDir: "files",
    baseUrl: "http://localhost:3000",
    // Public keys (exposed to client-side)
    public: {},
  },
  basicAuth: {
    enabled: true,
    users: [
      {
        username: "admin",
        password: "admin",
      },
    ],
    allowedRoutes: [
      "^/$", // Home page
      "^/api/download/.*", // GET /api/download/[randomId] - secure PDF downloads
    ],
  },
});
