---
title: "AI-Driven Zero Trust Pipeline"
---
contexa-core contexa-identity contexa-iam

# AI-Driven Zero Trust Pipeline

The LLM directly determines every security action. Spring Security enforces it in milliseconds. No rules to write — if behavior deviates from the baseline, Contexa finds it.

## Why AI-Native Zero Trust

Traditional security stops at authentication. Firewalls, WAFs, and login forms guard the gate — but once a session is established, the interior is largely undefended. Stolen credentials, compromised sessions, and AI agents that pass authentication in milliseconds all exploit this post-authentication blind spot.

Contexa is the first platform to fuse **Spring Security** with **Spring AI** into a unified AI-native zero-trust layer. Every authorized action — every URL access, every `@Protectable` method call — is continuously evaluated by an LLM that understands behavioral context, not just static rules.

### Traditional Auth

Guards the gate only.

-   Password / SSO / MFA at login
-   Session cookie = trusted
-   No post-auth monitoring
-   Stolen session = full access

### Rule-Based WAF

Catches known patterns.

-   Signature-based detection
-   Static IP / rate-limit rules
-   Cannot detect behavioral anomaly
-   AI agents bypass easily

### Contexa AI Zero Trust

Understands context.

-   LLM analyzes every action
-   HCAD behavioral baseline
-   Detects deviation, not signatures
-   5 enforcement actions (BLOCK/CHALLENGE/ESCALATE/ALLOW/PENDING)
-   Cross-instance real-time blocking

## ZeroTrustAction — The 5 Decisions

:::danger
**The LLM decides the action directly.** The tiered AI analysis pipeline outputs a `SecurityDecision` containing a `ZeroTrustAction` — not a risk score that gets mapped to an action. Fields like `riskScore` and `confidence` exist in `SecurityDecision` for audit logging and learning purposes only.
:::

Action

HTTP

TTL

Authority

Meaning

ALLOW

200

1500s

—

Request trusted. Proceed normally.

BLOCK

403

permanent

`ROLE_BLOCKED`

Threat confirmed. Session invalidated, credentials cleared. Cross-instance propagation via Redisson RTopic.

CHALLENGE

401

1800s

`ROLE_MFA_REQUIRED`

Suspicious activity. MFA challenge initiated. Max 2 attempts in 1 hour; failure escalates to BLOCK.

ESCALATE

423

300s

`ROLE_REVIEW_REQUIRED`

Human review required. Auto-promotes to BLOCK after 300s. SOAR integration for approval workflow.

PENDING\_ANALYSIS

503

0s

`ROLE_PENDING_ANALYSIS`

AI analysis in progress. Response wrapped until decision completes.

`ZeroTrustAction` also provides utility methods: `isBlocking()` returns `true` for BLOCK and ESCALATE; `isAccessRestricted()` returns `true` for BLOCK, CHALLENGE, and ESCALATE.

## End-to-End Pipeline

Every authenticated request flows through the pipeline below. The synchronous filter chain runs inline with **zero latency impact**; AI analysis runs asynchronously in the background; enforcement is applied to every subsequent request via Redis across all instances.

Request Interception

Synchronous · Every Request

Context Collection

Device, IP, session, behavioral vectors — full security context for every request

HCADFilter

Existing Action Check

If a prior AI decision exists in Redis, enforce BLOCK / CHALLENGE immediately

AccessControlFilter · ChallengeFilter

Method Authorization

Authorize @Protectable method invocation and publish a security event

MethodInterceptor · EventPublisher

Behavioral Analysis

Asynchronous · Background

Event Routing

Receive the security event in background and initiate the AI analysis pipeline

EventListener · SecurityPlaneAgent

Tiered AI Strategy

Layer 1 fast contextual analysis; escalate to Layer 2 deep forensic analysis when confidence is insufficient

ColdPathEventProcessor · L1 / L2 Strategy

LLM Decision

Structured prompt → LLM directly determines the ZeroTrustAction (not derived from riskScore)

PromptTemplate · LLMOrchestrator

Continuous Enforcement

Every Subsequent Request

Security Context Switch

Replace session/OAuth2 authentication with ZeroTrustAuthentication carrying the AI decision

SecurityContextRepository · OAuth2Filter

Action Lookup

Read the latest ZeroTrustAction from Redis and fuse it into Spring Security GrantedAuthority

ZeroTrustSecurityService

HTTP Enforcement

Enforce the action at HTTP level — 403 block, MFA challenge redirect, or 423 lock

AccessControlFilter · ChallengeFilter

Automated Response

ALLOW

Normal access

BLOCK

Access denied · 403

CHALLENGE

MFA required

ESCALATE

Locked · 423

## AI Analysis — Layer 1 & Layer 2

`ColdPathEventProcessor` orchestrates a tiered AI strategy. Layer 1 handles ~98% of requests via `Layer1ContextualStrategy` with a fast Tier 1 LLM. When confidence is insufficient, Layer 2 escalates to `Layer2ExpertStrategy` for deep forensic analysis. Both layers use `SecurityPromptTemplate` for structured prompt engineering and `UnifiedLLMOrchestrator` for Spring AI ChatClient execution.

:::info
**LLM output is `SecurityDecision`**, which directly contains a `ZeroTrustAction` (ALLOW, BLOCK, CHALLENGE, ESCALATE). The `riskScore` and `confidence` fields are recorded for audit and baseline learning — they do not drive the action decision.
:::

### Layer 1 — Contextual Analysis (Hot Path)

HCAD Context Collection

Builds `SessionContext` from session info, request patterns, device fingerprint, behavioral baseline vectors

|

RAG Search

Searches unified vector store (similarity threshold 0.5, top-k 5) for similar historical security events

|

Session History Analysis

Analyzes last 100 actions for anomalous patterns (unusual times, unfamiliar paths, rapid-fire requests)

|

LLM Evaluation (Tier 1)

Constructs prompt via `SecurityPromptTemplate`, sends to `UnifiedLLMOrchestrator`. Timeout: 10s LLM / 15s total. Outputs `SecurityDecision` with `ZeroTrustAction`.

### Layer 2 — Expert Investigation (Cold Path)

Triggered when Layer 1 confidence is below the configured threshold. Uses Tier 2 LLM for full forensic analysis.

Extended Context

Reuses Layer 1 context + deeper behavioral embeddings from complete activity profile

|

Broader RAG Search

Extended search with top-k 10 for comprehensive threat context

|

Expert LLM Evaluation (Tier 2)

Full forensic analysis. Timeout: 10s. Fail-closed: defaults to **BLOCK** on timeout (not ESCALATE).

|

SOAR Integration (optional)

`ApprovalService` requests human approval via `SoarApprovalNotifier` for ESCALATE decisions

## Enforcement Infrastructure

AI makes the decision. Spring Security's filter chain and distributed infrastructure enforce it — in milliseconds, across every instance, even mid-response.

#### BLOCK Enforcement

The most aggressive response. Immediate denial with cross-instance propagation.

SecurityDecisionEnforcementHandler

Saves BLOCK to Redis via `ZeroTrustActionRepository`. Sets `blockedFlag`.

|

BlockingSignalBroadcaster

Publishes `BLOCK:{userId}` via Redisson RTopic. All instances receive signal in real time.

|

BlockingDecisionRegistry

Receives RTopic signal. Updates local `ConcurrentHashMap` for O(1) lookup. `isBlocked()` check on every request.

|

BlockableResponseWrapper

`BlockableServletOutputStream` checks block status on every `write()`. Even in-flight responses are terminated immediately.

|

ZeroTrustAccessControlFilter

Returns 403 Forbidden. Clears authentication, invalidates session. `IBlockedUserRecorder` persists to DB.

#### CHALLENGE Enforcement

Requires additional authentication. Distributed lock prevents race conditions.

ZeroTrustAccessControlFilter

Detects CHALLENGE action. Grants `ROLE_MFA_REQUIRED` authority.

|

ChallengeMfaInitializer

Acquires distributed lock. Initializes MFA state machine. Redirects to MFA page.

|

ZeroTrustChallengeFilter

Processes MFA response. `BlockMfaStateStore` tracks attempts (max 2 in 1 hour).

|

Failure Escalation

MFA failure or timeout → auto-promotes to **BLOCK**.

#### ESCALATE Enforcement

Requires human review. Time-bounded with automatic promotion to BLOCK.

ZeroTrustAccessControlFilter

Returns 423 Locked. Grants `ROLE_REVIEW_REQUIRED`. TTL: 300 seconds.

|

SOAR Workflow

`ApprovalService.requestApproval()` → `SoarApprovalNotifier` sends notification to security team.

|

Admin Override or Auto-Promotion

`AdminOverrideService.approve()` resolves. If TTL expires (300s) → auto-promotes to **BLOCK**.

#### Cross-Instance Propagation

Blocking decisions propagate to all application instances in real time.

Redisson RTopic

Channel: `contexa:security:block-signal`. Signals: `BLOCK:{userId}`, `UNBLOCK:{userId}`.

|

BlockedUserService

Persists block to DB. `BlockedUserTimeoutScheduler` auto-resolves after configurable timeout.

|

ZeroTrustUnblockController

Admin endpoint for manual unblocking. Broadcasts `UNBLOCK` signal to all instances.

## Real-Time Monitoring & Learning

Every AI decision is streamed to dashboards in real time and fed back into the learning loop to improve future decisions.

### Real-Time Stream

Server-Sent Events for live monitoring.

-   `ZeroTrustSsePublisher` broadcasts decisions
-   `ZeroTrustSseController` SSE endpoint
-   Live action feed: ALLOW/BLOCK/CHALLENGE/ESCALATE

### Admin Dashboard

Visual control center for security operators.

-   `ZeroTrustPageController` web UI
-   `ZeroTrustUnblockController` for admin actions
-   `AdminOverrideService` for decision overrides

### Learning Loop

Every ALLOW decision improves baselines.

-   `SecurityLearningService` baseline update
-   `SecurityDecisionPostProcessor` vector storage
-   `ZeroTrustSecurityService` session tracking
-   `ZeroTrustLogoutStrategy` cleanup on logout

## SpEL Integration & Configuration

### Zero Trust in SpEL Expressions

Spring Security's `@PreAuthorize` and `@PostAuthorize` annotations can reference zero-trust state through custom expression methods on `AbstractAISecurityExpressionRoot`.

Expression

Returns

Description

`isZeroTrustAllowed()`

boolean

Current user's ZeroTrustAction is ALLOW

`isZeroTrustBlocked()`

boolean

Current user's action is BLOCK

`isZeroTrustChallenged()`

boolean

Current user's action is CHALLENGE

`getZeroTrustAction()`

ZeroTrustAction

Returns the current ZeroTrustAction enum value

### Configuration Reference

Property

Default

Description

`security.zerotrust.enabled`

`true`

Enable/disable zero-trust pipeline

`security.zerotrust.mode`

`ENFORCE`

SHADOW (log only) or ENFORCE (full enforcement)

`security.zerotrust.sampling.rate`

`1.0`

Fraction of requests to analyze (0.0-1.0)

`security.zerotrust.hotpath.enabled`

`true`

Enable Layer 1 hot-path analysis

`security.zerotrust.redis.updateIntervalSeconds`

`30`

Redis action update interval

`contexa.infrastructure.mode`

`STANDALONE`

STANDALONE (in-memory) or DISTRIBUTED (Redis+Kafka)

## Related

[**Platform Architecture** Module overview and request flow](../../../docs/reference/architecture/overview) [**Identity DSL** Authentication flows and security configuration](../../../docs/reference/identity/dsl) [**Shadow Mode** Safe progressive adoption strategy](../../../docs/install/shadow-mode)

[Previous Platform Architecture](../../../docs/reference/architecture/overview) [Next Identity DSL](../../../docs/reference/identity/dsl)