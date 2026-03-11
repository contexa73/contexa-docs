---
title: "Security Configuration"
---
# Security Configuration

Configuration properties for the Contexa security engine, including Zero Trust, HCAD detection, and SecurityPlane agent settings.

## Zero Trust Properties

Properties under `security.zerotrust`, bound to `SecurityZeroTrustProperties`. Controls the core Zero Trust engine including HCAD thresholds, threat evaluation weights, and enforcement mode.

See the full property reference on the [main Configuration page](/docs/install/configuration#zero-trust-properties).

**Related:** [Zero Trust Reference](/docs/reference/architecture/zero-trust-flow)

## HCAD Properties

Properties under the `hcad` prefix, bound to `HcadProperties`. Configures the Hierarchical Context-Aware Detection (HCAD) filter pipeline and baseline learning.

**Related:** [HCAD Reference](/docs/reference/architecture/overview)

Property

Type

Default

Description

`hcad`

`.enabled`

`boolean`

`false`

Enable or disable the HCAD filter pipeline.

`.filter-order`

`int`

`0`

HCAD filter order in the servlet filter chain.

`hcad.baseline.learning`

`.enabled`

`boolean`

`true`

Enable baseline learning from live traffic.

`.alpha`

`double`

`0.1`

Online baseline adaptation learning rate.

### Example Configuration

YAML

```yaml
hcad:
  enabled: true
  filter-order: 10
  baseline:
    learning:
      enabled: true
      alpha: 0.1
```

## Security Plane Properties

Properties under `security.plane`, bound to `SecurityPlaneProperties`. Configures the SecurityPlane agent and LLM executor thread pool for AI-powered security analysis.

Property

Type

Default

Description

`security.plane.agent`

`.name`

`String`

`SecurityPlaneAgent-1`

Unique name for this agent instance

`.auto-start`

`boolean`

`true`

Auto-start agent on application startup

`.organization-id`

`String`

`default-org`

Organization ID for multi-tenant deployments

`.execution-mode`

`String`

`ASYNC`

`ASYNC` (non-blocking) or `SYNC` (sequential)

`security.plane.llm-executor`

`.core-pool-size`

`int`

`4`

Core thread pool size for LLM analysis tasks

`.max-pool-size`

`int`

`4`

Maximum thread pool size for LLM analysis tasks

`.queue-capacity`

`int`

`100`

Queue capacity for pending LLM analysis tasks

```yaml
security:
  plane:
    agent:
      name: SecurityPlaneAgent-1
      auto-start: true
      organization-id: default-org
      execution-mode: ASYNC
    llm-executor:
      core-pool-size: 4
      max-pool-size: 4
      queue-capacity: 100
```

**Related:** [Zero Trust Reference](/docs/reference/architecture/zero-trust-flow), [SOAR Reference](/docs/reference/soar/)

## Session Security Properties

Properties under `security.session`, bound to `SecuritySessionProperties`. Controls session security settings including session fixation protection, concurrent session limits, and session timeout behavior.

See the full property reference on the [main Configuration page](/docs/install/configuration#session-security-properties).

**Related:** [State Management Reference](../../../docs/reference/identity/state-management)

[Previous Infrastructure Configuration](../../../docs/install/configuration/infrastructure) [Next AI Configuration](../../../docs/install/configuration/ai)