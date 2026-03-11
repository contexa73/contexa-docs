---
title: "Authentication"
---
contexa-identity

# Authentication

DSL options and code examples for each authentication method. Detailed reference for authentication methods configured via `.form()`, `.rest()`, `.ott()`, `.passkey()` in the [Identity DSL](dsl).

## Overview

Contexa Identity provides four authentication methods. Each method creates an independent `SecurityFilterChain`, and priority is controlled via `order()`.

Authentication Method

DSL Method

Default Order

Purpose

Form Login

`.form()`

100

Traditional web form login (server-rendered)

REST API

`.rest()`

200

JSON-based API authentication (SPA, mobile)

One-Time Token

`.ott()`

300

Magic Link / email authentication

WebAuthn / Passkey

`.passkey()`

400

Biometric authentication / hardware keys

All authentication methods support access to the full Spring Security API via [rawHttp()](dsl#rawhttp--full-spring-security-access), and support [common options](dsl#common-options) (order, CSRF, CORS, headers, logout, etc.).

:::info
For how to use these authentication methods with **MFA (Multi-Factor Authentication)**, see the [Adaptive MFA](mfa) documentation. URLs, adapters, and state management behave differently in single authentication vs. MFA flows.
:::

## Form Login

Traditional web form-based login. Configures Spring Security's `formLogin()` via the DSL. Default order is **100**.

### All Options

Method

Type

Default

Description

`loginPage(String)`

String

AuthUrlProvider default

Login page URL

`usernameParameter(String)`

String

`"username"`

Username parameter name

`passwordParameter(String)`

String

`"password"`

Password parameter name

`loginProcessingUrl(String)`

String

AuthUrlProvider default

Login processing URL

`defaultSuccessUrl(String)`

String

—

Redirect URL after successful login

`defaultSuccessUrl(String, boolean)`

String, boolean

—

Success URL + alwaysUse flag

`failureUrl(String)`

String

—

Redirect URL on login failure

`permitAll()`

—

—

Allow unauthenticated access to login page

`successHandler(PlatformAuthenticationSuccessHandler)`

Handler

Auto-selected

Custom success handler

`failureHandler(PlatformAuthenticationFailureHandler)`

Handler

Auto-selected

Custom failure handler

`securityContextRepository(SecurityContextRepository)`

Repository

Auto-selected by state type

Security context repository

`rawFormLogin(SafeHttpFormLoginCustomizer)`

Customizer

—

Direct customization within `formLogin()`

`rawHttp(SafeHttpCustomizer<HttpSecurity>)`

Customizer

—

Full Spring Security API access (cumulative)

`order(int)`

int

100

Filter chain priority

`asep(Customizer<FormAsepAttributes>)`

Customizer

—

ASEP annotation attribute configuration

### Basic Configuration

```java
registry
    .form(form -> form
        .loginPage("/login")
        .defaultSuccessUrl("/home")
        .failureUrl("/login?error")
        .permitAll()
    )
    .session(Customizer.withDefaults())
    .build();
```

### Custom Handlers

```java
registry
    .form(form -> form
        .loginPage("/login")
        .usernameParameter("email")
        .passwordParameter("passwd")
        .successHandler(customSuccessHandler)
        .failureHandler(customFailureHandler)
    )
    .session(Customizer.withDefaults())
    .build();
```

### Advanced Configuration (rawHttp + rawFormLogin)

```java
registry
    .form(form -> form
        .order(20)
        .loginPage("/admin/login")
        .rawFormLogin(formLogin -> formLogin
            .usernameParameter("admin_user")
            .passwordParameter("admin_pass"))
        .rawHttp(http -> http
            .securityMatcher("/admin/**")
            .sessionManagement(session -> session
                .maximumSessions(1)
                .maxSessionsPreventsLogin(true)))
    )
    .session(Customizer.withDefaults())
    .build();
```
:::info
**rawFormLogin() vs rawHttp()**
`rawFormLogin()` only customizes the internals of `HttpSecurity.formLogin()`. `rawHttp()` provides access to the full Spring Security API (`sessionManagement`, `securityMatcher`, custom filter registration, etc.). Both methods support cumulative invocations.
:::

## REST API Authentication

JSON-based REST API authentication. Authenticates via JSON payloads from frontend clients such as SPAs and mobile apps. Default order is **200**.

### All Options

Method

Type

Default

Description

`loginProcessingUrl(String)`

String

AuthUrlProvider default

REST login processing URL

`defaultSuccessUrl(String)`

String

—

Redirect URL after success

`defaultSuccessUrl(String, boolean)`

String, boolean

—

Success URL + alwaysUse flag

`failureUrl(String)`

String

—

Redirect URL on failure

`successHandler(PlatformAuthenticationSuccessHandler)`

Handler

Auto-selected

Custom success handler

`failureHandler(PlatformAuthenticationFailureHandler)`

Handler

Auto-selected

Custom failure handler

`securityContextRepository(SecurityContextRepository)`

Repository

Auto-selected by state type

Security context repository

`rawHttp(SafeHttpCustomizer<HttpSecurity>)`

Customizer

—

Full Spring Security API access (cumulative)

`order(int)`

int

200

Filter chain priority

`asep(Customizer<RestAsepAttributes>)`

Customizer

—

ASEP annotation attribute configuration

### Basic Configuration

```java
registry
    .rest(rest -> rest
        .loginProcessingUrl("/api/auth/login")
    )
    .oauth2(Customizer.withDefaults())
    .build();
```

### Stateless API Configuration (rawHttp)

```java
registry
    .rest(rest -> rest
        .order(50)
        .loginProcessingUrl("/api/auth")
        .rawHttp(http -> http
            .securityMatcher("/api/**")
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)))
    )
    .oauth2(Customizer.withDefaults())
    .build();
```
:::info
**REST + OAuth2 Combination**
REST API authentication is typically combined with `.oauth2()` for stateless JWT-based operation. It can also be combined with `.session()`, but OAuth2 is recommended for API servers.
:::

## One-Time Token (Magic Link)

Authentication via a one-time token sent by email or SMS. Passwordless authentication using the Magic Link approach. Default order is **300**.

### All Options

Method

Type

Default

Description

`tokenGeneratingUrl(String)`

String

—

Token generation request URL

`defaultSubmitPageUrl(String)`

String

—

Token input page URL

`usernameParameter(String)`

String

`"username"`

Username parameter name

`tokenParameter(String)`

String

`"token"`

Token parameter name

`showDefaultSubmitPage(boolean)`

boolean

`true`

Whether to display the default token submit page

`tokenService(OneTimeTokenService)`

Service

—

Token generation/verification service implementation (required)

`tokenGenerationSuccessHandler(OneTimeTokenGenerationSuccessHandler)`

Handler

—

Token generation success handler (e.g., email delivery)

`loginProcessingUrl(String)`

String

AuthUrlProvider default

Token verification processing URL

`successHandler(PlatformAuthenticationSuccessHandler)`

Handler

Auto-selected

Authentication success handler

`failureHandler(PlatformAuthenticationFailureHandler)`

Handler

Auto-selected

Authentication failure handler

`rawHttp(SafeHttpCustomizer<HttpSecurity>)`

Customizer

—

Full Spring Security API access (cumulative)

`order(int)`

int

300

Filter chain priority

`asep(Customizer<OttAsepAttributes>)`

Customizer

—

ASEP annotation attribute configuration

### Basic Configuration

```java
registry
    .ott(ott -> ott
        .tokenService(customTokenService)
        .tokenGenerationSuccessHandler(emailSendingHandler)
    )
    .session(Customizer.withDefaults())
    .build();
```

### Custom Pages + Email Delivery Handler

```java
registry
    .ott(ott -> ott
        .tokenGeneratingUrl("/auth/magic-link/request")
        .defaultSubmitPageUrl("/auth/magic-link/verify")
        .tokenParameter("code")
        .showDefaultSubmitPage(false)
        .tokenService(jpaOneTimeTokenService)
        .tokenGenerationSuccessHandler((request, response, token) -> {
            String email = request.getParameter("username");
            emailService.sendMagicLink(email, token.getTokenValue());
            response.sendRedirect("/auth/magic-link/sent");
        })
    )
    .session(Customizer.withDefaults())
    .build();
```

## WebAuthn / Passkey

FIDO2 WebAuthn-based biometric and hardware security key authentication. The most secure form of passwordless authentication. Default order is **400**.

### All Options

Method

Type

Default

Description

`rpName(String)`

String

`"contexa-identity"`

Relying Party name (displayed to users)

`rpId(String)`

String

`"localhost"`

Relying Party ID (domain)

`allowedOrigins(Set<String>)`

Set<String>

`["http://localhost:8080"]`

Allowed origins list

`allowedOrigins(String...)`

String...

—

Allowed origins (varargs)

`assertionOptionsEndpoint(String)`

String

—

Assertion options endpoint

`loginProcessingUrl(String)`

String

AuthUrlProvider default

Authentication processing URL

`successHandler(PlatformAuthenticationSuccessHandler)`

Handler

Auto-selected

Authentication success handler

`failureHandler(PlatformAuthenticationFailureHandler)`

Handler

Auto-selected

Authentication failure handler

`rawHttp(SafeHttpCustomizer<HttpSecurity>)`

Customizer

—

Full Spring Security API access (cumulative)

`order(int)`

int

400

Filter chain priority

`asep(Customizer<PasskeyAsepAttributes>)`

Customizer

—

ASEP annotation attribute configuration

### Basic Configuration

```java
registry
    .passkey(passkey -> passkey
        .rpName("My Application")
        .rpId("example.com")
        .allowedOrigins("https://example.com")
    )
    .session(Customizer.withDefaults())
    .build();
```

### Passkey Registration Flow

Passkey registration proceeds in three steps. The server's `JdbcUserCredentialRepository` stores the credentials.

```

  Client                         Server
    |                               |
    |  1. GET /webauthn/register    |
    |        /options               |
    |  ---------------------------> |
    |                               | PublicKeyCredentialCreationOptions
    |  <--------------------------- | (rpId, rpName, userId, challenge)
    |                               |
    |  2. navigator.credentials     |
    |        .create(options)       |
    |  [Browser WebAuthn API]       |
    |                               |
    |  3. POST /webauthn/register   |
    |  ---------------------------> |
    |  (AuthenticatorAttestation    | Verify + Store in
    |   Response)                   | JdbcUserCredentialRepository
    |                               |
    |  <--- 201 Created ----------- |
```

### Passkey Management REST API

Method

URL

Description

`GET`

`/webauthn/register/options`

Generate registration options (PublicKeyCredentialCreationOptions)

`POST`

`/webauthn/register`

Register credential (AuthenticatorAttestationResponse verification)

`POST`

`/webauthn/assertion/options`

Generate authentication challenge (assertionOptionsEndpoint)

`DELETE`

`/webauthn/credentials/{credentialId}`

Delete credential

### Single Authentication vs MFA Second Factor

Passkey uses completely different URLs, adapters, and state management for single authentication versus MFA second-factor authentication.

Aspect

Single Authentication

MFA Second Factor

Authentication URL

`/login/webauthn`

`/mfa/webauthn/authenticate`

Adapter

`SinglePasskeyAuthenticationAdapter`

`MfaPasskeyAuthenticationAdapter`

Filter

Spring Security built-in

`MfaPasskeyAuthenticationFilter`

State Management

SecurityContextRepository

MFA State Machine

DSL Configuration

`.passkey()`

`.mfa(m -> m.passkey())`

## Automatic Handler Resolution

When no custom handler is specified for an authentication method, the appropriate handler is automatically selected based on the authentication flow and state type.

### Success / Failure Handler Selection Rules

Flow

State Type

Success Handler

Failure Handler

Single Auth

Session

Spring Security default

Spring Security default

Single Auth

OAuth2

`OAuth2SingleAuthSuccessHandler`

`OAuth2SingleAuthFailureHandler`

MFA Primary

Any

`PrimaryAuthenticationSuccessHandler`

`UnifiedAuthenticationFailureHandler`

MFA Subsequent

Any

`MfaFactorProcessingSuccessHandler`

`UnifiedAuthenticationFailureHandler`

### SecurityContextRepository Selection Rules

Flow

Phase

Repository

Single Auth

Session

`HttpSessionSecurityContextRepository`

Single Auth

OAuth2

`NullSecurityContextRepository`

MFA

Primary (not final)

`NullSecurityContextRepository`

MFA

Final step

Auto-selected by state type

MFA

Intermediate step

`NullSecurityContextRepository`

For custom handler implementation, refer to the Extension Points section in the [Adaptive MFA](mfa) documentation.

[Previous Identity DSL](../../../docs/reference/identity/dsl) [Next Adaptive MFA](../../../docs/reference/identity/mfa)