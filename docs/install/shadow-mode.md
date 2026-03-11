---
title: "Shadow Mode Migration"
---
# Shadow Mode Migration

Shadow Mode provides a safe, progressive adoption path for AI-driven security. Transition from observation-only to full enforcement through two well-defined stages controlled by `security.zerotrust.mode`.

## How Shadow Mode Works

When Contexa is first deployed into an existing application, immediately enforcing AI-driven security decisions would be risky. Shadow Mode solves this by running the full AI evaluation pipeline in parallel with your existing security, allowing you to observe and validate AI decisions before enabling enforcement.

The mode is controlled by a single property: `security.zerotrust.mode`. In `SHADOW` mode, the AI analysis pipeline runs fully (HCAD, LLM analysis, risk scoring) but the `SecurityDecisionEnforcementHandler` skips writing actions to Redis. In `ENFORCE` mode (default), actions are saved and enforced by `ZeroTrustAccessControlFilter`.

Stage

`security.zerotrust.mode`

AI Behavior

Enforcement

Use Case

Shadow

`SHADOW`

Observe, analyze, and log only

None — AI decisions are logged but never enforced

Initial deployment, baseline learning, false positive evaluation

Enforce

`ENFORCE` (default)

Full enforcement

AI makes all security decisions through the Zero Trust engine

Production operation, full AI-native security

## Stage 1: Shadow

In Shadow mode, the full Contexa AI pipeline runs alongside your existing security infrastructure without affecting any authorization decisions. Every request is analyzed through HCAD and the Zero Trust engine, and the AI produces `ZeroTrustAction` decisions — but `SecurityDecisionEnforcementHandler` skips enforcement entirely. Decisions are only recorded in audit logs.

This stage is essential for building behavioral baselines. The HCAD engine needs to observe normal user patterns before it can reliably detect anomalies.

```yaml
contexa:
  enabled: true
  autonomous:
    enabled: true

security:
  zerotrust:
    enabled: true
    mode: SHADOW

hcad:
  enabled: true
  baseline:
    learning:
      enabled: true
```

:::info
**Baseline Learning** — Allow Shadow mode to run for at least 2 weeks to establish reliable behavioral baselines. The HCAD learning phase needs sufficient request samples per user before confidence scores stabilize.
:::

### How Shadow Mode Works Internally

The `SecurityEventProcessor` handler chain executes in order:

1.  **ProcessingExecutionHandler** (order=50) — AI analysis runs normally, producing risk scores and action recommendations
2.  **SecurityDecisionEnforcementHandler** (order=55) — `canHandle()` returns `false` in SHADOW mode, so the handler is skipped. No action is saved to Redis.
3.  **AuditingHandler** (order=60) — Records the AI decision to audit logs, including what action *would have been* enforced

Since no action is written to Redis, `ZeroTrustAccessControlFilter` has nothing to enforce on the next request — all requests pass through normally.

### What to Monitor

-   HCAD baseline confidence scores stabilizing across active users
-   `ZeroTrustAction` distribution in audit logs (ALLOW vs. BLOCK vs. CHALLENGE vs. ESCALATE)
-   False positive rate: how often the AI would have blocked a legitimate request
-   AI analysis latency: ensure the async pipeline does not impact request throughput

## Stage 2: Enforce

In Enforce mode, the Contexa AI engine has full authority over security decisions. The `SecurityDecisionEnforcementHandler` saves AI-determined `ZeroTrustAction` decisions to Redis, and the `ZeroTrustAccessControlFilter` enforces them on subsequent requests. This is the default mode.

```yaml
contexa:
  enabled: true
  autonomous:
    enabled: true

security:
  zerotrust:
    enabled: true
    mode: ENFORCE
    threat:
      initial: 0.3
  session:
    bearer:
      enabled: true

hcad:
  enabled: true
  baseline:
    learning:
      enabled: true
```

### Enforcement Rules

-   **ALLOW** — Request passes through normally
-   **BLOCK** — Request is denied (HTTP 403). User is recorded in the blocked user registry.
-   **CHALLENGE** — Additional verification steps are triggered
-   **ESCALATE** — Request is held (HTTP 423) until further review is complete
-   **PENDING\_ANALYSIS** — Response is wrapped in `BlockableResponseWrapper` and may be aborted if the async AI pipeline determines a block is necessary

:::danger
**Production Readiness Checklist** — Before switching to Enforce mode in production:

-   HCAD baselines must be established with sufficient learning data for all active users
-   False positive rate during Shadow phase should be below 1%
-   Redis must be available for action storage and retrieval
-   Monitoring and alerting must be in place for `ZeroTrustAction.BLOCK` and `ESCALATE` events
:::

## Migration Strategy

Follow this recommended timeline for a safe migration:

### Shadow (Weeks 1-4)

Deploy Contexa with `security.zerotrust.mode: SHADOW`. The full AI analysis pipeline runs — HCAD behavioral analysis, LLM-based threat evaluation, and risk scoring — but no enforcement actions are applied. Monitor audit logs to evaluate false positive rates and verify that HCAD baselines are building correctly across all active users.

### Enforce (Week 5+)

Switch to `security.zerotrust.mode: ENFORCE` to activate full AI enforcement. The `SecurityDecisionEnforcementHandler` now saves actions to Redis, and `ZeroTrustAccessControlFilter` enforces them on subsequent requests. Monitor the `ZeroTrustAction.BLOCK` and `ESCALATE` event rates closely during the first week.

## Rollback Strategy

You can safely roll back at any time by changing the `security.zerotrust.mode` property. HCAD baselines and learned patterns are preserved across mode changes.

:::warning
**Immediate Rollback** — To immediately disable all AI enforcement, set `security.zerotrust.mode: SHADOW`. The AI pipeline continues to run and log decisions, but no enforcement actions are applied. A full application restart is required for this change to take effect.
:::

Rollback Target

Configuration Change

Impact

Shadow

`security.zerotrust.mode: SHADOW`

AI analyzes and logs only; no enforcement

Pipeline Disabled

`security.zerotrust.enabled: false`

Zero Trust event pipeline disabled; HCAD still collects data

Fully Disabled

`contexa.enabled: false`

Entire Contexa platform disabled; Spring Security defaults apply

## Related Documentation

[

### Zero Trust Reference

Deep dive into the Zero Trust evaluation engine and action lifecycle.

](/docs/reference/security/zero-trust)[

### HCAD Reference

Detailed documentation on Hierarchical Context-Aware Detection.

](/docs/reference/security/hcad)[

### Event System

How Contexa publishes and consumes security events.

](/docs/reference/security/event-system)[

### Configuration Reference

Complete property reference for all Contexa modules.

](/docs/install/configuration)

[Previous Configuration](configuration) [Next Reference Overview](/docs/reference/core/ai-lab)