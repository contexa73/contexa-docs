---
title: "@Protectable Annotation"
---
contexa-iam

# @Protectable Annotation

AI-driven method-level authorization that intercepts method invocations, evaluates SpEL-based security rules, and enforces rapid reentry protection with optional synchronous AI decision support.

## Overview

The `@Protectable` annotation marks methods for AI-based authorization enforcement. Defined in `contexa-common` and processed by `contexa-iam`, it integrates with the XACML PEP layer to intercept method calls, evaluate security policies through SpEL expressions, and optionally invoke synchronous AI analysis for high-risk operations.

The processing pipeline consists of three key components working in sequence:

1.  **ProtectableRapidReentryGuard** — Prevents duplicate requests within a configurable time window
2.  **ProtectableMethodAuthorizationManager** — Evaluates SpEL-based security expressions against the current authentication context
3.  **AuthorizationManagerMethodInterceptor** — Orchestrates the full authorization flow as a Spring Security `AuthorizationAdvisor`

### When to Use @Protectable

Approach

Scope

Policy Source

AI Integration

Best For

`@Protectable`

Method-level

Database (dynamic)

Full (`sync`, `#ai.*` expressions)

Business-critical operations, owner-verified access, AI-monitored endpoints

`@PreAuthorize`

Method-level

Annotations (static)

None

Simple role/permission checks that rarely change

[Dynamic URL Auth](../../../docs/reference/iam/dynamic-authorization)

URL-level

Database (dynamic)

Full (`#ai.*` expressions)

URL-pattern-based access control, API endpoint protection

## Quick Start

### Basic Usage

```java
@Service
public class UserService {

    @Protectable
    public User getUser(Long userId) {
        // Protected by method-level policies from the database.
        // Policies are created via Admin Dashboard or Policy Builder.
        return userRepository.findById(userId).orElseThrow();
    }
}
```

### With Owner Verification

```java
@Service
public class OrderService {

    @Protectable(ownerField = "userId")
    public Order updateOrder(Order order) {
        // Only the resource owner (order.userId == authenticated user)
        // or users with ROLE_ADMIN can invoke this method.
        return orderRepository.save(order);
    }
}
```

### With Synchronous AI Analysis

```java
@Service
public class PaymentService {

    @Protectable(sync = true)
    public PaymentResult processPayment(PaymentRequest request) {
        // The request blocks until the AI Zero Trust analysis completes.
        // If the AI returns BLOCK, CHALLENGE, or ESCALATE,
        // ZeroTrustAccessDeniedException is thrown before execution.
        return paymentGateway.process(request);
    }
}
```

:::warning
**Performance note:** `sync = true` blocks the request until the AI LLM analysis completes. Use it only for high-risk operations (e.g., payments, data exports) where real-time AI verification is essential.
:::

## Annotation Definition

The annotation is declared in `io.contexa.contexacommon.annotation` and targets methods at runtime.

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Protectable {
    String ownerField() default "";
    boolean sync() default false;
}
```

### Attributes

Attribute

Type

Default

Description

`ownerField`

`String`

`""`

Field name on the return type used to identify the resource owner for ownership-based authorization checks. When empty, no owner-based filtering is applied.

`sync`

`boolean`

`false`

When true, the Zero Trust evaluation completes synchronously before the method returns — the user's request blocks until LLM analysis finishes, so choose this option carefully. When false (default), evaluation runs asynchronously and the method proceeds immediately.

## AuthorizationManagerMethodInterceptor

The core AOP interceptor that implements `MethodInterceptor` and `AuthorizationAdvisor`. It is registered at `AuthorizationInterceptorsOrder.FIRST + 1` priority, ensuring it runs before standard Spring Security method interceptors.

### Authorization Flow

Text Copy

Method Invocation

Incoming call to @Protectable method

\[1\] RapidReentryGuard.check()

Denied → RapidProtectableReentryDeniedException (no event published)

\[2\] ProtectableMethodAuthorizationManager.protectable()

SpEL expression evaluated from #protectableRule variable. Denied → AuthorizationDeniedException

\[3\] @Protectable(sync=true)?

Yes → SynchronousProtectableDecisionService.analyze()
ALLOW → proceed | BLOCK / CHALLENGE / ESCALATE → ZeroTrustAccessDeniedException

\[4\] mi.proceed()

Method executes and returns result

\[5\] Publish Event + Record Metrics

Authorization event via ZeroTrustEventPublisher, duration via AuthorizationMetrics

### Constructor

```java
public AuthorizationManagerMethodInterceptor(
        Pointcut pointcut,
        ProtectableMethodAuthorizationManager authorizationManager,
        ProtectableRapidReentryGuard rapidReentryGuard)
```

### Optional Dependencies (setter injection)

Setter

Type

Purpose

`setZeroTrustEventPublisher`

`ZeroTrustEventPublisher`

Publishes authorization events for audit logging and AI-driven threat analysis. When absent, event publishing is silently skipped.

`setMetricsCollector`

`AuthorizationMetrics`

Records invocation duration in nanoseconds and authorization decision counts for monitoring and alerting. When absent, metrics collection is silently skipped.

`setSynchronousProtectableDecisionService`

`SynchronousProtectableDecisionService`

Required for `sync=true`. If absent, sync requests throw `ZeroTrustAccessDeniedException`.

### Annotation Resolution

The interceptor resolves `@Protectable` annotations using a multi-level lookup strategy:

1.  Direct method annotation via `AnnotationUtils.findAnnotation(method)`
2.  Most specific method on the target class (handles proxy scenarios via `AopProxyUtils`)
3.  Class-level annotation on the target class
4.  Class-level annotation on the declaring class

## ProtectableMethodAuthorizationManager

Evaluates SpEL-based security expressions against the current method invocation context. It relies on Spring Security's `MethodSecurityExpressionHandler` to create an evaluation context, then looks up the `#protectableRule` variable.

```java
public class ProtectableMethodAuthorizationManager {

    private final MethodSecurityExpressionHandler expressionHandler;

    public void protectable(
            Supplier<Authentication> authentication,
            MethodInvocation mi) {
        // Creates evaluation context with authentication and method invocation
        // Looks up #protectableRule variable (set by policy engine)
        // Evaluates expression; throws AuthorizationDeniedException on failure
    }
}
```

The `#protectableRule` variable is an SpEL `Expression` injected into the evaluation context by the XACML policy engine. If the variable is missing or not of type `Expression`, access is denied.

## ProtectableRapidReentryGuard

Prevents the same authenticated user from invoking the same protected method within a 5-second window. This guards against accidental duplicate submissions and brute-force retry attacks on protected endpoints.

### Guard Logic

```java
public void check(Authentication authentication, MethodInvocation methodInvocation) {
    // 1. Skip if not authenticated
    // 2. Resolve current HttpServletRequest from RequestContextHolder
    // 3. Generate context binding hash via SessionFingerprintUtil
    // 4. Build resource key: "ClassName.methodName|HTTP_METHOD /uri"
    // 5. Attempt tryAcquire(userId, contextBindingHash, resourceKey, 5s)
    // 6. If not acquired, throw RapidProtectableReentryDeniedException
}
```

The resource key combines the method signature with the HTTP request details, ensuring that different URLs invoking the same method are tracked independently. The context binding hash incorporates session fingerprint data (User-Agent, IP, etc.) to prevent cross-session interference.

### Repository Interface

```java
public interface ProtectableRapidReentryRepository {
    boolean tryAcquire(String userId, String contextBindingHash,
                       String resourceKey, Duration window);
}
```

### Implementations

Implementation

Mode

Storage

Key Format

`InMemoryProtectableRapidReentryRepository`

Standalone

`ConcurrentHashMap<String, Instant>`

`userId:contextHash:resourceKey`

`RedisProtectableRapidReentryRepository`

Distributed

Redis `SET NX EX`

`security:protectable:rapid-reentry:{md5}`

The in-memory implementation uses lock-free CAS operations with `ConcurrentHashMap.putIfAbsent` for thread safety. The Redis implementation uses `setIfAbsent` with TTL for distributed lock semantics, falling back to allow on Redis errors to prevent service disruption.

## Connecting Policies to @Protectable Methods

`@Protectable` methods are enforced by policies stored in the database. The [Resource Scanner](../../../docs/reference/iam/resource-scanner) automatically discovers all `@Protectable` methods and registers them in the [Resource Workbench](../../../docs/reference/iam/admin), where you can define permissions and create policies.

### Method Identifier Format

Each `@Protectable` method is identified by its fully qualified signature:

Text Copy

```
com.example.service.OrderService.updateOrder(Order)
```

### Creating a Policy for a Method

Two approaches to create policies for `@Protectable` methods:

1.  **Resource Workbench (recommended)** — Navigate to the Resource Workbench in Admin Dashboard, find the scanned method, click "Create Policy" to enter the [Policy Builder](../../../docs/reference/iam/policy) in from-resource mode with compatible conditions pre-filtered.
2.  **Direct policy creation** — Create a policy with a `METHOD` target type matching the method identifier, and set the condition SpEL expression (e.g., `hasRole('ADMIN') and #ai.isAllowed()`).

### Behavior Matrix

`ownerField`

`sync`

Behavior

`""` (default)

`false`

SpEL policy evaluation only, async AI analysis

`""`

`true`

SpEL policy + synchronous AI blocking

`"userId"`

`false`

SpEL policy + ownership verification, async AI

`"userId"`

`true`

SpEL policy + ownership + synchronous AI blocking

## Additional Usage Examples

### Basic Protection

Protects a method with default settings: asynchronous evaluation, no owner-based filtering.

```java
@Protectable
@PostMapping("/api/users/{id}/disable")
public void disableUser(@PathVariable Long id) {
    userService.disable(id);
}
```

### Owner-Scoped with Synchronous AI Analysis

Restricts updates to the resource owner and enables real-time AI risk assessment before allowing the operation.

```java
@Protectable(ownerField = "userId", sync = true)
@PutMapping("/api/accounts/{id}")
public Account updateAccount(@PathVariable Long id,
                             @RequestBody AccountDto dto) {
    return accountService.update(id, dto);
}
```

### ZeroTrustAction Outcomes (sync mode)

Action

Behavior

`ALLOW`

Method proceeds normally and the result is returned to the caller

`BLOCK`

Throws `ZeroTrustAccessDeniedException` with the computed risk score included in the exception detail

`CHALLENGE`

Throws `ZeroTrustAccessDeniedException` requesting step-up authentication from the caller

`ESCALATE`

Throws `ZeroTrustAccessDeniedException` indicating the request is pending manual review by an administrator

`PENDING_ANALYSIS`

Throws `ZeroTrustAccessDeniedException` if the synchronous AI analysis service is unavailable or timed out

## Event Publishing and Metrics

Authorization events are published via `ZeroTrustEventPublisher.publishMethodAuthorization()` after each invocation. Events are suppressed in the following cases:

-   `RapidProtectableReentryDeniedException` — reentry denials are not published
-   `ZeroTrustAccessDeniedException` — synchronous AI decisions handle their own event lifecycle
-   Synchronous protectable methods that return `ALLOW` — handled by the synchronous pipeline

When `AuthorizationMetrics` is available, the interceptor records:

-   `recordProtectable(duration)` — invocation duration in nanoseconds
-   `recordAuthzDecision()` — authorization decision count

## ownerField Deep Dive

The `ownerField` attribute enables ownership-based authorization by comparing a field on the return object with the currently authenticated user's ID. This check runs after the method executes, inspecting the returned value through Java reflection.

### How Reflection Extracts the Field Value

When `ownerField` is specified, the interceptor uses reflection to read the named field from the method's return object. The process follows these steps:

1.  The method executes normally and produces a return value.
2.  The interceptor calls `getDeclaredField(ownerField)` on the return object's class (traversing the class hierarchy if needed).
3.  The field is made accessible via `setAccessible(true)` and its value is extracted.
4.  The extracted value is converted to a `String` and compared against the authenticated user's principal ID.

### Comparison with Authenticated User

The extracted owner field value is compared with the current user's ID obtained from `Authentication.getName()`. If the values match, the user is considered the resource owner and access is granted (assuming the SpEL policy also passes). Users with `ROLE_ADMIN` bypass the ownership check entirely.

### When ownerField Does Not Exist

:::warning
**Important:** If the specified `ownerField` does not exist on the return object, the reflection lookup fails silently and access is **denied by default**. No exception is thrown to the caller; instead, the system treats it as a non-owner access attempt. Always verify that the field name matches your domain object exactly.
:::

### Nested Field Access

The `ownerField` supports dot-notation for nested field access. For example, `ownerField = "creator.id"` first resolves the `creator` field, then reads the `id` field from that nested object.

```java
@Protectable(ownerField = "creator.id")
public Document getDocument(Long documentId) {
    // Returns Document with a nested Creator object.
    // The interceptor resolves document.creator.id
    // and compares it to the authenticated user's ID.
    return documentRepository.findById(documentId).orElseThrow();
}
```

If any intermediate object in the chain is `null`, the access check fails silently and access is denied.

## sync Mode Guidelines

### When to Use Synchronous Mode

The `sync` attribute controls whether the AI Zero Trust assessment completes before or after the method returns. Choosing the right mode depends on the sensitivity of the operation and the acceptable latency.

Mode

Behavior

Latency Impact

Security Guarantee

`sync = true`

Blocks until the AI assessment completes. If the AI returns BLOCK, CHALLENGE, or ESCALATE, the method never executes.

Higher latency (depends on LLM response time, typically 200ms–2s)

Strong — the operation is prevented before any side effects occur

`sync = false` (default)

Uses cached or asynchronous AI assessment. The method proceeds immediately; AI analysis happens in the background.

Minimal latency impact

Eventual consistency — threats are detected after the fact and handled through event-driven remediation

### Recommended Use Cases

Use `sync = true` for operations where preventing unauthorized actions is more critical than response time:

-   **Financial transactions** — Payment processing, fund transfers, refund operations
-   **Data deletion** — Permanent deletion of records, account closure, data purge operations
-   **Privilege escalation** — Role assignment, permission grants, admin-level operations
-   **Data export** — Bulk data downloads, report generation with sensitive data

Use `sync = false` (default) for read-heavy operations, listing endpoints, and actions where eventual consistency is acceptable and low latency is prioritized.

## Managing @Protectable Methods via Admin

`@Protectable` methods are automatically discovered by the [Resource Scanner](../../../docs/reference/iam/resource-scanner) and registered in the Admin Dashboard's Resource Workbench as `METHOD` type resources. This section explains how to find, define, and secure them through the Admin UI.

### Step 1: Find METHOD Resources in Resource Workbench

Navigate to **Admin > ID & Access Management > Resource Workbench**. Filter by resource type `METHOD` to see all discovered `@Protectable` methods. Each entry displays the fully qualified method signature (e.g., `com.example.service.OrderService.updateOrder(Order)`).

### Step 2: Define with a Business Name

Click on any METHOD resource to edit its metadata. Assign a human-readable business name (e.g., "Update Customer Order") and an optional description. This business name appears throughout the Admin Dashboard when creating policies and reviewing audit logs, making it easier for non-technical administrators to understand what each method does.

### Step 3: Create a Permission

From the resource detail view, click "Create Permission" to define what actions are allowed on this method. Specify a permission name (e.g., `ORDER_UPDATE`), a description, and the action type (READ, WRITE, DELETE, etc.). The permission is automatically linked to this METHOD resource.

### Step 4: Assign a Policy

With the permission defined, create a policy to control who can exercise that permission. There are two approaches:

#### Quick Grant via Policy Wizard

The Policy Wizard provides a guided flow for common authorization patterns. Select the permission, choose the target roles or users, and optionally add time-based or attribute-based conditions. The wizard generates the underlying SpEL expression automatically.

#### Advanced via Policy Builder (from-resource mode)

Click "Create Policy" from the Resource Workbench to open the [Policy Builder](../../../docs/reference/iam/policy) in **from-resource mode**. In this mode:

-   The resource target is **pre-filled** with the selected METHOD resource, so you do not need to manually enter the method signature.
-   The condition editor **filters compatible conditions** — only SpEL expressions that are valid for method-level policies are shown (e.g., `#ai.isAllowed()`, `hasRole()`, `hasPermission()`, owner-based checks).
-   URL-only expressions (such as path matchers) are hidden since they do not apply to method-level targets.

This from-resource mode significantly reduces configuration errors by scoping the available options to what is actually applicable for the selected method.

[Previous Dynamic Authorization](../../../docs/reference/iam/dynamic-authorization) [Next AI Security Expressions](../../../docs/reference/iam/ai-security-expressions)