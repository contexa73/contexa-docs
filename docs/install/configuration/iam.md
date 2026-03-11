---
title: "IAM Configuration"
---
# IAM Configuration

Configuration properties for the Contexa IAM (Identity and Access Management) module, covering admin console settings.

## IAM Configuration Overview

The IAM module manages authorization through dynamic policies stored in the database. Unlike most other Contexa modules, the core policy engine is not configured through `application.yml` — instead, policies are created, updated, and managed through the Admin Dashboard UI.

The Properties class documented on this page controls **administrative settings only**: the admin console REST documentation path. For policy configuration, refer to the [Admin Dashboard](/docs/reference/iam/admin) and [Policy Management](/docs/reference/iam/policy) reference pages.

## IAM Admin Properties

Properties under `contexa.iam.admin`, bound to `IamAdminProperties`. Configures the IAM admin console settings, including the path to the REST API documentation served by the admin module.

Property

Type

Default

Description

`contexa.iam.admin`

`.rest-docs-path`

`String`

`/docs/index.html`

Path to the REST API documentation page served by the IAM admin module

```yaml
contexa:
  iam:
    admin:
      rest-docs-path: /docs/index.html
```

**Related:** [Admin Dashboard Reference](/docs/reference/iam/admin)

[Previous Identity Configuration](../../../docs/install/configuration/identity) [Next Shadow Mode](../../../docs/install/shadow-mode)