---
title: "Dynamic URL Authorization"
---
contexa-iam

# Dynamic URL Authorization

Database-driven URL authorization using CustomDynamicAuthorizationManager. Define access policies through the Admin Dashboard and have them enforced automatically without redeployment.

## What is Dynamic Authorization?

Traditional Spring Security uses static URL matchers defined in Java code. Any change to authorization rules requires a code change, rebuild, and redeployment. Contexa's `CustomDynamicAuthorizationManager` takes a fundamentally different approach: authorization policies are loaded from the database at startup and evaluated at runtime.

This architecture enables three key capabilities:

-   **No-redeploy policy changes** — Authorization rules can be modified, added, or removed without rebuilding or redeploying the application. After editing, a hot-reload triggers re-initialization.
-   **Admin Dashboard management** — Policies can be created and managed through the Admin Dashboard UI, making authorization accessible to non-developers.
-   **AI-generated policy integration** — AI-generated and AI-evolved policies can be integrated into the authorization pipeline after human approval.

## How It Works

`CustomDynamicAuthorizationManager` implements Spring Security's `AuthorizationManager<RequestAuthorizationContext>` interface. It bridges the gap between database-stored policies and Spring Security's runtime evaluation engine.

### Policy Evaluation Flow

Text Copy

Initialization

Application Startup

Admin Dashboard / PAP REST API

PolicyRetrievalPoint (PRP)

Loads policies

Database (Policies)

Rules, Conditions, Targets

CustomDynamicAuthorizationManager

Builds RequestMatcherEntry list from policies + URL targets

Per-Request Evaluation

PolicyTranslator

Converts policy conditions to SpEL ExpressionNode trees

ExpressionAuthorizationManagerResolver

Matches request URL to applicable policies

SpEL Evaluation

hasAnyAuthority(), hasPermission(), isAllowed(), custom expressions

AI Policy Gate

AI-generated policies are SKIPPED unless approvalStatus = APPROVED

CentralAuditFacade

Logs all authorization attempts

### Step-by-Step Evaluation

1.  **PolicyRetrievalPoint (PRP)** loads all policies from the database at application startup via a `ContextRefreshedEvent` listener.
2.  For each policy, `CustomDynamicAuthorizationManager` extracts URL targets and converts the policy into a SpEL expression string.
3.  **PolicyTranslator** converts policy conditions into SpEL expression trees (`ExpressionNode`).
4.  At request time, **ExpressionAuthorizationManagerResolver** matches the incoming request URL against the cached `RequestMatcherEntry` list.
5.  The matched SpEL expression is evaluated against the current `Authentication` context.
6.  AI-generated policies (source = `AI_GENERATED` or `AI_EVOLVED`) are **skipped entirely** unless their `approvalStatus` is `APPROVED`.
7.  The authorization decision (grant or deny) is enforced, and the attempt is logged to `CentralAuditFacade`.

## Static + Dynamic Integration

Contexa's dynamic authorization coexists with standard Spring Security static rules. Static rules are evaluated first by the filter chain; only requests that reach `.anyRequest()` are handled by the dynamic authorization manager.

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(auth -> auth
        // Static rules: evaluated first, bypasses dynamic authorization
        .requestMatchers("/", "/home", "/css/**", "/js/**").permitAll()
        .requestMatchers("/login", "/register").permitAll()
        .requestMatchers("/user/list/**").hasRole("USER")

        // Dynamic authorization: all remaining requests
        // Policies loaded from database, hot-reloadable at runtime
        .anyRequest().access(customDynamicAuthorizationManager)
    );
    return http.build();
}
```

### Evaluation Flow

Incoming Request

GET /admin/dashboard

Static Matchers

/css/\*\*, /js/\*\*, /images/\*\*, /favicon.ico

Match Found?

Yes: return permitAll() immediately | No: continue

CustomDynamicAuthorizationManager

Evaluate XACML policies from database

AuthorizationDecision

Grant or deny based on policy evaluation

### Important Behaviors

-   **Order matters** — Static `requestMatchers` must be declared before `.anyRequest()`. Spring Security evaluates them top-to-bottom and uses the first match.
-   **Short-circuit evaluation** — Once a static matcher matches, the dynamic manager is never invoked. This means `permitAll()` routes cannot be restricted by database policies.
-   **No overlap recommended** — Avoid defining database policies for URLs that are already statically matched, as the static rule will always take precedence.
-   **Audit implications** — Statically permitted requests do not pass through the XACML engine and will not appear in the authorization audit trail.

:::warning
**Caution:** If you add a URL to `requestMatchers().permitAll()`, any database policy targeting that URL will be silently ignored. The static matcher always wins.
:::

### Default Decision for Unmatched Requests

When a request URL does not match any policy in the database, `CustomDynamicAuthorizationManager` returns a default authorization decision. By default, unmatched requests are **allowed** (`AuthorizationDecision(true)`), which means only explicitly defined DENY policies block access.

:::warning
**Security consideration:** The default-allow behavior is suitable during initial setup and migration. For production environments with strict security requirements, consider creating a catch-all DENY policy with low priority to enforce a deny-by-default posture.
:::

## Configuration Patterns

The `authorizeHttpRequests` block inside the global customizer determines how static matchers interact with the dynamic authorization engine. Choose the pattern that matches your security posture.

### Pattern 1: Public Assets + Full Dynamic

The most common pattern. Static assets bypass authorization entirely; everything else is evaluated by the XACML policy engine.

```java
http.authorizeHttpRequests(authReq -> authReq
    .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
    .anyRequest().access(customDynamicAuthorizationManager)
);
```

### Pattern 2: Admin Fixed + Rest Dynamic

A hybrid approach where certain well-known routes are statically permitted alongside asset paths, while the remaining routes go through dynamic evaluation. Useful when you want guaranteed access to specific pages regardless of policy state.

```java
http.authorizeHttpRequests(authReq -> authReq
    .requestMatchers("/css/**", "/js/**").permitAll()
    .requestMatchers("/home", "/user/list/**").permitAll()
    .anyRequest().access(customDynamicAuthorizationManager)
);
```

### Pattern 3: Full Dynamic

Enterprise pattern where every request — including static assets — is evaluated by the policy engine. All access rules live in the database with no compile-time exceptions.

```java
http.authorizeHttpRequests(authReq -> authReq
    .anyRequest().access(customDynamicAuthorizationManager)
);
```

### Pattern Comparison

Criteria

Pattern 1: Public Assets + Dynamic

Pattern 2: Hybrid

Pattern 3: Full Dynamic

Static asset performance

Best — no policy lookup

Good — no policy lookup for assets

Slowest — all requests evaluated

Policy flexibility

High for non-asset routes

Medium — some routes are hardcoded

Maximum — everything is policy-driven

Operational safety

Safe — assets always load

Safe — critical pages always reachable

Requires careful policy setup

Best for

Most applications

Admin panels with guaranteed access

Enterprise with full policy governance

Misconfiguration risk

Low

Low

High — missing policies block everything

## Core Implementation

The manager initializes on Spring context refresh and supports hot-reload for runtime policy updates.

```java
public class CustomDynamicAuthorizationManager
        implements AuthorizationManager<RequestAuthorizationContext> {

    private final PolicyRetrievalPoint policyRetrievalPoint;
    private final ExpressionAuthorizationManagerResolver managerResolver;
    private final ContextHandler contextHandler;
    private final ZeroTrustEventPublisher zeroTrustEventPublisher;
    private final AuthorizationMetrics metricsCollector;

    // Initializes on application context refresh
    @EventListener
    public void onApplicationEvent(ContextRefreshedEvent event) {
        initialize();
    }

    @Override
    public AuthorizationDecision check(
            Supplier<Authentication> authenticationSupplier,
            RequestAuthorizationContext context) {
        // 1. Match request URL to cached RequestMatcherEntry
        // 2. Resolve the SpEL expression for the matched policy
        // 3. Evaluate the expression against the Authentication
        // 4. Log result to CentralAuditFacade
        // 5. Return AuthorizationDecision(granted/denied)
    }

    // Hot-reload: clears PRP cache and re-initializes mappings
    public synchronized void reload() {
        policyRetrievalPoint.clearCache();
        initialize();
    }
}
```

## Policy Model

Each `Policy` entity stored in the database contains the full authorization definition including targets, rules, and metadata for AI-generated policies.

```java
public class Policy {
    String name;               // Human-readable policy name
    String description;        // Purpose and scope of the policy
    PolicyEffect effect;       // ALLOW or DENY
    int priority;              // Higher priority policies evaluated first
    List<PolicyTarget> targets; // URL patterns + HTTP methods
    List<PolicyRule> rules;     // Conditions with SpEL expressions
    PolicySource source;        // MANUAL, AI_GENERATED, AI_EVOLVED, IMPORTED
    ApprovalStatus approvalStatus; // NOT_REQUIRED, PENDING, APPROVED, REJECTED
    Double confidenceScore;    // AI confidence (0.0 - 1.0), null for manual
    String aiModel;            // AI model identifier, null for manual
}
```

### Policy Field Reference

Field

Type

Description

`name`

String

A human-readable identifier for the policy, displayed in the Admin Dashboard and audit logs.

`description`

String

A human-readable description of what the policy protects and why it exists.

`effect`

PolicyEffect

The policy effect. `ALLOW` grants access when conditions are met; `DENY` blocks access when conditions are met.

`priority`

int

Determines the evaluation order when multiple policies match the same request. Higher priority policies are evaluated first and take precedence.

`targets`

List<PolicyTarget>

The resource targets this policy applies to, defined as Ant-style URL patterns paired with HTTP methods.

`rules`

List<PolicyRule>

The authorization rules for this policy. Each rule contains one or more SpEL conditions that are evaluated at request time.

`source`

PolicySource

Indicates how the policy was created: `MANUAL`, `AI_GENERATED`, `AI_EVOLVED`, or `IMPORTED`.

`approvalStatus`

ApprovalStatus

The approval workflow status: `NOT_REQUIRED`, `PENDING`, `APPROVED`, or `REJECTED`. AI-generated policies must be `APPROVED` before they are enforced.

`confidenceScore`

Double

The AI model's confidence score for this policy, ranging from 0.0 to 1.0. Null for manually created policies.

`aiModel`

String

The identifier of the AI model that generated this policy. Null for manually created policies.

### PolicyTarget

Each target binds a URL pattern to one or more HTTP methods.

```java
public class PolicyTarget {
    String urlPattern;          // Ant-style URL pattern, e.g. "/api/admin/**"
    List<HttpMethod> methods;   // GET, POST, PUT, DELETE, etc.
}
```

### PolicyRule and Conditions

Each rule contains one or more conditions. Conditions hold the actual SpEL expression strings that are evaluated at request time.

```java
public class PolicyRule {
    String name;
    List<PolicyCondition> conditions;
}

public class PolicyCondition {
    String expression;  // SpEL expression, e.g. "hasAnyAuthority('ROLE_ADMIN')"
}
```

## SpEL Expression Support

Contexa extends the standard Spring Security SpEL expressions with custom methods from `AbstractAISecurityExpressionRoot` for zero-trust AI action checks.

### Standard Spring Security Expressions

Expression

Description

`hasAnyAuthority('ROLE_ADMIN', 'ROLE_USER')`

Grants access if the principal has any of the listed authorities.

`hasAuthority('ROLE_ADMIN')`

Grants access if the principal has the specified authority.

`hasPermission('resource', 'action')`

Delegates evaluation to the `PermissionEvaluator` chain. This expression is automatically stripped from URL-level policies since it is only relevant for method-level evaluation.

`permitAll`

Always grants access regardless of authentication state or conditions.

`denyAll`

Always denies access regardless of authentication state or conditions.

`isAuthenticated()`

Grants access if the user is authenticated and not an anonymous user.

### Zero-Trust AI Expressions

These expressions are provided by `AbstractAISecurityExpressionRoot` and integrate with Contexa's zero-trust AI evaluation pipeline.

Expression

Description

`isAllowed()`

Returns true if the zero-trust AI action for the current request is `ALLOW`.

`isBlocked()`

Returns true if the zero-trust AI action for the current request is `BLOCK`.

`needsChallenge()`

Returns true if the AI evaluation determined that a step-up MFA challenge is required before granting access.

`needsEscalation()`

Returns true if the AI evaluation determined that human review or security team escalation is needed.

`isPendingAnalysis()`

Returns true if asynchronous AI analysis is still in progress for the current request.

`hasAction('ALLOW')`

Checks whether the zero-trust action matches a specific action by name.

### Policy-to-Expression Conversion Rules

The `getExpressionFromPolicy()` method in `CustomDynamicAuthorizationManager` applies the following conversion logic:

Condition

Resulting Expression

No conditions + ALLOW effect

`permitAll`

No conditions + DENY effect

`denyAll`

Single condition

Uses the expression directly

Multiple simple authority conditions

`hasAnyAuthority('A', 'B', 'C')`

Multiple mixed conditions

Joined with `or` operator

DENY effect

Wraps the expression in `!(expression)`

`hasPermission()` in URL policy

Stripped (only relevant for method-level evaluation)

## XACML Integration

Dynamic authorization is powered by the XACML engine (eXtensible Access Control Markup Language). The five XACML components work together to manage the complete policy lifecycle. See the [XACML Engine](../../../docs/reference/iam/xacml) page for full details.

Component

Full Name

Role in Dynamic Authorization

**PAP**

Policy Administration Point

Creates, reads, updates, and deletes policies via the REST API or the Admin Dashboard.

**PDP**

Policy Decision Point

Evaluates policy conditions as SpEL expressions against the security context and returns a grant or deny decision.

**PEP**

Policy Enforcement Point

Implemented by `CustomDynamicAuthorizationManager`. Enforces PDP decisions within the Spring Security filter chain.

**PIP**

Policy Information Point

Provides contextual attributes such as user roles, permissions, and request metadata for use in SpEL expression evaluation.

**PRP**

Policy Retrieval Point

Loads policies from the database at application startup and refreshes them on hot-reload events.

## Usage Example

The following example shows the complete lifecycle of creating and enforcing a dynamic authorization policy.

### Step 1: Create a Policy

Policies can be created through the Admin Dashboard UI or programmatically via the PAP REST API.

HTTP Copy

```
POST /api/iam/policies
Content-Type: application/json

{
  "name": "Admin API Access",
  "description": "Restrict /api/admin/** endpoints to users with ROLE_ADMIN",
  "effect": "ALLOW",
  "priority": 100,
  "targets": [
    {
      "urlPattern": "/api/admin/**",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  ],
  "rules": [
    {
      "name": "Require admin role",
      "conditions": [
        {
          "expression": "hasAuthority('ROLE_ADMIN')"
        }
      ]
    }
  ]
}
```

### Step 2: Policy is Stored in Database

The PAP persists the policy as JPA entities: `Policy`, `PolicyTarget`, `PolicyRule`, and `PolicyCondition`. For manually created policies, `source` is set to `MANUAL` and `approvalStatus` to `NOT_REQUIRED`.

### Step 3: Manager Picks Up the Policy

On the next hot-reload (or application restart), `CustomDynamicAuthorizationManager` loads the new policy from the PRP and builds a `RequestMatcherEntry` mapping:

Text Copy

```
URL Pattern: /api/admin/**
HTTP Methods: GET, POST, PUT, DELETE
SpEL Expression: hasAuthority('ROLE_ADMIN')
Source: MANUAL
Approval: NOT_REQUIRED (active immediately)
```

### Step 4: Requests are Automatically Secured

When a request arrives at `/api/admin/users`:

Text Copy

```
1. Request: GET /api/admin/users
2. CustomDynamicAuthorizationManager.check() is invoked
3. URL matches pattern /api/admin/** (Ant path matching)
4. SpEL expression "hasAuthority('ROLE_ADMIN')" is evaluated
5a. User has ROLE_ADMIN -> AuthorizationDecision(granted=true)
5b. User lacks ROLE_ADMIN -> AuthorizationDecision(granted=false) -> 403
6. CentralAuditFacade logs: policy="Admin API Access", decision=GRANT/DENY
```

### AI-Generated Policy Example

When an AI model generates a policy, it enters the system with `PENDING` approval status and is **not enforced** until a human reviewer approves it.

```
{
  "name": "AI: Restrict Sensitive Reports",
  "description": "AI-detected sensitive data endpoint requiring elevated access",
  "effect": "ALLOW",
  "priority": 90,
  "targets": [
    {
      "urlPattern": "/api/reports/sensitive/**",
      "methods": ["GET"]
    }
  ],
  "rules": [
    {
      "name": "Require manager role and AI clearance",
      "conditions": [
        { "expression": "hasAuthority('ROLE_MANAGER')" },
        { "expression": "isAllowed()" }
      ]
    }
  ],
  "source": "AI_GENERATED",
  "approvalStatus": "PENDING",
  "confidenceScore": 0.87,
  "aiModel": "contexa-policy-gen-v2"
}
```

This policy will be **skipped** during authorization evaluation until an administrator sets `approvalStatus` to `APPROVED` through the Admin Dashboard or PAP API.

## Configuration

Dynamic authorization is enabled automatically when the `contexa-iam` module is on the classpath. The primary configuration is managed through the [Admin Dashboard](../../../docs/reference/iam/admin).

### Hot-Reload

After modifying policies through the Admin Dashboard or PAP API, trigger a hot-reload to apply changes without restarting the application:

HTTP Copy

```
POST /api/iam/policies/reload
Authorization: Bearer <admin-token>
```

This calls `CustomDynamicAuthorizationManager.reload()`, which clears the PRP cache and re-initializes all `RequestMatcherEntry` mappings from the database.

### Related Configuration

For IAM property configuration, see the [Configuration](../../../docs/install/configuration) reference. Key properties include:

Property

Default

Description

`contexa.iam.enabled`

`true`

Enables or disables the entire IAM module. When disabled, dynamic authorization is not applied.

`contexa.iam.policy.ai-approval-required`

`true`

When enabled, AI-generated policies must be explicitly approved by an administrator before they are enforced.

`contexa.iam.policy.cache-ttl`

`3600`

The time-to-live for the PRP policy cache, in seconds. Set to 0 to disable caching entirely.

### Zero Trust Properties

Property

Default

Description

`security.zerotrust.enabled`

`true`

Enable or disable the zero-trust authorization framework globally

`security.zerotrust.mode`

`ENFORCE`

Authorization mode: `SHADOW` (audit only) or `ENFORCE` (live enforcement)

`security.zerotrust.sampling.rate`

`1.0`

Sampling rate for authorization evaluation (1.0 = evaluate all requests)

`security.zerotrust.hotpath.enabled`

`true`

Enable hot-path optimization for frequently accessed resources

`security.zerotrust.threat.initial`

`0.3`

Initial threat score assigned to new sessions

### Threshold Properties

Property

Default

Description

`security.zerotrust.thresholds.skip`

`0.3`

Threat score below which authorization checks may be skipped

`security.zerotrust.thresholds.optional`

`0.5`

Threat score threshold for optional additional verification

`security.zerotrust.thresholds.required`

`0.7`

Threat score threshold requiring mandatory verification

`security.zerotrust.thresholds.strict`

`0.9`

Threat score threshold triggering strict security measures

### Cache and Session Properties

Property

Default

Description

`security.zerotrust.cache.ttl-hours`

`24`

TTL for cached authorization decisions (hours)

`security.zerotrust.cache.session-ttl-minutes`

`30`

Session-specific cache TTL (minutes)

`security.zerotrust.cache.invalidated-ttl-minutes`

`60`

TTL for invalidated cache entries before removal (minutes)

`security.zerotrust.session.tracking-enabled`

`true`

Enable AI session tracking for behavioral analysis

`security.zerotrust.redis.timeout`

`5`

Redis connection timeout (seconds)

`security.zerotrust.redis.update-interval-seconds`

`30`

Interval for pushing session metrics to Redis

:::info
**Related:** For IAM admin UI properties such as `contexa.iam.admin.*`, see the [Admin Dashboard](../../../docs/reference/iam/admin) reference page.
:::

## See Also

-   [Authorization Overview](../../../docs/reference/iam/xacml) — Full XACML architecture, AI expressions, and Quick Start
-   [Policy Management](../../../docs/reference/iam/policy) — Policy lifecycle, Policy Builder, and condition templates
-   [Resource Scanner](../../../docs/reference/iam/resource-scanner) — Automatic resource discovery and the end-to-end workflow
-   [Permission Evaluators](../../../docs/reference/iam/permission-evaluators) — Method-level permission evaluation with `hasPermission()`
-   [Admin Dashboard](../../../docs/reference/iam/admin) — UI for managing policies, roles, and permissions

## Default Policy Management

When an incoming request does not match any configured policy, the authorization manager falls back to a default decision. Out of the box, the default is **allow**:

```java
// Default behavior: unmatched requests are allowed
return new AuthorizationDecision(true);
```

### Security Implications

Default Policy

Behavior

Use Case

Risk

`AuthorizationDecision(true)`

Allow access when no policy matches

Development, gradual migration

Unprotected resources are open by default

`AuthorizationDecision(false)`

Deny access when no policy matches

Production, zero-trust environments

New endpoints are blocked until a policy is created

### Switching to Default Deny

For stricter security postures (recommended for production), configure the default policy to **deny** unmatched requests. This ensures that every accessible endpoint must have an explicit ALLOW policy.

```yaml
contexa:
  security:
    zero-trust:
      default-policy: DENY
```

You can also change the default policy at runtime through the [Admin Dashboard](../../../docs/reference/iam/admin) under **Authorization Policies > Global Settings**, enabling zero-downtime policy changes without redeployment.

:::info
**Tip:** Use the [Resource Scanner](../../../docs/reference/iam/resource-scanner) to discover and create policies for all endpoints before switching to default deny.
:::

## Creating URL Policies via Admin

The Admin Dashboard provides a visual workflow for creating URL-based authorization policies. Follow these steps to create a policy that protects a URL pattern:

1.  **Navigate to Policies** — Go to **Admin > Authorization Policies > Policy List** in the Admin Dashboard.
2.  **Create New Policy** — Click the **"Create New Policy"** button to open the policy editor.
3.  **Set Policy Metadata** — Enter a descriptive policy name, select the effect (`ALLOW` or `DENY`), and set the priority (lower numbers evaluate first).
4.  **Add URL Target** — In the Targets section, add a URL target by specifying:
    -   URL pattern (e.g., `/api/admin/**`)
    -   HTTP method (`GET`, `POST`, `PUT`, `DELETE`, or `ANY`)
5.  **Add Rule with Condition** — Add a rule containing a SpEL condition expression. For example:

    SpEL Copy

    ```
    hasAnyAuthority('ROLE_ADMIN')
    ```

6.  **Save and Verify** — Save the policy. The `CustomDynamicAuthorizationManager` will hot-reload the new policy automatically. Verify enforcement using the [Authorization Studio](../../../docs/reference/iam/admin) simulation tool.

:::info
**Tip:** For complex conditions, use the **Policy Builder** wizard which provides AI-assisted SpEL expression generation and validation. See [Policy Management](../../../docs/reference/iam/policy) for details.
:::

## Policy Hot-Reload

`CustomDynamicAuthorizationManager` supports hot-reloading of policies without application restart. This ensures authorization changes take effect immediately.

### Automatic Reload

Policies are automatically reloaded when the application context fires a `ContextRefreshedEvent`. The reload process:

1.  `PolicyRetrievalPoint` fetches the latest policies from the database.
2.  `CustomDynamicAuthorizationManager` rebuilds the `RequestMatcherEntry` list.
3.  New requests are evaluated against the updated policy set.

### Manual Reload

You can trigger a policy reload manually through two mechanisms:

-   **Admin Dashboard** — Click the **"Reload Policies"** button under **Authorization Policies > Global Settings**.
-   **REST API** — Send a `POST` request to the policy reload endpoint:

    HTTP Copy

    ```
    POST /api/admin/policies/reload
    Authorization: Bearer <admin-token>
    ```


### Cache Invalidation

When policies are reloaded, `PolicyRetrievalPoint` invalidates its internal cache to ensure stale policies are not served. The cache is rebuilt lazily on the next policy lookup. If you are using a distributed cache (e.g., Redis), invalidation events are propagated across all application instances.

[Previous Authorization Overview](../../../docs/reference/iam/xacml) [Next @Protectable](../../../docs/reference/iam/protectable)