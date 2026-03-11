---
title: "Streaming"
---
contexa-core

# Streaming

The streaming subsystem provides Server-Sent Events (SSE) streaming for AI responses. `StandardStreamingService` handles the full lifecycle from chunk processing through sentence buffering to JSON extraction, delivering a smooth real-time experience to clients through two execution paths: the Strategy/Lab path via `AICoreOperations` and the direct Pipeline path via `PipelineOrchestrator`.

## Overview

Streaming in Contexa uses a marker-based protocol within the LLM output to separate narrative text from structured JSON responses. The `DefaultStandardStreamingService` processes raw LLM chunks, buffers them into complete sentences, detects protocol markers, extracts JSON payloads, and wraps everything in SSE events for delivery to the client.

## StandardStreamingService

The primary interface for all streaming operations. Supports two execution paths and both streaming and non-streaming modes.

`public interface StandardStreamingService`

stream(AIRequest<C> request, AICoreOperations<C> aiProcessor) Flux<ServerSentEvent<String>>

Streams the response using the Strategy/Lab path. Enables `DiagnosisType`\-based routing and domain-specific processing.

stream(AIRequest<C> request, PipelineOrchestrator pipelineOrchestrator) Flux<ServerSentEvent<String>>

Streams the response directly via the pipeline, bypassing the Strategy/Lab layer. Use this for simple LLM calls or custom prompt execution.

process(AIRequest<C> request, AICoreOperations<C> aiProcessor, Class<R> responseType) Mono<R>

Non-streaming single response via the Strategy/Lab path.

process(AIRequest<C> request, PipelineOrchestrator orchestrator, Class<R> responseType) Mono<R>

Non-streaming single response via the pipeline path.

errorStream(String errorCode, String message) Flux<ServerSentEvent<String>>

Creates an SSE error stream with a JSON-formatted error payload.

## StreamingProtocol

Defines the marker constants used in the streaming pipeline to separate text, JSON, and control signals.

`public final class StreamingProtocol`

Constant

Value

Description

`FINAL_RESPONSE_MARKER`

`###FINAL_RESPONSE###`

Prefixes the final complete JSON response.

`STREAMING_MARKER`

`###STREAMING###`

Prefixes narrative text chunks for client display.

`JSON_START_MARKER`

`===JSON_START===`

Signals the beginning of a JSON payload in the stream.

`JSON_END_MARKER`

`===JSON_END===`

Signals the end of a JSON payload in the stream.

`GENERATING_RESULT_MARKER`

`###GENERATING_RESULT###`

Sent when JSON\_START is detected, notifying clients that analysis text is complete and result data is being generated.

## StreamingContext

Stateful context object that tracks the streaming session. Accumulates chunks, detects markers, and manages a `SentenceBuffer` for converting raw LLM chunks into complete sentences.

`public class StreamingContext extends BaseStreamingContext`

Key features:

-   **Chunk accumulation** via `appendChunk()` for marker detection.
-   **Sentence buffering** via `getSentenceBuffer()` that groups chunks into complete sentences before sending.
-   **JSON extraction** via `extractJsonPart()` that detects and extracts JSON payloads from the accumulated stream.
-   **State tracking** via `isFinalResponseStarted()` and `isJsonSent()` to prevent duplicate emissions.

## ChunkProcessor

Interface for custom chunk processing logic that can be plugged into the streaming pipeline.

`public interface ChunkProcessor`

process(Flux<String> upstream) Flux<String>

Processes the upstream flux of raw chunks and returns the transformed output.

getProcessorType() String

Returns a string identifier for this processor type.

## JsonStreamingProcessor

A `ChunkProcessor` implementation that detects `JSON_START` and `JSON_END` markers in the stream, accumulates the JSON payload between them, and emits the complete JSON as a `FINAL_RESPONSE`. Includes JSON repair logic for handling incomplete LLM output (bracket balancing, missing comma insertion).

`public class JsonStreamingProcessor implements ChunkProcessor`

### Processing Flow

1.  Text before `JSON_START` is emitted with `STREAMING_MARKER`.
2.  When `JSON_START` is detected, a `GENERATING_RESULT_MARKER` is emitted.
3.  Content between markers is accumulated in a JSON buffer.
4.  When `JSON_END` is detected, the JSON is emitted with `FINAL_RESPONSE_MARKER`.
5.  If the stream completes without `JSON_END`, the JSON is repaired and emitted.

## Code Examples

### Using StandardStreamingService in a Controller

```java
@GetMapping(value = "/analyze/stream",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> analyzeStream(
        @RequestParam String query) {

    AIRequest<SecurityContext> request = buildRequest(query);

    return streamingService.stream(request, aiNativeProcessor);
}

@PostMapping("/analyze")
public Mono<AnalysisResponse> analyze(
        @RequestBody AnalysisRequest body) {

    AIRequest<SecurityContext> request = buildRequest(body);

    return streamingService.process(
            request, aiNativeProcessor, AnalysisResponse.class);
}
```

### Direct Pipeline Streaming

```java
@GetMapping(value = "/chat/stream",
        produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> chatStream(
        @RequestParam String message) {

    AIRequest<ChatContext> request = buildChatRequest(message);

    return streamingService.stream(request, pipelineOrchestrator);
}
```

## Related

[

### AI Pipeline

Pipeline orchestrator used as one of the two streaming execution paths.

](../../../docs/reference/core/pipeline)[

### AI Strategy

Strategy/Lab path used via AICoreOperations for the other streaming path.

](../../../docs/reference/core/strategy)

:::info
**Configuration Reference**
For streaming `application.yml` properties (buffer sizes, timeouts, backpressure), see [AI Configuration](../../../docs/install/configuration/ai) — covers `StreamingProperties`.
:::

[Previous RAG & Vectors](../../../docs/reference/core/rag) [Next Advisor System](../../../docs/reference/core/advisor)