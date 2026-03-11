---
title: "Admin Dashboard"
---
contexa-iam

# Admin Dashboard

Web-based administration console providing security overview, user/role/group/permission management, blacklist management, and the visual Authorization Studio for policy editing.

### Menu Structure

The Admin Dashboard organizes features into logical groups:

Menu Group

Pages

Purpose

Dashboard

`/admin/dashboard`

Security metrics and statistics overview

Identity

Users, Groups, Roles, Permissions

User and access entity management

Authorization

Policies, Policy Builder, Studio

Policy creation and analysis

Resources

Resource Workbench

Resource discovery, permission definition

Workflows

Policy Wizard, Granting Wizard

Guided multi-step workflows

Security

Blacklist, Role Hierarchies

Security operations

## Controllers

All admin controllers are served under the `/admin` base path and return Thymeleaf template views. They follow standard Spring MVC conventions with `@Controller` annotations.

Controller

Base Path

Purpose

`DashboardController`

`/admin`

Security overview dashboard with aggregated statistics

`AuthorizationStudioController`

`/admin/studio`

Visual authorization studio for policy exploration, simulation, and grant workflows

`UserManagementController`

`/admin/users`

User CRUD with group assignment

`RoleController`

`/admin/roles`

Role CRUD with permission assignment

`PermissionController`

`/admin/permissions`

Permission CRUD with managed resource linking

`GroupController`

`/admin/groups`

Group CRUD with role assignment

`BlacklistController`

`/admin/blacklist`

Blocked user management with resolution workflows

## DashboardController

Provides the main security overview page with aggregated data from `DashboardService`.

Endpoint

Method

Description

`/admin`, `/admin/`, `/admin/dashboard`

GET

Renders the dashboard view with security statistics

## Authorization Studio

Access: `/admin/studio`

The Authorization Studio provides advanced analysis and visualization tools for the authorization system. It exposes both page endpoints and JSON API endpoints for dynamic interaction.

### Subject Explorer

Browse and search users, groups, and roles. View their assigned permissions, group memberships, and role hierarchies.

### Access Path Analysis

Trace how a specific user gains access to a particular resource through the chain of groups, roles, permissions, and policies.

### Effective Permissions

View the complete set of permissions a user has, considering:

-   Direct role assignments
-   Group memberships
-   Role hierarchy inheritance

### Policy Simulation

Test "what-if" scenarios: simulate adding or removing roles, permissions, or group memberships and see how access decisions would change.

### Grant Workflow

Grant access directly from the Studio interface by creating the necessary role/permission assignments.

### Page Endpoints

Endpoint

Method

Description

`/admin/studio`

GET

Renders the Authorization Studio main page

### API Endpoints (JSON)

Endpoint

Method

Description

`/admin/studio/api/subject-details`

GET

Get detailed information for a subject. Params: `subjectId`, `subjectType`

`/admin/studio/api/explorer-items`

GET

Get all explorer items (users, roles, groups, permissions) for the tree view

`/admin/studio/api/access-path`

GET

Analyze access path from subject to permission. Params: `subjectId`, `subjectType`, `permissionId`

`/admin/studio/api/access-path-graph`

GET

Same analysis as above but returns `GraphDataDto` for visual graph rendering

`/admin/studio/api/effective-permissions`

GET

Get all effective permissions for a subject. Params: `subjectId`, `subjectType`

`/admin/studio/api/simulate`

POST

Run policy simulation with `SimulationRequestDto`

`/admin/studio/api/initiate-grant`

POST

Initiate a permission grant workflow with `InitiateGrantRequestDto`

## UserManagementController

Endpoint

Method

Description

`/admin/users`

GET

List all users

`/admin/users/new`

GET

Show user creation form with available roles and groups

`/admin/users/{id}`

GET

Show user detail/edit form

`/admin/users/{id}`

PUT/POST

Update user with group assignments

`/admin/users/{id}`

DELETE

Delete user

`/admin/users/delete/{id}`

POST

Delete user (form-compatible)

## RoleController

Endpoint

Method

Description

`/admin/roles`

GET

List all roles with permission counts

`/admin/roles/register`

GET

Show role creation form

`/admin/roles`

POST

Create role with permission assignments

`/admin/roles/{id}`

GET

Show role detail with assigned permissions

`/admin/roles/{id}/edit`

POST

Update role and permission assignments

`/admin/roles/delete/{id}`

POST

Delete role

## PermissionController

Endpoint

Method

Description

`/admin/permissions`

GET

List all permissions with managed resource links

`/admin/permissions/register`

GET

Show permission creation form

`/admin/permissions`

POST

Create permission

`/admin/permissions/{id}`

GET

Show permission detail

`/admin/permissions/{id}/edit`

POST

Update permission

`/admin/permissions/delete/{id}`

POST

Delete permission

## GroupController

Endpoint

Method

Description

`/admin/groups`

GET

List all groups with role and user counts

`/admin/groups/register`

GET

Show group creation form with available roles

`/admin/groups`

POST

Create group with role assignments

`/admin/groups/{id}`

GET

Show group detail with assigned roles

`/admin/groups/{id}/edit`

POST

Update group and role assignments

`/admin/groups/delete/{id}`

POST

Delete group

## BlacklistController

Manages blocked users detected by the Zero Trust engine. Supports filtering by status and resolution workflows by administrators.

Endpoint

Method

Description

`/admin/blacklist`

GET

List blocked users. Filter param: `all`, `blocked`, `unblock_requested`, `resolved`, `timeout_responded`

`/admin/blacklist/{id}`

GET

Show block detail

`/admin/blacklist/{id}/resolve`

POST

Resolve a block with action and reason. Current admin is recorded.

`/admin/blacklist/{id}/delete`

POST

Delete block record

### BlockedUserStatus Values

Status

Description

`BLOCKED`

User is currently blocked by the Zero Trust engine

`UNBLOCK_REQUESTED`

User has requested to be unblocked

`RESOLVED`

An administrator has resolved the block

`TIMEOUT_RESPONDED`

Block expired via timeout and user responded

## Resource Workbench

Access: `/admin/resources` (Enterprise edition)

The Resource Workbench provides a visual interface for managing resources discovered by the Resource Scanner.

### Resource Discovery

-   All `@RequestMapping` endpoints and `@Protectable` methods are automatically scanned at startup
-   Resources appear with status `NEEDS_DEFINITION`
-   AI-generated friendly names help identify resources

### Defining Resources

-   Click **Define as Permission** to create a Permission entity for the resource
-   Status changes to `PERMISSION_CREATED`

### Creating Policies from Resources

Two paths are available:

-   **Quick Grant:** Click **Grant via Wizard** to open the 3-step Policy Wizard for simple role-permission assignment
-   **Advanced Policy:** Click **Create Policy** to open the 5-step Policy Builder in from-resource mode with compatible conditions auto-filtered

See the [Resource Scanner](../../../docs/reference/iam/resource-scanner) page for the full end-to-end workflow.

## Workflow Wizards

### Policy Wizard

Access: `/admin/policy-wizard`

A 3-step guided workflow for assigning permissions to roles:

Step

Action

Step 1

Select the target role

Step 2

Choose permissions to assign

Step 3

Review and confirm

### Granting Wizard

Access: `/admin/granting-wizard`

A guided workflow for managing user/group memberships:

-   Assign users to groups
-   Assign roles to groups
-   Real-time simulation: preview the impact of membership changes before applying
-   Shows effective permissions before and after the change

## Getting Started Scenario

A complete walkthrough from application deployment to fully dynamic authorization:

Step

Action

Details

Deploy your application

Resource Scanner automatically discovers all endpoints

Open Resource Workbench

Review discovered resources (`NEEDS_DEFINITION` status)

Define permissions

Click **Define as Permission** for resources that need authorization

Create policies

Use Policy Builder from the Workbench to create policies with appropriate conditions

Verify

The policy takes effect immediately via hot-reload. Test access with different user roles.

Monitor

Use the Authorization Studio to analyze access paths and simulate changes

With this workflow complete, your application's authorization is fully managed through the Admin Dashboard without any static security configuration.

## Support Services

### SecurityScoreCalculator

Calculates a security score for the dashboard based on current system state.

```java
public interface SecurityScoreCalculator {
    SecurityScoreDto calculate();
}
```

### PermissionMatrixService

Generates a permission matrix view showing the relationship between roles/groups and permissions.

```java
public interface PermissionMatrixService {
    PermissionMatrixDto getPermissionMatrix();
    PermissionMatrixDto getPermissionMatrix(MatrixFilter filter);
}
```

## Configuration Properties

### IamAdminProperties

```yaml
contexa:
  iam:
    admin:
      rest-docs-path: /docs/index.html  # Path to REST API documentation
```

### SecurityStepUpProperties

```yaml
security:
  stepup:
    max-attempts: 3       # Maximum step-up authentication attempts
    lockout-duration: 300  # Lockout duration in seconds (5 minutes)
```

## Admin Dashboard Architecture

The Admin Dashboard organizes security management into logical sections, each served by dedicated controllers and services.

Admin Dashboard Menu Architecture

Dashboard /admin/dashboard -- Security metrics, statistics overview, security score

Identity Management Users, Groups, Roles, Permissions -- Entity CRUD and assignments

Authorization Policies, Policy Builder, Studio -- Policy creation and analysis

Resources Resource Workbench -- Discovery, permission definition, policy setup

Workflows Policy Wizard, Granting Wizard -- Guided multi-step processes

Security Blacklist, Role Hierarchies -- Security operations and enforcement

Data Flow Between Sections

Resources

Permissions

Roles

Groups

Users

Policies

## User Management Guide

The User Management screen (`/admin/users`) provides complete user lifecycle management.

### Creating Users

1.  Navigate to `/admin/users` and click **"New User"**
2.  Fill in the user profile: username, email, full name
3.  Set the initial password (or configure for external identity provider)
4.  Optionally assign the user to one or more groups
5.  Click **"Save"** to create the user

### Editing User Profiles

Click on any user in the list to open their detail page. From here you can:

-   Update profile information (name, email)
-   Change group memberships
-   View effective permissions (inherited through groups and roles)
-   Check the user's authentication history and current session status

### Group and Role Assignment

Users gain permissions through the chain: **User → Group → Role → Permission**. To assign a user to groups:

1.  Open the user detail page
2.  In the "Groups" section, select groups from the available list
3.  Save changes -- the user immediately inherits all roles and permissions from the assigned groups

### MFA Status Management

View and manage Multi-Factor Authentication status for each user:

-   **Enabled:** User has MFA configured and active
-   **Disabled:** MFA is not configured
-   **Reset:** Administrators can reset a user's MFA configuration if they lose access to their authenticator device

## Role Management Guide

The Role Management screen (`/admin/roles`) handles role creation and permission assignment.

### Creating Roles

1.  Navigate to `/admin/roles` and click **"Register Role"**
2.  Enter the role name (automatically prefixed with `ROLE_` if not present)
3.  Add a description explaining the role's purpose
4.  Select permissions to assign to this role from the available list
5.  Click **"Save"** to create the role

### Assigning Permissions to Roles

Open a role's detail page to manage its permission assignments:

-   View all currently assigned permissions
-   Add or remove permissions using the permission selector
-   When permissions change, `RolePermissionsChangedEvent` fires and `PolicySynchronizationService` auto-generates/updates the corresponding policy

### Role Hierarchy Configuration

Roles can be organized into parent-child hierarchies. A parent role automatically inherits all permissions from its child roles. See [Role Hierarchy Configuration](#role-hierarchy-configuration) for details.

## Group Management Guide

The Group Management screen (`/admin/groups`) organizes users and roles into logical groups.

### Creating Groups

1.  Navigate to `/admin/groups` and click **"Register Group"**
2.  Enter the group name and description
3.  Select roles to assign to this group
4.  Click **"Save"** to create the group

### Assigning Roles to Groups

Open a group's detail page to manage role assignments. All users in the group automatically inherit the permissions from the assigned roles.

### Managing Group Membership

Users can be added to or removed from groups in two ways:

-   **From the Group page:** View all members and add/remove users
-   **From the User page:** Assign the user to groups from their profile
-   **Via Granting Wizard:** Use the guided workflow at `/admin/granting-wizard` for bulk assignments with impact preview

## Permission Management Guide

The Permission Management screen (`/admin/permissions`) handles individual permission entities.

### Creating Permissions

1.  Navigate to `/admin/permissions` and click **"Register Permission"**
2.  Enter the permission details:

Field

Description

Example

**Name**

Unique permission identifier

`USER_READ`

**Description**

Human-readable explanation

Read user profile information

**Target Type**

The domain this permission applies to

`USER`, `DOCUMENT`, `ORDER`

**Action Type**

The action this permission grants

`READ`, `WRITE`, `DELETE`

### Linking Permissions to Managed Resources

Permissions can be linked to `ManagedResource` entities discovered by the Resource Scanner. This link is typically created automatically when you use "Define as Permission" in the Resource Workbench, but can also be configured manually from the permission detail page.

### Permission Lifecycle

Permissions follow this lifecycle:

1.  **Creation:** Permission entity created (manually or via Resource Workbench)
2.  **Role assignment:** Permission assigned to one or more roles
3.  **Policy linkage:** Policies reference the permission through SpEL conditions
4.  **Enforcement:** `CustomDynamicAuthorizationManager` evaluates the permission at runtime

## Blacklist Management

The Blacklist Management screen (`/admin/blacklist`) handles users blocked by the Zero Trust engine.

### How Zero Trust Blocking Works

The Zero Trust engine continuously monitors user behavior and AI risk analysis. When suspicious activity is detected, the engine can automatically block a user. Blocking decisions are driven by:

-   **AI risk score:** Exceeds the configured threshold
-   **Behavioral anomalies:** Unusual access patterns, impossible travel, credential stuffing
-   **Policy violations:** Repeated access attempts to unauthorized resources
-   **SecurityDecisionEnforcementHandler:** Processes `ZeroTrustAction.BLOCK` decisions

### Viewing Blocked Users

The blacklist screen shows all blocked users with filtering by status:

-   **BLOCKED:** Currently blocked, requires admin resolution
-   **UNBLOCK\_REQUESTED:** User has submitted an unblock request
-   **RESOLVED:** Admin has resolved the block
-   **TIMEOUT\_RESPONDED:** Block expired via timeout

### Unblocking Workflow

1.  Navigate to `/admin/blacklist` and find the blocked user
2.  Click the user entry to view block details (reason, timestamp, risk score)
3.  Review the AI analysis that triggered the block
4.  Click **"Resolve"** and choose an action:

-   **Unblock:** Remove the block and restore access
-   **Keep blocked:** Confirm the block with documentation
-   **Escalate:** Flag for further security investigation

The resolving administrator's identity is recorded for audit purposes.

## Role Hierarchy Configuration

Role hierarchy enables permission inheritance between roles. A parent role automatically includes all permissions of its child roles.

### Setting Up Parent-Child Relationships

1.  Navigate to `/admin/roles` and select a role to be the parent
2.  In the role detail page, configure the parent role field
3.  The child role's permissions are automatically inherited by the parent

### How Hierarchy Affects Permission Inheritance

Role Hierarchy Permission Inheritance

ROLE\_ADMIN Inherits all permissions from child roles + own permissions

ROLE\_MANAGER Inherits ROLE\_USER permissions + own permissions

ROLE\_AUDITOR Read-only access permissions

ROLE\_USER Base level permissions

In this example, `ROLE_ADMIN` inherits permissions from `ROLE_MANAGER`, `ROLE_AUDITOR`, and `ROLE_USER`. The hierarchy is resolved by Spring Security's `RoleHierarchy` implementation and is considered during both the `Authorization Studio` effective permissions calculation and `CustomDynamicAuthorizationManager` runtime evaluation.

## Default Policy Settings

The Default Policy Settings control what happens when a request does not match any configured policy.

### Allow or Deny Unmatched Requests

When `CustomDynamicAuthorizationManager` evaluates a request and no policy matches, the system falls back to the default policy setting:

Setting

Behavior

Recommended For

**DENY (default)**

Unmatched requests are denied

Production environments -- deny-by-default is the most secure posture

**ALLOW**

Unmatched requests are allowed

Development environments or during initial migration when not all resources have policies yet

### Managing via Admin UI

The default policy setting is stored in the database and can be changed through the Admin Dashboard without restarting the application:

1.  Navigate to the Dashboard settings section
2.  Find the **"Default Authorization Policy"** setting
3.  Toggle between ALLOW and DENY
4.  The change takes effect immediately via hot-reload (zero-downtime)

### Security Recommendations

-   **Production:** Always use DENY as the default. Explicitly create ALLOW policies for every resource that should be accessible.
-   **Staging:** Use DENY to match production behavior and catch missing policies before deployment.
-   **Development:** Use ALLOW during initial setup, then switch to DENY once policies are configured. Use Shadow Mode to test policy enforcement without blocking requests.

[Previous Resource Scanner](../../../docs/reference/iam/resource-scanner) [Next End-to-End Workflow](../../../docs/reference/iam/end-to-end-workflow)