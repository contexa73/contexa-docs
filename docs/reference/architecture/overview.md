---
title: "Platform Architecture"
---
# Platform Architecture

Understand how Contexa's modules work together to provide AI-driven zero trust security for Spring Boot applications — from HTTP request entry through AI threat analysis to final access decisions.

## Platform Overview

Contexa is an **AI Native Zero Trust** security platform for Spring Boot. Rather than relying solely on perimeter-based security, Contexa provides **continuous verification after authentication** through AI-driven security decisions. Every request is evaluated in real time by an AI engine that considers session context, behavioral patterns, and threat intelligence.

The platform is composed of four core modules, each handling a distinct security concern, plus auto-configuration and starter support for seamless Spring Boot integration.

AI

### contexa-core AI Engine

The AI-powered security brain of the platform. Communicates with LLMs to make autonomous security decisions.

-   LLM communication and orchestration
-   Risk analysis and threat evaluation
-   HCAD anomaly detection
-   SecurityPlaneAgent with tiered analysis
-   Autonomous event pipeline with handler chain
-   RAG-based context retrieval
-   Behavioral embeddings

ID

### contexa-identity Authentication

Manages all authentication flows with a custom DSL built on top of Spring Security.

-   Form login and REST API authentication
-   Adaptive MFA, passkey/WebAuthn, OTT
-   OAuth2 integration
-   Zero-trust challenge filters
-   Custom security DSL configuration

AC

### contexa-iam Authorization

Dynamic policy-based access control using XACML with AI-driven method-level security.

-   XACML engine (PAP/PDP/PEP/PIP/PRP)
-   `@Protectable` annotation for AI-driven method security
-   Admin console for policy management
-   SpEL-based dynamic URL authorization
-   Resource scanning and discovery

CM

### contexa-common Shared

Common entities, services, and domain models shared across all modules.

-   Shared entity models
-   Cache service abstraction
-   Central audit facade
-   Common annotations
-   Domain value objects

Additionally, **contexa-autoconfigure** provides 38 auto-configuration classes that wire everything together for Spring Boot, and **spring-boot-starter-contexa** is the single starter dependency that includes all modules plus a demo application.

## Request Processing Flow

Contexa processes every HTTP request through two distinct pipelines: a **synchronous filter chain** that runs on every request, and an **asynchronous AI pipeline** that analyzes events in the background. AI decisions are stored in Redis and enforced on the *next* request — this non-blocking design ensures zero latency impact on normal traffic.

### Synchronous Filter Chain

The Spring Security filter chain processes every HTTP request in order. Filters inspect, gate, or enrich the request but never call the LLM directly.

HTTP Request

HCADFilter Host & Context Anomaly Detection — extracts session, device, behavioral signals and sets request attributes. Never blocks.

ZeroTrustAccessControlFilter Reads ZeroTrustAction from Redis for this user — enforces decisions made by the async AI pipeline on a *previous* request.

ALLOW → continue BLOCK → 403 ESCALATE → 423 PENDING → wrap response

ZeroTrustChallengeFilter If CHALLENGE authority detected → initiate MFA challenge

CustomDynamicAuthorizationManager URL-level authorization — evaluates policies from DB as SpEL expressions

AuthorizationManagerMethodInterceptor AOP interceptor — intercepts `@Protectable` method calls *before* execution. Evaluates access decision.

GRANTED DENIED

ZeroTrustEventPublisher Called via `publishMethodAuthorization()` — publishes via Spring `ApplicationEventPublisher` ZeroTrustSpringEvent

@Protectable Method Execution The actual annotated method executes only if authorization was granted by the interceptor above.

Application Logic

### Asynchronous AI Pipeline

`ZeroTrustEventListener` receives the `ZeroTrustSpringEvent` synchronously via `@EventListener`, acting as the bridge into the asynchronous processing pipeline. The AI evaluates threats in the background and stores its decision in Redis, which is enforced by `ZeroTrustAccessControlFilter` on the user's *next* request.

ZeroTrustEventListener (@EventListener) ZeroTrustSpringEvent Receives event synchronously — bridges sync and async. Routes to SecurityEventPublisher (Kafka or in-memory).

SecurityPlaneAgent Orchestrates batch processing via SecurityEventProcessor

ColdPathEventProcessor AI analysis entry point — orchestrates Layer1/Layer2 tiered analysis with context collection

Layer1ContextualStrategy

Session context + RAG + behavior analysis

/

Layer2ExpertStrategy

Extended forensics + SOAR integration

SecurityPromptTemplate

UnifiedLLMOrchestrator Spring AI ChatClient — model selection, advisor chain, retry logic ExecutionContext

ALLOW BLOCK CHALLENGE ESCALATE

SecurityDecisionEnforcementHandler (order=55) Saves ZeroTrustAction to Redis. On BLOCK: broadcasts via Redisson RTopic. Skipped in SHADOW mode.

Stored in `ZeroTrustActionRepository` (Redis or in-memory) → **enforced on next request**

### Zero Trust Enforcement (Next Request)

Everything above — synchronous event publication, asynchronous AI analysis, LLM decisions — **converges here**. Every subsequent request from this user is now governed by the AI's verdict. The decision is not a suggestion; it is fused into Spring Security's `Authentication` itself.

Every User Request Every HTTP request passes through this pipeline — not just the next one. The AI decision persists until a new analysis overrides it.

AISessionSecurityContextRepository

Session-based login

/

AIOAuth2ZeroTrustFilter

JWT / OAuth2

Spring SecurityContext Loading

ZeroTrustSecurityService Reads `ZeroTrustAction` from Redis → replaces `Authentication` with `ZeroTrustAuthenticationToken` AI Decision → Spring Security Authority

Action already assigned to this user

ALLOW BLOCK CHALLENGE ESCALATE

This action governs **every request** until a new AI analysis overrides it

ZeroTrustAccessControlFilter **BLOCK** → 403 Forbidden, session invalidated, cross-instance broadcast
**ESCALATE** → 423 Locked, Retry-After: 30s, auto-promotes to BLOCK on TTL expiry
**PENDING** → wraps response with `BlockableResponseWrapper` for mid-stream termination

ZeroTrustChallengeFilter **CHALLENGE** → initiates MFA via `ChallengeMfaInitializer`
Max 2 attempts in 1hr window — failure auto-promotes to BLOCK

**ALLOW** → request reaches application code  |  all others → blocked before reaching controller

For detailed enforcement mechanics including `BlockableResponseWrapper`, `BlockingSignalBroadcaster`, and cross-instance propagation, see [Zero Trust Flow — Enforcement Infrastructure](zero-trust-flow#enforcement-infrastructure).

## Module Dependencies

The modules form a layered dependency graph. Higher-level modules depend on the core AI engine and shared infrastructure, while the starter aggregates everything.

spring-boot-starter-contexa | +-- contexa-autoconfigure | | | +-- contexa-identity | | +-- contexa-core | | +-- contexa-common | | | +-- contexa-iam | | +-- contexa-core | | +-- contexa-common | | | +-- contexa-core | +-- contexa-common | +-- contexa-identity +-- contexa-iam +-- contexa-core +-- contexa-common

Module

Depends On

`contexa-identity`

`contexa-core`, `contexa-common`

`contexa-iam`

`contexa-core`, `contexa-common`

`contexa-core`

`contexa-common`

`contexa-autoconfigure`

All modules

`spring-boot-starter-contexa`

All modules

## Infrastructure Modes

Contexa supports two infrastructure modes, allowing you to start with a zero-dependency setup for development and scale to a distributed architecture for production.

### STANDALONE

In-memory implementations for all services. Zero external dependencies — ideal for development, testing, and rapid prototyping.

`contexa.infrastructure.mode=STANDALONE`

-   In-memory ZeroTrustAction storage
-   In-memory cache service
-   In-memory event bus
-   No Redis or Kafka required

### DISTRIBUTED

Redis + Kafka backed services for production deployments. Supports horizontal scaling and multi-instance coordination.

`contexa.infrastructure.mode=DISTRIBUTED`

-   Redis-backed ZeroTrustAction storage
-   Redis cache with TTL management
-   Kafka event streaming
-   Cluster-aware session management

## Shadow Mode

Contexa supports a **Shadow Mode** for safe, progressive adoption. Controlled by a single property, `security.zerotrust.mode`, it determines whether AI decisions are enforced or only logged.

### SHADOW

The full AI pipeline runs — HCAD analysis, tiered LLM evaluation, risk scoring — but `SecurityDecisionEnforcementHandler` skips enforcement via `canHandle()`. No actions are saved to Redis. All AI decisions are recorded in audit logs only.

`security.zerotrust.mode: SHADOW`

### ENFORCE

Default mode. AI decisions are saved to Redis by `SecurityDecisionEnforcementHandler` and enforced by `ZeroTrustAccessControlFilter` on subsequent requests. Full enforcement with BLOCK, CHALLENGE, ESCALATE actions active.

`security.zerotrust.mode: ENFORCE`

See [Shadow Mode Migration Guide](../../../docs/install/shadow-mode) for a detailed walkthrough of the recommended adoption timeline and rollback strategy.

## AI Integration Points

AI and LLM capabilities are deeply integrated throughout the platform. The following are the primary points where AI-driven decisions are made.

1.  1

    **Zero-Trust Threat Evaluation** SecurityPlaneAgent uses a tiered LLM strategy — Layer 1 for fast contextual analysis, Layer 2 for deep expert investigation — to evaluate every suspicious request and produce a ZeroTrustAction.

2.  2

    **@Protectable Method Authorization** Methods annotated with `@Protectable` trigger AI-driven authorization decisions at the method level, going beyond static role checks to evaluate request context dynamically.

3.  3

    **HCAD Baseline Learning & Anomaly Scoring** The Host & Context Anomaly Detection system learns normal behavioral baselines and scores each request for deviation, feeding anomaly data into the threat evaluation pipeline.

4.  4

    **Adaptive MFA Policy Decisions** AIAdaptiveMfaPolicyProvider uses AI analysis to determine when additional authentication factors should be required, adapting challenge strength based on risk context.

5.  5

    **AI-Generated XACML Policies** The platform can generate and suggest XACML access control policies using AI, reducing the manual effort of policy authoring while maintaining fine-grained control.

6.  6

    **Behavior Analytics** Behavioral embeddings capture user interaction patterns as vectors, enabling the AI engine to detect subtle anomalies that rule-based systems would miss.

7.  7

    **SOAR Orchestration** Layer 2 Expert Investigation integrates with SOAR workflows via SoarApprovalNotifier. High-risk decisions can require human approval before enforcement, bridging automated analysis with operational oversight.

8.  8

    **Central Audit Logging** Every AI decision is recorded by AuditingHandler through CentralAuditFacade — regardless of whether enforcement is active (ENFORCE mode) or observation-only (SHADOW mode). Provides a complete audit trail for compliance and forensics.


[Previous Quick Start](../../../docs/install/quickstart) [Next Zero Trust Engine](/docs/reference/architecture/zero-trust-flow)