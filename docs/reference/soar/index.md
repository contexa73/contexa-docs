---
title: "SOAR Overview"
---
contexa-core Enterprise

# SOAR Overview

Security Orchestration, Automation and Response (SOAR). An AI-driven incident response system that processes security incidents through a tool-execution pipeline with configurable approval workflows and execution modes.

## Overview

Contexa SOAR bridges the gap between AI-driven threat detection and automated incident response. When the tiered evaluation pipeline produces a critical security decision (e.g., Layer 2 detects a BLOCK\-worthy threat), the SOAR system orchestrates the response: selecting appropriate tools, managing approval workflows, executing response actions, and maintaining audit trails.

The SOAR architecture follows the AI Lab pattern: a `SoarLab` receives a `SoarRequest` containing the incident context, processes it through the LLM-powered pipeline, determines which `@SoarTool`\-annotated methods to invoke, and manages the approval flow before execution.

Security Incident

SoarRequest

SoarLab

Tool Selection

Approval Workflow

Tool Execution

SoarResponse

## SoarLab

The SOAR processing lab. Implements the AI Lab interface to provide reactive incident processing.

`public interface SoarLab`

processAsync Mono<?>

Processes a SOAR request through the AI pipeline asynchronously. Analyzes the incident, selects appropriate tools, manages approval workflows, and executes the response plan.

request SoarRequest The SOAR request containing incident context and processing parameters.

## SoarContext

The rich context object that tracks the full lifecycle of a SOAR session. Extends `DomainContext` and maintains incident details, session state, conversation history, approval requests, tool execution results, and LLM interaction state.

`public class SoarContext extends DomainContext`

Field

Type

Description

`incidentId`

String

Unique identifier for the security incident.

`threatType`

String

Classification of the threat (e.g., "UNAUTHORIZED\_ACCESS").

`severity`

String

Incident severity level.

`description`

String

Human-readable incident description.

`affectedAssets`

List<String>

List of affected system assets.

`currentStatus`

String

Current incident status.

`organizationId`

String

The organization context.

`sessionState`

SessionState

Current session lifecycle state (NEW, INITIALIZED, ACTIVE, ANALYZING, INVESTIGATING, WAITING\_APPROVAL, EXECUTING, etc.).

`executionMode`

SoarExecutionMode

How the SOAR pipeline processes this context (SYNC, ASYNC, AUTO).

`threatLevel`

ThreatLevel

Assessed threat level (CRITICAL, HIGH, MEDIUM, LOW, INFO, UNKNOWN).

`riskScore`

double

Numeric risk assessment.

`conversationHistory`

List<Message>

Full LLM conversation history for this session.

`approvalRequests`

List<ApprovalRequest>

All approval requests generated during processing.

`approvedTools`

Set<String>

Tools that have been approved for execution.

`humanApprovalNeeded`

boolean

Whether human approval is currently required.

`emergencyMode`

boolean

Whether emergency mode is active (bypasses normal approval flows).

transitionTo void

Transitions the session to a new state.

approveTool void

Marks a tool as approved for execution in this session.

addToolExecutionResult void

Records the result of a tool execution for audit and context tracking.

## SoarRequest

The request object that initiates SOAR processing. Extends `AIRequest<SoarContext>` and wraps the context with template and diagnosis type configuration.

`public class SoarRequest extends AIRequest<SoarContext>`

```java
SoarRequest request = SoarRequest.builder()
    .context(soarContext)
    .incidentId("INC-2024-001")
    .threatType("UNAUTHORIZED_ACCESS")
    .description("Suspicious login from unrecognized IP range")
    .initialQuery("Investigate and contain the unauthorized access attempt")
    .sessionId("session-abc-123")
    .userId("admin-user")
    .build();
```

## SoarExecutionMode

`public enum SoarExecutionMode`

Value

Code

Description

`SYNC`

`sync`

Synchronous approval processing with blocking wait. The caller blocks until approval is received or times out.

`ASYNC`

`async`

Asynchronous approval processing with persistence. Approval requests are stored and can be resolved later.

`AUTO`

`auto`

Automatic mode selection based on context. Low-risk tools use SYNC; high-risk tools use ASYNC with mandatory approval.

## SoarIncident

Represents a security incident with full lifecycle tracking from detection through resolution.

`public class SoarIncident`

### IncidentStatus

Value

Description

`NEW`

Incident just created.

`INVESTIGATING`

Under active investigation.

`IN_PROGRESS`

Response actions in progress.

`CONTAINED`

Threat contained but not eradicated.

`MITIGATED`

Impact mitigated.

`ERADICATED`

Threat fully removed.

`RECOVERED`

Systems recovered to normal operation.

`RESOLVED`

Incident resolved.

`CLOSED`

Incident closed after post-mortem.

`FALSE_POSITIVE`

Confirmed as false positive.

### IncidentType

Value

Description

`MALWARE`

Malware infection.

`RANSOMWARE`

Ransomware attack.

`PHISHING`

Phishing attempt.

`DATA_BREACH`

Data breach or exfiltration.

`UNAUTHORIZED_ACCESS`

Unauthorized access attempt.

`DOS_ATTACK`

Denial of Service attack.

`INSIDER_THREAT`

Insider threat activity.

`VULNERABILITY`

Vulnerability exploitation.

`COMPLIANCE_VIOLATION`

Compliance policy violation.

`OTHER`

Uncategorized incident.

## Related

[

### @SoarTool Annotation

Define custom SOAR tools with approval requirements, rate limits, and audit configuration.

](soar-tool)[

### Approval Workflows

Human-in-the-loop approval for sensitive SOAR tool executions.

](approval)[

### Threat Evaluation

The Layer 2 strategy that triggers SOAR playbook execution.

](../../../docs/reference/security/threat-evaluation)

[Previous Shadow Mode](/docs/install/shadow-mode) [Next @SoarTool Annotation](soar-tool)