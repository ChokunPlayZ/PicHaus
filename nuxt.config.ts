// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  css: ['~/assets/css/variables.css'],
  nitro: {
    serverAssets: [{
      baseName: 'migrations',
      dir: './drizzle/migrations',
    }],
  },
  app: {
    head: {
      title: 'PicHaus',
      meta: [
        { name: 'theme-color', content: '#5e4d56' }, // Matches the app's purple gradient
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      script: [
        {
          children: `
            (function() {
              const theme = localStorage.getItem('theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (theme === 'dark' || (!theme && prefersDark)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })();
          `,
          type: 'text/javascript'
        }
      ]
    }
  }
})
