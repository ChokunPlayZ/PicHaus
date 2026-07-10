// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  css: ['~/assets/css/variables.css'],
  nitro: {
    externals: {
      // Nitro's dependency tracer can omit Vue's ESM entrypoint when the build
      // dependencies were installed by Bun. Bundle the SSR runtime so the
      // production server does not depend on that incomplete traced package.
      inline: ['vue', /^@vue\//, 'vue-bundle-renderer'],
    },
    serverAssets: [{
      baseName: 'migrations',
      dir: './drizzle/migrations',
    }],
  },
  app: {
    head: {
      title: 'PicHaus',
      meta: [
        { name: 'theme-color', content: '#f5f5f7' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      script: [
        {
          innerHTML: `
            (function() {
              const getCookie = function(name) {
                const value = "; " + document.cookie;
                const parts = value.split("; " + name + "=");
                if (parts.length === 2) return parts.pop().split(";").shift();
              };
              const theme = getCookie('theme') || localStorage.getItem('theme');
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
