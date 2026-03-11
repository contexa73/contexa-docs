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
      defaultMode: 'dark',
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
        {to: '/get-started', label: 'Get Started', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/contexa-security/contexa',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Getting Started',
          items: [
            {label: 'Quick Start', to: '/docs/install/quickstart'},
            {label: 'Installation Guide', to: '/docs/install/installation-guide'},
            {label: 'Configuration', to: '/docs/install/configuration'},
          ],
        },
        {
          title: 'Reference',
          items: [
            {label: 'Architecture', to: '/docs/reference/architecture/overview'},
            {label: 'Identity', to: '/docs/reference/identity/dsl'},
            {label: 'IAM', to: '/docs/reference/iam/xacml'},
            {label: 'AI Engine', to: '/docs/reference/core/ai-lab'},
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
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Contexa. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['java', 'groovy', 'yaml', 'properties', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
