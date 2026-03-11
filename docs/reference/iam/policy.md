---
title: "Policy Management"
---
contexa-iam

# Policy Management

PAP (Policy Administration Point) services for policy lifecycle management: CRUD operations, automatic role-based synchronization, AI-powered enrichment, visual builder, and business rule translation.

## PolicyService

The primary service for policy CRUD operations. Handles creation, update, deletion, and permission-based synchronization of `Policy` entities.

```java
public interface PolicyService {
    List<Policy> getAllPolicies();
    Policy findById(Long id);
    Policy createPolicy(PolicyDto policyDto);
    void updatePolicy(PolicyDto policyDto);
    void deletePolicy(Long id);
    void synchronizePolicyForPermission(Permission permission);
}
```

### PolicyDto Structure

The `PolicyDto` carries the full policy definition including targets, rules, and conditions:

Field

Type

Description

`id`

`Long`

Policy ID (null for creation)

`name`

`String`

Unique policy name

`description`

`String`

Human-readable description

`effect`

`Policy.Effect`

`ALLOW` or `DENY`

`priority`

`int`

Evaluation priority (lower = higher)

`targets`

`List<TargetDto>`

The resource targets this policy applies to. Each target specifies a URL pattern or METHOD type.

`rules`

`List<RuleDto>`

The list of rules that define the authorization conditions for this policy. Each rule contains one or more SpEL conditions.

## PolicySynchronizationService

Automatically generates and updates policies when role-permission assignments change. Listens for `RolePermissionsChangedEvent` via Spring's `@EventListener` and executes asynchronously with `@Async`.

```java
public class PolicySynchronizationService {

    @Async
    @EventListener
    @Transactional
    public void handleRolePermissionsChange(
            RolePermissionsChangedEvent event) { ... }
}
```

### Synchronization Flow

Policy Synchronization Pipeline

RolePermissionsChangedEvent Triggered when role-permission assignments change

Load Role Fetch role with permissions and managed resources

Build Targets Create targets from ManagedResource (URL or METHOD type)

Build Condition hasAuthority('ROLE\_NAME') and (permission expressions)

Create PolicyDto Name: AUTO\_POLICY\_FOR\_{roleName}, Priority: 500

Upsert Policy Existing policy by name? Update : Create new

Auto-generated policies use the naming convention `AUTO_POLICY_FOR_{roleName}` with a priority of 500. The condition expression combines the role authority check with individual permission authority checks joined by `or`.

## PolicyBuilderService

Provides visual policy construction capabilities for the Authorization Studio UI.

```java
public interface PolicyBuilderService {
    // Get available policy templates for a given context
    List<PolicyTemplateDto> getAvailableTemplates(PolicyContext context);

    // Build a Policy entity from visual drag-and-drop components
    Policy buildPolicyFromVisualComponents(VisualPolicyDto visualPolicyDto);

    // Simulate a policy against a test context before deployment
    SimulationResultDto simulatePolicy(Policy policyToSimulate,
                                       SimulationContext context);

    // Detect conflicts with existing policies
    List<PolicyConflictDto> detectConflicts(Policy newPolicy);
}
```

## PolicyEnrichmentService

Enriches policy entities with human-readable descriptions by delegating to `PolicyTranslator`. This service translates SpEL expressions in policy conditions into natural language descriptions.

```java
public class PolicyEnrichmentService {

    private final PolicyTranslator policyTranslator;

    public void enrichPolicyWithFriendlyDescription(Policy policy) {
        // Translates policy rules/conditions to human-readable text
        // Sets policy.friendlyDescription
    }
}
```

Example: A policy with condition `hasRole('ADMIN') and isAuthenticated()` would be enriched to `"(User has role ADMIN and User is authenticated)"`.

## BusinessPolicyService

Provides bidirectional translation between business-level access rules and technical policy definitions, enabling non-technical administrators to manage authorization.

```java
public interface BusinessPolicyService {
    // Create a technical policy from a business rule definition
    Policy createPolicyFromBusinessRule(BusinessPolicyDto dto);

    // Update an existing policy from business rule changes
    Policy updatePolicyFromBusinessRule(Long policyId, BusinessPolicyDto dto);

    // Get the business rule representation for a technical policy
    BusinessPolicyDto getBusinessRuleForPolicy(Long policyId);

    // Translate an existing technical policy to business rule format
    BusinessPolicyDto translatePolicyToBusinessRule(Long policyId);
}
```

## Policy Entity Model

Policy Entity Structure

Policy name (unique) | description | effect: ALLOW / DENY | priority: int | isActive | isAIGenerated | approvalStatus: PENDING / APPROVED / REJECTED | friendlyDescription

PolicyTarget (list) targetType: URL | METHOD -- targetIdentifier: URL pattern or method signature -- httpMethod: GET, POST, ANY, etc.

PolicyRule (list) description: String

PolicyCondition (list per rule) expression: String (SpEL) | authorizationPhase: PRE\_AUTHORIZE / POST\_AUTHORIZE

## Policy Builder

The Policy Builder provides a 5-step visual UI for creating policies in the Admin Dashboard.

### Five-Step Workflow

1.  **Name & Description** — Set the policy name, description, and effect (ALLOW/DENY)
2.  **Targets** — Define URL patterns or method identifiers this policy applies to
3.  **Rules** — Configure ALLOW/DENY rules with priority ordering
4.  **Conditions** — Write SpEL expressions for each rule
5.  **Condition Picker** — Select from compatible condition templates

### From-Resource Mode

When navigating from the Resource Workbench "Create Policy" button, the Policy Builder enters from-resource mode:

-   Resource target information is pre-filled
-   Only compatible condition templates are shown (filtered by `ConditionCompatibilityService`)
-   Domain-specific variables and ABAC applicability are considered

## Condition Template System

Condition templates are reusable SpEL expression patterns that simplify policy creation.

### Three-Tier Classification

Tier

Name

Scope

Examples

UNIVERSAL

All resources

Time-based restrictions, IP range checks

CONTEXT\_DEPENDENT

Domain-specific

User ownership verification, department checks

CUSTOM\_COMPLEX

Advanced

Multi-factor conditions, composite rules

### AI Auto-Generation

The `AutoConditionTemplateService` generates condition templates automatically:

-   Batch generation based on resource types and access patterns
-   Complexity scoring (1-10 scale) for each template
-   SpEL safety validation to block dangerous patterns

### Condition Compatibility

`ConditionCompatibilityService` filters conditions per resource:

-   **Domain compatibility** — matches condition domain to resource domain
-   **Available variables** — ensures referenced SpEL variables exist in the evaluation context
-   **ABAC applicability** — checks if Attribute-Based Access Control conditions are relevant

## Business Policy Service

`BusinessPolicyService` translates business-level authorization rules into technical SpEL policy conditions.

### SpEL Expression Conversion

Input Type

Generated SpEL

Example

Role-based

`hasRole('ROLE_NAME')`

`hasRole('ROLE_ADMIN')`

Permission-based

`hasPermission(targetId, 'DOMAIN', 'ACTION')`

`hasPermission(#id, 'USER', 'READ')`

AI action

`#ai.isAllowed() and hasRole('ROLE')`

`#ai.isAllowed() and hasRole('USER')`

Custom SpEL

Validated and used directly

`isAuthenticated() and hasIpAddress('10.0.0.0/8')`

### Safety Validation

Custom SpEL expressions are validated before storage to block:

-   System-level method calls
-   Reflection-based access
-   Runtime class loading
-   File system operations

### Policy Creation Flow

Business Policy Creation Pipeline

BusinessPolicyDto UI form input

Policy Entity Create from DTO

Enrichment Human-readable description

Save to DB Persist policy

Hot-Reload reloadAuthorizationSystem()

## Policy Wizard: Quick Grant Guide

The Policy Wizard is the fastest way to grant role-based permissions. Use it when you need simple permission grants without complex conditions, time-based restrictions, or AI expressions.

### When to Use the Wizard

-   Simple role-based permission grants without complex conditions
-   Granting access to a single resource for one or more roles
-   Quick setup during initial resource onboarding
-   No need for time-based, IP-based, or AI-assisted conditions

### Step-by-Step Guide

Policy Wizard: 4-Step Quick Grant

Initiate from Resource Workbench

Navigate to /admin/resources, find a resource with PERMISSION\_CREATED status, and click "Quick Grant". The wizard opens with the resource pre-selected.

Select Permissions

Choose which permissions to grant. The list is filtered to show only permissions compatible with the selected resource.

Select Target Roles / Groups

Pick one or more roles or groups that should receive the permission. The wizard shows current assignments to avoid duplicates.

Confirm and Commit

Review the summary and click "Grant". The wizard auto-creates: Permission + Policy + Role assignment in a single transaction.

### What the Wizard Auto-Creates

When you confirm, the wizard automatically creates the following entities:

Permission Linked to resource

Policy ALLOW effect, role-based condition

Role Assignment Permission assigned to selected roles

## Policy Builder: Advanced Policy Creation

The Policy Builder provides a comprehensive 5-step visual interface for creating policies with full control over targets, rules, conditions, and condition templates. Use it when you need complex authorization logic.

### When to Use the Builder

-   Policies with time-based, IP-based, or ownership conditions
-   AI-assisted authorization expressions (`#ai.isAllowed()`)
-   Multi-rule policies with different condition combinations
-   DENY policies or priority-sensitive configurations
-   Policies requiring custom SpEL expressions

### Step-by-Step Guide

Policy Builder: 5-Step Advanced Creation

Name and Description

Set a unique policy name, human-readable description, and the policy effect (ALLOW or DENY). Choose the priority level (lower number = higher priority).

Targets

Define URL patterns (e.g., /api/users/\*\*) or method identifiers this policy applies to. Specify HTTP methods (GET, POST, ANY). In from-resource mode, this step is pre-filled.

Rules

Configure one or more rules. Each rule can have its own description and contains conditions evaluated together. Rules are evaluated in priority order.

Conditions

Write SpEL expressions for each rule. Conditions define who can access the target and under what circumstances. Use the expression editor with syntax validation.

Condition Picker

Browse and select from compatible condition templates (UNIVERSAL, CONTEXT\_DEPENDENT, CUSTOM\_COMPLEX). The system recommends templates based on the target resource context.

### Context-Aware Mode (from-resource)

When launched from the Resource Workbench "Create Policy" button, the Policy Builder enters **from-resource mode**:

-   **Pre-filled target:** The resource URL pattern or method signature is automatically set as the policy target
-   **Filtered conditions:** `ConditionCompatibilityService` filters condition templates to show only those compatible with the resource domain
-   **Domain-specific variables:** Available SpEL context variables are displayed based on the resource type
-   **ABAC applicability:** Attribute-Based Access Control conditions are shown only when relevant to the resource

### Condition Template Selection

Tier

Name

When to Use

AI Recommendation

UNIVERSAL

Conditions that apply to any resource: time-based, IP range, authentication level

Recommended for general access control

CONTEXT\_DEPENDENT

Domain-specific conditions: ownership checks, department verification, data sensitivity

Recommended based on resource domain analysis

CUSTOM\_COMPLEX

Multi-factor conditions: combined role + AI + time checks, composite authorization rules

AI generates based on security posture analysis

### AI-Assisted Condition Recommendation

The Policy Builder integrates with the AI engine to recommend conditions. When creating a policy for a resource, the AI analyzes:

-   The resource type and its data sensitivity
-   Existing policies on similar resources
-   The organization's security posture
-   Common access patterns for the resource domain

Recommendations appear as suggested condition templates that can be applied with one click.

## Wizard vs. Builder: Decision Guide

Which Tool Should You Use?

#### Policy Wizard (Quick Grant)

-   Simple role-to-permission grants
-   No custom conditions needed
-   Single resource, one or more roles
-   ALLOW effect only
-   4 steps, under 30 seconds
-   Auto-creates all entities

**Best for:** Initial resource onboarding, straightforward access grants, quick setup during development.

VS

#### Policy Builder (Advanced)

-   Complex multi-condition policies
-   Time, IP, AI, ownership conditions
-   Multiple rules per policy
-   ALLOW or DENY effects
-   5 steps, full control
-   AI-assisted recommendations

**Best for:** Production security policies, compliance requirements, fine-grained access control.

## AI Policy Approval Workflow

Policies generated by the AI engine follow an approval workflow to ensure human oversight before enforcement.

### Approval Lifecycle

AI-Generated Policy Approval Flow

AI Generates Policy isAIGenerated = true, approvalStatus = PENDING

PENDING Review Policy is visible in Admin Dashboard but NOT enforced

APPROVED Admin approves -- Policy becomes enforceable when isActive = true

REJECTED Admin rejects -- Policy is archived and never enforced

### Enforcement Rules

`CustomDynamicAuthorizationManager` only evaluates policies that meet **all** of the following criteria:

-   `isActive = true` -- the policy is currently enabled
-   `approvalStatus = APPROVED` -- the policy has been reviewed and approved (for AI-generated policies)

Manually created policies (where `isAIGenerated = false`) do not require approval and are enforced as soon as they are saved and activated.

### Admin Review Process

1.  Navigate to `/admin/policies` and filter by `approvalStatus = PENDING`
2.  Review the policy details: name, description, targets, rules, and conditions
3.  Check the AI-generated friendly description for accuracy
4.  Simulate the policy using `PolicyBuilderService.simulatePolicy()` to preview its impact
5.  Check for conflicts with existing policies using `PolicyBuilderService.detectConflicts()`
6.  Approve or reject the policy with a reason

## Condition Template Examples

The following examples illustrate common condition templates used in policy rules. Each template is a SpEL expression that is evaluated at authorization time.

Category

Description

SpEL Expression

**Time-based**

Allow access only during business hours (9 AM to 6 PM)

`T(java.time.LocalTime).now().isAfter(T(java.time.LocalTime).of(9,0)) and T(java.time.LocalTime).now().isBefore(T(java.time.LocalTime).of(18,0))`

**IP Range**

Allow access only from internal network

`hasIpAddress('10.0.0.0/8')`

**Ownership**

Allow access if AI approves and user has permission on the resource

`#ai.isAllowed() and hasPermission(#id, 'USER', 'READ')`

**AI Assessment**

Allow access if AI analysis passes without requiring a challenge

`#ai.isAllowed() and !#ai.needsChallenge()`

**Combined (Role + AI)**

Allow admin access unconditionally, or require AI approval with permission check for others

`hasAnyAuthority('ROLE_ADMIN') or (#ai.isAllowed() and hasPermission(#id, 'DOCUMENT', 'UPDATE'))`

**Role-based**

Allow access for users with a specific role

`hasRole('ROLE_MANAGER')`

**Authentication Level**

Require full authentication (not remember-me)

`isFullyAuthenticated()`

[Previous Permission Evaluators](../../../docs/reference/iam/permission-evaluators) [Next Resource Scanner](../../../docs/reference/iam/resource-scanner)