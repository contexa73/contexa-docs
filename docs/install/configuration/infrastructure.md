---
title: "Infrastructure Configuration"
---
# Infrastructure Configuration

Detailed property reference for Contexa's infrastructure layer — caching, Redis pub/sub and streams, Kafka event topics, and OpenTelemetry observability. These properties control how Contexa communicates with external systems in a distributed deployment.

## Contexa Core Properties (Summary)

The top-level `ContexaProperties` class (prefix `contexa`) contains the master switches for infrastructure mode, Redis, Kafka, and observability. These properties are fully documented on the [Configuration Overview](/docs/install/configuration#contexa-core-properties) page. Key infrastructure-related entries include:

Property

Type

Default

Description

`contexa.infrastructure`

`.mode`

`enum`

`STANDALONE`

`STANDALONE` (in-memory) or `DISTRIBUTED` (Redis/Kafka)

`.redis.enabled`

`boolean`

`true`

Enable Redis for distributed caching and pub/sub

`.kafka.enabled`

`boolean`

`true`

Enable Kafka for event streaming in distributed mode

`.observability.enabled`

`boolean`

`true`

Enable observability infrastructure

`.observability.open-telemetry-enabled`

`boolean`

`true`

Enable OpenTelemetry for distributed tracing

See the [Configuration Overview](../../../docs/install/configuration) for the complete `ContexaProperties` reference.

## Cache Properties

Properties under `contexa.cache`, bound to `ContexaCacheProperties`. Controls the multi-tier caching subsystem used throughout Contexa for identity, policy, and behavioral data. Supports local (Caffeine), Redis, and hybrid caching strategies with optional pub/sub-based cache invalidation.

### General Settings

Property

Type

Default

Description

`contexa.cache`

`.type`

`CacheType`

`REDIS`

`LOCAL`, `REDIS`, or `HYBRID` (L1 local + L2 Redis)

`.local.max-size`

`int`

`1000`

Max entries in the local (L1) cache

`.local.default-ttl-seconds`

`int`

`60`

Default TTL (seconds) for local cache entries

`.redis.default-ttl-seconds`

`int`

`300`

Default TTL (seconds) for Redis cache entries

`.redis.key-prefix`

`String`

`contexa:cache:`

Prefix for all Redis cache keys (namespace isolation)

`.pubsub.enabled`

`boolean`

`true`

Enable pub/sub cache invalidation across cluster nodes

`.pubsub.channel`

`String`

`contexa:cache:invalidation`

Pub/sub channel for cache invalidation broadcasts

### Domain-Specific TTL

Each cache domain can have independent TTL values for local and Redis tiers. This allows fine-grained control — for example, frequently changing policy data can use shorter TTLs while stable HCAD baseline data uses longer ones.

Property

Type

Default

Description

`contexa.cache.domains`

`.users`

`TtlConfig`

`local: 3600 / redis: 3600`

User identity and profile data

`.roles`

`TtlConfig`

`local: 14400 / redis: 14400`

Role definitions and permission mappings

`.permissions`

`TtlConfig`

`local: 28800 / redis: 28800`

Permission grants and access control entries

`.groups`

`TtlConfig`

`local: 14400 / redis: 14400`

Group membership and hierarchy data

`.policies`

`TtlConfig`

`local: 30 / redis: 300`

XACML/ABAC policy definitions (short local TTL)

`.soar`

`TtlConfig`

`local: 900 / redis: 900`

SOAR playbook and automated response data

`.hcad`

`TtlConfig`

`local: 86400 / redis: 86400`

HCAD behavioral baselines (long-lived profiles)

Each domain entry is a `TtlConfig` object with `local-ttl-seconds` and `redis-ttl-seconds` fields. Override any domain independently:

```yaml
contexa:
  cache:
    type: HYBRID
    local:
      max-size: 5000
      default-ttl-seconds: 120
    redis:
      default-ttl-seconds: 600
      key-prefix: "myapp:contexa:cache:"
    pubsub:
      enabled: true
      channel: "contexa:cache:invalidation"
    domains:
      users:
        local-ttl-seconds: 1800
        redis-ttl-seconds: 3600
      policies:
        local-ttl-seconds: 15
        redis-ttl-seconds: 60
      hcad:
        local-ttl-seconds: 43200
        redis-ttl-seconds: 86400
```

Related: [Caching Architecture Reference](/docs/reference/core/overview)

## Security Kafka Properties

Properties under `security.kafka`, bound to `SecurityKafkaProperties`. Configures Kafka topic names for Contexa's security event pipeline.

Property

Type

Default

Description

`security.kafka`

`.topic.dlq`

`String`

`security-events-dlq`

Dead-letter queue topic for failed event processing

```yaml
security:
  kafka:
    topic:
      dlq: "security-events-dlq"
```

Related: [Zero Trust Security Reference](/docs/reference/architecture/zero-trust-flow) | [SOAR Automation Reference](/docs/reference/soar/)

## OpenTelemetry Properties

Properties under `contexa.opentelemetry`, bound to `OpenTelemetryProperties`. Configures the OpenTelemetry integration for distributed tracing, metrics export, and observability.

Property

Type

Default

Description

`contexa.opentelemetry`

`.enabled`

`boolean`

`true`

Enable OpenTelemetry trace and metric export

`.service-name`

`String`

`contexa-core`

Service name in trace spans and metric labels

`.exporter-endpoint`

`String`

`http://localhost:4317`

OTLP exporter endpoint (gRPC; 4318 for HTTP)

`.sampling-probability`

`double`

`1.0`

Sampling probability (0.0–1.0); lower in production

```yaml
contexa:
  opentelemetry:
    enabled: true
    service-name: "my-application"
    exporter-endpoint: "http://otel-collector.monitoring:4317"
    sampling-probability: 0.1
```

Related: [Observability Reference](/docs/reference/core/overview)

## Full Configuration Example

A production-ready `application.yml` combining all infrastructure properties for a distributed deployment with Redis, Kafka, and an external OpenTelemetry collector.

```yaml
# Infrastructure configuration for Contexa distributed deployment
contexa:
  enabled: true
  infrastructure:
    mode: DISTRIBUTED
    redis:
      enabled: true
    kafka:
      enabled: true
    observability:
      enabled: true
      open-telemetry-enabled: true

  # Multi-tier caching
  cache:
    type: HYBRID
    local:
      max-size: 5000
      default-ttl-seconds: 120
    redis:
      default-ttl-seconds: 600
      key-prefix: "contexa:cache:"
    pubsub:
      enabled: true
      channel: "contexa:cache:invalidation"
    domains:
      users:
        local-ttl-seconds: 1800
        redis-ttl-seconds: 3600
      roles:
        local-ttl-seconds: 7200
        redis-ttl-seconds: 14400
      permissions:
        local-ttl-seconds: 14400
        redis-ttl-seconds: 28800
      groups:
        local-ttl-seconds: 7200
        redis-ttl-seconds: 14400
      policies:
        local-ttl-seconds: 15
        redis-ttl-seconds: 120
      soar:
        local-ttl-seconds: 900
        redis-ttl-seconds: 900
      hcad:
        local-ttl-seconds: 86400
        redis-ttl-seconds: 86400

  # OpenTelemetry
  opentelemetry:
    enabled: true
    service-name: "contexa-production"
    exporter-endpoint: "http://otel-collector.monitoring:4317"
    sampling-probability: 0.1

# Security event infrastructure - Kafka
security:
  kafka:
    topic:
      dlq: "security-events-dlq"
```

[Previous Configuration Overview](../../../docs/install/configuration) [Next Security Configuration](../../../docs/install/configuration/security)