---
title: "Advisor System"
---
contexa-core

# Advisor System

The Advisor System integrates with Spring AI's `CallAdvisor` and `StreamAdvisor` interfaces to intercept and enrich every LLM request and response. The `AdvisorRegistry` manages advisor lifecycle, domain organization, and enable/disable state. The `UnifiedLLMOrchestrator` automatically applies all enabled advisors to every `ChatClient` it creates.

## Overview

Advisors form a chain-of-responsibility around every LLM call. Each advisor can modify the request before it reaches the LLM, inspect or transform the response after, and add context metadata for downstream advisors. Advisors are organized by domain (e.g., "SECURITY", "AUDIT") and ordered by priority.

The system provides:

-   **Domain-based organization** — Advisors are grouped by domain, enabling bulk enable/disable operations.
-   **Priority ordering** — Advisors execute in order of their `getOrder()` value (lower runs first).
-   **Hot reload** — Advisors can be registered, unregistered, enabled, and disabled at runtime.
-   **Error isolation** — Non-blocking advisor errors skip the advisor and continue the chain; blocking errors halt execution.

## AdvisorRegistry

Central registry for managing advisor lifecycle. Thread-safe with internal caching of the enabled advisor list.

`public class AdvisorRegistry`

register(Advisor advisor) void

Registers an advisor. If the advisor extends `BaseAdvisor`, it is validated and indexed by domain. Invalidates the enabled cache.

registerAll(Collection<? extends Advisor> advisors) void

Batch registers multiple advisors.

unregister(String advisorName) void

Removes an advisor by name and cleans up domain mappings.

get(String advisorName) Optional<Advisor>

Retrieves a specific advisor by its full name (format: `domain.name`).

getEnabled() List<Advisor>

Returns all enabled advisors sorted by order. Results are cached until the registry is modified.

getByDomain(String domain) List<Advisor>

Returns all advisors in the given domain, sorted by order.

enableDomain(String domain) / disableDomain(String domain) void

Bulk enable or disable all advisors in a domain.

enableAll() / disableAll() void

Enable or disable all registered advisors.

getStats() RegistryStats

Returns statistics including total advisors, total domains, and advisors-per-domain counts.

## BaseAdvisor

Abstract base class implementing both `CallAdvisor` and `StreamAdvisor`. Provides the template method pattern with lifecycle hooks, error handling, and context enrichment.

`public abstract class BaseAdvisor implements CallAdvisor, StreamAdvisor`

### Constructor

BaseAdvisor(String domain, String name, int order)

Creates an advisor with the given domain, name, and execution order. The full advisor name is formatted as `domain.name`.

### Abstract Methods (Must Implement)

beforeCall(ChatClientRequest request) ChatClientRequest

Called before the LLM request. Modify and return the request to enrich it with context.

afterCall(ChatClientResponse response, ChatClientRequest request) ChatClientResponse

Called after the LLM response. Modify and return the response for post-processing, auditing, or validation.

### Overridable Hooks

-   `beforeStream()` — Defaults to calling `beforeCall()`. Override for stream-specific pre-processing.
-   `afterStream()` — No-op by default. Override for stream-specific post-processing.
-   `enrichContext(Map<String, Object> context)` — Adds `advisor.domain`, `advisor.name`, and `advisor.timestamp` to the context.
-   `handleBlockingError(AdvisorException e, ChatClientRequest request)` — Handles blocking errors by setting error context and rethrowing.

### Error Handling

`AdvisorException` supports two modes:

-   **Blocking** — Halts the advisor chain and prevents the LLM call. Used for security enforcement.
-   **Non-blocking** — Logs the error and continues the chain. Used for optional enrichment.

## SecurityContextAdvisor

Injects security context (user identity, session, authentication state, authorities) into every LLM request. Supports async security context recovery from Redis for non-HTTP threads.

`public class SecurityContextAdvisor extends BaseAdvisor`

### Injected Context Keys

Key

Description

`user.id`

Authenticated user identifier.

`session.id`

Session identifier.

`authenticated`

Boolean authentication status.

`authorities`

String representation of granted authorities.

`principal.type`

Type of the authentication principal.

`async.context`

Always `true`, indicating async context mode.

`timestamp`

Request timestamp in milliseconds.

:::warning
**Authentication Enforcement:** When `contexa.advisor.security.require-authentication` is `true`, unauthenticated requests throw a blocking `AdvisorException` that prevents the LLM call.
:::

## Code Examples

### Implementing a Custom Advisor

```java
@Component
public class RateLimitAdvisor extends BaseAdvisor {

    private final RateLimiter rateLimiter;

    public RateLimitAdvisor(RateLimiter rateLimiter) {
        super("INFRASTRUCTURE", "rate-limit", 10);
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected ChatClientRequest beforeCall(
            ChatClientRequest request) {
        String userId = (String) request.context()
                .get("user.id");

        if (!rateLimiter.tryAcquire(userId)) {
            throw AdvisorException.blocking(
                    getDomain(), getName(),
                    "Rate limit exceeded for user: " + userId);
        }

        return request;
    }

    @Override
    protected ChatClientResponse afterCall(
            ChatClientResponse response,
            ChatClientRequest request) {
        return response;
    }
}
```

### Managing Advisors at Runtime

```java
// Disable all security advisors during maintenance
advisorRegistry.disableDomain("SECURITY");

// Re-enable after maintenance
advisorRegistry.enableDomain("SECURITY");

// Check registry health
AdvisorRegistry.RegistryStats stats =
        advisorRegistry.getStats();
// stats.totalAdvisors, stats.totalDomains,
// stats.advisorsPerDomain
```

## Related

[

### LLM Orchestrator

Automatically applies all enabled advisors via the AdvisorRegistry.

](../../../docs/reference/core/llm-orchestrator)[

### Zero Trust

SecurityContextAdvisor propagates zero trust context to LLM calls.

](/docs/reference/architecture/zero-trust-flow)

:::info
**Configuration Reference**
For advisor `application.yml` properties (enabled advisors, ordering, security context propagation), see [AI Configuration](../../../docs/install/configuration/ai) — covers `ContexaAdvisorProperties`.
:::

[Previous Streaming](../../../docs/reference/core/streaming) [Next AI Strategy](../../../docs/reference/core/strategy)