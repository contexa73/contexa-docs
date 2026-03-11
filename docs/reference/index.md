---
title: "API Reference"
---
[Home](/) / Reference

# API Reference

Complete API documentation for every module in the Contexa platform. Each section covers the public interfaces, classes, configuration properties, and code examples you need to integrate Contexa into your Spring Boot application.

## Core

The foundation module providing AI lab orchestration, LLM integration, pipeline execution, model management, RAG operations, streaming, advisor system, and strategy patterns.

[

### AI Lab

Generic lab abstraction for AI workloads. Synchronous, asynchronous, and streaming processing through the `AILab` interface and `AbstractAILab` base class.

](/docs/reference/core/ai-lab)[

### LLM Orchestrator

Unified LLM client with tiered model selection, tool calling, and automatic advisor integration via `UnifiedLLMOrchestrator`.

](/docs/reference/core/llm-orchestrator)[

### AI Pipeline

Configurable multi-step pipeline from context retrieval through LLM execution to response parsing via `PipelineOrchestrator`.

](/docs/reference/core/pipeline)[

### Model Providers

Dynamic model registry supporting Ollama, Anthropic, and OpenAI with priority-based selection through `DynamicModelRegistry`.

](/docs/reference/core/model-provider)[

### RAG & Vectors

Vector storage and similarity search with PgVector integration, cache layers, and domain-specific vector services.

](/docs/reference/core/rag)[

### Streaming

Server-Sent Events streaming with sentence buffering, JSON extraction, and chunk processing via `StandardStreamingService`.

](/docs/reference/core/streaming)[

### Advisor System

Spring AI Advisor registry with domain-based organization, enabling/disabling, and security context injection.

](/docs/reference/core/advisor)[

### AI Strategy

DiagnosisType-based strategy routing with distributed execution, quality gates, and fallback mechanisms.

](/docs/reference/core/strategy)

## Security

AI-driven zero trust security layer providing real-time threat evaluation, behavioral anomaly detection (HCAD), autonomous blocking, shadow mode migration, and a comprehensive event system.

[

### Zero Trust

Core zero trust engine with AI-powered request evaluation and autonomous security decisions.

](/docs/reference/security/zero-trust)[

### Threat Evaluation

Real-time threat scoring, risk assessment, and multi-factor threat analysis.

](/docs/reference/security/threat-evaluation)[

### HCAD

Hierarchical Contextual Anomaly Detection for behavioral pattern analysis.

](/docs/reference/security/hcad)[

### Event System

Security event publishing, subscription, and audit trail infrastructure.

](/docs/reference/security/event-system)[

### Blocking

Autonomous blocking actions with configurable thresholds and escalation policies.

](/docs/reference/security/blocking)[

### Shadow Mode

Four-stage migration path from monitoring-only to full autonomous enforcement.

](/docs/reference/security/shadow-mode)

## Identity

Identity management with a fluent DSL for authentication flows, adaptive multi-factor authentication, ASEP annotations, zero trust filter chains, and session state management.

[

### Identity DSL

Fluent builder API for defining authentication and authorization flows.

](/docs/reference/identity/dsl)[

### Authentication

Authentication providers, token management, and session handling.

](/docs/reference/identity/authentication)[

### Adaptive MFA

Risk-based multi-factor authentication with TOTP, passkey, and OTT support.

](/docs/reference/identity/mfa)[

### ASEP Annotations

AI Security Enforcement Point annotations for declarative security policies.

](/docs/reference/identity/asep)[

### State Management

Session state tracking, Redis-backed persistence, and state transitions.

](/docs/reference/identity/state-management)[

### Zero Trust Filters

Servlet filter chain integration for zero trust request interception.

](/docs/reference/identity/dsl)

## IAM

Identity and Access Management with XACML-based policy evaluation, the `@Protectable` annotation, resource scanning, permission evaluation, policy authoring, and an admin dashboard.

[

### @Protectable

Method-level authorization annotation with XACML policy enforcement.

](/docs/reference/iam/protectable)[

### XACML Engine

Full XACML 3.0 policy engine with PDP, PEP, PIP, PAP, and PRP components.

](/docs/reference/iam/xacml)[

### Permission Evaluators

Pluggable permission evaluation with role hierarchy and attribute-based access.

](/docs/reference/iam/permission-evaluators)[

### Policy Management

Policy CRUD, versioning, conflict resolution, and AI-assisted policy authoring.

](/docs/reference/iam/policy)[

### Resource Scanner

Automatic discovery and registration of protectable resources at startup.

](/docs/reference/iam/resource-scanner)[

### Admin Dashboard

Web-based administration interface for users, roles, groups, and policies.

](/docs/reference/iam/admin)