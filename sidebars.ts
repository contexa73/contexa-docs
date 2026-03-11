import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'install/quickstart',
        'install/installation-guide',
        'install/spring-boot',
        'install/configuration',
        'install/shadow-mode',
        {
          type: 'category',
          label: 'Configuration Details',
          items: [
            'install/configuration/ai',
            'install/configuration/iam',
            'install/configuration/identity',
            'install/configuration/security',
            'install/configuration/infrastructure',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'reference/architecture/overview',
        'reference/architecture/zero-trust-flow',
      ],
    },
    {
      type: 'category',
      label: 'Identity',
      items: [
        'reference/identity/dsl',
        'reference/identity/authentication',
        'reference/identity/mfa',
        'reference/identity/asep',
        'reference/identity/state-management',
      ],
    },
    {
      type: 'category',
      label: 'IAM',
      items: [
        'reference/iam/xacml',
        'reference/iam/protectable',
        'reference/iam/admin',
        'reference/iam/policy',
        'reference/iam/dynamic-authorization',
        'reference/iam/ai-security-expressions',
        'reference/iam/permission-evaluators',
        'reference/iam/resource-scanner',
        'reference/iam/end-to-end-workflow',
      ],
    },
    {
      type: 'category',
      label: 'AI Engine',
      items: [
        'reference/core/overview',
        'reference/core/ai-lab',
        'reference/core/pipeline',
        'reference/core/llm-orchestrator',
        'reference/core/model-provider',
        'reference/core/streaming',
        'reference/core/advisor',
        'reference/core/rag',
        'reference/core/strategy',
      ],
    },
    {
      type: 'category',
      label: 'SOAR',
      items: [
        'reference/soar/index',
        'reference/soar/soar-tool',
        'reference/soar/approval',
      ],
    },
  ],
};

export default sidebars;
