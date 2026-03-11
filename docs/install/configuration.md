---
title: "Configuration Properties"
---
# Configuration Properties

Complete reference for all Contexa configuration properties. All properties are set in `application.yml` and bound through Spring Boot's `@ConfigurationProperties` mechanism. Properties are organized into 5 categories below.

## Configuration Categories

Contexa provides 17 `@ConfigurationProperties` classes across all modules. Select a category to view the full property reference.

[

### Infrastructure

ContexaProperties, Cache, Redis, Kafka, OpenTelemetry

5 Properties classes

](configuration/infrastructure)[

### Security

ZeroTrust, HCAD, Session, SecurityPlane, Kafka

5 Properties classes

](configuration/security)[

### AI Engine

Tiered LLM, Tiered Strategy, Advisor, RAG, Streaming

5 Properties classes

](configuration/ai)[

### Identity

Authentication Context, MFA, State Machine

2 Properties classes (55+ fields)

](configuration/identity)[

### IAM

Admin Console

1 Properties class (policies managed via Admin UI)

](configuration/iam)

## Essential Properties

The most important properties to configure when starting with Contexa:

Property

Default

Description

`contexa.enabled`

`true`

Master switch for the entire Contexa platform

`contexa.infrastructure.mode`

`STANDALONE`

`STANDALONE` (in-memory) or `DISTRIBUTED` (Redis + Kafka)

`contexa.llm.enabled`

`true`

Enable LLM integration for AI-driven security decisions

`security.zerotrust.enabled`

`true`

Enable zero-trust continuous verification

`spring.auth.state-type`

`OAUTH2`

State management: `SESSION` or `OAUTH2`

`spring.ai.chat.model.priority`

—

LLM provider priority (e.g., `ollama,anthropic,openai`)

## Minimal Configuration

A minimal `application.yml` to get started with Contexa in standalone mode:

```yaml
contexa:
  enabled: true
  infrastructure:
    mode: standalone
  llm:
    enabled: true
    tiered-enabled: true

security:
  zerotrust:
    enabled: true

spring:
  auth:
    state-type: SESSION
  ai:
    chat:
      model:
        priority: ollama
    ollama:
      base-url: http://127.0.0.1:11434
      chat:
        options:
          model: qwen2.5:7b
```

## Contexa Core Properties

Top-level properties under the `contexa` prefix, bound to `ContexaProperties`.

Property

Type

Default

Description

`contexa`

`.enabled`

`boolean`

`true`

Master switch to enable or disable the entire Contexa platform

`.infrastructure.mode`

`enum`

`STANDALONE`

Infrastructure mode: `STANDALONE` (in-memory) or `DISTRIBUTED` (Redis, Kafka)

`.infrastructure.redis.enabled`

`boolean`

`true`

Enable Redis integration for distributed caching

`.infrastructure.redis.redisson-enabled`

`boolean`

`false`

Enable Redisson client for advanced distributed data structures

`.infrastructure.kafka.enabled`

`boolean`

`true`

Enable Kafka integration for event streaming (distributed mode)

`.infrastructure.observability.enabled`

`boolean`

`true`

Enable observability infrastructure

`.infrastructure.observability.open-telemetry-enabled`

`boolean`

`true`

Enable OpenTelemetry integration for distributed tracing

## LLM Properties

Property

Type

Default

Description

`contexa.llm`

`.enabled`

`boolean`

`true`

Enable LLM integration for AI-driven security decisions

`.tiered-enabled`

`boolean`

`true`

Enable 2-tier LLM system (lightweight Layer 1 + expert Layer 2)

`.advisor-enabled`

`boolean`

`true`

Enable the AI advisor system for security recommendations

`.pipeline-enabled`

`boolean`

`true`

Enable the AI pipeline for request processing

### Spring AI Provider Configuration

LLM providers are configured using standard Spring AI properties.

Property

Type

Description

`spring.ai`

`.chat.model.priority`

`String`

Comma-separated LLM provider priority list (e.g., `ollama,anthropic,openai`)

`.ollama.base-url`

`String`

Ollama server URL (e.g., `http://127.0.0.1:11434`)

`.ollama.chat.options.model`

`String`

Ollama chat model name (e.g., `qwen2.5:7b`)

`.ollama.chat.options.keep-alive`

`String`

Model keep-alive duration (e.g., `24h`)

`.ollama.embedding.enabled`

`boolean`

Enable Ollama embedding model

`.ollama.embedding.model`

`String`

Ollama embedding model name (e.g., `mxbai-embed-large`)

`.anthropic.api-key`

`String`

Anthropic API key

`.anthropic.chat.options.model`

`String`

Anthropic model name (e.g., `claude-sonnet-4-20250514`)

`.openai.api-key`

`String`

OpenAI API key

`.chat.embedding.model.priority`

`String`

Comma-separated embedding provider priority list

## Vector Store Properties

Property

Type

Default

Description

`contexa.rag`

`.enabled`

`boolean`

`true`

Enable RAG (Retrieval Augmented Generation) subsystem

`.vector-store.type`

`String`

`pgvector`

Vector store backend type

`.vector-store.default-top-k`

`int`

`5`

Default number of results for similarity search

`.vector-store.default-similarity-threshold`

`double`

`0.7`

Minimum similarity score to include results

`spring.ai.vectorstore.pgvector`

`.table-name`

`String`

`vector_store`

PostgreSQL table name for vector storage

`.index-type`

`String`

`HNSW`

Vector index type (`HNSW` recommended)

`.distance-type`

`String`

`COSINE_DISTANCE`

Distance metric: `COSINE_DISTANCE`, `EUCLIDEAN_DISTANCE`, `NEGATIVE_INNER_PRODUCT`

`.dimensions`

`int`

`1536`

Vector embedding dimensions (must match the embedding model)

`.initialize-schema`

`boolean`

`true`

Auto-create the vector store table on startup

`.max-document-batch-size`

`int`

`10000`

Maximum batch size for document insertion

## Zero Trust Properties

Properties under `security.zerotrust`, bound to `SecurityZeroTrustProperties`.

Property

Type

Default

Description

`security.zerotrust`

`.enabled`

`boolean`

`true`

Enable Zero Trust evaluation engine

`.threat.initial`

`double`

`0.3`

Initial threat score assigned to new sessions

`.cache.ttl-hours`

`int`

`24`

Trust evaluation cache TTL in hours

`.cache.session-ttl-minutes`

`int`

`30`

Session cache TTL in minutes

`.cache.invalidated-ttl-minutes`

`int`

`60`

Invalidated session cache TTL in minutes

`.redis.timeout`

`int`

`5`

Redis operation timeout in seconds

`.redis.update-interval-seconds`

`int`

`30`

Interval for syncing trust scores to Redis

`.session.tracking-enabled`

`boolean`

`true`

Enable AI-driven session tracking

## HCAD Properties

Hierarchical Context-Aware Detection properties under `hcad`, bound to `HcadProperties`.

Property

Type

Default

Description

`hcad`

`.enabled`

`boolean`

`false`

Enable the HCAD anomaly detection engine

`.filter-order`

`int`

`0`

Order of the HCAD filter in the security filter chain

`.baseline.learning.enabled`

`boolean`

`true`

Enable continuous baseline learning

## Autonomous Security Properties

Property

Type

Default

Description

`contexa.autonomous`

`.enabled`

`boolean`

`true`

Enable autonomous security response system

`.strategy-mode`

`String`

`dynamic`

Strategy selection mode for autonomous decisions

`.event-timeout`

`long`

`30000`

Timeout for autonomous event processing in milliseconds

## Session Security Properties

Properties under `security.session`, bound to `SecuritySessionProperties`.

Property

Type

Default

Description

`security.session`

`.cookie.name`

`String`

`SESSION`

Session cookie name

`.header.name`

`String`

`X-Auth-Token`

Session header name for token-based sessions

`.bearer.enabled`

`boolean`

`true`

Enable bearer token session resolution

## Full Configuration Example

A complete `application.yml` showing all major configuration sections:

```yaml
contexa:
  enabled: true
  infrastructure:
    mode: standalone
    redis:
      enabled: true
    kafka:
      enabled: false
    observability:
      enabled: true
      open-telemetry-enabled: true

  hcad:
    enabled: true
    similarity:
      hot-path-threshold: 0.7
    baseline:
      min-samples: 10
      auto-learning: true

  llm:
    enabled: true
    tiered-enabled: true
    advisor-enabled: true
    pipeline-enabled: true

  rag:
    enabled: true
    vector-store:
      type: pgvector
      default-top-k: 5
      default-similarity-threshold: 0.7

  autonomous:
    enabled: true
    strategy-mode: dynamic
    event-timeout: 30000

hcad:
  enabled: true
  baseline:
    learning:
      enabled: true

security:
  zerotrust:
    enabled: true
    threat:
      initial: 0.3
    cache:
      ttl-hours: 24
      session-ttl-minutes: 30
    redis:
      timeout: 5
      update-interval-seconds: 30
    session:
      tracking-enabled: true

  session:
    cookie:
      name: SESSION
    header:
      name: X-Auth-Token
    bearer:
      enabled: true

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/contexa
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

  ai:
    chat:
      model:
        priority: ollama,anthropic,openai
    ollama:
      base-url: http://127.0.0.1:11434
      chat:
        options:
          model: qwen2.5:7b
          keep-alive: "24h"
      embedding:
        enabled: true
        model: mxbai-embed-large
    vectorstore:
      pgvector:
        table-name: vector_store
        index-type: HNSW
        distance-type: COSINE_DISTANCE
        dimensions: 1536
        initialize-schema: true

  data:
    redis:
      host: localhost
      port: 6379
      timeout: 200000

  jpa:
    database: POSTGRESQL
    hibernate:
      ddl-auto: update
```

[Previous Spring Boot Integration](spring-boot) [Next Shadow Mode](shadow-mode)