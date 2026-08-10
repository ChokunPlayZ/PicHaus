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
        { name: 'theme-color', content: '#191b1a' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=2' }
      ],
      script: [
        {
          innerHTML: `
            (function() {
              try {
                const getCookie = function(name) {
                  const value = "; " + document.cookie;
                  const parts = value.split("; " + name + "=");
                  if (parts.length === 2) return parts.pop().split(";").shift();
                  return null;
                };
                let storedTheme = null;
                try { storedTheme = localStorage.getItem('theme'); } catch (e) {}
                const theme = getCookie('theme') || storedTheme;
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                let cachedAccent = null;
                try { cachedAccent = localStorage.getItem('pichaus-accent'); } catch (e) {}
                if (cachedAccent && /^#[0-9a-fA-F]{6}$/.test(cachedAccent)) {
                  const r = parseInt(cachedAccent.slice(1, 3), 16);
                  const g = parseInt(cachedAccent.slice(3, 5), 16);
                  const b = parseInt(cachedAccent.slice(5, 7), 16);
                  const root = document.documentElement.style;
                  root.setProperty('--accent', cachedAccent);
                  root.setProperty('--accent-hover', 'rgba(' + r + ',' + g + ',' + b + ',0.85)');
                  root.setProperty('--accent-pressed', 'rgba(' + r + ',' + g + ',' + b + ',0.75)');
                  root.setProperty('--accent-light', 'rgba(' + r + ',' + g + ',' + b + ',0.12)');
                }
              } catch (e) {}
            })();
          `,
          type: 'text/javascript'
        }
      ]
    }
  }
})
