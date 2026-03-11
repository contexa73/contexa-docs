---
title: "ASEP Annotations"
---
contexa-identity

# ASEP Annotations

An annotation system for declaratively accessing the security context from controllers. Injects the current user, authentication object, and request headers/body/attributes directly into method parameters, and handles security exceptions at the filter chain level.

## Overview

ASEP annotations operate within the Security Filter Chain, before Spring MVC's `DispatcherServlet`. This allows authentication and authorization failures to be handled at the filter level, intercepting them before Spring MVC exception handling.

```

  ASEP Processing Flow
  =====================

  [HTTP Request]
       |
       v
  [Security Filter Chain]
       |
       v
  [ASEPFilter] --- on security exception --->  [@SecurityExceptionHandler]
       |                                              |
       v                                              v
  [DispatcherServlet]                       [Custom Error Response]
       |
       v
  [@SecurityPrincipal]  - Injects current user
  [@AuthenticationObject] - Injects authentication object
  [@SecurityRequestHeader] - Injects request header
```

### Enabling ASEP in DSL

Call `asep()` for each authentication method to configure the ASEP attributes.

```java
registry
    .form(form -> form
        .loginPage("/login")
        .asep(asep -> asep
            .enableExceptionHandling(true)
            .addArgumentResolver(customResolver)))
    .session(Customizer.withDefaults())
    .build();
```

ASEP attribute classes: `FormAsepAttributes`, `RestAsepAttributes`, `OttAsepAttributes`, `PasskeyAsepAttributes`, `MfaAsepAttributes`

## Argument Injection Annotations

These annotations enable direct injection of security context data into handler method parameters. Each has a corresponding `SecurityHandlerMethodArgumentResolver` implementation.

### @SecurityPrincipal

Injects the current security principal into a method parameter. Resolves from `SecurityContextHolder`.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

```java
@SecurityExceptionHandler(AuthenticationException.class)
public ResponseEntity<ErrorResponse> handleAuthError(
        @SecurityPrincipal Object principal,
        AuthenticationException ex) {
    // principal is resolved from SecurityContextHolder
    return ResponseEntity.status(401).body(
        new ErrorResponse("AUTH_FAILED", ex.getMessage()));
}
```

### @AuthenticationObject

Injects the full `Authentication` object from the security context, providing access to credentials, authorities, and authentication details.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

```java
@SecurityExceptionHandler(AccessDeniedException.class)
public ResponseEntity<ErrorResponse> handleAccessDenied(
        @AuthenticationObject Authentication auth,
        AccessDeniedException ex) {
    String username = auth != null ? auth.getName() : "anonymous";
    return ResponseEntity.status(403).body(
        new ErrorResponse("ACCESS_DENIED", "User " + username + " lacks permission"));
}
```

### @SecurityCookieValue

Injects a cookie value from the HTTP request within a security exception handler context.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`value` / `name`

`String`

`""`

Cookie name.

`required`

`boolean`

`true`

Whether the cookie must be present.

`defaultValue`

`String`

none

Default value when cookie is absent and not required.

### @SecurityRequestBody

Deserializes the HTTP request body within a security exception handler context using the configured `HttpMessageConverter` instances.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`required`

`boolean`

`true`

Whether the request body must be present.

### @SecurityRequestAttribute

Injects a servlet request attribute value.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`value` / `name`

`String`

`""`

Request attribute name.

`required`

`boolean`

`true`

Whether the attribute must be present.

### @SecurityRequestHeader

Injects an HTTP request header value.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`value` / `name`

`String`

`""`

Header name.

`required`

`boolean`

`true`

Whether the header must be present.

`defaultValue`

`String`

none

Default value when header is absent and not required.

### @SecuritySessionAttribute

Injects an HTTP session attribute value.

`@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`value` / `name`

`String`

`""`

Session attribute name.

`required`

`boolean`

`true`

Whether the attribute must be present.

## Exception Handling Annotations

### @SecurityExceptionHandler

Marks a method as a security exception handler. Methods annotated with this are invoked by the `SecurityExceptionHandlerInvoker` when a matching exception occurs within the security filter chain. This is the security-layer equivalent of Spring MVC's `@ExceptionHandler`.

`@Target(ElementType.METHOD) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`value`

`Class<? extends Throwable>[]`

`{}`

Exception types this handler catches. If empty, the handler method's exception parameter type is used.

`priority`

`int`

`LOWEST_PRECEDENCE`

Handler priority. Lower values have higher priority.

`produces`

`String[]`

`{}`

Producible media types (e.g., `"application/json"`).

### @SecurityControllerAdvice

Marks a class as a security controller advice bean, analogous to Spring MVC's `@ControllerAdvice`. Classes annotated with this are scanned by the `SecurityExceptionHandlerMethodRegistry` to discover `@SecurityExceptionHandler` methods.

`@Target(ElementType.TYPE) @Retention(RetentionPolicy.RUNTIME)`

Attribute

Type

Default

Description

`value` / `basePackages`

`String[]`

`{}`

Base packages to scan for applicability.

`basePackageClasses`

`Class<?>[]`

`{}`

Classes whose packages are used as base packages.

`assignableTypes`

`Class<?>[]`

`{}`

Specific types this advice applies to.

```java
@SecurityControllerAdvice
public class GlobalSecurityExceptionAdvice {

    @SecurityExceptionHandler(AuthenticationException.class)
    @SecurityResponseBody
    public ResponseEntity<Map<String, Object>> handleAuthFailure(
            @AuthenticationObject Authentication auth,
            @SecurityRequestHeader(value = "X-Request-ID", required = false) String requestId,
            AuthenticationException ex) {

        Map<String, Object> body = Map.of(
            "error", "AUTHENTICATION_FAILED",
            "message", ex.getMessage(),
            "requestId", requestId != null ? requestId : "unknown"
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @SecurityExceptionHandler(AccessDeniedException.class)
    @SecurityResponseBody
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            @SecurityPrincipal Object principal,
            AccessDeniedException ex) {

        Map<String, Object> body = Map.of(
            "error", "ACCESS_DENIED",
            "message", ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }
}
```

## Response Annotations

### @SecurityResponseBody

Indicates that the return value of a `@SecurityExceptionHandler` method should be serialized to the HTTP response body using the configured `HttpMessageConverter` instances. Internally meta-annotated with Spring's `@ResponseBody`.

`@Target({ElementType.TYPE, ElementType.METHOD}) @Retention(RetentionPolicy.RUNTIME)`

## Complete Example

A complete example of a security controller and global exception handling using ASEP annotations.

```java
@RestController
@RequestMapping("/api/user")
public class UserController {

    @GetMapping("/profile")
    public UserProfile getProfile(
            @SecurityPrincipal UserDetails user,
            @AuthenticationObject Authentication auth,
            @SecurityRequestHeader("X-Device-Id") String deviceId) {
        return userService.getProfile(user.getUsername());
    }
}

@SecurityControllerAdvice
public class GlobalSecurityExceptionHandler {

    @SecurityExceptionHandler(AuthenticationException.class)
    @SecurityResponseBody
    public ErrorResponse handleAuthError(
            AuthenticationException ex,
            @SecurityPrincipal UserDetails user) {
        return new ErrorResponse("AUTH_FAILED", ex.getMessage());
    }

    @SecurityExceptionHandler(AccessDeniedException.class)
    @SecurityResponseBody
    public ErrorResponse handleAccessDenied(
            AccessDeniedException ex,
            @SecurityRequestAttribute("requestURI") String uri) {
        return new ErrorResponse("ACCESS_DENIED", "Forbidden: " + uri);
    }
}
```

[Previous Adaptive MFA](../../../docs/reference/identity/mfa) [Next State Management](../../../docs/reference/identity/state-management)