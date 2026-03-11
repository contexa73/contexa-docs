---
title: "Installation Guide"
---
# Installation Guide

Complete setup instructions for Contexa AI Native Zero Trust Platform, covering prerequisites, dependency configuration, and both Standalone and Distributed deployment modes.

## Prerequisites

Before installing Contexa, ensure your environment meets the following requirements:

Requirement

Version

Purpose

**Java**

21+

Runtime (configured via Gradle toolchain)

**Spring Boot**

3.x

Application framework

**PostgreSQL**

15+ with pgvector

Identity store and vector embeddings

**Ollama**

Latest

Local LLM inference for AI security analysis

:::info
**Distributed mode only** — If you plan to use Distributed mode, you will also need **Redis** (for async security context) and **Kafka** (for event streaming).
:::

## Add the Starter Dependency

Add `spring-boot-starter-contexa` to your build file. This single dependency transitively includes all Contexa modules along with their auto-configuration.

```kotlin
dependencies {
    implementation("io.contexa:spring-boot-starter-contexa:0.1.0")
}
```

```groovy
dependencies {
    implementation 'io.contexa:spring-boot-starter-contexa:0.1.0'
}
```

```xml
<dependency>
    <groupId>io.contexa</groupId>
    <artifactId>spring-boot-starter-contexa</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Enable AI Security

Annotate your main application class with `@EnableAISecurity` to activate the Zero Trust configurer mechanism and register the default `PlatformConfig`.

```java
import io.contexa.contexacommon.annotation.EnableAISecurity;

@SpringBootApplication
@EnableAISecurity
public class MyApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

:::info
**What happens behind the scenes** — `@EnableAISecurity` imports `AiSecurityImportSelector`, which conditionally registers the AI security infrastructure. If no custom `PlatformConfig` bean exists, a default one is created via `IdentityDslRegistry`.
:::

## Database Setup

Contexa requires PostgreSQL with the **pgvector** extension for identity storage and vector embeddings used in AI security analysis.

```sql
-- Create the database
CREATE DATABASE identity;

-- Connect to the database and enable required extensions
\c identity

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

:::info
**Automatic schema creation** — All required tables are created automatically by Hibernate when `ddl-auto` is set to `update`. You do not need to run any additional migration scripts.
:::

## Ollama Setup

Contexa uses Ollama for local LLM inference. Install Ollama and pull the required models for chat and embedding.

```bash
# Install Ollama from https://ollama.ai

# Pull the chat model
ollama pull qwen2.5:7b

# Pull the embedding model
ollama pull mxbai-embed-large
```

:::warning
**Resource requirements** — The `qwen2.5:7b` model requires approximately 4.7 GB of disk space and at least 8 GB of RAM for inference. Ensure your system has sufficient resources before pulling the models.
:::

## Mode A: Standalone (Memory Mode)

Standalone mode is the **default** deployment mode. It uses `InMemoryAsyncSecurityContextProvider` and requires no additional infrastructure beyond PostgreSQL and Ollama.

:::info
**Best for** — Development environments, single-instance deployments, and getting started quickly. No Redis or Kafka required.
:::

Create or update your `application.yml` with the following configuration:

```yaml
contexa:
  infrastructure:
    mode: standalone

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/identity
    username: your_username
    password: your_password
    driver-class-name: org.postgresql.Driver

  jpa:
    database: POSTGRESQL
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: update

  ai:
    ollama:
      base-url: http://127.0.0.1:11434
      embedding:
        enabled: true
        model: mxbai-embed-large
      chat:
        options:
          model: qwen2.5:7b
          keep-alive: "24h"

    vectorstore:
      pgvector:
        table-name: vector_store
        index-type: HNSW
        distance-type: COSINE_DISTANCE
        dimensions: 1536
        initialize-schema: true

  auth:
    token-transport-type: header_cookie
    oauth2-csrf: false
```

## Mode B: Distributed

Distributed mode uses `RedisAsyncSecurityContextProvider` for shared security context across multiple application instances, and Kafka for event streaming.

:::warning
**Additional infrastructure required** — Distributed mode requires **Redis** (default: `localhost:6379`) and **Kafka** (default: `localhost:9092`) in addition to the base prerequisites.
:::

Add the following configuration on top of the standalone settings:

```yaml
contexa:
  infrastructure:
    mode: distributed
    redis:
      enabled: true
    kafka:
      enabled: true

spring:
  data:
    redis:
      host: localhost
      port: 6379
      timeout: 200000
      lettuce:
        pool:
          max-active: 8
          max-idle: 8

  cache:
    type: redis
    redis:
      time-to-live: 3600000

  kafka:
    bootstrap-servers: localhost:9092
```

:::info
**Merge with standalone config** — The distributed configuration is additive. Keep all the datasource, JPA, AI, and auth settings from the standalone configuration and add the Redis/Kafka sections shown above.
:::

## Verification

After starting your application, verify that Contexa has been properly configured using one of the following methods.

### Method 1: Debug Logging

Run your application with the `--debug` flag and look for `CoreInfrastructureAutoConfiguration` in the positive matches section of the auto-configuration report.

```bash
./gradlew bootRun --args='--debug'

# Look for in the output:
# Positive matches:
#   CoreInfrastructureAutoConfiguration matched
```

### Method 2: Actuator Health Endpoint

If Spring Boot Actuator is enabled, check the health endpoint to confirm the application is running correctly.

```bash
curl http://localhost:8080/actuator/health
```

## Troubleshooting

Common issues encountered during installation and their solutions.

Problem

Cause

Solution

PostgreSQL connection refused

Database not running or incorrect credentials

Verify the datasource URL, username/password, and check `pg_hba.conf` for client authentication settings.

Ollama connection refused

Ollama service not running

Start Ollama with `ollama serve` and verify it is listening on port **11434**.

pgvector extension not found

Extension not installed on PostgreSQL

Run `CREATE EXTENSION IF NOT EXISTS vector;` in your database. You may need to install the pgvector package first.

Port conflicts

Another process using a required port

Default ports: PostgreSQL **5432**, Redis **6379**, Kafka **9092**, Ollama **11434**. Check for conflicts with `netstat` or `lsof`.

Redis connection refused (distributed mode)

Redis not running or wrong host/port

Start Redis and verify it is accessible at the configured host and port.

:::info
**Need more help?** — Check the [Configuration Reference](./configuration) for a complete list of all available properties, or visit the [GitHub Discussions](https://github.com/contexa-security/contexa/discussions) for community support.
:::

[Previous Quick Start](quickstart) [Next Spring Boot Integration](spring-boot)