import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Adonia',
  description: 'AdonisJS modules you add with a CLI, not a starter kit.',
  vite: {
    ssr: {
      noExternal: ['vitepress-carbon'],
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/what-is-adonia' },
      { text: 'CLI', link: '/cli/overview' },
      { text: 'Modules', link: '/modules/overview' },
      { text: 'Reference', link: '/reference/adonia-json' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'What is Adonia', link: '/guide/what-is-adonia' },
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Concepts', link: '/guide/concepts' },
            { text: 'Scaffolding', link: '/guide/scaffolding' },
            { text: 'Host wiring', link: '/guide/host-wiring' },
            { text: 'Local development', link: '/guide/local-development' },
          ],
        },
      ],
      '/cli/': [
        {
          text: 'CLI',
          items: [
            { text: 'Overview', link: '/cli/overview' },
            { text: 'init', link: '/cli/init' },
            { text: 'add', link: '/cli/add' },
            { text: 'list', link: '/cli/list' },
            { text: 'diff', link: '/cli/diff' },
            { text: 'check', link: '/cli/check' },
          ],
        },
      ],
      '/modules/': [
        {
          text: 'Modules',
          items: [
            { text: 'Overview', link: '/modules/overview' },
            { text: 'api', link: '/modules/api' },
            { text: 'auth', link: '/modules/auth' },
            { text: 'account', link: '/modules/account' },
            { text: 'notification', link: '/modules/notification' },
            { text: 'creem', link: '/modules/creem' },
            { text: 'subscription', link: '/modules/subscription' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'adonia.json', link: '/reference/adonia-json' },
            { text: 'module.json', link: '/reference/module-json' },
            { text: 'CLI flags', link: '/reference/cli-flags' },
          ],
        },
      ],
    },
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/britzdylan/adonia' },
    ],
  },
})
