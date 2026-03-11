---
title: "AI Engine Overview"
---
contexa-core

# AI Engine Overview

Contexa AI Engine overview — architecture, AI diagnosis process, standard and streaming analysis, customization points, and platform integration with Identity and IAM.

## AI Diagnosis Process

The AI Engine supports two execution modes. Choose based on your use case:

**Standard Analysis**

Returns `Mono<AIResponse>`
Full 6-step pipeline execution
Structured JSON response

*Best for: dashboards, reports, batch processing*

**Streaming Analysis**

Returns `Flux<ServerSentEvent>`
4-step pipeline (pre-process + streaming LLM)
Real-time text stream via SSE

*Best for: chat interfaces, live analysis, interactive UIs*

### Standard Analysis

Executes the full 6-step pipeline and returns a structured JSON response. Use this when you need complete, parsed analysis results.

```java
@RestController
@RequestMapping("/api/my-analysis")
@RequiredArgsConstructor
public class MyAnalysisController {

    private final AICoreOperations<MyContext> aiProcessor;
    private final StandardStreamingService streamingService;

    @PostMapping("/analyze")
    public Mono<ResponseEntity<MyAnalysisResponse>> analyze(
            @RequestBody MyAnalysisItem request) {

        MyAnalysisRequest aiRequest = createRequest(request);

        return streamingService.process(
                aiRequest, aiProcessor, MyAnalysisResponse.class
        ).map(ResponseEntity::ok);
    }
}
```

### Streaming Analysis

Runs context retrieval, preprocessing, and prompt generation, then streams the LLM response in real-time via Server-Sent Events. Use this for chat-like interfaces or when users need immediate feedback.

```java
@PostMapping(value = "/analyze/stream",
             produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> analyzeStream(
        @RequestBody MyAnalysisItem request) {

    MyAnalysisRequest aiRequest = createRequest(request);

    return streamingService.stream(aiRequest, aiProcessor);
}
```
:::info
**Choosing Between Modes**
Use **Standard Analysis** when you need structured JSON responses that can be programmatically processed (dashboards, reports, automated workflows). Use **Streaming Analysis** when users need to see results as they are generated (chat UIs, live monitoring, interactive analysis).
:::

## Customization Points

To build a custom AI feature, you implement these extension points. Each one plugs into the AI Engine at a specific layer:

**AIRequest / AIResponse**

Define your request and response types. Extend `AIResponse` with domain-specific fields.

**Strategy**

Route requests by `DiagnosisType`. Validate input and select the Lab to execute.

**Lab**

Collect domain data, enrich the request, and delegate to the Pipeline.

**PromptTemplate**

Generate system and user prompts for the LLM from your domain data.

**ContextRetriever**

Customize RAG vector search to retrieve relevant context for your domain.

**Configuration**

Tune LLM models, tiers, RAG parameters, and streaming settings via `application.yml`.

:::tip
**Getting Started**
See [Building Custom AI](strategy) for a step-by-step guide to implementing each extension point with working code examples.
:::

## Platform Integration

The AI Engine integrates with Contexa's Identity and IAM modules to deliver AI Native Security. Each module contributes a distinct capability:

**Identity**

Authentication
Session / Token
MFA

**IAM**

Authorization
Policy / XACML
Resource Protection

**AI Engine**

AI Diagnosis
Risk Analysis
Policy Generation

When integrated together, the platform enables:

-   **Zero Trust security analysis** — AI-powered continuous risk assessment for every access decision
-   **Automated policy generation** — AI generates and refines XACML policies based on access patterns
-   **Resource naming recommendations** — AI suggests standardized resource names for policy consistency
-   **Interactive security studio** — Natural language queries against your IAM data with AI analysis

:::info
**Standalone Usage**
The AI Engine can also be used independently for any AI analysis task in your Spring application. The Identity and IAM integration is optional and adds security-specific AI capabilities.
:::

## Configuration Overview

AI Engine behavior is controlled through `application.yml` properties. Key configuration areas:

**LLM & Models**

Tiered model hierarchy (Layer 1 / Layer 2)
Model provider selection (OpenAI, Anthropic, Ollama)
Temperature, max tokens per task type

**Pipeline & RAG**

Vector search parameters (topK, similarity threshold)
Lab-specific RAG configuration
Pipeline timeout and streaming settings

:::info
**Configuration Reference**
For complete property reference with examples, see [Configuration > AI](../../../docs/install/configuration/ai) — covers LLM tiers, strategy settings, RAG parameters, streaming, and vector store configuration.
:::

## Related

[

### Building Custom AI

Step-by-step guide to implementing Strategy, Lab, and PromptTemplate.

](strategy)[

### Pipeline & RAG

6-step pipeline architecture and RAG context retrieval.

](pipeline)[

### Streaming

Real-time SSE streaming and client integration.

](streaming)[

### LLM & Models

Tiered model hierarchy, providers, and advisor system.

](llm-orchestrator)

[Previous IAM End-to-End Workflow](../../../docs/reference/iam/end-to-end-workflow) [Next Building Custom AI](strategy)