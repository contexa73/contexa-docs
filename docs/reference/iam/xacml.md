---
title: "Authorization Architecture"
---
contexa-iam

# Authorization Architecture

XACML-based authorization architecture with dynamic policy enforcement at both URL and method levels, AI-powered security expressions, and runtime policy management — all without code changes or redeployment.

## Overview

Traditional Spring Security authorization uses static annotations like `@PreAuthorize("hasRole('ADMIN')")` that are hardcoded at compile time. When business requirements change — such as restricting admin access to business hours or requiring MFA for sensitive operations — you must modify source code and redeploy.

Contexa's authorization architecture solves this by **externalizing authorization policies into the database**. Policies are managed through the [Admin Dashboard](../../../docs/reference/iam/admin) UI and applied at runtime without code changes. The engine follows the XACML standard architecture with five components that separate policy enforcement, decision-making, administration, information gathering, and retrieval into distinct, testable concerns.

For details on how these components are wired into the Spring Security filter chain, see [Identity DSL](../../../docs/reference/identity/dsl).

### Static vs Dynamic Authorization

Aspect

Static (Spring Security default)

Dynamic (Contexa)

Policy definition

Annotations in source code

Database-stored policies via Admin UI

Policy changes

Requires code change + redeploy

Runtime hot-reload, zero downtime

Enforcement scope

Per-method or per-URL (compile time)

URL-level + method-level (runtime)

Context awareness

Authentication + authorities only

User, resource, environment, behavioral metrics, AI threat scores

AI integration

Not available

`#ai.isAllowed()`, `#ai.needsChallenge()` in SpEL

Audit trail

Manual implementation required

Built-in via `CentralAuditFacade`

Coexistence

Both can work together: `.requestMatchers().permitAll()` for static rules, `.anyRequest().access(customDynamicAuthorizationManager)` for dynamic

### Key Capabilities

-   **Runtime policy changes** — Add, modify, or revoke access rules without redeployment via the Admin Dashboard or REST API
-   **Two enforcement layers** — URL-level via [Dynamic Authorization](../../../docs/reference/iam/dynamic-authorization) and method-level via [@Protectable](../../../docs/reference/iam/protectable)
-   **Rich context evaluation** — Policies can reference behavioral metrics, time-of-day, device info, and AI threat scores collected by the PIP
-   **AI-powered security expressions** — Use `#ai.isAllowed()`, `#ai.needsChallenge()`, and other AI expressions directly in SpEL policy conditions
-   **End-to-end resource management** — [Resource Scanner](../../../docs/reference/iam/resource-scanner) discovers endpoints, [Resource Workbench](../../../docs/reference/iam/admin) defines permissions, [Policy Builder](../../../docs/reference/iam/policy) creates policies
-   **SpEL-native** — Uses Spring Expression Language instead of XML, keeping the familiar Spring Security programming model

:::info
**Related pages:**

-   [Dynamic Authorization](../../../docs/reference/iam/dynamic-authorization) — URL-level enforcement in detail
-   [@Protectable](../../../docs/reference/iam/protectable) — Method-level enforcement
-   [Policy Management](../../../docs/reference/iam/policy) — Policy lifecycle and the Policy Builder
-   [Resource Scanner](../../../docs/reference/iam/resource-scanner) — Automatic resource discovery and the end-to-end workflow
:::

## Architecture Overview

Contexa implements the XACML reference architecture with SpEL (Spring Expression Language) as the policy expression language. Instead of XML-based XACML policies, Contexa uses a relational data model where policies, rules, conditions, and targets are stored as JPA entities with SpEL expressions for evaluation.

Text Copy

Incoming Request

PEP (Enforcement)

CustomDynamicAuthorizationManager

Policy Components

PIP

Attribute Info

PDP

Policy Decision

PRP

Policy Retrieval

Decision: ALLOW / DENY

PEP Enforce

## PEP — Policy Enforcement Point

The PEP intercepts authorization requests and delegates decisions to the PDP. Contexa provides two PEP implementations for URL-level and method-level enforcement.

### CustomDynamicAuthorizationManager

Implements `AuthorizationManager<RequestAuthorizationContext>` for URL-based policy enforcement. On application context refresh, it loads all URL policies from the PRP and builds a list of `RequestMatcherEntry` mappings.

```java
public class CustomDynamicAuthorizationManager
        implements AuthorizationManager<RequestAuthorizationContext> {

    private final PolicyRetrievalPoint policyRetrievalPoint;
    private final ExpressionAuthorizationManagerResolver managerResolver;
    private final ContextHandler contextHandler;
    private final ZeroTrustEventPublisher zeroTrustEventPublisher;
    private final AuthorizationMetrics metricsCollector;

    // Initializes on ContextRefreshedEvent
    @EventListener
    public void onApplicationEvent(ContextRefreshedEvent event) {
        initialize();
    }

    @Override
    public AuthorizationDecision check(
            Supplier<Authentication> authenticationSupplier,
            RequestAuthorizationContext context) { ... }

    // Hot-reload: clears PRP cache and re-initializes mappings
    public synchronized void reload() { ... }
}
```

#### Policy-to-Expression Conversion

The `getExpressionFromPolicy()` method converts a `Policy` entity into a SpEL expression string:

-   No conditions with ALLOW effect → `permitAll`
-   No conditions with DENY effect → `denyAll`
-   Single condition → uses the expression directly
-   Multiple simple authority conditions → `hasAnyAuthority('A','B')`
-   Multiple mixed conditions → joined with `or`
-   DENY effect → wraps the expression in `!()`
-   `hasPermission()` calls are stripped from URL policies since they are only relevant for method-level evaluation

### ExpressionAuthorizationManagerResolver

Resolves SpEL expression strings into `AuthorizationManager` instances by delegating to a chain of `ExpressionEvaluator` implementations.

```java
public class ExpressionAuthorizationManagerResolver {

    private final List<ExpressionEvaluator> evaluators;
    private final SecurityExpressionHandler<RequestAuthorizationContext>
            customWebSecurityExpressionHandler;

    public AuthorizationManager<RequestAuthorizationContext> resolve(
            String expression) {
        // Iterates evaluators; WebSpelExpressionEvaluator creates
        // WebExpressionAuthorizationManager with custom handler
    }
}
```

## PDP — Policy Decision Point

The PDP evaluates authorization requests against policies and returns decisions. In Contexa, the PDP operates through SpEL expression evaluation, with the `PolicyTranslator` providing bidirectional translation between policy entities and human-readable descriptions.

### PolicyTranslator

Translates `Policy` entities to human-readable strings and `EntitlementDto` objects by walking the SpEL AST (Abstract Syntax Tree). It supports pluggable `SpelFunctionTranslator` instances for custom SpEL method translations.

```java
public class PolicyTranslator {

    private final RoleRepository roleRepository;
    private final GroupRepository groupRepository;
    private final PermissionRepository permissionRepository;
    private final List<SpelFunctionTranslator> translators;

    // Policy -> Human readable string
    public String translatePolicyToString(Policy policy) { ... }

    // Policy -> Entitlement DTOs with subject/action/condition analysis
    public Stream<EntitlementDto> translate(Policy policy, String resourceName) { ... }

    // Policy -> ExpressionNode tree for programmatic analysis
    public ExpressionNode parsePolicy(Policy policy) { ... }

    // Single condition -> ExpressionNode
    public ExpressionNode parseCondition(PolicyCondition condition) { ... }
}
```

#### SpEL AST Node Translation

SpEL Node

Translation

`OpAnd`

`(left and right)`

`OpOr`

`(left or right)`

`OperatorNot`

`NOT (expr)`

`OpEQ`

`left equals right`

`MethodReference`

Delegated to matching `SpelFunctionTranslator`

`Identifier("permitAll")`

`All access permitted`

`Identifier("denyAll")`

`All access denied`

## PAP — Policy Administration Point

The PAP manages the lifecycle of authorization policies. See the [Policy Management](../../../docs/reference/iam/policy) page for detailed API documentation of all PAP services.

Service

Responsibility

`PolicyService`

Manages policy CRUD operations and synchronizes policies when role-permission assignments change.

`PolicyBuilderService`

Provides a visual policy builder with reusable templates and automatic conflict detection between policies.

`PolicySynchronizationService`

Automatically regenerates and updates policies when a `RolePermissionsChangedEvent` is published.

`PolicyEnrichmentService`

Enriches policies with human-readable descriptions by delegating to the `PolicyTranslator`.

`BusinessPolicyService`

Translates business-level rules into technical policy representations that the PDP can evaluate.

## PIP — Policy Information Point

The PIP collects attributes needed for policy evaluation. It provides contextual data about subjects, resources, actions, and the environment to the PDP.

### AttributeInformationPoint

```java
public interface AttributeInformationPoint {
    Map<String, Object> getAttributes(AuthorizationContext context);
}
```

### DatabaseAttributePIP

The primary PIP implementation that enriches the authorization context from database sources. It collects five categories of attributes:

Category

Attributes Collected

Basic User

`userId`, `userEmail`, `userGroups`, `groupCount`, `mfaEnabled`, `createdAt`

Behavior Metrics

`requestsInLastHour`, `requestsInLastDay`, `uniqueResourcesAccessed`, `typicalAccessHours`, `accessVelocity`

Resource Patterns

`resourceTotalAccess`, `resourceUniqueUsers`, `resourceSensitivityLevel`, `resourceRecentFailures`

Time/Environment

`currentHour`, `currentDayOfWeek`, `isBusinessHours`, `isWeekend`, `remoteAddress`

Security Profile

`userSecurityScore`, `hasRecentFailures`, `highAccessVelocity`, `unusualAccessTime`, `riskIndicatorCount`

### AuthorizationContext

```java
public record AuthorizationContext(
    Authentication subject,
    Users subjectEntity,
    ResourceDetails resource,
    String action,
    EnvironmentDetails environment,
    Map<String, Object> attributes
) {}
```

### ContextHandler

Creates `AuthorizationContext` instances for both URL and method-level authorization:

```java
public interface ContextHandler {
    AuthorizationContext create(Authentication authentication,
                               HttpServletRequest request);
    AuthorizationContext create(Authentication authentication,
                               MethodInvocation invocation);
}
```

## PRP — Policy Retrieval Point

The PRP retrieves policies from the underlying data store. Contexa caches policies through `ContexaCacheService` to minimize database queries during high-throughput authorization.

```java
public interface PolicyRetrievalPoint {
    List<Policy> findUrlPolicies();
    void clearUrlPoliciesCache();
    List<Policy> findMethodPolicies(String methodIdentifier);
    void clearMethodPoliciesCache();
}
```

### DatabasePolicyRetrievalPoint

The default implementation that retrieves policies from the database via `PolicyRepository` with caching through `ContexaCacheService`.

Cache Key

Description

`policies:url:all`

All active URL policies

`policies:method:{identifier}`

Method-specific policies by method identifier

AI-generated policies are only included when their `approvalStatus` is `APPROVED` and `isActive` is `true`. Unapproved AI policies are filtered out during the initialization phase in the PEP.

## Complete Authorization Flow

Text Copy

```
1. Request arrives at Spring Security filter chain
2. PEP (CustomDynamicAuthorizationManager) receives RequestAuthorizationContext
3. ContextHandler creates AuthorizationContext with subject, resource, action
4. PEP matches request URL against cached RequestMatcherEntry list
5. Matched entry's AuthorizationManager evaluates the SpEL expression
   - The expression was derived from Policy -> Rules -> Conditions
   - hasRole(), hasAuthority(), hasAnyAuthority() etc.
6. PDP (SpEL evaluator) returns AuthorizationDecision(granted/denied)
7. PEP enforces the decision
   - If granted: request proceeds to the controller
   - If denied: 403 Forbidden response
8. Audit log records the authorization attempt via CentralAuditFacade
```

## AI-Powered Security Expressions

Contexa extends the standard Spring Security SpEL environment with AI-driven expressions. These are available in both URL-level and method-level policy conditions through the `#ai` variable, backed by `AbstractAISecurityExpressionRoot`.

### AI Expression Reference

All AI expressions query the Zero Trust analysis result for the current request. The analysis is performed asynchronously by the AI Engine and the result is stored in Redis.

Expression

Return Type

Description

`#ai.isAllowed()`

`boolean`

Returns `true` if the AI Zero Trust action is `ALLOW`

`#ai.isBlocked()`

`boolean`

Returns `true` if the AI Zero Trust action is `BLOCK`

`#ai.needsChallenge()`

`boolean`

Returns `true` if the AI recommends a step-up authentication challenge

`#ai.needsEscalation()`

`boolean`

Returns `true` if the AI recommends escalation to a human reviewer

`#ai.isPendingAnalysis()`

`boolean`

Returns `true` if the AI analysis has not yet completed

`#ai.hasAction('ACTION')`

`boolean`

Returns `true` if the Zero Trust action matches the given string

`#ai.hasActionIn('A','B')`

`boolean`

Returns `true` if the Zero Trust action is one of the given values

`#ai.hasActionOrDefault('DEFAULT','A','B')`

`boolean`

Like `hasActionIn`, but uses the default action when no analysis result exists

#### Usage in SpEL Policy Conditions

SpEL Copy

```
// Require both role and AI approval
hasRole('ADMIN') and #ai.isAllowed()

// Allow if user has role OR AI allows it
hasRole('MANAGER') or #ai.isAllowed()

// Block if AI detects threat, regardless of role
hasRole('USER') and !#ai.isBlocked()

// Flexible action matching with fallback
hasRole('USER') and #ai.hasActionOrDefault('ALLOW', 'ALLOW', 'CHALLENGE')
```

### URL-Level Expressions

`CustomWebSecurityExpressionRoot` adds HTTP-specific expressions available in URL policy conditions:

Expression

Description

`hasIpAddress('192.168.1.0/24')`

Checks if the request originates from the specified IP address or CIDR range

`getHttpMethod()`

Returns the HTTP method of the request (GET, POST, PUT, DELETE, etc.)

### Method-Level Expressions

`CustomMethodSecurityExpressionRoot` adds method-specific expressions with local caching:

-   **`hasPermission(target, permission)`** — Evaluates permission through the [CompositePermissionEvaluator](../../../docs/reference/iam/permission-evaluators), including ownership verification when `ownerField` is set
-   **`hasPermission(targetId, targetType, permission)`** — ID-based permission evaluation with the same ownership support
-   **Local cache** — Zero Trust action results are cached locally using Caffeine with a 5-second TTL and 10,000-entry maximum to minimize Redis lookups

:::tip
**Expression hierarchy:**

-   `AbstractAISecurityExpressionRoot` — provides AI expressions (`#ai.*`) to both URL and method contexts
-   `CustomWebSecurityExpressionRoot` — adds `hasIpAddress()` for URL policies
-   `CustomMethodSecurityExpressionRoot` — adds `hasPermission()` with ownership verification for method policies
:::

## Quick Start

Get dynamic authorization running in four steps:

### 1\. Configure Spring Security

Inject `CustomDynamicAuthorizationManager` and add it to your security filter chain:

```java
@Configuration
public class SecurityConfig {

    @Autowired
    private CustomDynamicAuthorizationManager dynamicAuthManager;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
            // Static rules evaluated first
            .requestMatchers("/", "/home", "/css/**", "/js/**").permitAll()
            .requestMatchers("/login", "/register").permitAll()
            // All other requests use dynamic authorization
            .anyRequest().access(dynamicAuthManager)
        );
        return http.build();
    }
}
```

### 2\. Create Your First Policy

Open the [Admin Dashboard](../../../docs/reference/iam/admin) and navigate to **Policies → Create Policy**. Set a URL target (e.g., `/admin/**`) with an ALLOW effect and condition `hasRole('ADMIN')`.

### 3\. Protect a Method

```java
@Service
public class OrderService {

    @PreAuthorize("hasRole('ROLE_USER')")
    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId).orElseThrow();
    }
}
```

### 4\. Verify

Access the protected URL or method. The authorization decision is logged via `CentralAuditFacade` and visible in the Admin Dashboard. To change the policy, update it in the Admin Dashboard — the change takes effect immediately through the hot-reload mechanism.

:::info
**Next steps:**

-   [Dynamic Authorization](../../../docs/reference/iam/dynamic-authorization) — Detailed URL-level setup
-   [@Protectable](../../../docs/reference/iam/protectable) — Method-level protection
-   [Resource Scanner](../../../docs/reference/iam/resource-scanner) — Automatic resource discovery and policy creation
:::

## Getting Started with Admin Dashboard

The Contexa Admin Dashboard provides a visual interface for managing the entire authorization lifecycle. Access it at `/admin/dashboard` after enabling the admin module.

### Core Authorization Workflows

The Admin Dashboard offers three main workflows for building and managing authorization policies:

1.  **Resource Workbench** — Discover and define protected resources. The workbench scans your application endpoints and lets you organize them into resource groups with appropriate protection levels.
2.  **Policy Builder / Wizard** — Create authorization policies through a guided interface. Define targets, conditions, and effects without writing raw SpEL expressions. The AI-assisted mode can suggest policies based on your resource structure.
3.  **Authorization Studio** — Test and simulate policies before they go live. Run what-if scenarios against your policy set to verify that authorization decisions match expectations.

For the complete Admin Dashboard reference, see the [Admin Dashboard](../../../docs/reference/iam/admin) documentation. For a step-by-step walkthrough covering resource discovery through policy testing, see the [End-to-End Workflow](/docs/reference/iam/end-to-end-workflow) guide.

[Next Dynamic Authorization](../../../docs/reference/iam/dynamic-authorization)