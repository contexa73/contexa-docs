---
title: "AI Engine Configuration"
---
# AI Engine Configuration

Configuration properties for the Contexa AI engine, including the tiered LLM strategy, security task mapping, RAG (Retrieval-Augmented Generation), advisor chain, and streaming pipeline.

## Tiered LLM Properties

Properties under the `spring.ai.security` prefix, bound to `TieredLLMProperties`. Configures the LLM model assignments for the two-layer analysis pipeline, including primary and backup model names, per-layer timeouts, and temperature settings.

**Related:** [LLM Orchestrator Reference](../../../docs/reference/core/llm-orchestrator), [AI Strategy Reference](../../../docs/reference/core/strategy)

### Layer 1 (Contextual Analysis)

Property

Type

Default

Description

`spring.ai.security.layer1`

`.model`

`String`

`qwen2.5:14b`

Primary model for Layer 1 (fast analysis).

`.backup.model`

`String`

—

Fallback when Layer 1 primary is unavailable.

`spring.ai.security.tiered.layer1`

`.timeout-ms`

`Integer`

`30000`

Layer 1 inference timeout in ms (max 120000).

### Layer 2 (Expert Analysis)

Property

Type

Default

Description

`spring.ai.security.layer2`

`.model`

`String`

`exaone3.5:latest`

Primary model for Layer 2 (deep analysis).

`.backup.model`

`String`

—

Fallback when Layer 2 primary is unavailable.

`spring.ai.security.tiered.layer2`

`.timeout-ms`

`Integer`

`60000`

Layer 2 inference timeout in ms (max 120000).

### Temperature Defaults

Temperature is not directly configurable via properties — it is set programmatically per tier: Layer 1 = `0.3` (more deterministic), Layer 2 = `0.7` (more creative).

### Example Configuration

YAML

```yaml
spring:
  ai:
    security:
      layer1:
        model: qwen2.5:14b
        backup:
          model: llama3.2:latest
      layer2:
        model: exaone3.5:latest
        backup:
          model: deepseek-r1:14b
      tiered:
        layer1:
          timeout-ms: 30000
        layer2:
          timeout-ms: 60000
```

## Tiered Strategy Properties

Properties under the `spring.ai.security.tiered` prefix, bound to `TieredStrategyProperties`. Controls the multi-layer AI analysis pipeline including RAG thresholds, caching, prompt construction, truncation limits, and vector cache behavior for each tier.

### Layer 1 Settings

Property

Type

Default

Description

`spring.ai.security.tiered.layer1`

`.rag.similarityThreshold`

`double`

`0.5`

Min similarity for RAG retrieval in Layer 1

`.session.maxRecentActions`

`int`

`100`

Max recent session actions in analysis context

`.cache.maxSize`

`int`

`1000`

Max entries in Layer 1 result cache

`.cache.ttlMinutes`

`int`

`30`

Time-to-live in minutes for Layer 1 cache entries

`.timeout.totalMs`

`long`

`15000`

Total timeout (ms) for Layer 1 analysis pipeline

`.timeout.llmMs`

`long`

`10000`

LLM call timeout (ms) within Layer 1

`.vectorSearchLimit`

`int`

`5`

Max vector search results in Layer 1

### Layer 1 Prompt Settings

Property

Type

Default

Description

`spring.ai.security.tiered.layer1.prompt`

`.maxSimilarEvents`

`int`

`3`

Max similar historical events in the prompt

`.maxRagDocuments`

`int`

`5`

Max RAG documents included in the prompt

`.includeEventId`

`boolean`

`false`

Include raw event ID in prompt (may leak IDs)

`.includeRawTimestamp`

`boolean`

`false`

Include raw timestamps in prompt

`.includeRawSessionId`

`boolean`

`false`

Include raw session ID in prompt

`.includeFullUserAgent`

`boolean`

`false`

Include full User-Agent (truncated when false)

### Layer 2 Settings

Property

Type

Default

Description

`spring.ai.security.tiered.layer2`

`.rag.similarityThreshold`

`double`

`0.5`

Min similarity for RAG retrieval in Layer 2

`.timeoutMs`

`long`

`10000`

Total timeout (ms) for Layer 2 analysis

`.enableSoar`

`boolean`

`false`

Enable SOAR integration in Layer 2

`.ragTopK`

`int`

`10`

Top-K RAG results for Layer 2 analysis

### Truncation Settings

Controls maximum character lengths for various fields to manage prompt size and token usage.

Property

Type

Default

Description

`spring.ai.security.tiered.truncation.layer1`

`.userAgent`

`int`

`150`

Max chars for User-Agent in Layer 1 prompts

`.payload`

`int`

`200`

Max chars for payload in Layer 1 prompts

`.ragDocument`

`int`

`300`

Max chars per RAG document in Layer 1 prompts

### Vector Cache Settings

Property

Type

Default

Description

`spring.ai.security.tiered.vectorCache`

`.maxSize`

`int`

`10000`

Max entries in vector embedding cache

`.expireMinutes`

`int`

`5`

Expiry (minutes) for cached vector embeddings

`.enabled`

`boolean`

`true`

Enable or disable the vector embedding cache

`.recordStats`

`boolean`

`true`

Record hit/miss stats for monitoring

### Proxy Security Settings

Property

Type

Default

Description

`spring.ai.security.tiered.security`

`.trustedProxies`

`List<String>`

`[]`

Trusted proxy IPs/CIDRs for X-Forwarded-For

`.trustedProxyValidationEnabled`

`boolean`

`true`

Validate proxy headers against trusted list

```yaml
spring:
  ai:
    security:
      tiered:
        layer1:
          rag:
            similarityThreshold: 0.5
          session:
            maxRecentActions: 100
          cache:
            maxSize: 1000
            ttlMinutes: 30
          timeout:
            totalMs: 15000
            llmMs: 10000
          prompt:
            maxSimilarEvents: 3
            maxRagDocuments: 5
            includeEventId: false
            includeRawTimestamp: false
            includeRawSessionId: false
            includeFullUserAgent: false
          vectorSearchLimit: 5
        layer2:
          rag:
            similarityThreshold: 0.5
          timeoutMs: 10000
          enableSoar: false
          ragTopK: 10
        truncation:
          layer1:
            userAgent: 150
            payload: 200
            ragDocument: 300
        vectorCache:
          maxSize: 10000
          expireMinutes: 5
          enabled: true
          recordStats: true
        security:
          trustedProxies: []
          trustedProxyValidationEnabled: true
```

See also: [Tiered Strategy Reference](../../../docs/reference/core/strategy)

## Advisor Properties

Properties under the `contexa.advisor` prefix, bound to `ContexaAdvisorProperties`. Configures the security advisor ordering and authentication requirements.

Property

Type

Default

Description

`contexa.advisor.security`

`.enabled`

`boolean`

`true`

Enable the security advisor in the chain

`.order`

`int`

`50`

Execution order of the security advisor (lower values run first)

`.requireAuthentication`

`boolean`

`false`

Require an authenticated principal before AI analysis proceeds

```yaml
contexa:
  advisor:
    security:
      enabled: true
      order: 50
      requireAuthentication: false
```

See also: [Advisor Chain Reference](../../../docs/reference/core/advisor)

## RAG Properties

Properties under the `contexa.rag` prefix, bound to `ContexaRagProperties`. Configures the Retrieval-Augmented Generation pipeline including default search parameters and AI Lab batch processing.

### Default Search Parameters

Property

Type

Default

Description

`contexa.rag.defaults`

`.similarityThreshold`

`double`

`0.7`

Default minimum cosine similarity threshold for RAG queries

`.topK`

`int`

`10`

Default number of top-K documents returned per RAG query

### AI Lab Settings

Property

Type

Default

Description

`contexa.rag.lab`

`.batchSize`

`int`

`50`

Batch size for AI Lab document processing operations

`.validationEnabled`

`boolean`

`true`

Enable validation of documents before vector store ingestion

`.enrichmentEnabled`

`boolean`

`true`

Enable metadata enrichment during document processing

`.topK`

`int`

`100`

Top-K limit for AI Lab similarity searches

`.similarityThreshold`

`double`

`0.75`

Similarity threshold for AI Lab document matching

```yaml
contexa:
  rag:
    defaults:
      similarityThreshold: 0.7
      topK: 10
    lab:
      batchSize: 50
      validationEnabled: true
      enrichmentEnabled: true
      topK: 100
      similarityThreshold: 0.75
```

See also: [RAG Pipeline Reference](../../../docs/reference/core/rag)

## Streaming Properties

Properties under the `contexa.streaming` prefix, bound to `StreamingProperties`. Configures the SSE (Server-Sent Events) streaming pipeline used for real-time LLM response delivery, including protocol markers and buffer settings.

Property

Type

Default

Description

`contexa.streaming`

`.finalResponseMarker`

`String`

*StreamingProtocol constant*

Marker string indicating the final response chunk in an SSE stream

`.markerBufferSize`

`int`

`100`

Internal buffer size for marker detection in the stream parser

```yaml
contexa:
  streaming:
    markerBufferSize: 100
```

See also: [Streaming Pipeline Reference](../../../docs/reference/core/streaming)

## PgVector Store Properties

Properties under the `spring.ai.vectorstore.pgvector` prefix, provided by Spring AI's PGVector auto-configuration. These configure the PostgreSQL-based vector store used by both the tiered strategy and the RAG pipeline.

Key settings include the table name, embedding dimensions, index type (HNSW or IVFFlat), distance function, and schema initialization behavior. For the full property reference, see the dedicated page.

```yaml
spring:
  ai:
    vectorstore:
      pgvector:
        index-type: HNSW
        distance-type: COSINE_DISTANCE
        dimensions: 384
        initialize-schema: true
```

See also: [PgVector Configuration Reference](/docs/install/configuration#vector-store-properties)

[Previous Security Configuration](../../../docs/install/configuration/security) [Next Identity Configuration](../../../docs/install/configuration/identity)