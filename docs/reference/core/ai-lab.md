---
title: "AI Lab System"
---
contexa-core

# AI Lab System

The AI Lab system provides a generic abstraction for building domain-specific AI processing units. Each lab encapsulates a focused AI workload with synchronous, asynchronous, and streaming execution modes. Labs are discovered and managed through the Spring application context via `AILabFactory`.

## Overview

The lab architecture follows a template method pattern. You implement `AILab<Req, Res>` (or extend `AbstractAILab`) to define a processing unit, then register it as a Spring bean. The `AILabFactory` locates labs by type at runtime, and the strategy layer delegates work to the appropriate lab based on the current `DiagnosisType`.

Each lab is assigned a unique ID on creation and supports three execution modes:

-   **Synchronous** — `process(Req)` blocks until the result is ready.
-   **Asynchronous** — `processAsync(Req)` returns a `Mono<Res>` for non-blocking execution.
-   **Streaming** — `processStream(Req)` returns a `Flux<String>` for real-time chunk delivery.

## AILab<Req, Res>

The core interface that every lab must implement. The generic parameters define the request and response types for the lab's domain.

`public interface AILab<Req, Res>`

getLabId() String

Returns the unique identifier assigned to this lab instance. Generated automatically in `AbstractAILab` using a UUID-based prefix.

getLabName() String

Returns the human-readable name of this lab, set during construction.

process(Req request) Res

Synchronously processes the request and returns the result. Throws `LabProcessingException` on failure.

request Req The domain-specific request object.

processAsync(Req request) Mono<Res>

Asynchronously processes the request using Project Reactor's `Mono`. The default implementation in `AbstractAILab` wraps the synchronous `doProcess` call.

request Req The domain-specific request object.

processStream(Req request) Flux<String>

Streams the response as a series of string chunks. Only available when `supportsStreaming()` returns `true`.

request Req The domain-specific request object.

supportsStreaming() boolean

Returns whether this lab supports streaming execution. Defaults to `false`. Override to enable streaming.

isActive() boolean

Returns whether this lab is currently active and available for processing. Defaults to `true`.

canProcess(Req request) boolean

Checks whether this lab can handle the given request. The default implementation returns `true` when the request is non-null and the lab is active.

request Req The request to evaluate.

## AbstractAILab<Req, Res>

The base class for all lab implementations. It provides the template method pattern with lifecycle hooks for validation, pre-processing, core processing, and post-processing. Subclasses only need to implement `doProcess()`.

`public abstract class AbstractAILab<Req, Res> implements AILab<Req, Res>`

### Template Method Lifecycle

validateRequest(request)

preProcess(request)

doProcess(request)

postProcess(request, result)

doProcess(Req request) Res

**Abstract.** The core processing logic that subclasses must implement. Called within the template method after validation and pre-processing.

doProcessAsync(Req request) Mono<Res>

Override for truly asynchronous processing. The default delegates to `doProcess()` wrapped in `Mono.fromCallable()`.

doProcessStream(Req request) Flux<String>

Override to provide streaming output. The default throws `UnsupportedOperationException`. Remember to also override `supportsStreaming()` to return `true`.

validateRequest(Req request) void

Validates the request before processing. The default checks for null. Override to add domain-specific validation.

preProcess(Req request) void

Hook executed before `doProcess()`. No-op by default.

postProcess(Req request, Res result) void

Hook executed after successful processing. No-op by default.

### Inner Class: LabProcessingException

Runtime exception thrown when lab processing fails. Wraps the original cause and includes the lab name in the message.

## AILabFactory

Factory interface for discovering and retrieving lab instances from the Spring application context.

`public interface AILabFactory`

getLab(Class<T> labType) Optional<T>

Retrieves a lab bean by its class type. Returns `Optional.empty()` if the lab is not registered.

createLab(Class<T> labType) T

Returns an existing lab or throws `UnsupportedOperationException` if none exists. Labs are expected to be pre-registered as Spring beans.

getLabByClassName(String className) Optional<AILab<?, ?>>

Retrieves a lab by its fully-qualified class name. Useful for dynamic lab resolution from configuration.

hasLab(Class<?> labType) boolean

Checks whether a lab of the given type is registered. Default method delegates to `getLab()`.

## DefaultAILabFactory

The default `AILabFactory` implementation that uses the Spring `ApplicationContext` to discover lab beans.

`public class DefaultAILabFactory implements AILabFactory`

This class is auto-configured by `CoreAutonomousAutoConfiguration`. It resolves labs using `ApplicationContext.getBean(Class)`, so any class implementing `AILab` and annotated as a Spring component is automatically discoverable.

## Code Examples

### Implementing a Custom Lab

```java
@Component
public class ThreatAnalysisLab
        extends AbstractAILab<ThreatRequest, ThreatResponse> {

    private final UnifiedLLMOrchestrator orchestrator;

    public ThreatAnalysisLab(UnifiedLLMOrchestrator orchestrator) {
        super("ThreatAnalysis");
        this.orchestrator = orchestrator;
    }

    @Override
    protected ThreatResponse doProcess(ThreatRequest request)
            throws Exception {
        ExecutionContext ctx = ExecutionContext.builder()
                .prompt(request.toPrompt())
                .securityTaskType(SecurityTaskType.THREAT_FILTERING)
                .build();

        String json = orchestrator.execute(ctx).block();
        return ThreatResponse.fromJson(json);
    }

    @Override
    protected void validateRequest(ThreatRequest request) {
        super.validateRequest(request);
        if (request.getPayload() == null) {
            throw new IllegalArgumentException(
                    "Threat payload is required");
        }
    }
}
```

### Retrieving a Lab via Factory

```java
@Service
public class SecurityService {

    private final AILabFactory labFactory;

    public SecurityService(AILabFactory labFactory) {
        this.labFactory = labFactory;
    }

    public ThreatResponse analyzeThreat(ThreatRequest request) {
        ThreatAnalysisLab lab = labFactory
                .getLab(ThreatAnalysisLab.class)
                .orElseThrow(() -> new IllegalStateException(
                        "ThreatAnalysisLab not available"));

        return lab.process(request);
    }
}
```

## Related

[

### AI Strategy

Strategy layer that delegates to labs based on DiagnosisType.

](../../../docs/reference/core/strategy)[

### LLM Orchestrator

The LLM client that labs use for AI inference.

](../../../docs/reference/core/llm-orchestrator)[

### AI Pipeline

Pipeline execution that can be used alongside or instead of labs.

](../../../docs/reference/core/pipeline)

[Previous Reference Overview](/docs/reference/architecture/overview) [Next LLM Orchestrator](../../../docs/reference/core/llm-orchestrator)