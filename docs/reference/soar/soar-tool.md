---
title: "@SoarTool Annotation"
---
contexa-core Enterprise

# @SoarTool Annotation

Marks a method or class as a SOAR response tool available for AI-driven invocation. Configures approval requirements, rate limits, environment restrictions, retry behavior, and audit settings for each tool.

## Overview

The `@SoarTool` annotation transforms ordinary Java methods into SOAR-invocable tools. When the SOAR pipeline's LLM determines that a specific response action is needed (e.g., blocking an IP, isolating a host, or sending a notification), it selects the appropriate `@SoarTool`\-annotated method based on the tool's `name` and `description`.

Before execution, the framework checks approval requirements, validates permissions, enforces rate limits, and ensures environment compatibility. After execution, it records an audit trail if `auditRequired` is enabled.

`@Target({ElementType.TYPE, ElementType.METHOD})   @Retention(RetentionPolicy.RUNTIME)   public @interface SoarTool` `io.contexa.contexacommon.annotation`

## Attributes

Attribute

Type

Default

Description

`name`

String

`""`

Unique tool name used for LLM tool selection. If empty, the method name is used.

`description`

String

`""`

Human-readable description of the tool's purpose. Included in LLM tool selection prompts.

`approval`

ApprovalRequirement

`AUTO`

Approval level required before this tool can execute. See [ApprovalRequirement](#approvalrequirement) enum.

`requiredPermissions`

String\[\]

`{}`

Security permissions required to invoke this tool. Checked against the current session's granted authorities.

`allowedEnvironments`

String\[\]

`{"dev", "staging", "prod"}`

Environments where this tool is available. Restricts dangerous tools to non-production or vice versa.

`maxExecutionsPerHour`

int

`100`

Maximum number of times this tool can be invoked per hour. Prevents runaway automation.

`auditRequired`

boolean

`true`

Whether tool execution is recorded in the `CentralAuditFacade`.

`retryable`

boolean

`true`

Whether the tool can be automatically retried on transient failures.

`maxRetries`

int

`3`

Maximum retry attempts if `retryable` is true.

`timeoutMs`

long

`30000`

Maximum execution time in milliseconds before the tool invocation is cancelled.

## ApprovalRequirement

Defines the level of human oversight required before a tool can execute.

`public enum ApprovalRequirement` (nested in `@SoarTool`)

Value

Description

Use Case

`NONE`

No approval required. Tool executes immediately.

Low-risk read-only operations (log lookup, status check).

`AUTO`

Automatic approval based on risk assessment and tool policy.

Default for most tools. The `ToolApprovalPolicyManager` decides.

`NOTIFICATION`

Notification sent to approvers, then auto-proceeds after a delay.

Medium-risk actions where awareness is needed but blocking is not.

`REQUIRED`

Single approver must explicitly approve before execution.

High-risk actions (IP blocking, account suspension).

`MULTI_APPROVAL`

Multiple approvers must independently approve before execution.

Critical actions (firewall rule changes, data deletion, production deployments).

## Code Examples

### Read-Only Investigation Tool

```java
@SoarTool(
    name = "lookup_user_activity",
    description = "Retrieves recent activity logs for a specific user",
    approval = ApprovalRequirement.NONE,
    maxExecutionsPerHour = 500,
    timeoutMs = 10000
)
public List<ActivityLog> lookupUserActivity(String userId, int hours) {
    return activityLogRepository.findRecentByUserId(userId, hours);
}
```

### High-Risk Blocking Tool

```java
@SoarTool(
    name = "block_ip_address",
    description = "Blocks an IP address at the firewall level",
    approval = ApprovalRequirement.REQUIRED,
    requiredPermissions = {"SOAR_BLOCK_IP"},
    allowedEnvironments = {"staging", "prod"},
    maxExecutionsPerHour = 50,
    retryable = false,
    timeoutMs = 60000
)
public BlockResult blockIpAddress(String ipAddress, String reason, int durationHours) {
    return firewallService.blockIp(ipAddress, reason, Duration.ofHours(durationHours));
}
```

### Critical Infrastructure Tool

```java
@SoarTool(
    name = "isolate_host",
    description = "Isolates a compromised host from the network",
    approval = ApprovalRequirement.MULTI_APPROVAL,
    requiredPermissions = {"SOAR_ISOLATE_HOST", "INFRA_ADMIN"},
    allowedEnvironments = {"prod"},
    maxExecutionsPerHour = 10,
    retryable = false,
    auditRequired = true,
    timeoutMs = 120000
)
public IsolationResult isolateHost(String hostname, String incidentId) {
    return networkService.isolateHost(hostname, incidentId);
}
```

### Class-Level Annotation

```java
// Class-level annotation applies defaults to all methods in the class
@SoarTool(
    approval = ApprovalRequirement.NOTIFICATION,
    requiredPermissions = {"SOAR_NOTIFICATION"},
    maxExecutionsPerHour = 200
)
@Component
public class NotificationTools {

    @SoarTool(
        name = "send_slack_alert",
        description = "Sends a security alert to the designated Slack channel"
    )
    public void sendSlackAlert(String channel, String message, String severity) {
        slackService.sendMessage(channel, formatAlert(message, severity));
    }

    @SoarTool(
        name = "send_email_alert",
        description = "Sends a security alert email to the incident response team"
    )
    public void sendEmailAlert(String subject, String body, List<String> recipients) {
        emailService.send(recipients, subject, body);
    }
}
```

## Related

[

### SOAR Overview

Architecture and execution flow of the SOAR pipeline that invokes @SoarTool methods.

](./)[

### Approval Workflows

How the ApprovalService manages the approval lifecycle for REQUIRED and MULTI\_APPROVAL tools.

](approval)[

### Shadow Mode

Operational modes that control whether SOAR tools actually execute or run in observation mode.

](/docs/install/shadow-mode)

[Previous SOAR Overview](./) [Next Approval Workflows](approval)