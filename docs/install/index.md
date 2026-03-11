---
title: "Installation Overview"
---
# Installation Overview

Contexa is an AI Native Zero Trust Security platform that integrates with Spring Boot applications. This guide covers the prerequisites, module architecture, and installation pathways.

## Prerequisites

Before installing Contexa, ensure your environment meets the following requirements:

Requirement

Minimum Version

Notes

Java

17+

LTS releases recommended (17 or 21)

Spring Boot

3.2+

Spring Boot 3.x with Jakarta EE namespace

Spring Security

6.2+

Included transitively via Spring Boot Starter

PostgreSQL

14+

Required for identity store and pgvector

Redis

7.0+

Required for distributed caching and session management

:::info
**LLM Requirement** — Contexa requires at least one LLM provider. The platform supports Ollama (local), Anthropic, and OpenAI. For standalone development, Ollama with a lightweight model such as `qwen2.5:7b` is sufficient.
:::

## Module Architecture

Contexa is composed of modular layers, each responsible for a distinct security domain. The Spring Boot Starter aggregates all modules into a single dependency.

Module

Artifact

Responsibility

**Starter**

`spring-boot-starter-contexa`

Aggregator dependency; includes all modules and auto-configuration

**Common**

`contexa-common`

Shared annotations (`@EnableAISecurity`, `@Protectable`), enums, entity models, and cache abstractions

**Core**

`contexa-core`

AI pipeline, LLM orchestration, HCAD engine, Zero Trust evaluation, RAG and vector store integration

**Identity**

`contexa-identity`

Identity DSL, authentication flows (form, REST, OTT, passkey), adaptive MFA, session management

**IAM**

`contexa-iam`

XACML policy engine, `@Protectable` method interception, dynamic authorization, admin dashboard

**Auto-Configure**

`contexa-autoconfigure`

Spring Boot auto-configuration for all modules; conditional bean registration based on classpath and properties

## Infrastructure Modes

Contexa supports two infrastructure modes that control how internal components (caching, event processing, data stores) are provisioned:

### Standalone Mode Default

All components run in-process with in-memory implementations. Suitable for development, testing, and single-instance deployments. No external infrastructure beyond PostgreSQL is required.

### Distributed Mode

Components use Redis for distributed caching, Kafka for event streaming, and external observability pipelines. Required for multi-instance production deployments with horizontal scaling.

## Installation Pathways

Choose the path that best fits your needs:

[

### Quick Start

Get Contexa running in 5 minutes with a minimal configuration. Best for initial evaluation.

](/docs/install/quickstart)[

### Spring Boot Integration

Deep dive into the Identity DSL, security configuration, and authentication flow composition.

](/docs/install/spring-boot)[

### Configuration Reference

Complete property reference for all Contexa modules, including Zero Trust, HCAD, and LLM settings.

](/docs/install/configuration)[

### Shadow Mode Migration

Safely adopt AI-driven security with a progressive 4-stage migration strategy.

](/docs/install/shadow-mode)

## Dependency Coordinates

All Contexa artifacts are published under the `io.contexa` group. The starter dependency is the recommended entry point:

```kotlin
implementation("io.contexa:spring-boot-starter-contexa:0.1.0")
```

```xml
<dependency>
    <groupId>io.contexa</groupId>
    <artifactId>spring-boot-starter-contexa</artifactId>
    <version>0.1.0</version>
</dependency>
```

[Next Quick Start](quickstart)