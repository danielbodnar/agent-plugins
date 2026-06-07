// .vitepress/config.ts: VitePress configuration for an engineering handbook.
//
// To use:
//   1. bun add -D vitepress
//   2. Create .vitepress/ directory at your repo root, copy this file in.
//   3. Set srcDir to point at your handbook directory.
//   4. Update title, description, sidebar to match your structure.
//   5. Run: bunx vitepress dev (preview at http://localhost:5173)
//   6. Run: bunx vitepress build (produces .vitepress/dist for deployment)

import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Engineering Handbook',
  description: 'How we work',

  // Point at the handbook directory. Adjust if your handbook lives elsewhere.
  srcDir: '../handbook',

  // Output directory for built site. Default is .vitepress/dist.
  outDir: '../.vitepress/dist',

  // Clean URLs (no .html extension in URLs).
  cleanUrls: true,

  // Last-updated timestamps from git.
  lastUpdated: true,

  themeConfig: {
    // Built-in local search using minisearch. For larger handbooks consider
    // Algolia DocSearch (free for open-source projects).
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    // Top navigation bar.
    nav: [
      { text: 'Direction & Culture', link: '/01-direction-and-culture/' },
      { text: 'Workflows', link: '/02-workflows/' },
      { text: 'Planning', link: '/03-planning/' },
      { text: 'Incidents', link: '/04-incident-management/' },
      { text: 'Monitoring', link: '/05-monitoring-and-quality/' },
    ],

    // Per-section sidebar. Set to 'auto' to autogenerate from filesystem.
    sidebar: {
      '/01-direction-and-culture/': [
        {
          text: 'Direction & Culture',
          items: [
            { text: 'Overview', link: '/01-direction-and-culture/' },
            { text: 'Values', link: '/01-direction-and-culture/values' },
            { text: 'Principles', link: '/01-direction-and-culture/principles' },
            { text: 'Three-Year Strategy', link: '/01-direction-and-culture/three-year-strategy' },
            { text: 'Engineering Excellence', link: '/01-direction-and-culture/engineering-excellence' },
          ],
        },
      ],
      '/02-workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Overview', link: '/02-workflows/' },
            { text: 'Issues', link: '/02-workflows/issues' },
            { text: 'Code Review', link: '/02-workflows/code-review' },
            { text: 'Merge Requests', link: '/02-workflows/merge-requests' },
            { text: 'CI/CD', link: '/02-workflows/ci-cd' },
            { text: 'Security Review', link: '/02-workflows/security-review' },
          ],
        },
      ],
      '/03-planning/': [
        {
          text: 'Planning',
          items: [
            { text: 'Overview', link: '/03-planning/' },
            { text: 'Milestones', link: '/03-planning/milestones' },
            { text: 'Technical Roadmaps', link: '/03-planning/technical-roadmaps' },
            { text: 'Prioritization', link: '/03-planning/prioritization' },
            { text: 'Capacity Planning', link: '/03-planning/capacity-planning' },
          ],
        },
      ],
      '/04-incident-management/': [
        {
          text: 'Incident Management',
          items: [
            { text: 'Overview', link: '/04-incident-management/' },
            { text: 'Broken Main', link: '/04-incident-management/broken-master' },
            { text: 'Feature Change Locks', link: '/04-incident-management/feature-change-locks' },
            { text: 'On-Call', link: '/04-incident-management/on-call' },
            { text: 'SLOs and Error Budgets', link: '/04-incident-management/slos-and-error-budgets' },
            { text: 'Postmortems', link: '/04-incident-management/postmortems' },
          ],
        },
      ],
      '/05-monitoring-and-quality/': [
        {
          text: 'Monitoring & Quality',
          items: [
            { text: 'Overview', link: '/05-monitoring-and-quality/' },
            { text: 'Observability', link: '/05-monitoring-and-quality/observability' },
            { text: 'Technical Debt', link: '/05-monitoring-and-quality/technical-debt' },
            { text: 'Infradev', link: '/05-monitoring-and-quality/infradev' },
            { text: 'Performance', link: '/05-monitoring-and-quality/performance' },
          ],
        },
      ],
    },

    // Footer link to source repo.
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/your-repo' },
    ],

    editLink: {
      pattern: 'https://github.com/your-org/your-repo/edit/main/handbook/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Single source of truth for how we work.',
      copyright: 'Copyright © 2026 Your Org',
    },
  },
})
