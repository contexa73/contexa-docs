---
title: "Permission Evaluators"
---
contexa-iam

# Permission Evaluators

Composite permission evaluation system implementing Spring Security's `PermissionEvaluator` with domain-specific evaluators for fine-grained method-level access control.

### Choosing the Right Approach

Approach

Scope

Use Case

`hasPermission()`

Object-level

Fine-grained CRUD permissions on specific domain objects

`hasRole()`

Global

Broad access control based on user roles

`@Protectable`

Method-level

Dynamic policy-driven authorization with AI integration

## Quick Start

Use `hasPermission()` in `@PreAuthorize` annotations or SpEL policy conditions to check fine-grained permissions.

### In Annotations

```java
@PreAuthorize("hasPermission(#id, 'USER', 'READ')")
public User getUser(Long id) { ... }

@PreAuthorize("hasPermission(#id, 'ORDER', 'UPDATE')")
public void updateOrder(Long id, OrderDto dto) { ... }
```

### In Policy Conditions

When creating policies via the Admin Dashboard or Policy Builder, use `hasPermission()` in SpEL condition expressions:

SpEL Copy

```
hasPermission(#targetId, 'DOCUMENT', 'DELETE')
hasPermission(#targetId, 'REPORT', 'READ') and #ai.isAllowed()
```

## CRUD Synonym Mapping

Permission evaluators use synonym groups so that equivalent actions are treated as the same permission. For example, `GET`, `FIND`, `READ`, `FETCH`, `VIEW`, and `RETRIEVE` all resolve to the same READ group.

Permission Group

Synonyms

READ

`GET`, `FIND`, `READ`, `FETCH`, `VIEW`, `RETRIEVE`

CREATE

`CREATE`, `SAVE`, `ADD`, `INSERT`, `REGISTER`, `POST`

UPDATE

`UPDATE`, `EDIT`, `MODIFY`, `CHANGE`, `PATCH`, `PUT`

DELETE

`DELETE`, `REMOVE`, `DESTROY`, `DROP`, `ERASE`, `PURGE`

This means `hasPermission(#id, 'USER', 'FETCH')` is equivalent to `hasPermission(#id, 'USER', 'READ')`.

## Architecture

The permission evaluation system follows a composite pattern. `CompositePermissionEvaluator` acts as the entry point, routing `hasPermission()` calls to the appropriate domain-specific evaluator based on the permission string prefix or target type.

Text Copy

hasPermission(auth, target, 'USER\_READ')

SpEL expression triggers permission evaluation

CompositePermissionEvaluator

Routes to domain evaluators sorted by domain length (longest first)

UserPermissionEvaluator

domain: "USER"

RolePermissionEvaluator

domain: "ROLE"

RoleHierarchyPermissionEvaluator

domain: "ROLE\_HIERARCHY"

GroupPermissionEvaluator

domain: "GROUP"

DomainPermissionEvaluator

domain: custom (user-defined)

PermissionTargetPermissionEvaluator

domain: "PERMISSION"

## CompositePermissionEvaluator

Implements Spring Security's `PermissionEvaluator` interface and routes permission checks to domain-specific evaluators.

```java
public class CompositePermissionEvaluator implements PermissionEvaluator {

    // Sorted by domain length (descending) for longest-prefix matching
    // e.g., ROLE_HIERARCHY matches before ROLE
    private final List<DomainPermissionEvaluator> evaluators;

    // Permission-string routing (e.g., "USER_READ" -> UserPermissionEvaluator)
    @Override
    public boolean hasPermission(Authentication authentication,
                                 Object targetDomainObject,
                                 Object permission) { ... }

    // Target-type routing (e.g., targetType="ROLE" -> RolePermissionEvaluator)
    @Override
    public boolean hasPermission(Authentication authentication,
                                 Serializable targetId,
                                 String targetType,
                                 Object permissionAction) { ... }

    // Entity resolution for UI display
    public Object resolveEntity(Serializable targetId, String targetType) { ... }
}
```

### Routing Logic

Method Signature

Routing Strategy

`hasPermission(auth, target, permission)`

Routes to the first evaluator whose `supportsPermission()` method returns `true` for the given permission string. The permission is matched against evaluators by domain prefix (e.g., `USER_READ` routes to the User evaluator).

`hasPermission(auth, targetId, targetType, action)`

Routes to the first evaluator whose `supportsTargetType()` method returns `true` for the given target type. Target type matching is case-insensitive.

## DomainPermissionEvaluator Interface

```java
public interface DomainPermissionEvaluator {
    boolean supportsTargetType(String targetType);
    boolean supportsPermission(String permission);
    boolean hasPermission(Authentication auth, Object target, Object permission);
    boolean hasPermission(Authentication auth, Serializable targetId,
                          String targetType, Object permission);
    Object resolveEntity(Serializable targetId);
}
```

## AbstractDomainPermissionEvaluator

Base class providing common functionality for all domain evaluators. Implements CRUD synonym resolution and `PermissionAuthority`\-based permission matching.

### Permission Matching

Permission strings are matched against the user's `PermissionAuthority` grants. The matching process:

1.  Strip the domain prefix (e.g., `USER_READ` → `READ`)
2.  Resolve CRUD synonyms for the action verb
3.  Match against authorities with target type `METHOD` that contain both the action synonym and the domain name

### CRUD Synonym Groups

Group

Synonyms

Read

`GET`, `FIND`, `READ`, `FETCH`, `VIEW`, `RETRIEVE`, `LIST`, `SEARCH`

Create

`CREATE`, `SAVE`, `ADD`, `INSERT`, `REGISTER`, `POST`

Update

`UPDATE`, `EDIT`, `MODIFY`, `CHANGE`, `PATCH`, `PUT`

Delete

`DELETE`, `REMOVE`, `DESTROY`, `DROP`, `ERASE`, `PURGE`, `CLEAR`, `TRUNCATE`

For example, `hasPermission(auth, null, 'USER_FETCH')` will match if the user has any authority containing `USER` and any of `GET`, `FIND`, `READ`, `FETCH`, `VIEW`, `RETRIEVE`, `LIST`, or `SEARCH`.

### Entity Resolution

Each evaluator resolves entities via a named repository bean from the `ApplicationContext`. The `resolveEntity()` method calls `findById()` on the resolved repository using reflection.

## Domain Evaluators

Evaluator

Domain

Repository Bean

Permission Prefix

`UserPermissionEvaluator`

`USER`

`userRepository`

`USER_*`

`RolePermissionEvaluator`

`ROLE`

`roleRepository`

`ROLE_*`

`RoleHierarchyPermissionEvaluator`

`ROLE_HIERARCHY`

`roleHierarchyRepository`

`ROLE_HIERARCHY_*`

`GroupPermissionEvaluator`

`GROUP`

`groupRepository`

`GROUP_*`

`PermissionTargetPermissionEvaluator`

`PERMISSION`

`permissionRepository`

`PERMISSION_*`

All evaluators extend `AbstractDomainPermissionEvaluator` and only define their `domain()`, `repositoryBeanName()`, and `getApplicationContext()` methods. The permission check logic is inherited from the abstract base.

## Evaluation Order

Evaluators are sorted by domain string length in descending order. This ensures that more specific domains are matched first:

1.  `ROLE_HIERARCHY` (14 chars) — checked first
2.  `PERMISSION` (10 chars)
3.  `GROUP` (5 chars)
4.  `USER` (4 chars)
5.  `ROLE` (4 chars)

This ordering prevents `ROLE_HIERARCHY_READ` from being incorrectly matched by the `ROLE` evaluator.

## Usage in SpEL Expressions

```java
// Permission-string based (routed by prefix)
@PreAuthorize("hasPermission(null, 'USER_READ')")
public List<UserDto> getUsers() { ... }

// Target-type based (routed by targetType parameter)
@PreAuthorize("hasPermission(#id, 'ROLE', 'EDIT')")
public void updateRole(@PathVariable Long id, @RequestBody RoleDto dto) { ... }

// Group-scoped permission
@PreAuthorize("hasPermission(#groupId, 'GROUP', 'DELETE')")
public void deleteGroup(@PathVariable Long groupId) { ... }
```

## Managing Permissions via Admin Dashboard

Permissions can be created and managed through the Admin Dashboard UI, providing a visual interface for defining fine-grained access controls that integrate with the `CompositePermissionEvaluator` routing system.

### Navigating to Permission Management

Go to **Admin > ID & Access Management > Permission Management**. This view lists all defined permissions with their target types, action types, and associated roles.

### Creating a New Permission

Click "Create Permission" and fill in the following fields:

Field

Description

Example

**Name**

A unique identifier for the permission, typically in `DOMAIN_ACTION` format

`ORDER_UPDATE`

**Description**

Human-readable explanation of what this permission grants

"Allows updating existing customer orders"

**Target Type**

The resource scope: `URL` for endpoint-level or `METHOD` for method-level permissions

`METHOD`

**Action Type**

The CRUD action: `READ`, `CREATE`, `UPDATE`, `DELETE`, or a custom action

`UPDATE`

### Associating Permissions with Roles

After creating a permission, navigate to the role management section to associate it. Open the target role, go to the "Permissions" tab, and add the newly created permission. When a user with that role invokes `hasPermission()`, the `CompositePermissionEvaluator` checks whether the user's `PermissionAuthority` grants include the matching domain and action.

### How Permissions Connect to DomainPermissionEvaluator Routing

Permissions created in the Admin Dashboard are stored as `PermissionAuthority` grants on the user's authentication token. When `hasPermission()` is called, `CompositePermissionEvaluator` routes the call to the appropriate `DomainPermissionEvaluator` based on the domain prefix. The evaluator then checks whether the user's authorities include a matching permission with the correct action synonym group.

## Using hasPermission() in Policy Builder

When creating policies in the [Policy Builder](../../../docs/reference/iam/policy), `hasPermission()` can be used within SpEL condition expressions to combine permission-based access control with other authorization checks.

:::warning
**Important:** `hasPermission()` is **stripped from URL-level policies**. It only works in method-level policies (i.e., policies targeting `METHOD` resources such as `@Protectable` methods). If you include `hasPermission()` in a URL-level policy condition, it will be ignored during evaluation.
:::

### Examples of Policy Conditions

SpEL Copy

```
// Permission check only
hasPermission(#targetId, 'DOCUMENT', 'READ')

// Combined with AI security expression
hasPermission(#targetId, 'ORDER', 'UPDATE') and #ai.isAllowed()

// Combined with role check
hasPermission(#targetId, 'REPORT', 'DELETE') or hasRole('ADMIN')

// Combined with time-based condition
hasPermission(#targetId, 'PAYMENT', 'CREATE') and #time.isBusinessHours()
```

In the Policy Builder UI, these expressions are entered in the "Condition" field when defining a policy rule. The expression editor provides auto-completion for `hasPermission()` parameters when the target resource type is `METHOD`.

## Creating Custom Domain Evaluators

You can extend the permission evaluation system by implementing the `DomainPermissionEvaluator` interface for your own domain types. Custom evaluators are automatically detected by `CompositePermissionEvaluator` when registered as Spring beans.

### Implementation Steps

1.  Implement the `DomainPermissionEvaluator` interface
2.  Define `domain()` to return your domain name (e.g., `"DOCUMENT"`)
3.  Define `repositoryBeanName()` to return the Spring bean name of the repository that handles your domain entities
4.  Register the class as a Spring `@Component` — `CompositePermissionEvaluator` auto-detects all `DomainPermissionEvaluator` beans in the application context

### Example Implementation

```java
@Component
public class DocumentPermissionEvaluator
        extends AbstractDomainPermissionEvaluator {

    private final ApplicationContext applicationContext;

    public DocumentPermissionEvaluator(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    @Override
    public String domain() {
        return "DOCUMENT";
    }

    @Override
    public String repositoryBeanName() {
        return "documentRepository";
    }

    @Override
    protected ApplicationContext getApplicationContext() {
        return applicationContext;
    }
}
```

With this bean registered, `hasPermission(#id, 'DOCUMENT', 'READ')` will automatically route to `DocumentPermissionEvaluator`. The base class `AbstractDomainPermissionEvaluator` handles CRUD synonym resolution, `PermissionAuthority` matching, and entity resolution via the named repository bean.

### Auto-Detection and Ordering

`CompositePermissionEvaluator` collects all `DomainPermissionEvaluator` beans at startup and sorts them by domain string length (longest first). This ensures that a custom evaluator with domain `"DOCUMENT_ARCHIVE"` is matched before one with domain `"DOCUMENT"`. No additional configuration is required beyond registering the bean.

[Previous AI Security Expressions](../../../docs/reference/iam/ai-security-expressions) [Next Policy Management](../../../docs/reference/iam/policy)