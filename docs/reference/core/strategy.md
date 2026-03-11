---
title: "AI Strategy"
---
contexa-core

# AI Strategy

The AI Strategy system routes AI requests to the appropriate processing lab based on `DiagnosisType`. The `AIStrategyRegistry` discovers all strategy implementations, and the `AINativeProcessor` provides a high-level `AICoreOperations` interface with distributed locking and audit logging.

## Overview

The strategy layer sits between the API/streaming layer and the AI Labs. Each `AIStrategy` implementation handles one `DiagnosisType` and delegates processing to its associated lab. The complete execution flow is:

AICoreOperations

AINativeProcessor

DistributedStrategyExecutor

AIStrategyRegistry

AIStrategy → AILab

## AIStrategy<T, R>

The core interface for domain-specific AI processing strategies. Each implementation handles one `DiagnosisType`.

`public interface AIStrategy<T extends DomainContext, R extends AIResponse>`

getSupportedType() DiagnosisType

Returns the `DiagnosisType` this strategy handles. Used by the registry for routing.

getPriority() int

Returns the priority of this strategy. When multiple strategies handle the same type, the lowest priority wins.

execute(AIRequest<T> request, Class<R> responseType) R

Synchronous execution. Throws `DiagnosisException` on failure.

executeAsync(AIRequest<T> request, Class<R> responseType) Mono<R>

Asynchronous execution returning a reactive `Mono`.

executeStream(AIRequest<T> request, Class<R> responseType) Flux<String>

Streaming execution. Only available when `supportsStreaming()` returns `true`.

supportsStreaming() boolean

Returns whether this strategy supports streaming. Default: `false`.

## AbstractAIStrategy<T, R>

Base class that implements the strategy-to-lab delegation pattern. Uses `AILabFactory` to resolve the lab at runtime.

`public abstract class AbstractAIStrategy<T extends DomainContext, R extends AIResponse>       implements AIStrategy<T, R>`

### Template Method Flow

1.  `validateRequest(request)` — Validate the incoming request.
2.  `getRequiredLab()` — Resolve the lab via `AILabFactory` using `getLabType()`.
3.  `convertLabRequest(request)` — Convert the `AIRequest` to the lab's request format.
4.  `processLabExecution(lab, labRequest, request)` — Execute the lab and return the response.

### Abstract Methods (Must Implement)

getLabType() Class<?>

Returns the `AILab` class type that this strategy delegates to.

validateRequest(AIRequest<T> request) void

Validates the request. Throw `DiagnosisException` for invalid requests.

convertLabRequest(AIRequest<T> request) Object

Converts the generic `AIRequest` into the lab's specific request type.

processLabExecution(Object lab, Object labRequest, AIRequest<T> request) R

Executes the lab with the converted request and returns the typed response.

processLabExecutionAsync(Object lab, Object labRequest, AIRequest<T> request) Mono<R>

Async lab execution. Override for reactive lab implementations.

## AIStrategyRegistry

Auto-discovers all `AIStrategy` beans and routes requests by `DiagnosisType`. When multiple strategies handle the same type, the one with the lowest priority wins.

`public class AIStrategyRegistry`

getStrategy(DiagnosisType diagnosisType) AIStrategy<T, R>

Returns the strategy for the given diagnosis type. Throws `DiagnosisException` if no strategy is registered.

executeStrategyAsync(AIRequest<T> request, Class<R> responseType) Mono<R>

Looks up the strategy by `request.getDiagnosisType()` and executes it asynchronously.

executeStrategyStream(AIRequest<T> request, Class<R> responseType) Flux<String>

Looks up the strategy and executes it in streaming mode.

## AICoreOperations<T>

The high-level interface for AI processing. Used by `StandardStreamingService` and controllers.

`public interface AICoreOperations<T extends DomainContext>`

process(AIRequest<T> request, Class<R> responseType) Mono<R>

Processes a request and returns the typed response.

processStream(AIRequest<T> request) Flux<String>

Processes a request in streaming mode.

## AINativeProcessor<T>

The primary `AICoreOperations` implementation. Adds distributed locking and audit logging around strategy execution.

`public final class AINativeProcessor<T extends DomainContext>       implements AICoreOperations<T>`

### Key Behaviors

-   **Distributed Locking** — Acquires a distributed lock (via Redis) before strategy execution. Prevents concurrent execution of the same strategic operation across cluster nodes. Lock timeout: 30 minutes.
-   **Audit Logging** — Creates an audit trail entry before execution and completes it with the result or error after.
-   **Node Identification** — Each node generates a unique ID for lock ownership.

## DistributedStrategyExecutor<T>

Bridges `AINativeProcessor` and the `AIStrategyRegistry`. Handles error wrapping and result validation.

`public class DistributedStrategyExecutor<T extends DomainContext>`

executeDistributedStrategyAsync(AIRequest<T> request, Class<R> responseType) Mono<R>

Delegates to `AIStrategyRegistry.executeStrategyAsync()` with result validation.

executeDistributedStrategyStream(AIRequest<T> request, Class<R> responseType, String auditId) Flux<String>

Delegates to `AIStrategyRegistry.executeStrategyStream()` with error handling.

## LabExecutionStrategy

A configuration object that defines how a lab should be executed, including multi-step workflows, fallback behavior, and quality gates.

`public class LabExecutionStrategy`

Property

Type

Description

`strategyId`

`String`

Unique strategy identifier.

`operationType`

`String`

The type of operation being executed.

`executionSteps`

`List<LabExecutionStep>`

Ordered list of lab execution steps with dependencies and timeouts.

`fallbackStrategy`

`FallbackStrategy`

Defines fallback behavior (IMMEDIATE, GRADUAL, FULL\_RECOVERY, EMERGENCY).

`qualityGate`

`QualityGate`

Quality thresholds for accuracy, response time, and confidence.

### QualityGate

passesQualityGate(double accuracy, double responseTime, double confidence) boolean

Returns `true` if all three metrics meet their respective thresholds.

### FallbackStrategy.FallbackType Enum

Value

Description

`IMMEDIATE`

Immediately switch to fallback lab.

`GRADUAL`

Gradually degrade to simpler processing.

`FULL_RECOVERY`

Attempt full recovery before fallback.

`EMERGENCY`

Emergency fallback with minimal processing.

## Code Examples

### Implementing a Custom Strategy

```java
@Component
public class ThreatEvaluationStrategy
        extends AbstractAIStrategy<SecurityContext,
                                    ThreatResponse> {

    public ThreatEvaluationStrategy(AILabFactory labFactory) {
        super(labFactory);
    }

    @Override
    public DiagnosisType getSupportedType() {
        return DiagnosisType.THREAT_EVALUATION;
    }

    @Override
    public int getPriority() {
        return 10;
    }

    @Override
    protected Class<?> getLabType() {
        return ThreatAnalysisLab.class;
    }

    @Override
    protected void validateRequest(
            AIRequest<SecurityContext> request) {
        if (request.getDomainContext() == null) {
            throw new DiagnosisException(
                    getSupportedType().name(),
                    "INVALID_REQUEST",
                    "SecurityContext is required");
        }
    }

    @Override
    protected Object convertLabRequest(
            AIRequest<SecurityContext> request) {
        return ThreatRequest.from(request.getDomainContext());
    }

    @Override
    protected ThreatResponse processLabExecution(
            Object lab, Object labRequest,
            AIRequest<SecurityContext> request) throws Exception {
        ThreatAnalysisLab threatLab = (ThreatAnalysisLab) lab;
        return threatLab.process((ThreatRequest) labRequest);
    }
}
```

### Using AICoreOperations

```java
@RestController
public class SecurityController {

    private final AICoreOperations<SecurityContext> aiProcessor;

    @PostMapping("/api/threat/evaluate")
    public Mono<ThreatResponse> evaluate(
            @RequestBody ThreatEvalRequest body) {

        AIRequest<SecurityContext> request = AIRequest.builder()
                .requestId(UUID.randomUUID().toString())
                .domainContext(body.toSecurityContext())
                .diagnosisType(DiagnosisType.THREAT_EVALUATION)
                .build();

        return aiProcessor.process(
                request, ThreatResponse.class);
    }
}
```

## Related

[

### AI Lab

Labs that strategies delegate to for actual AI processing.

](../../../docs/reference/core/ai-lab)[

### Streaming

StandardStreamingService uses AICoreOperations for the Strategy/Lab streaming path.

](../../../docs/reference/core/streaming)[

### AI Pipeline

Alternative execution path that bypasses the strategy layer.

](../../../docs/reference/core/pipeline)

:::info
**Configuration Reference**
For AI strategy `application.yml` properties (tier definitions, model assignments, fallback chains, timeout/retry), see [AI Configuration](../../../docs/install/configuration/ai) — covers `TieredStrategyProperties` with 30+ configurable fields.
:::

[Previous Advisor System](../../../docs/reference/core/advisor) [Next Zero Trust](/docs/reference/architecture/zero-trust-flow)