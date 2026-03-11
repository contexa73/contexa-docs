---
title: "AI Security Expressions"
---
contexa-iam

# AI Security Expressions

Extend Spring Security's SpEL expression system with AI-powered risk assessment functions. Contexa's `AbstractAISecurityExpressionRoot` provides real-time Zero Trust action evaluation for both URL-level and method-level authorization decisions.

## Overview

Contexa extends Spring Security's expression-based access control with AI-integrated functions that evaluate `ZeroTrustAction` results in real time. These expressions can be used in both URL-level security configurations and method-level annotations.

The expression system is built on two levels:

-   **URL-Level** — `CustomWebSecurityExpressionRoot` for HTTP request matching in URL policies
-   **Method-Level** — `CustomMethodSecurityExpressionRoot` for annotation-based authorization with `@Protectable`

Both classes extend `AbstractAISecurityExpressionRoot`, which provides the shared `#ai.*` expression API. The AI expressions are integrated with the Zero Trust pipeline — `ZeroTrustAction` objects are retrieved from Redis (and optionally Caffeine cache at the method level) to make authorization decisions based on AI risk assessments.

## Expression API Reference

All expressions are accessed through the `#ai` prefix in SpEL. These are defined in `AbstractAISecurityExpressionRoot` and available at both URL and method levels.

Expression

Returns

Description

`#ai.isAllowed()`

`boolean`

Returns `true` if the AI assessment result is `ALLOW`

`#ai.isBlocked()`

`boolean`

Returns `true` if the AI assessment result is `BLOCK`

`#ai.needsChallenge()`

`boolean`

Returns `true` if the AI assessment result is `CHALLENGE`

`#ai.needsEscalation()`

`boolean`

Returns `true` if the AI assessment result is `ESCALATE`

`#ai.isPendingAnalysis()`

`boolean`

Returns `true` if the AI assessment result is `PENDING_ANALYSIS`

`#ai.hasAction(String)`

`boolean`

Checks whether the current `ZeroTrustAction` matches a specific action string

`#ai.hasActionIn(String...)`

`boolean`

Returns `true` if the current action matches any of the provided action strings

`#ai.hasActionOrDefault(default, actions...)`

`boolean`

Checks the provided actions; returns the `default` boolean value if no `ZeroTrustAction` is available

## URL-Level Expressions

`CustomWebSecurityExpressionRoot` extends `AbstractAISecurityExpressionRoot` and adds URL-specific helper methods for HTTP request matching. It is used in URL policies created through the Policy Builder.

### Additional URL-Level Methods

Method

Returns

Description

`hasIpAddress(String ipAddress)`

`boolean`

Checks if the request originates from the given IP address or CIDR range

`getHttpMethod()`

`String`

Returns the HTTP method of the current request (GET, POST, etc.)

### Usage Examples

These expressions are used in URL policy conditions created via the Admin Dashboard or Policy Builder:

SpEL Copy

```
// Allow only if AI approves AND user has USER role
#ai.isAllowed() and hasRole('USER')

// Allow if AI approves AND request is from internal network
#ai.isAllowed() and hasIpAddress('10.0.0.0/8')

// Deny only if AI explicitly blocks (permissive mode)
!(#ai.isBlocked())

// Allow or challenge actions only
#ai.hasActionIn('ALLOW', 'CHALLENGE')
```

## Method-Level Expressions

`CustomMethodSecurityExpressionRoot` extends `AbstractAISecurityExpressionRoot` and adds method-level authorization capabilities including ownership verification and full `hasPermission()` support.

### Additional Method-Level Methods

Method

Returns

Description

`hasPermission(Object, Object)`

`boolean`

Full permission evaluation with ownership checking via `CompositePermissionEvaluator`

`hasPermission(Object, String, Object)`

`boolean`

Target-type-based permission evaluation with domain-specific routing

### Caching

Method-level expressions use a two-layer cache for `ZeroTrustAction` lookups:

-   **Caffeine local cache** — 5-second TTL, maximum 10,000 entries
-   **Redis** — Primary distributed store, session-scoped

### Usage with @Protectable

Method-level AI expressions are typically used with the `@Protectable` annotation and `@PreAuthorize`:

```java
@PreAuthorize("#ai.isAllowed() and hasPermission(#id, 'USER', 'READ')")
@Protectable(ownerField = "userId")
public User getUser(Long id) { ... }

@PreAuthorize("#ai.isAllowed() and hasPermission(#orderId, 'ORDER', 'UPDATE')")
@Protectable(ownerField = "customerId", sync = true)
public void updateOrder(Long orderId, OrderDto dto) { ... }

@PreAuthorize("!(#ai.isBlocked()) and hasRole('ADMIN')")
@Protectable
public List<AuditLog> getAuditLogs() { ... }
```

## URL vs Method Comparison

The two expression roots serve different authorization layers and have distinct capabilities:

Feature

URL-Level

Method-Level

Expression Root

`CustomWebSecurityExpressionRoot`

`CustomMethodSecurityExpressionRoot`

Cache

Redis only

Caffeine (5s TTL) + Redis

Ownership Check

No

Yes (via `ownerField`)

`hasPermission()`

Stripped (URL-level only)

Full support

`hasIpAddress()`

Yes

No

Trigger

HTTP request matching

`@Protectable` annotation

Typical Use

URL policies via Policy Builder

Service method annotations

## ZeroTrustAction Flow

AI security expressions evaluate the `ZeroTrustAction` generated by the AI analysis pipeline. The following diagram shows how a request flows from initial analysis to authorization decision:

ZeroTrustAction Evaluation Flow

HTTP Request Incoming request enters the filter chain

AI Analysis Pipeline Risk scoring, behavioral analysis, threat detection

ZeroTrustAction Generated ALLOW | BLOCK | CHALLENGE | ESCALATE | PENDING\_ANALYSIS

Stored in Redis Session-scoped cache for subsequent evaluations

Expression Evaluation #ai.isAllowed(), #ai.isBlocked(), etc.

Authorization Decision Grant or deny access based on expression result

### Action Types

Action

Meaning

Typical Response

`ALLOW`

AI assessment indicates low risk

Grant access normally

`BLOCK`

AI assessment indicates high risk or threat

Deny access, log incident

`CHALLENGE`

AI assessment indicates medium risk

Require additional verification (MFA, CAPTCHA)

`ESCALATE`

AI assessment requires human review

Route to security team for manual approval

`PENDING_ANALYSIS`

AI analysis is still in progress

Apply default policy or wait for completion

### Risk Score Calculation

The risk score is derived from the AI assessment confidence:

Text Copy

```
riskScore = 1.0 - aiAssessmentScore

Example:
  AI confidence = 0.92 (high confidence of safety)
  Risk score   = 1.0 - 0.92 = 0.08 (low risk)
  Action       = ALLOW

  AI confidence = 0.25 (low confidence of safety)
  Risk score   = 1.0 - 0.25 = 0.75 (high risk)
  Action       = BLOCK or CHALLENGE
```

## Practical Scenarios

### Scenario 1: Risk-Based Access Control

Use AI expressions to implement tiered access control based on risk level:

-   **Low risk** — AI returns `ALLOW`, access is granted
-   **Medium risk** — AI returns `CHALLENGE`, require additional authentication (MFA)
-   **High risk** — AI returns `BLOCK`, access is denied

SpEL Copy

```
// Strict mode: only allow if AI explicitly approves
#ai.isAllowed()

// Permissive mode: allow unless AI explicitly blocks
!(#ai.isBlocked())

// Challenge-aware: allow if permitted or after challenge completion
#ai.hasActionIn('ALLOW', 'CHALLENGE')
```

### Scenario 2: AI + Role-Based Hybrid

Combine AI risk assessment with traditional role-based access control for defense in depth:

SpEL Copy

```
// Require both AI approval and appropriate role
#ai.isAllowed() and hasAnyAuthority('ROLE_USER', 'ROLE_ADMIN')

// Admin bypass with AI monitoring (AI can still block suspicious admin activity)
hasRole('ADMIN') and !(#ai.isBlocked())

// Elevated access requires both AI approval and specific authority
#ai.isAllowed() and hasAuthority('PERMISSION_SENSITIVE_DATA_READ')
```

### Scenario 3: Ownership with AI Verification

Combine AI expressions with `@Protectable` ownership checking and permission evaluation for fine-grained access control:

```java
// AI + ownership + permission: triple-layered authorization
@Protectable(ownerField = "createdBy", sync = true)
@PreAuthorize("#ai.isAllowed() and hasPermission(#id, 'DOCUMENT', 'UPDATE')")
public void updateDocument(Long id, DocumentDto dto) { ... }

// AI + ownership for read operations
@Protectable(ownerField = "patientId")
@PreAuthorize("#ai.isAllowed() and hasPermission(#id, 'MEDICAL_RECORD', 'READ')")
public MedicalRecord getRecord(Long id) { ... }

// Fallback when AI is unavailable: default to deny
@Protectable(ownerField = "accountId")
@PreAuthorize("#ai.hasActionOrDefault(false, 'ALLOW') and hasPermission(#id, 'ACCOUNT', 'UPDATE')")
public void updateAccount(Long id, AccountDto dto) { ... }
```

## Creating AI-Aware Policies in Admin

AI security expressions can be used in policies created through the Admin Dashboard's Policy Builder. This allows administrators to define authorization rules that incorporate AI risk assessment without writing code.

### Step 1: Open Policy Builder

Navigate to **IAM → Policies → Create Policy** in the Admin Dashboard. Select the target resource and HTTP method pattern for the policy.

### Step 2: Select AI Condition Template

In the condition editor, choose from predefined AI expression templates or write custom SpEL expressions. Available templates include:

-   **AI Approved** — `#ai.isAllowed()`
-   **AI Not Blocked** — `!(#ai.isBlocked())`
-   **AI Approved + Role** — `#ai.isAllowed() and hasRole('...')`
-   **Custom AI Expression** — Write any valid SpEL using `#ai.*` functions

### Step 3: Configure Approval Workflow

For AI-generated policies, an approval workflow is available. Policies with AI expressions can be:

-   **Auto-approved** — Applied immediately for low-risk policy changes
-   **Requires review** — Queued for security team review before activation
-   **Shadow mode** — Evaluate but do not enforce, for testing AI policy effectiveness

### Step 4: Monitor Policy Effectiveness

After activation, monitor AI policy outcomes in the Admin Dashboard:

-   View allow/deny/challenge rates per policy
-   Track false positive and false negative rates
-   Analyze risk score distributions for protected resources
-   Review escalation patterns and response times

## Cache Architecture

AI security expressions rely on cached `ZeroTrustAction` objects to avoid re-running AI analysis on every expression evaluation. The caching strategy differs between URL-level and method-level expressions.

### Cache Layers

ZeroTrustAction Cache Lookup Order

Request Attribute Checked first — in-request cache for current HTTP request

Caffeine Local Cache Method-level only — 5s TTL, 10K max entries

Redis Primary distributed store — session-scoped TTL

Cache Layer

Scope

TTL

Max Entries

Used By

Request Attribute

Single HTTP request

Request lifetime

1 per request

Both URL and Method level

Caffeine

JVM-local

5 seconds

10,000

Method-level only

Redis

Distributed (session-scoped)

Session TTL

Unlimited

Both URL and Method level

The request attribute cache ensures that within a single HTTP request, the `ZeroTrustAction` is resolved only once regardless of how many expressions reference it. The Caffeine cache at the method level provides low-latency access for repeated evaluations across requests within a short time window.

[Previous @Protectable](../../../docs/reference/iam/protectable) [Next Permission Evaluators](../../../docs/reference/iam/permission-evaluators)