---
title: "AI Pipeline"
---
contexa-core

# AI Pipeline

The AI Pipeline provides a configurable, multi-step execution flow for AI requests. The `PipelineOrchestrator` selects the appropriate `PipelineExecutor` based on the configuration and delegates the request through a series of processing steps from context retrieval to response parsing.

## Overview

The pipeline is designed for use cases where you need a full processing flow (RAG context retrieval, prompt generation, LLM execution, response parsing) rather than direct LLM calls. The orchestrator automatically selects between standard and streaming executors.

### Pipeline Flow

CONTEXT\_RETRIEVAL

PREPROCESSING

PROMPT\_GENERATION

LLM\_EXECUTION

RESPONSE\_PARSING

POSTPROCESSING

## PipelineOrchestrator

The central coordinator that selects and delegates to the appropriate `PipelineExecutor` based on the given configuration.

`public class PipelineOrchestrator`

execute(AIRequest<T> request, Class<R> responseType) Mono<R>

Executes the pipeline with the default configuration (`createPipelineConfig()`). Selects an executor, runs the pipeline, and returns the typed response.

execute(AIRequest<T> request, PipelineConfiguration config, Class<R> responseType) Mono<R>

Executes the pipeline with a custom configuration. Includes automatic fallback response generation on failure.

executeStream(AIRequest<T> request) Flux<String>

Executes the pipeline in streaming mode with the default streaming configuration.

executeStream(AIRequest<T> request, PipelineConfiguration config) Flux<String>

Executes the pipeline in streaming mode with a custom configuration. Selects a streaming-capable executor.

## PipelineConfiguration

Defines the steps, parameters, timeout, and streaming mode for a pipeline execution.

`public class PipelineConfiguration`

Property

Type

Default

Description

`steps`

`List<PipelineStep>`

Empty

Ordered list of pipeline steps to execute.

`parameters`

`Map<String, Object>`

Empty

Arbitrary key-value parameters for step configuration.

`timeoutSeconds`

`int`

300

Maximum execution time in seconds.

`enableStreaming`

`boolean`

false

Whether to use streaming execution mode.

`name`

`String`

null

Optional pipeline name for identification.

`description`

`String`

null

Optional description of the pipeline purpose.

### PipelineStep Enum

Step

Description

`PREPROCESSING`

Request validation, normalization, and enrichment.

`CONTEXT_RETRIEVAL`

RAG context retrieval from vector stores.

`PROMPT_GENERATION`

Constructs the final prompt from request data and retrieved context.

`LLM_EXECUTION`

Sends the prompt to the LLM via `UnifiedLLMOrchestrator`.

`TOOL_EXECUTION`

Executes tool calls from the LLM response.

`RESPONSE_PARSING`

Parses the raw LLM output into the target response type.

`POSTPROCESSING`

Final enrichment, validation, and side-effect execution.

### Factory Methods

createPipelineConfig() PipelineConfiguration

Creates the default pipeline configuration with steps: CONTEXT\_RETRIEVAL, PREPROCESSING, PROMPT\_GENERATION, LLM\_EXECUTION, RESPONSE\_PARSING, POSTPROCESSING. Timeout: 300 seconds.

createStreamPipelineConfig() PipelineConfiguration

Creates a streaming pipeline configuration with steps: CONTEXT\_RETRIEVAL, PREPROCESSING, PROMPT\_GENERATION, LLM\_EXECUTION. Streaming enabled, timeout: 300 seconds.

## PipelineExecutor

The interface that concrete executors implement to process pipeline configurations.

`public interface PipelineExecutor`

execute(AIRequest<T> request, PipelineConfiguration config, Class<R> responseType) Mono<R>

Executes the pipeline steps in order and returns the typed response.

executeStream(AIRequest<T> request, PipelineConfiguration config) Flux<String>

Executes the pipeline in streaming mode.

supportsConfiguration(PipelineConfiguration config) boolean

Returns whether this executor can handle the given configuration.

supportsStreaming() boolean

Returns whether this executor supports streaming. Used by the orchestrator for executor selection.

getPriority() int

Returns the executor priority. Lower values are preferred. Default: 100.

### Built-in Implementations

Class

Streaming

Description

`UniversalPipelineExecutor`

No

Standard synchronous/async pipeline executor. Processes all steps sequentially and returns the final response.

`StreamingUniversalPipelineExecutor`

Yes

Streaming-capable executor that delivers LLM output as a reactive `Flux<String>`.

## Code Examples

### Standard Pipeline Execution

```java
AIRequest<SecurityContext> request = AIRequest.builder()
        .requestId(UUID.randomUUID().toString())
        .domainContext(securityContext)
        .diagnosisType(DiagnosisType.THREAT_EVALUATION)
        .build();

ThreatResponse response = pipelineOrchestrator
        .execute(request, ThreatResponse.class)
        .block();
```

### Custom Pipeline Configuration

```java
PipelineConfiguration config = PipelineConfiguration.builder()
        .addStep(PipelineStep.PREPROCESSING)
        .addStep(PipelineStep.PROMPT_GENERATION)
        .addStep(PipelineStep.LLM_EXECUTION)
        .addStep(PipelineStep.TOOL_EXECUTION)
        .addStep(PipelineStep.RESPONSE_PARSING)
        .timeoutSeconds(120)
        .build();

SecurityResponse response = pipelineOrchestrator
        .execute(request, config, SecurityResponse.class)
        .block();
```

### Streaming Pipeline

```java
Flux<String> chunks = pipelineOrchestrator
        .executeStream(request);

chunks.subscribe(
        chunk -> sendSseEvent(chunk),
        error -> handleError(error),
        () -> completeStream()
);
```

## Related

[

### LLM Orchestrator

The LLM client used by pipeline executors during the LLM\_EXECUTION step.

](../../../docs/reference/core/llm-orchestrator)[

### RAG & Vectors

Vector operations used during the CONTEXT\_RETRIEVAL step.

](../../../docs/reference/core/rag)[

### Streaming

SSE streaming service that wraps pipeline streaming output.

](../../../docs/reference/core/streaming)

:::info
**Configuration Reference**
For pipeline `application.yml` properties, see [Security Configuration](../../../docs/install/configuration/security) — covers `SecurityPipelineProperties` and `SecurityColdPathProperties`.
:::

[Previous LLM Orchestrator](../../../docs/reference/core/llm-orchestrator) [Next Model Providers](../../../docs/reference/core/model-provider)