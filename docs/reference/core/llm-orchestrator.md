---
title: "LLM Orchestrator"
---
contexa-core

# LLM Orchestrator

The `UnifiedLLMOrchestrator` is the central LLM client for the entire Contexa platform. It implements both `LLMOperations` and `ToolCapableLLMClient`, providing a single entry point for synchronous calls, streaming, structured entity extraction, and tool-calling across all configured model providers.

## Overview

The orchestrator uses a `ModelSelectionStrategy` to pick the right model for each request, automatically applies registered Spring AI Advisors via the `AdvisorRegistry`, and supports tiered model routing based on `SecurityTaskType`, `AnalysisLevel`, or an explicit tier number. It also handles retry logic with exponential backoff for transient I/O failures.

## LLMClient

The base interface for all LLM interactions. Provides the simplest call, entity extraction, and streaming methods.

`public interface LLMClient`

call(Prompt prompt) Mono<String>

Sends a prompt to the LLM and returns the text response.

entity(Prompt prompt, Class<T> targetType) Mono<T>

Sends a prompt and deserializes the response into the given type using Spring AI's structured output support.

stream(Prompt prompt) Flux<String>

Streams the response as a series of string chunks.

## ToolCapableLLMClient

Extends `LLMClient` with tool/function calling capabilities for agentic workflows.

`public interface ToolCapableLLMClient extends LLMClient`

callTools(Prompt prompt, List<Object> toolProviders) Mono<String>

Calls the LLM with Spring AI tool provider objects. The LLM may invoke tools and return the final text.

callToolCallbacks(Prompt prompt, ToolCallback\[\] toolCallbacks) Mono<String>

Calls the LLM with explicit `ToolCallback` array instead of provider objects.

callToolsResponse(Prompt prompt, List<Object> toolProviders) Mono<ChatResponse>

Like `callTools()` but returns the full `ChatResponse` including metadata and tool call details.

callToolCallbacksResponse(Prompt prompt, ToolCallback\[\] toolCallbacks) Mono<ChatResponse>

Like `callToolCallbacks()` but returns the full `ChatResponse`.

streamTools(Prompt prompt, List<Object> toolProviders) Flux<String>

Streams the response while enabling tool calling for agentic streaming workflows.

streamToolCallbacks(Prompt prompt, ToolCallback\[\] toolCallbacks) Flux<String>

Streams the response with explicit `ToolCallback` array for tool-enabled streaming.

## LLMOperations

Higher-level interface that accepts `ExecutionContext` instead of raw `Prompt` objects. This is the preferred interface for internal platform code.

`public interface LLMOperations`

execute(ExecutionContext context) Mono<String>

Executes an LLM call with full context including tier, security task type, model preferences, and tool configuration.

stream(ExecutionContext context) Flux<String>

Streams the LLM response using the streaming handler with the selected model.

executeEntity(ExecutionContext context, Class<T> targetType) Mono<T>

Executes and deserializes the LLM response into a typed entity.

## ExecutionContext

A Lombok `@Builder` data class that carries all parameters for an LLM execution request. This is the primary way to configure model selection, tool calling, and runtime options.

`@Data @Builder   public class ExecutionContext`

Property

Type

Description

`prompt`

`Prompt`

The Spring AI prompt to send to the LLM.

`requestId`

`String`

Unique request identifier for tracing and logging.

`userId`

`String`

The authenticated user ID for security context propagation.

`sessionId`

`String`

The session ID for stateful interactions.

`preferredModel`

`String`

Explicit model name to use, bypassing tier-based selection.

`securityTaskType`

`SecurityTaskType`

Security task classification that determines the default tier.

`tier`

`Integer`

Explicit tier number (1, 2, or 3) for model selection.

`analysisLevel`

`AnalysisLevel`

Analysis depth that maps to a default tier.

`temperature`

`Double`

Sampling temperature override.

`topP`

`Double`

Top-p (nucleus sampling) override.

`maxTokens`

`Integer`

Maximum output tokens override.

`toolCallbacks`

`List<ToolCallback>`

Tool callbacks to enable for this execution.

`toolProviders`

`List<Object>`

Tool provider objects to enable for this execution.

`streamingMode`

`Boolean`

Whether to use streaming execution mode.

`toolExecutionEnabled`

`Boolean`

Whether tool calling is enabled for this request.

### SecurityTaskType Enum

Classifies the security operation, which determines the default LLM tier for model selection.

Value

Default Tier

Description

`THREAT_FILTERING`

Fast threat filtering for real-time requests.

`QUICK_DETECTION`

Quick anomaly detection with minimal latency.

`CONTEXTUAL_ANALYSIS`

Context-aware security analysis.

`BEHAVIOR_ANALYSIS`

User behavior pattern analysis.

`CORRELATION`

Cross-event correlation analysis.

`EXPERT_INVESTIGATION`

Deep expert-level investigation.

`INCIDENT_RESPONSE`

Automated incident response planning.

`FORENSIC_ANALYSIS`

Forensic analysis of security events.

`APPROVAL_WORKFLOW`

Human-in-the-loop approval workflows.

### AnalysisLevel Enum

Value

Default Tier

Default Timeout

`QUICK`

50ms

`NORMAL`

300ms

`DEEP`

5000ms

## UnifiedLLMOrchestrator

The concrete implementation that ties everything together. It implements both `LLMOperations` and `ToolCapableLLMClient`.

`public class UnifiedLLMOrchestrator implements LLMOperations, ToolCapableLLMClient`

### Constructor Dependencies

Dependency

Description

`ModelSelectionStrategy`

Selects the appropriate `ChatModel` based on the execution context.

`StreamingHandler`

Handles streaming response processing and chunk delivery.

`TieredLLMProperties`

Configuration for the 3-tier model hierarchy.

`AdvisorRegistry`

Registry of enabled Spring AI Advisors to apply to each request.

### Key Behaviors

-   **Advisor Integration** — Automatically applies all enabled advisors from the `AdvisorRegistry` to every `ChatClient` instance. Advisor snapshots are cached and rebuilt when the enabled set changes.
-   **Model Selection** — Delegates to `ModelSelectionStrategy.selectModel()` which considers tier, preferred model, analysis level, and security task type.
-   **Retry Logic** — Applies exponential backoff retry (up to 2 retries) for `IOException` during execution.
-   **Ollama Optimization** — Detects `OllamaChatModel` instances and applies `OllamaOptions` with model name, temperature, topP, and numPredict settings.

## Code Examples

### Basic LLM Call with Tier Selection

```java
ExecutionContext context = ExecutionContext.builder()
        .prompt(new Prompt("Analyze this request for threats"))
        .securityTaskType(SecurityTaskType.THREAT_FILTERING)
        .userId("user-123")
        .requestId(UUID.randomUUID().toString())
        .build();

String result = orchestrator.execute(context).block();
```

### Tool-Calling Execution

```java
Prompt prompt = new Prompt(
        "Investigate and block suspicious IP 192.168.1.100");

String result = orchestrator.callTools(
        prompt, List.of(ipBlockTool, auditTool)).block();
```

### Streaming with ExecutionContext

```java
ExecutionContext context = ExecutionContext.builder()
        .prompt(new Prompt("Perform deep forensic analysis"))
        .securityTaskType(SecurityTaskType.FORENSIC_ANALYSIS)
        .streamingMode(true)
        .build();

orchestrator.stream(context)
        .subscribe(chunk -> sendToClient(chunk));
```

## Related

[

### Model Providers

Dynamic model registry and selection strategy used by the orchestrator.

](../../../docs/reference/core/model-provider)[

### Advisor System

Spring AI Advisors automatically applied by the orchestrator.

](../../../docs/reference/core/advisor)[

### AI Lab

Labs use the orchestrator for LLM inference.

](../../../docs/reference/core/ai-lab)

:::info
**Configuration Reference**
For LLM provider and model configuration properties, see [AI Configuration](../../../docs/install/configuration/ai) — covers `TieredStrategyProperties` (model tiers, timeouts, retry), `SecurityMappingProperties` (task-to-tier mapping), and `ContexaAdvisorProperties`.
:::

[Previous AI Lab](../../../docs/reference/core/ai-lab) [Next AI Pipeline](../../../docs/reference/core/pipeline)