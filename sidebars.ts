import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        {type: 'doc', id: 'install/quickstart', label: 'Quick Start'},
        {type: 'doc', id: 'install/installation-guide', label: 'Installation Guide'},
        {type: 'doc', id: 'install/spring-boot', label: 'Spring Boot'},
        {type: 'doc', id: 'install/configuration', label: 'Configuration'},
        {type: 'doc', id: 'install/shadow-mode', label: 'Shadow Mode'},
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        {type: 'doc', id: 'reference/architecture/overview', label: 'Platform Overview'},
        {type: 'doc', id: 'reference/architecture/zero-trust-flow', label: 'Zero Trust Flow'},
      ],
    },
    {
      type: 'category',
      label: 'Identity',
      items: [
        {type: 'doc', id: 'reference/identity/dsl', label: 'Identity DSL'},
        {type: 'doc', id: 'reference/identity/authentication', label: 'Authentication'},
        {type: 'doc', id: 'reference/identity/mfa', label: 'Adaptive MFA'},
        {type: 'doc', id: 'reference/identity/asep', label: 'ASEP Annotations'},
        {type: 'doc', id: 'reference/identity/state-management', label: 'State Management'},
      ],
    },
    {
      type: 'category',
      label: 'IAM',
      items: [
        {type: 'doc', id: 'reference/iam/xacml', label: 'Authorization Overview'},
        {type: 'doc', id: 'reference/iam/dynamic-authorization', label: 'Dynamic Authorization'},
        {type: 'doc', id: 'reference/iam/protectable', label: '@Protectable'},
        {type: 'doc', id: 'reference/iam/ai-security-expressions', label: 'AI Security Expressions'},
        {type: 'doc', id: 'reference/iam/permission-evaluators', label: 'Permission Evaluators'},
        {type: 'doc', id: 'reference/iam/policy', label: 'Policy Management'},
        {type: 'doc', id: 'reference/iam/resource-scanner', label: 'Resource Scanner'},
        {type: 'doc', id: 'reference/iam/admin', label: 'Admin Dashboard'},
        {type: 'doc', id: 'reference/iam/end-to-end-workflow', label: 'End-to-End Workflow'},
      ],
    },
    {
      type: 'category',
      label: 'AI Engine',
      items: [
        {type: 'doc', id: 'reference/core/overview', label: 'Overview'},
        {type: 'doc', id: 'reference/core/strategy', label: 'Building Custom AI'},
        {type: 'doc', id: 'reference/core/pipeline', label: 'Pipeline & RAG'},
        {type: 'doc', id: 'reference/core/streaming', label: 'Streaming'},
        {type: 'doc', id: 'reference/core/llm-orchestrator', label: 'LLM & Models'},
      ],
    },
  ],
};

export default sidebars;
