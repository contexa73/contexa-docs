---
title: "Quick Start"
---
# Quick Start

Get Contexa running in your Spring Boot application in 3 steps: add the dependency, enable AI security, and configure your environment.

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

:::info
**Transitive Dependencies** — The starter includes Spring Security, Spring AI, and all Contexa modules. You do not need to declare them individually unless you require a specific version override.
:::

## Enable AI Security

Annotate your main application class with `@EnableAISecurity`. This activates the Zero Trust configurer mechanism and registers the default `PlatformConfig` using the Identity DSL.

```java
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

## Configure Your Environment

Create or update your `application.yml` with the minimal required configuration for infrastructure mode, datasource, and LLM provider.

```yaml
contexa:
  infrastructure:
    mode: standalone

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/contexa
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

  ai:
    chat:
      model:
        priority: ollama

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

  jpa:
    database: POSTGRESQL
    hibernate:
      ddl-auto: update
```

:::info
**Model Priority** — The `spring.ai.chat.model.priority` property accepts a comma-separated list of providers. Contexa will attempt each provider in order, falling back to the next if unavailable. Supported values: `ollama`, `anthropic`, `openai`.
:::

## Protect Your First Method

With Contexa activated, you can apply AI-driven authorization to any service method using the `@Protectable` annotation. The Zero Trust engine evaluates each invocation through the HCAD pipeline and produces a `ZeroTrustAction` decision.

```java
@Service
public class OrderService {

    @Protectable(ownField="customerId", sync=true)
    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}
```

Attribute

Type

Default

Description

`ownerField`

`String`

`""`

Field name on the return type used to identify the resource owner for ownership-based authorization checks

`sync`

`boolean`

`false`

When `true`, the Zero Trust evaluation completes synchronously before the method returns — the user's request blocks until LLM analysis finishes, so choose this option carefully. When `false` (default), evaluation runs asynchronously and the method proceeds immediately.

## Zero Trust Actions

Every request evaluated by Contexa produces one of the following `ZeroTrustAction` decisions:

Action

HTTP Status

TTL

Behavior

`ALLOW`

200

1500s

Request proceeds normally

`BLOCK`

403

Permanent

Request is denied; user receives `ROLE_BLOCKED`

`CHALLENGE`

401

1800s

Additional authentication required (MFA); user receives `ROLE_MFA_REQUIRED`

`ESCALATE`

423

300s

Request held for manual review; user receives `ROLE_REVIEW_REQUIRED`

`PENDING_ANALYSIS`

503

0s

AI analysis in progress; request deferred until evaluation completes

## Verify Installation

Start your application and verify Contexa is active with the following methods:

### Method 1: Auto-Configuration Report

Run your application with the `--debug` flag to see which Contexa auto-configurations were applied:

```bash
./gradlew bootRun --args='--debug'
```

Look for `CoreInfrastructureAutoConfiguration`, `CoreLLMAutoConfiguration`, and `CoreHCADAutoConfiguration` in the positive matches section.

### Method 2: Actuator Health Endpoint

If Spring Boot Actuator is enabled, check the health endpoint:

```bash
curl http://localhost:8080/actuator/health
```

:::warning
**Database Required** — Contexa will fail to start if PostgreSQL is unreachable. Ensure your datasource configuration is correct and the database exists before launching the application.
:::

## Next Steps

[

### Spring Boot Integration

Configure the Identity DSL, customize authentication flows, and integrate with CustomDynamicAuthorizationManager.

](/docs/install/spring-boot)[

### Configuration Reference

Explore the complete property reference for fine-tuning Zero Trust, HCAD, and LLM behavior.

](/docs/install/configuration)

[Previous Overview](./) [Next Spring Boot Integration](spring-boot)