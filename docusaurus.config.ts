import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Contexa',
  tagline: 'AI Native Zero Trust Platform for Spring',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://contexa.io',
  baseUrl: '/',

  organizationName: 'contexa-security',
  projectName: 'contexa',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    format: 'detect',
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ko'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en-US'},
      ko: {label: '한국어', htmlLang: 'ko-KR'},
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/contexa-security/contexa/tree/main/contexa-docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/contexa-social-card.png',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'CONTEXA',
      logo: {
        alt: 'Contexa',
        src: 'img/logo.png',
      },
      items: [
        {to: '/', label: 'Overview', position: 'left', activeBaseRegex: '^/$'},
        {to: '/get-started', label: 'Get Started', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          label: 'Community',
          position: 'left',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/contexa-security/contexa',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/contexa-security/contexa/discussions',
            },
          ],
        },
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/contexa-security/contexa',
          'aria-label': 'GitHub',
          position: 'right',
          className: 'header-github-link',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Quick Start', to: '/docs/install/quickstart'},
            {label: 'Spring Boot Integration', to: '/docs/install/spring-boot'},
            {label: 'Configuration', to: '/docs/install/configuration'},
            {label: 'API Reference', to: '/docs/reference/'},
            {label: 'Shadow Mode', to: '/docs/install/shadow-mode'},
          ],
        },
        {
          title: 'Platform',
          items: [
            {label: 'AI Engine', to: '/docs/reference/core/overview'},
            {label: 'Identity DSL', to: '/docs/reference/identity/dsl'},
            {label: '@Protectable', to: '/docs/reference/iam/protectable'},
            {label: 'XACML Engine', to: '/docs/reference/iam/xacml'},
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/contexa-security/contexa',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/contexa-security/contexa/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/contexa-security/contexa/issues',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Contexa. Released under the Apache License 2.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['java', 'groovy', 'yaml', 'properties', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
