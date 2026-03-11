---
title: "RAG & Vector Operations"
---
contexa-core

# RAG & Vector Operations

Contexa provides a layered vector storage architecture for RAG (Retrieval-Augmented Generation) workflows. The `VectorOperations` interface defines the contract, `UnifiedVectorService` provides general-purpose storage with caching, and `AbstractVectorLabService` enables domain-specific vector services with metrics, enrichment, and validation.

## Overview

Vector operations power the CONTEXT\_RETRIEVAL step of the AI pipeline. Documents are stored with metadata, embedded via Spring AI's embedding model, and persisted to PgVector. Similarity searches retrieve relevant context before LLM execution.

The architecture has two layers:

-   **UnifiedVectorService** — General-purpose vector operations with cache integration. Used for standard document storage and retrieval.
-   **AbstractVectorLabService** — Base class for domain-specific vector services. Adds lab-specific metadata enrichment, validation, metrics tracking, and filter expressions. `BehaviorVectorService` is the primary implementation for behavioral analysis data.

## VectorOperations

The core interface for all vector store interactions.

`public interface VectorOperations`

storeDocument(Document document) void

Stores a single document with its metadata and text content into the vector store.

storeDocuments(List<Document> documents) void

Batch stores multiple documents. Uses configurable batch sizes for large document sets.

searchSimilar(String query) List<Document>

Searches for documents similar to the query text using default topK and similarity threshold settings.

searchSimilar(String query, Map<String, Object> filters) List<Document>

Searches with metadata filters. Filter keys are matched with equality operators, lists use IN, and maps with "gte"/"lte" keys are treated as range filters.

searchSimilar(SearchRequest searchRequest) List<Document>

Advanced search with full control over topK, similarity threshold, and filter expressions via Spring AI's `SearchRequest`.

deleteDocuments(List<String> documentIds) void

Deletes documents by their IDs from the vector store.

## UnifiedVectorService

General-purpose implementation with cache integration through `VectorStoreCacheLayer`.

`public class UnifiedVectorService implements VectorOperations`

### Key Behaviors

-   Enriches documents with auto-generated `id`, `timestamp`, `documentType`, and `version` metadata.
-   Uses `VectorStoreCacheLayer` for search result caching. Cache is invalidated on write operations.
-   Batch inserts use the configured `batchSize` from `PgVectorStoreProperties`.
-   All write operations are `@Transactional`.

## AbstractVectorLabService

Base class for domain-specific vector services that adds lab-aware processing, metrics, enrichment, and validation.

`public abstract class AbstractVectorLabService implements VectorOperations`

### Abstract Methods (Must Implement)

getLabName() String

Returns the lab name used for metrics, logging, and metadata tagging.

getDocumentType() String

Returns the document type identifier stored in metadata.

enrichLabSpecificMetadata(Document document) Document

Enriches the document with domain-specific metadata. Called during preprocessing when enrichment is enabled.

validateLabSpecificDocument(Document document) void

Validates the document against domain-specific rules. Called during preprocessing when validation is enabled.

### Metrics Integration

When a `VectorStoreMetrics` bean is available, all operations (STORE, SEARCH, DELETE) are automatically tracked with operation counts, durations, and error rates per lab.

## BehaviorVectorService

Specialized vector service for storing and querying user behavioral analysis data. Used by the HCAD system for anomaly detection.

`public class BehaviorVectorService extends AbstractVectorLabService`

storeBehavior(BehavioralAnalysisContext context) void

Stores a user behavior pattern including user ID, IP address, session data, user agent, and activity details.

storeThreatPattern(BehavioralAnalysisContext context, BehavioralAnalysisResponse response) void

Stores a detected threat pattern for future similarity matching.

storeAnalysisResult(BehavioralAnalysisContext context, BehavioralAnalysisResponse response) void

Stores the result of a behavioral analysis for historical reference.

findSimilarBehaviors(String userId, String ip, String path, int topK) List<Document>

Finds behavior patterns similar to the given parameters. Filters by userId and lab name.

### Metadata Enrichment

Automatically adds temporal metadata (`hour`, `dayOfWeek`, `isWeekend`) and network metadata (`networkSegment` extracted from IP address) to each stored document.

## Configuration

```yaml
spring:
  ai:
    vectorstore:
      pgvector:
        index-type: HNSW
        distance-type: COSINE_DISTANCE
        dimensions: 384

contexa:
  rag:
    lab:
      batch-size: 100
      top-k: 10
      similarity-threshold: 0.7
      validation-enabled: true
      enrichment-enabled: true
```

## Code Examples

### Storing and Searching Documents

```java
// Store a security policy document
Document policyDoc = new Document(
        "Users must use MFA for admin operations",
        Map.of("documentType", "POLICY", "category", "auth"));

unifiedVectorService.storeDocument(policyDoc);

// Search for relevant context
List<Document> context = unifiedVectorService.searchSimilar(
        "multi-factor authentication requirements",
        Map.of("category", "auth"));
```

### Behavior Pattern Storage

```java
BehavioralAnalysisContext context = BehavioralAnalysisContext.builder()
        .userId("user-456")
        .remoteIp("10.0.1.55")
        .currentActivity("ADMIN_ACCESS")
        .userAgent("Mozilla/5.0")
        .build();

behaviorVectorService.storeBehavior(context);

// Find similar historical behaviors
List<Document> similar = behaviorVectorService
        .findSimilarBehaviors("user-456", "10.0.1.55", "/admin", 5);
```

## Related

[

### AI Pipeline

Uses vector operations during the CONTEXT\_RETRIEVAL step.

](../../../docs/reference/core/pipeline)[

### HCAD

Uses BehaviorVectorService for behavioral anomaly detection.

](/docs/reference/architecture/overview)

:::info
**Configuration Reference**
For RAG and vector store `application.yml` properties, see [AI Configuration](../../../docs/install/configuration/ai) — covers `ContexaRagProperties` (chunk sizes, similarity thresholds) and `PgVectorStoreProperties` (connection, dimensions, indexing).
:::

[Previous Model Providers](../../../docs/reference/core/model-provider) [Next Streaming](../../../docs/reference/core/streaming)