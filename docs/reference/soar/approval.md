---
title: "Approval Workflows"
---
contexa-core Enterprise

# Approval Workflows

Human-in-the-loop approval system for SOAR tool execution. Manages the full approval lifecycle from request creation through resolution, with support for auto-approval, single-approver, multi-approver, unanimous, and emergency approval types.

## Overview

When a `@SoarTool`\-annotated method requires approval before execution, the SOAR pipeline delegates to the `ApprovalService`. The service creates an `ApprovalRequest`, notifies designated approvers via `SoarApprovalNotifier`, and tracks the request through its lifecycle until it is approved, rejected, expired, or cancelled.

The approval system integrates with the `SoarContext` session state, transitioning the session to `WAITING_APPROVAL` while approval is pending. Once resolved, the pipeline either proceeds with tool execution or aborts the action based on the approval outcome.

@SoarTool (approval = REQUIRED)

ApprovalRequestDetails

ApprovalService.requestApproval()

ApprovalRequest (PENDING)

SoarApprovalNotifier

Human Review

APPROVED / REJECTED

## ApprovalService

The core service interface for managing approval workflows. Provides both abstract methods that implementations must define and convenience default methods for common operations.

`public interface ApprovalService` `io.contexa.contexacore.soar.approval`

### Abstract Methods

requestApproval String

Creates a new approval request for a SOAR tool execution. Returns the generated approval ID that can be used to track and resolve the request.

soarContext SoarContext The current SOAR session context containing incident details and session state.

requestDetails ApprovalRequestDetails Details of the action requiring approval, including action name, type, risk level, and parameters.

getApprovalStatus ApprovalStatus

Retrieves the current status of an approval request by its ID.

approvalId String The approval request identifier returned by `requestApproval()`.

handleApprovalResponse void

Processes an approval or rejection response from a human reviewer.

approvalId String The approval request identifier.

isApproved boolean Whether the request is approved (`true`) or rejected (`false`).

comment String Reviewer comment or rejection reason.

reviewer String Identifier of the reviewing user.

getPendingApprovalIds Set<String>

Returns the set of all currently pending approval request IDs.

getPendingCount int

Returns the number of currently pending approval requests.

### Default Convenience Methods

Method

Return

Description

`requestApproval(ApprovalRequest)`

CompletableFuture<Boolean>

Asynchronous approval request using an `ApprovalRequest` object directly.

`processApprovalResponse(requestId, approved, reviewer, comment)`

void

Delegates to `handleApprovalResponse()` with reordered parameters for convenience.

`waitForApprovalSync(ApprovalRequest)`

boolean

Blocking wait for approval resolution. Used in `SYNC` execution mode.

`saveApprovalRequest(ApprovalRequest)`

ApprovalRequest

Persists an approval request to the backing store.

`sendApprovalNotification(ApprovalRequest)`

void

Sends a notification to designated approvers about a pending request.

`processApproval(approvalId, approved, reason)`

void

Simplified approval processing with `"system"` as the default reviewer.

`getPendingApprovals()`

List<ApprovalRequest>

Returns all pending approval requests as full objects.

`submitApprovalRequest(ApprovalRequest)`

void

Composite operation: saves the request then sends a notification.

`approve(approvalId)`

void

Quick approval with default comment `"Approved"` and reviewer `"system"`.

`reject(approvalId)`

void

Quick rejection with default comment `"Rejected"` and reviewer `"system"`.

`getApprovalRequest(approvalId)`

ApprovalRequest

Retrieves the full approval request object by ID. Returns `null` by default.

## ApprovalRequest

The domain object representing a single approval request. Tracks the full lifecycle from creation through resolution, including the requesting tool, approval type, reviewer information, and timeout configuration. Supports both builder-pattern construction and a convenience factory method.

`public class ApprovalRequest implements Serializable` `io.contexa.contexacore.domain`

### Key Fields

Field

Type

Description

`requestId`

String

Unique identifier (e.g., `APR-1709942400000`).

`sessionId`

String

The SOAR session that initiated the request.

`incidentId`

String

Associated security incident identifier.

`toolName`

String

Name of the `@SoarTool` requiring approval.

`actionType`

String

Classification of the action (e.g., "BLOCK\_IP", "ISOLATE\_HOST").

`parameters`

Map<String, Object>

Tool invocation parameters for reviewer inspection.

`reason`

String

Justification for the action.

`approvalType`

ApprovalType

The type of approval workflow to follow.

`status`

ApprovalStatus

Current lifecycle status.

`requestedAt`

LocalDateTime

Timestamp of request creation.

`requestedBy`

String

The user or system that initiated the request.

`approvedBy`

String

The reviewer who resolved the request.

`approvedAt`

LocalDateTime

Timestamp of approval or rejection.

`rejectionReason`

String

Reason provided when request is rejected.

`requiredRoles`

Set<String>

Roles required to approve this request.

`requiredApprovers`

Integer

Number of approvers needed for `MULTI` or `UNANIMOUS` types.

`approvalTimeout`

Integer

Timeout in minutes before the request expires.

`potentialImpact`

String

Description of the potential impact of the action.

`organizationId`

String

Organization context for multi-tenant deployments.

### Lifecycle Methods

Method

Description

Status Transition

`approve(approver)`

Marks the request as approved, records the approver and timestamp.

\* → APPROVED

`reject(approver, reason)`

Marks the request as rejected with a reason.

\* → REJECTED

`expire()`

Marks the request as expired (timeout reached).

PENDING → EXPIRED

`cancel()`

Cancels the request (e.g., incident resolved before approval).

PENDING → CANCELLED

`addApproval(approver, name, role, comments)`

Records an individual approval for multi-approver workflows.

\* → APPROVED

### Factory Method

```java
// Quick creation with auto-generated APR- prefixed ID
ApprovalRequest request = ApprovalRequest.create(
    "session-abc-123",       // sessionId
    "block_ip_address",      // toolName
    Map.of("ip", "10.0.0.1", "duration", 24),  // parameters
    "Suspicious traffic detected from this IP"   // reason
);
// request.status = PENDING, request.requestedAt = now()
```

### Builder Pattern

```java
ApprovalRequest request = ApprovalRequest.builder()
    .requestId("APR-custom-001")
    .sessionId("session-abc-123")
    .incidentId("INC-2024-001")
    .toolName("isolate_host")
    .actionDescription("Isolate compromised host from network")
    .toolParameters(Map.of("hostname", "web-server-03", "incidentId", "INC-2024-001"))
    .approvalType(ApprovalType.MULTI)
    .requestedBy("soar-pipeline")
    .requestReason("Host shows signs of lateral movement")
    .potentialImpact("Service disruption for web-server-03")
    .riskAssessment("HIGH - production server with active traffic")
    .timeoutMinutes(30)
    .organizationId("org-456")
    .build();
```

## ApprovalType

Defines the approval workflow variant for a request. Determines how many approvers are needed and how the approval process is managed.

`public enum ApprovalType` (nested in `ApprovalRequest`)

Value

Description

Use Case

`AUTO`

Auto Approval. Request is automatically approved based on policy.

Low-risk tools where the `ToolApprovalPolicyManager` determines no human review is needed.

`MANUAL`

Manual Approval Required. A human must review and decide.

Standard approval for moderate-risk actions that need human oversight.

`SINGLE`

Single Approval. One designated approver must approve.

Actions requiring a specific role holder's authorization (e.g., SOC analyst for IP blocks).

`MULTI`

Multi Approval Required. A configurable number of approvers must independently approve.

High-risk actions requiring consensus (e.g., host isolation, firewall changes).

`UNANIMOUS`

Unanimous. All designated approvers must approve.

Critical infrastructure changes where any single objection should block execution.

`EMERGENCY`

Emergency Approval. Expedited approval with reduced requirements.

Time-critical incidents where standard approval timelines are too slow.

## ApprovalStatus

Represents the current state of an approval request in its lifecycle.

`public enum ApprovalStatus` (nested in `ApprovalRequest`)

Value

Description

Terminal

`PENDING`

Request created, awaiting reviewer action.

No

`APPROVED`

Request approved. Tool execution may proceed.

Yes

`REJECTED`

Request rejected. Tool execution is blocked.

Yes

`EXPIRED`

Request timed out before receiving a response.

Yes

`CANCELLED`

Request cancelled (e.g., incident resolved, session terminated).

Yes

## ApprovalRequestDetails

An immutable record that captures the details of the action requiring approval. Passed to `ApprovalService.requestApproval()` alongside the `SoarContext` to create a new approval request.

`public record ApprovalRequestDetails implements Serializable` `io.contexa.contexacore.soar.approval`

Field

Type

Description

`actionName`

String

The `@SoarTool` name that requires approval (e.g., `"block_ip_address"`).

`actionType`

String

Classification of the action (e.g., `"CONTAINMENT"`, `"ERADICATION"`).

`riskLevel`

String

Assessed risk level of the action (e.g., `"HIGH"`, `"CRITICAL"`).

`description`

String

Human-readable description of what the action will do.

`arguments`

String

Serialized arguments the tool will be invoked with.

`parameters`

Map<String, Object>

Structured parameters for the tool invocation.

```java
ApprovalRequestDetails details = new ApprovalRequestDetails(
    "block_ip_address",                          // actionName
    "CONTAINMENT",                               // actionType
    "HIGH",                                      // riskLevel
    "Block IP 10.0.0.1 at the firewall level",   // description
    "{ip: 10.0.0.1, duration: 24}",              // arguments
    Map.of("ip", "10.0.0.1", "durationHours", 24) // parameters
);

String approvalId = approvalService.requestApproval(soarContext, details);
```

## SoarApprovalNotifier

Notification interface for the approval system. Implementations deliver approval notifications to human reviewers through configured channels (e.g., Slack, email, PagerDuty) and send reminders for stale pending requests.

`public interface SoarApprovalNotifier` `io.contexa.contexacore.autonomous.notification`

receiveApprovalNotification void

Receives and processes an incoming approval notification message. Called when a new approval request is created or when an external system sends an approval decision.

message String The notification message content.

sendApprovalReminder void

Sends a reminder notification for a pending approval request that has not been resolved within the expected timeframe.

approvalId String The approval request ID to send a reminder for.

## End-to-End Workflow Example

```java
// 1. SOAR pipeline determines a tool requires approval
ApprovalRequestDetails details = new ApprovalRequestDetails(
    "isolate_host", "CONTAINMENT", "CRITICAL",
    "Isolate web-server-03 due to lateral movement detection",
    "{hostname: web-server-03}", Map.of("hostname", "web-server-03")
);

// 2. Request approval through the service
String approvalId = approvalService.requestApproval(soarContext, details);
// SoarContext transitions to WAITING_APPROVAL

// 3. Check status (polling or event-driven)
ApprovalStatus status = approvalService.getApprovalStatus(approvalId);

// 4a. Human approves via dashboard or notification channel
approvalService.handleApprovalResponse(
    approvalId, true, "Confirmed lateral movement in logs", "analyst-jane"
);

// 4b. Or use convenience methods
approvalService.approve(approvalId);   // Quick system approval
approvalService.reject(approvalId);    // Quick system rejection

// 5. Pipeline checks status and proceeds with tool execution
if (approvalService.getApprovalStatus(approvalId) == ApprovalStatus.APPROVED) {
    // Execute the @SoarTool method
}
```

```java
// Using the builder for full control over the approval request
ApprovalRequest request = ApprovalRequest.builder()
    .sessionId(soarContext.getSessionId())
    .incidentId(soarContext.getIncidentId())
    .toolName("isolate_host")
    .approvalType(ApprovalType.MULTI)
    .requestedBy("soar-pipeline")
    .requestReason("Lateral movement detected from web-server-03")
    .potentialImpact("Web traffic disruption for 200+ active sessions")
    .riskAssessment("CRITICAL - production server under active attack")
    .timeoutMinutes(15)
    .organizationId(soarContext.getOrganizationId())
    .build();

// Submit: saves and notifies in one call
approvalService.submitApprovalRequest(request);

// Or use async API
CompletableFuture<Boolean> future = approvalService.requestApproval(request);
future.thenAccept(approved -> {
    if (approved) {
        // Proceed with tool execution
    }
});
```

## Related

[

### @SoarTool Annotation

Configure approval requirements, rate limits, and permissions on individual SOAR tools.

](soar-tool)[

### SOAR Overview

Architecture and execution flow of the SOAR pipeline that triggers approval workflows.

](./)[

### Shadow Mode

Operational modes that control whether approval workflows are enforced or simulated.

](/docs/install/shadow-mode)

[Previous @SoarTool Annotation](soar-tool) [Next Identity DSL](../../../docs/reference/identity/dsl)