---
title: "End-to-End Dynamic Authorization"
---
contexa-iam

# End-to-End Dynamic Authorization Workflow

Build a complete policy-driven authorization system with zero hardcoded rules. From automatic resource discovery to runtime enforcement — Contexa replaces Spring Security's static authorization with a fully dynamic, database-driven approach.

## Why This is Revolutionary

Traditional Spring Security forces developers to hardcode authorization rules directly in Java configuration. Every new endpoint, every role change, every permission tweak requires a code change, a rebuild, and a redeployment. Contexa eliminates this entire pattern.

### Traditional vs. Contexa Approach

#### Traditional Spring Security

```java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**")
        .hasRole("ADMIN")
    .requestMatchers("/api/users/**")
        .hasAuthority("READ_USERS")
    .requestMatchers("/api/reports/**")
        .hasAnyRole("ADMIN", "ANALYST")
    .requestMatchers("/api/orders/**")
        .hasAuthority("MANAGE_ORDERS")
    .requestMatchers("/api/settings/**")
        .hasRole("SUPER_ADMIN")
    .requestMatchers("/api/audit/**")
        .hasAuthority("VIEW_AUDIT_LOG")
    // ... 20+ more lines
    .anyRequest().authenticated()
);
```

Every change requires code modification, rebuild, and redeployment. No visibility into who has access to what without reading source code.

VS

#### Contexa Dynamic Authorization

```java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/css/**", "/js/**")
        .permitAll()
    .anyRequest()
        .access(customDynamicAuthorizationManager)
);
```

One line replaces all static rules. Policies are managed through the Admin Dashboard, stored in the database, and enforced at runtime. Zero downtime. Zero redeployment.

### Key Advantages

Capability

Traditional

Contexa

**Policy changes**

Code change + rebuild + redeploy

Admin Dashboard edit, instant effect

**New endpoint protection**

Manual `requestMatchers` entry

Auto-discovered by ResourceScanner

**Policy creation**

Developer writes Java code

Admin UI wizard or AI-assisted builder

**Audit trail**

Git history only

Full audit log with CentralAuditFacade

**AI integration**

Not possible

AI risk assessment, condition recommendation

**Granularity**

URL patterns + roles

URL, method, ownership, time, IP, AI conditions

**Visibility**

Read source code

Centralized dashboard for all stakeholders

## Complete Workflow Overview

The dynamic authorization system operates as a five-stage pipeline. Each stage is automated and feeds into the next, creating a seamless flow from code to enforcement.

ResourceScanner

Auto-discovers all endpoints and @Protectable methods at startup

registers

Resource Workbench

Admin UI to browse, name, and organize discovered resources

configures

Policy Builder / Wizard

Create policies manually or with AI assistance

persists

DB Policy Storage

Policies, conditions, targets stored in database

loads

Dynamic Authorization Manager

Evaluates policies at runtime for every request

The following sections walk through four real-world scenarios demonstrating this pipeline in action.

## Scenario 1 — Protecting a New API Endpoint

You have written a new REST controller and want it dynamically protected without touching your security configuration.

Write a Controller with @RequestMapping

Create your endpoint as usual. No security annotations required.

```java
@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    @GetMapping
    public List<InvoiceDto> listInvoices() {
        return invoiceService.findAll();
    }

    @PostMapping
    public InvoiceDto createInvoice(@RequestBody CreateInvoiceRequest req) {
        return invoiceService.create(req);
    }

    @DeleteMapping("/{id}")
    public void deleteInvoice(@PathVariable Long id) {
        invoiceService.delete(id);
    }
}
```

ResourceScanner Auto-Detects on Startup

`MvcResourceScanner` runs automatically when the application starts. It scans all `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, and `@PatchMapping` annotations across all controllers.

Three new resources are registered in the database:

Resource ID

HTTP Method

URL Pattern

Type

`GET:/api/v1/invoices`

GET

/api/v1/invoices

URL

`POST:/api/v1/invoices`

POST

/api/v1/invoices

URL

`DELETE:/api/v1/invoices/{id}`

DELETE

/api/v1/invoices/{id}

URL

No manual registration is needed. The scanner discovers everything automatically.

Resource Workbench — Organize and Name

Open the Admin Dashboard and navigate to **Resource Workbench**. Your three new endpoints appear in the resource list.

For each resource you can:

-   Assign a human-readable **business name** (e.g., "List Invoices", "Create Invoice", "Delete Invoice")
-   Group resources into a **resource group** (e.g., "Invoice Management")
-   A **Permission** is automatically created matching the resource (e.g., `INVOICES_READ`, `INVOICES_CREATE`, `INVOICES_DELETE`)

Create a Policy — Quick Grant or Advanced Builder

You have two options for creating authorization policies:

#### Option A: Quick Grant (Policy Wizard)

The fastest path. Select roles, assign permissions, done.

1.  Select the resource (e.g., `GET:/api/v1/invoices`)
2.  Choose target roles: **ADMIN**, **ACCOUNTANT**
3.  Assign permission: `INVOICES_READ`
4.  Effect: **ALLOW**
5.  Click "Create Policy"

This creates a simple role-based policy equivalent to `hasAnyRole('ADMIN', 'ACCOUNTANT')` — but stored in the database, not in code.

#### Option B: Advanced Policy Builder

For complex authorization logic with conditions.

Policy Definition (Conceptual) Copy

```
Policy: "Invoice Deletion - Restricted"
  Target:   DELETE:/api/v1/invoices/{id}
  Effect:   ALLOW
  Roles:    ADMIN
  Conditions:
    - Time:  weekdays 09:00-18:00 only
    - IP:    internal network (10.0.0.0/8)
    - AI:    #ai.riskScore(request) < 0.7
```

The Policy Builder translates this into XACML-compatible conditions that are evaluated at runtime using SpEL expressions.

Runtime Enforcement — Automatic and Immediate

The policy is stored in the database. `CustomDynamicAuthorizationManager` loads policies via `PolicyRetrievalPoint` (with caching) and builds a runtime matcher list.

When a request hits `DELETE /api/v1/invoices/42`:

1.  Spring Security delegates to `CustomDynamicAuthorizationManager`
2.  The manager matches the request URL to the "Invoice Deletion - Restricted" policy
3.  All conditions are evaluated: role check, time window, IP range, AI risk score
4.  If all conditions pass, `AuthorizationDecision(true)` is returned
5.  `CentralAuditFacade` logs the decision asynchronously

**Result:** The endpoint is dynamically protected. No code change. No redeployment. The policy can be updated at any time through the Admin Dashboard.

## Scenario 2 — Protecting a Business Method

Beyond URL-level authorization, Contexa supports method-level protection using the `@Protectable` annotation. This enables fine-grained access control on individual service methods with ownership semantics.

Annotate with @Protectable

```java
@Service
public class DocumentService {

    @Protectable(ownerField = "createdBy")
    public Document getDocument(Long documentId) {
        return documentRepository.findById(documentId)
            .orElseThrow(() -> new NotFoundException("Document not found"));
    }

    @Protectable(ownerField = "createdBy")
    public void updateDocument(Long documentId, UpdateDocumentRequest req) {
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new NotFoundException("Document not found"));
        doc.setTitle(req.getTitle());
        doc.setContent(req.getContent());
        documentRepository.save(doc);
    }
}
```

The `ownerField` parameter tells Contexa which field on the returned entity identifies the resource owner. This enables ownership-based authorization: the owner can always access their own resources.

MethodResourceScanner Detects on Startup

`MethodResourceScanner` scans all beans for `@Protectable` annotations and registers them as METHOD-type resources:

Resource ID

Class

Method

Type

`DocumentService.getDocument`

DocumentService

getDocument

METHOD

`DocumentService.updateDocument`

DocumentService

updateDocument

METHOD

Resource Workbench Shows METHOD Resources

In the Admin Dashboard Resource Workbench, METHOD-type resources appear alongside URL resources. They are visually distinguished and can be managed the same way — assign business names, group them, and create permissions.

Policy Builder with Ownership + AI Conditions

Use the Policy Builder in "from-resource" mode to create policies that combine ownership checks with additional conditions:

Policy Definition (Conceptual) Copy

```
Policy: "Document Update - Owner or Admin"
  Target:   DocumentService.updateDocument
  Effect:   ALLOW
  Rules:
    Rule 1 (Owner Access):
      Condition: #ownership.isOwner(authentication, returnObject)
      Effect:    ALLOW
    Rule 2 (Admin Override):
      Condition: hasRole('ADMIN')
      Effect:    ALLOW
    Rule 3 (AI Risk Gate):
      Condition: #ai.riskScore(request) > 0.8
      Effect:    DENY (overrides all)
```

This policy allows the document owner or an ADMIN to update documents, but blocks the action entirely if the AI risk assessment exceeds the threshold.

Dynamic Method-Level Authorization Active

The policy is now enforced at the method level. When `updateDocument()` is called, Contexa's AOP interceptor evaluates the policy before the method executes. Ownership is resolved by comparing `authentication.getName()` with the entity's `createdBy` field.

## Scenario 3 — AI-Assisted Policy Creation

Contexa integrates AI directly into the policy creation workflow. The AI Policy Builder can analyze resources, recommend conditions, assess risk, and generate complete policies that go through an approval workflow before activation.

### AI-Powered Risk Assessment

When creating a policy for a sensitive resource, the AI engine analyzes:

-   **Resource sensitivity** — Based on the data types accessed (PII, financial, health records)
-   **Historical access patterns** — Who has accessed this resource and how frequently
-   **Threat landscape** — Current security context and known attack vectors
-   **Regulatory requirements** — Applicable compliance frameworks (GDPR, HIPAA, PCI-DSS)

### Condition Auto-Recommendation

Based on the analysis, the AI recommends conditions for the policy:

AI-Generated Recommendations Copy

```
Resource: DELETE:/api/v1/customers/{id}
AI Analysis: HIGH SENSITIVITY (PII data, destructive operation)

Recommended Conditions:
  1. Role restriction:     ADMIN only
  2. Time restriction:     Business hours (M-F 09:00-18:00)
  3. IP restriction:       Internal network only
  4. MFA requirement:      Step-up authentication required
  5. AI risk gate:         #ai.riskScore(request) < 0.5
  6. Rate limit:           Max 10 deletions per hour per user

Confidence: 92%
Rationale: Destructive operation on PII data requires
           maximum protection with multiple condition layers.
```

### Approval Workflow

AI-generated policies are never activated immediately. They follow a strict approval workflow:

AI Generates Policy

Status: DRAFT

submit

Pending Review

Status: PENDING

approve

Active Policy

Status: APPROVED

Only policies with **APPROVED** status are loaded by the `CustomDynamicAuthorizationManager`. Security administrators review AI-generated policies before they take effect.

### AI Expressions in Policies

Once approved, AI-powered conditions are evaluated at runtime using SpEL expressions:

```java
// Allow if AI determines the request is safe
#ai.isAllowed(request, authentication)

// Require step-up authentication if AI detects anomalies
#ai.needsChallenge(request, authentication)

// Numeric risk scoring for threshold-based decisions
#ai.riskScore(request) < 0.7

// Combined with traditional conditions
hasRole('ADMIN') AND #ai.riskScore(request) < 0.5
```

## Scenario 4 — Migrating from Static to Dynamic

This scenario walks through converting an existing application with 20+ lines of hardcoded `requestMatchers` to Contexa's dynamic authorization.

### Before: Static Security Configuration

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers("/css/**", "/js/**", "/images/**").permitAll()
        .requestMatchers("/api/public/**").permitAll()
        .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
        .requestMatchers("/api/admin/settings/**").hasRole("SUPER_ADMIN")
        .requestMatchers("/api/admin/audit/**").hasAuthority("VIEW_AUDIT")
        .requestMatchers("/api/reports/financial/**").hasAnyRole("ADMIN", "FINANCE")
        .requestMatchers("/api/reports/analytics/**").hasAnyRole("ADMIN", "ANALYST")
        .requestMatchers("/api/orders/**").hasAuthority("MANAGE_ORDERS")
        .requestMatchers("/api/customers/**").hasAuthority("MANAGE_CUSTOMERS")
        .requestMatchers("/api/products/**").hasAuthority("MANAGE_PRODUCTS")
        .requestMatchers("/api/inventory/**").hasAnyRole("ADMIN", "WAREHOUSE")
        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.PUT, "/api/users/*/role").hasRole("SUPER_ADMIN")
        // ... more rules
        .anyRequest().authenticated()
    );
    return http.build();
}
```

Enable ResourceScanner (Auto-Configured)

Add the Contexa IAM dependency. `MvcResourceScanner` is auto-configured and runs on startup. All your existing endpoints are automatically discovered and registered as resources.

```yaml
contexa:
  iam:
    resource-scanner:
      enabled: true          # default: true
      scan-on-startup: true  # default: true
```

Review Discovered Resources in Workbench

Open the Admin Dashboard Resource Workbench. All your existing endpoints are listed. Review them, assign business names, and organize into groups. This gives you a complete inventory of every protected surface in your application.

Define Permissions and Create Policies

For each resource (or resource group), create equivalent policies using the Policy Wizard. Map your existing static rules to dynamic policies:

Static Rule

Dynamic Policy

`.hasRole("ADMIN")`

Policy: roles=\[ADMIN\], effect=ALLOW

`.hasAuthority("VIEW_AUDIT")`

Policy: permissions=\[VIEW\_AUDIT\], effect=ALLOW

`.hasAnyRole("ADMIN","FINANCE")`

Policy: roles=\[ADMIN,FINANCE\], effect=ALLOW

Once migrated, you can immediately enhance these policies with conditions that were impossible with static configuration: time-based access, IP restrictions, AI risk assessment, and more.

Replace Static Configuration

Replace your entire static security configuration with a single dynamic line:

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http,
        CustomDynamicAuthorizationManager customDynamicAuthorizationManager)
        throws Exception {
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers("/css/**", "/js/**", "/images/**").permitAll()
        .requestMatchers("/api/public/**").permitAll()
        .anyRequest().access(customDynamicAuthorizationManager)
    );
    return http.build();
}
```

Static matchers remain only for truly public resources (assets, public APIs). Everything else is delegated to the dynamic authorization manager.

Configure Default Policy

Set the default behavior for resources that do not have an explicit policy. See the [Default Policy Management](#default-policy-management) section below for details.

## Default Policy Management

When a request matches a resource that has no explicit policy, the system needs a fallback behavior. This is the **default policy**.

### Current Default Behavior

Out of the box, Contexa's `CustomDynamicAuthorizationManager` returns `new AuthorizationDecision(true)` for unmatched resources. This means: if no policy exists for a resource, access is **allowed** (as long as the user is authenticated).

```java
// Default behavior: allow authenticated users if no policy matches
if (matchingPolicies.isEmpty()) {
    return new AuthorizationDecision(true);
}
```

### Configuring Default Deny

For stricter security postures (recommended for production), configure default deny so that only explicitly authorized resources are accessible:

```yaml
contexa:
  iam:
    authorization:
      default-decision: DENY  # ALLOW or DENY
      log-unmatched: true     # log requests with no matching policy
```

### Managing via Admin Dashboard

The default policy can also be changed through the Admin Dashboard without any application restart. Navigate to **Settings > Authorization > Default Policy** to toggle between ALLOW and DENY. Changes take effect immediately through the database-driven configuration — zero downtime.

## Architecture Deep Dive

This section traces the complete lifecycle of an HTTP request through the dynamic authorization system.

HTTP Request

Incoming request from client

filter chain

PlatformSecurityConfig

Static matchers for public resources (assets, public APIs). Passes all other requests through.

.anyRequest().access()

CustomDynamicAuthorizationManager

Core engine. Matches request to policies, orchestrates evaluation.

find policies

PolicyRetrievalPoint (PRP)

Loads policies from database with caching layer. Supports hot-reload.

evaluate conditions

Expression Evaluation (SpEL + AI)

PolicyTranslator converts conditions to SpEL expression trees. AI expressions evaluated via LLM pipeline.

decision

AuthorizationDecision

ALLOW or DENY with detailed reasoning context.

async

CentralAuditFacade

Asynchronous audit logging with full decision context, user identity, and policy reference.

### Key Components

#### CustomDynamicAuthorizationManager

Implements `AuthorizationManager<RequestAuthorizationContext>`. On initialization, it loads all active policies from the database via `PolicyRetrievalPoint` and builds a list of `RequestMatcherEntry` objects. Each entry maps a URL pattern (with HTTP method) to an `ExpressionAuthorizationManager` that evaluates the policy's conditions.

#### PolicyRetrievalPoint (PRP)

The data access layer for policies. It loads policies from the database, caches them for performance, and supports hot-reload when policies are modified through the Admin Dashboard. The cache invalidation is event-driven — when a policy is created, updated, or deleted, the PRP receives a notification and refreshes its cache.

#### PolicyTranslator

Converts XACML-style policy conditions into SpEL (Spring Expression Language) expression trees. This bridges the gap between the human-readable policy definitions in the Admin Dashboard and the runtime expression evaluation engine in Spring Security.

#### CentralAuditFacade

Every authorization decision is logged asynchronously. The audit log captures the request details, the matched policy, the evaluated conditions, the decision outcome, the user identity, and a timestamp. This provides a complete audit trail for compliance and forensic analysis.

## Advantages Summary

A comprehensive comparison across all dimensions of authorization management.

Dimension

Traditional Spring Security

Contexa Dynamic Authorization

**Policy changes**

Code change, rebuild, redeploy

Admin Dashboard edit, immediate effect

**Deployment required**

Yes, for every rule change

No — database-driven, zero downtime

**Audit trail**

Git commit history only

Full runtime audit log via CentralAuditFacade

**AI integration**

Not possible

AI risk assessment, condition recommendation, policy generation

**Granularity**

URL patterns with role/authority checks

URL + method + ownership + time + IP + AI + custom conditions

**Admin UI**

None — source code only

Resource Workbench, Policy Builder, Policy Wizard

**Resource discovery**

Manual inventory

Automatic via ResourceScanner on startup

**Method-level security**

@PreAuthorize with hardcoded expressions

@Protectable with dynamic, database-driven policies

**Who manages policies**

Developers only

Security admins, compliance officers, developers

**Time to protect new endpoint**

Code + review + merge + deploy (hours/days)

Auto-discovered, policy via Admin UI (minutes)

**Approval workflow**

Code review (PR-based)

Built-in DRAFT → PENDING → APPROVED workflow

**Rollback**

Git revert + redeploy

Disable policy in Admin Dashboard, instant effect

## Related Documentation

-   [Resource Scanner](../../../docs/reference/iam/resource-scanner) — Detailed reference for MvcResourceScanner and MethodResourceScanner
-   [Dynamic URL Authorization](../../../docs/reference/iam/dynamic-authorization) — CustomDynamicAuthorizationManager API reference
-   [Policy Management](../../../docs/reference/iam/policy) — Policy lifecycle, CRUD operations, and AI enrichment
-   [@Protectable](../../../docs/reference/iam/protectable) — Method-level resource protection annotation
-   [XACML Integration](../../../docs/reference/iam/xacml) — Policy model and evaluation engine
-   [Permission Evaluators](../../../docs/reference/iam/permission-evaluators) — Custom expression evaluation
-   [Admin Dashboard](../../../docs/reference/iam/admin) — Web-based administration console

[Previous Admin Dashboard](../../../docs/reference/iam/admin)