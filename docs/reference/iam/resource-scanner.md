---
title: "Resource Scanner"
---
contexa-iam

# Resource Scanner

Automatic resource discovery that scans `@Protectable` methods and MVC endpoints at application startup, registering them as `ManagedResource` entities for policy assignment.

## Overview

Contexa provides two complementary resource scanners that detect different types of protectable resources in the application:

-   **MethodResourceScanner** — Discovers non-controller methods annotated with `@Protectable`
-   **MvcResourceScanner** — Discovers Spring MVC controller endpoints via `RequestMappingHandlerMapping`

Both scanners implement the `ResourceScanner` interface and produce `ManagedResource` entities with an initial status of `NEEDS_DEFINITION`.

### End-to-End Pipeline

Resource scanning is the first stage of a four-step resource management pipeline: **Scan → Define → Policy → Dynamic Authorization**. At application startup, `ResourceScanner` implementations discover all `@RequestMapping` endpoints and `@Protectable` methods, storing them as `ManagedResource` entities in the database. The AI engine then generates human-readable friendly names for discovered resources in batch.

Administrators use the **Resource Workbench** in the Admin Dashboard (`/admin/resources`) to review discovered resources, define them as permissions, and create authorization policies. Once policies are created, `CustomDynamicAuthorizationManager` enforces them at runtime through `.anyRequest().access(customDynamicAuthorizationManager)`. This approach eliminates the need for static `.requestMatchers().hasRole()` configuration — all authorization decisions are driven by policies defined through the admin interface.

Resource Scanning Pipeline

Application Start WorkbenchInitializer triggers resource scanning

MethodResourceScanner.scan() Scan beans in io.contexa.contexaiam -- Skip @Controller / @RestController -- Find public methods with @Protectable -- Register as ManagedResource (METHOD)

MvcResourceScanner.scan() Get RequestMappingHandlerMapping -- Iterate handler methods -- Extract URL patterns and HTTP methods -- Register as ManagedResource (URL)

ManagedResource Entities status: NEEDS\_DEFINITION

Admin Assigns Permission status: PERMISSION\_CREATED

Policy Connected status: POLICY\_CONNECTED

## ResourceScanner Interface

```java
public interface ResourceScanner {
    List<ManagedResource> scan();
}
```

## MethodResourceScanner

Scans all Spring beans in the `io.contexa.contexaiam` package for public methods annotated with `@Protectable`. Controller classes are explicitly excluded since they are handled by `MvcResourceScanner`.

### Scan Logic

1.  Iterate all bean definitions in the `ApplicationContext`
2.  Resolve the target class (unwrapping AOP proxies via `AopUtils.getTargetClass()`)
3.  Skip classes outside the `io.contexa.contexaiam` package
4.  Skip classes annotated with `@Controller` or `@RestController`
5.  For each public method with `@Protectable`, create a `ManagedResource`

### Resource Identifier Format

Method resources use a fully qualified method signature as the identifier:

Text Copy

```
io.contexa.contexaiam.service.AccountService.updateAccount(Long,AccountDto)
```

### ManagedResource Fields (METHOD type)

Field

Value Source

`resourceIdentifier`

Fully qualified method signature with parameter types

`resourceType`

`METHOD`

`serviceOwner`

Simple class name of the declaring class

`parameterTypes`

JSON array of fully qualified parameter type names

`returnType`

Fully qualified return type name

`sourceCodeLocation`

Derived from class name: `io/contexa/.../ClassName.java`

`status`

`NEEDS_DEFINITION`

## MvcResourceScanner

Scans Spring MVC `@Controller` and `@RestController` classes for URL-mapped endpoints using `RequestMappingHandlerMapping`.

### Scan Logic

1.  Retrieve the `requestMappingHandlerMapping` bean
2.  Iterate all registered handler methods
3.  Skip classes outside the `io.contexa.contexaiam` package
4.  Skip classes not annotated with `@Controller` or `@RestController`
5.  Extract URL patterns from `PathPatternsRequestCondition`
6.  Extract HTTP method (defaulting to `ANY`)
7.  Generate API docs URL using `IamAdminProperties.restDocsPath`

### ManagedResource Fields (URL type)

Field

Value Source

`resourceIdentifier`

URL pattern string (e.g., `/admin/users/{id}`)

`resourceType`

`URL`

`httpMethod`

`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, or `ANY`

`friendlyName`

Handler method name

`description`

`URL: [HTTP_METHOD] /path/pattern`

`serviceOwner`

Simple class name of the controller

`apiDocsUrl`

`{restDocsPath}#{controller}_{method}`

`status`

`NEEDS_DEFINITION`

## ManagedResource Entity

```java
@Entity
@Table(name = "MANAGED_RESOURCE")
public class ManagedResource {
    private Long id;
    private String resourceIdentifier;    // URL pattern or method signature
    private ResourceType resourceType;    // URL or METHOD
    private HttpMethod httpMethod;        // GET, POST, PUT, DELETE, PATCH, ANY
    private String friendlyName;
    private String description;
    private String serviceOwner;
    private String parameterTypes;        // JSON array (METHOD only)
    private String returnType;            // Fully qualified type (METHOD only)
    private String apiDocsUrl;            // Link to API documentation
    private String sourceCodeLocation;    // Source file path (METHOD only)
    private String availableContextVariables;
    private Status status;                // NEEDS_DEFINITION, PERMISSION_CREATED,
                                          // POLICY_CONNECTED, EXCLUDED
    private Permission permission;        // OneToOne mapping
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum ResourceType { URL, METHOD }
    public enum HttpMethod { GET, POST, PUT, DELETE, PATCH, ANY }
    public enum Status {
        NEEDS_DEFINITION,
        PERMISSION_CREATED,
        POLICY_CONNECTED,
        EXCLUDED
    }
}
```

### Resource Lifecycle

Status

Description

`NEEDS_DEFINITION`

Discovered by scanner; no permission assigned yet

`PERMISSION_CREATED`

A `Permission` entity has been linked to this resource

`POLICY_CONNECTED`

A policy references this resource through its targets

`EXCLUDED`

Explicitly excluded from authorization (e.g., public endpoints)

## ManagedResource Lifecycle

### Status Transitions

ManagedResource Status Transitions

NEEDS\_DEFINITION Resource discovered by scanner, not yet configured

PERMISSION\_CREATED defineResourceAsPermission() called

POLICY\_CONNECTED Policy created and linked

EXCLUDED Admin marks as excluded (public endpoints, static assets)

Status

Description

Transition Trigger

`NEEDS_DEFINITION`

Resource discovered by scanner, not yet configured

Initial scan

`PERMISSION_CREATED`

`defineResourceAsPermission()` called, `Permission` entity created

Admin action in Workbench

`POLICY_CONNECTED`

Policy created and linked to this resource

Policy Builder / Policy Wizard

`EXCLUDED`

Resource excluded from authorization management

Admin marks as excluded

### ManagedResource Entity Fields

Field

Type

Description

`resourceIdentifier`

`String`

Unique ID (URL pattern + method, or qualified method signature)

`resourceType`

`ResourceType`

`URL` or `METHOD`

`friendlyName`

`String`

AI-generated human-readable name

`status`

`ResourceStatus`

`NEEDS_DEFINITION`, `PERMISSION_CREATED`, `POLICY_CONNECTED`, `EXCLUDED`

`scanSource`

`String`

Scanner that discovered this resource

## Resource Workbench

The Resource Workbench in the Admin Dashboard (`/admin/resources`) provides a visual interface for managing discovered resources.

### Discovering Resources

-   View all scanned resources with status-based filtering
-   Refresh scan results on demand
-   Search and filter by resource type, status, or name

### Defining Resources as Permissions

Click **"Define as Permission"** on a `NEEDS_DEFINITION` resource to:

1.  Create a corresponding `Permission` entity
2.  Update the resource status to `PERMISSION_CREATED`
3.  Make the resource available for policy creation

### Two Paths from Workbench

After defining a resource as a permission, two policy creation options are available:

Path

Action

Use Case

**Quick Grant**

"Grant via Wizard" → Policy Wizard (3-step)

Simple role-to-permission assignment

**Advanced Policy**

"Create Policy" → Policy Builder (5-step, from-resource mode)

Complex conditions, AI expressions, multi-rule policies

## End-to-End Workflow

End-to-End Resource Management Pipeline

Step 1: SCAN

MvcResourceScanner + MethodResourceScanner ManagedResource (NEEDS\_DEFINITION)

Step 2: DEFINE

Resource Workbench /admin/resources -- Define as Permission (PERMISSION\_CREATED)

Step 3: POLICY

Policy Builder / Wizard /admin/policies -- from-resource mode (POLICY\_CONNECTED)

Step 4: ENFORCE

CustomDynamicAuthorizationManager reload() -- .anyRequest().access(dynamic)

### Step 1: Scan

Automatic at application startup via `WorkbenchInitializer`. `MvcResourceScanner` scans all `@Controller` and `@RestController` classes. `MethodResourceScanner` scans all `@Protectable` methods. AI generates friendly names in batch.

### Step 2: Review & Define

In the Resource Workbench, review `NEEDS_DEFINITION` resources. Define relevant resources as permissions. Exclude resources that do not need authorization (static assets, public endpoints).

### Step 3: Create Policy

From the Workbench, click **"Create Policy"** to enter the Policy Builder in from-resource mode. Compatible condition templates are automatically filtered. Configure rules and conditions, then save.

### Step 4: Dynamic Authorization

When the policy is saved, `reloadAuthorizationSystem()` triggers `CustomDynamicAuthorizationManager.reload()`. The policy takes effect immediately. With `.anyRequest().access(customDynamicAuthorizationManager)` in your security configuration, no static authorization rules are needed.

## Resource Workbench: Operations Guide

The Resource Workbench (`/admin/resources`) is the central interface for managing all discovered resources. This section covers detailed operational workflows.

### Filtering Resources

The Workbench provides multiple filtering options to find resources quickly:

Filter

Options

Use Case

**By Status**

`NEEDS_DEFINITION`, `PERMISSION_CREATED`, `POLICY_CONNECTED`, `EXCLUDED`

Find resources at a specific lifecycle stage

**By Service Owner**

Controller or service class name

Filter resources belonging to a specific module

**By Keyword**

Free text search

Search by resource identifier, friendly name, or description

**By Resource Type**

`URL` or `METHOD`

Filter by endpoint type vs. method-level resource

### Defining a Resource

When you define a resource, the following happens in sequence:

1.  Click **"Define as Permission"** on a `NEEDS_DEFINITION` resource
2.  Enter a friendly name for the permission (or accept the AI-suggested name)
3.  A `Permission` entity is automatically created and linked to the resource
4.  The resource status changes to `PERMISSION_CREATED`
5.  The resource is now ready for policy assignment

### Policy Setup from Workbench

After defining a resource, a modal appears offering two policy creation paths:

#### Quick Grant (Wizard)

Click **"Grant via Wizard"** to open the 3-step Policy Wizard.

-   Pre-selects the resource permission
-   Choose target roles and confirm
-   Creates a simple ALLOW policy

VS

#### Advanced (Policy Builder)

Click **"Create Policy"** to open the 5-step Policy Builder.

-   Target is pre-filled (from-resource mode)
-   Full condition template selection
-   Supports complex rules and AI conditions

### Excluding and Restoring Resources

Resources that do not require authorization (public endpoints, static assets, health checks) can be excluded:

-   **Excluding:** Click **"Exclude"** on a `NEEDS_DEFINITION` resource. The status changes to `EXCLUDED`, and the resource is removed from authorization management.
-   **Restoring:** Excluded resources can be restored by clicking **"Restore"**. The status reverts to `NEEDS_DEFINITION`, and the resource re-enters the management lifecycle.

**When to exclude:** Public API endpoints, static asset paths, health check endpoints (`/actuator/health`), documentation paths.

**When to restore:** Previously public endpoints that now require authorization, or resources excluded by mistake.

### Status Transition Diagram

Resource Workbench Status Flow

NEEDS\_DEFINITION Discovered by scanner at startup

PERMISSION\_CREATED "Define as Permission" clicked -- Permission entity linked

POLICY\_CONNECTED Policy created via Wizard or Builder -- Resource fully managed

EXCLUDED "Exclude" clicked -- Not managed -- Can be restored

## AI Auto-Naming

When resources are discovered by the scanner, their technical identifiers (URL patterns or method signatures) are not user-friendly. The AI auto-naming system generates human-readable names and descriptions automatically.

### How It Works

`ResourceRegistryServiceImpl` calls the AI `ResourceNaming` service after scanning is complete. The AI analyzes each technical identifier and generates:

-   **Friendly name:** A concise, business-oriented name (e.g., "Update User Profile" for `PUT /api/users/{id}`)
-   **Description:** A longer explanation of what the resource does

### Batch Processing

To optimize AI API usage, auto-naming processes resources in batches of **10 items per batch**. This approach:

-   Reduces the number of AI API calls
-   Provides contextual awareness across related resources in the same batch
-   Handles failures gracefully by retrying individual batches

### Name Generation Strategy

AI Auto-Naming Pipeline

Technical Identifiers URL patterns + method signatures

AI ResourceNaming Batch of 10 items analyzed

Friendly Names Business-readable names + descriptions

Technical Identifier

AI-Generated Friendly Name

`GET /api/users`

List All Users

`PUT /api/users/{id}`

Update User Profile

`DELETE /admin/roles/{id}`

Delete Role

`AccountService.updateAccount(Long,AccountDto)`

Update Account Details

[Previous Policy Management](../../../docs/reference/iam/policy) [Next Admin Dashboard](../../../docs/reference/iam/admin)