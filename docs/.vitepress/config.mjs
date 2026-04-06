import { defineConfig } from 'vitepress';

export default defineConfig({
 lang: 'en-US',
 title: 'sqler-mdb',
 description: 'MariaDB/MySQL dialect for sqler',
 base: '/sqler-mdb/',
//  srcDir: 'docs',
 cleanUrls: true,
 head: [
  ['link', { rel: 'icon', type: 'image/png', href: '/sqler-mdb/favicon-32x32.png' }]
 ],
//  ignoreDeadLinks: [
//   /^\/?api\/.*$/,
//   /^\.\/(SQLER|Dialect|Manager|Stream\.)/
//  ],
 themeConfig: {
  logo: '/favicon-32x32.png',
  siteTitle: 'sqler-mdb',
  nav: [
   { text: 'Guide', link: '/guide/getting-started' },
   { text: 'API', link: '/api/' },
   { text: 'GitHub', link: 'https://github.com/ugate/sqler-mdb' },
   { text: 'npm', link: 'https://www.npmjs.com/package/sqler-mdb' }
  ],
  sidebar: [
   {
    text: 'Guide',
    items: [
     { text: 'Overview', link: '/' },
     { text: 'Getting Started', link: '/guide/getting-started' },
     { text: 'Manual', link: '/guide/manual' }
    ]
   },
   {
    text: 'API',
    items: [
     { text: 'API Reference', link: '/api/' }
    ]
   }
  ],
  socialLinks: [
   { icon: 'github', link: 'https://github.com/ugate/sqler-mdb' }
  ],
  search: {
   provider: 'local'
  },
  footer: {
   message: 'Released under the MIT License.',
   copyright: 'Copyright © ugate'
  }
 }
});
