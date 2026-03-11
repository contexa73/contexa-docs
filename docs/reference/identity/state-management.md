---
title: "State Management"
---
contexa-identity

# State Management

Post-authentication state management strategy. Choose between Session (server memory/Redis) or OAuth2 (JWT Stateless). Each authentication method can be independently configured with a different state.

## Overview

Configure state by calling `.session()` or `.oauth2()` after an authentication method in the DSL. The `StateSetter` applies the state to the most recently added flow.

```java
registry
    .form(f -> f.loginPage("/login"))
    .session(Customizer.withDefaults())      // form -> Session

    .rest(r -> r.loginProcessingUrl("/api/auth"))
    .oauth2(Customizer.withDefaults())        // rest -> OAuth2

    .mfa(m -> m.primaryAuthentication(...).passkey(...))
    .session(Customizer.withDefaults())        // mfa -> Session

    .build();
```

## Session vs OAuth2 Comparison

Category

Session

OAuth2

State Storage

Server memory / Redis

JWT token (Stateless)

Suitable For

Traditional web apps, SSR

SPA, API, Microservices

Scalability

Requires Redis cluster

Stateless (easy horizontal scaling)

Built-in Security

Session fixation protection (sessionFixation().changeSessionId())

JWT + OIDC + Zero Trust Filter

CSRF

Required (cookie-based)

Not required (token-based)

Logout

Session invalidation + cookie deletion

Token revocation (OAuth2AuthorizationService)

## Session-Based

Configured via `.session(Customizer.withDefaults())`. Suitable for traditional web applications and server-side rendering.

### Auto-Applied

-   `sessionFixation().changeSessionId()` — Session fixation attack protection
-   Session invalidation + cookie deletion on logout
-   `CompositeLogoutHandler` integration (Strategy pattern)

### Additional Configuration via rawHttp

```java
.form(f -> f
    .rawHttp(http -> http.sessionManagement(s -> s
        .maximumSessions(1)
        .maxSessionsPreventsLogin(true)))
)
.session(Customizer.withDefaults())
```

## OAuth2-Based

Configured via `.oauth2(Customizer.withDefaults())`. Suitable for SPA, microservices, and API servers.

### Auto-Applied

-   **Resource Server**: JWT authentication converter, authentication failure/access denied handlers, `SessionCreationPolicy.STATELESS`
-   **Authorization Server**: `AuthorizationService`, `ClientRepository`, token endpoint, `authenticated_user` grant type, OIDC support
-   OAuth2 CSRF: Controlled by the `spring.auth.oauth2-csrf` configuration

### authenticated\_user Grant Type

A custom grant type that issues OAuth2 tokens to users who have completed Identity authentication (Form, REST, MFA). It bridges traditional authentication with OAuth2 token issuance.

```

  authenticated_user Grant Flow
  ===============================

  [Form/REST/MFA Authentication Complete]
           |
           v
  [AuthenticatedUserGrantAuthenticationProvider]
           |
           +-- Client Verification
           +-- User Lookup (UserRepository)
           +-- Scope Resolution
           +-- Access Token Generation (JWT)
           +-- Refresh Token Generation (optional)
           +-- Authorization Persistence (transactional)
           |
           v
  [JWT Token Issuance Complete]
```

## Configuration Properties

Core settings from `AuthContextProperties` (`spring.auth.*`).

### Core Settings (spring.auth.\*)

Property

Type

Default

Description

`state-type`

enum

`OAUTH2`

Authentication state type (OAUTH2, SESSION)

`token-transport-type`

enum

`HEADER`

Token transport method (HEADER, COOKIE, HEADER\_COOKIE)

`token-issuer`

enum

`INTERNAL`

Token issuer (INTERNAL, AUTHORIZATION\_SERVER)

`access-token-validity`

long (ms)

3600000 (1h)

Access token validity period

`refresh-token-validity`

long (ms)

604800000 (7d)

Refresh token validity period

`enable-refresh-token`

boolean

true

Enable refresh token

`allow-multiple-logins`

boolean

false

Allow concurrent multiple logins

`max-concurrent-logins`

int

Maximum concurrent login count

`cookie-secure`

boolean

true

Cookie Secure flag

`token-persistence`

String

"memory"

Token storage (memory, localstorage)

`token-prefix`

String

"Bearer "

Token prefix

`roles-claim`

String

"roles"

JWT roles claim

`oauth2-csrf`

boolean

false

OAuth2 CSRF protection

#### TokenTransportType Details

Value

accessToken

refreshToken

`HEADER`

HTTP Header

HTTP Header

`COOKIE`

Cookie

Cookie

`HEADER_COOKIE` (recommended)

HTTP Header

Cookie

### OAuth2 Settings (spring.auth.oauth2.\*)

Property

Description

`client-id`

OAuth2 client ID

`client-secret`

Client secret

`issuer-uri`

Token issuer URI

`jwk-key-store-path`

JWK keystore path

`jwk-key-store-password`

Keystore password

`jwk-key-alias`

Key alias

### MFA Settings (spring.auth.mfa.\*)

Property

Default

Description

`session-timeout-ms`

600000 (10min)

MFA session timeout

`challenge-timeout-ms`

300000 (5min)

Challenge timeout

`max-retry-attempts`

Maximum retry attempts

`account-lockout-duration-ms`

900000 (15min)

Account lockout duration

`otp-token-validity-seconds`

300

OTP validity period (seconds)

`otp-token-length`

OTP code length

`device-remember-duration-ms`

2592000000 (30d)

Device trust retention period

`session-storage-type`

http-session

Session storage (http-session, redis, memory)

### Session Security Settings (security.session.\*)

Property

Description

`header.name`

Session header name (default: X-Auth-Token)

`cookie.name`

Session cookie name (default: SESSION)

`hijack.detection.enabled`

Enable session hijacking detection

`threat.ip-change-risk`

IP change risk score (default: 0.4)

`threat.ua-change-risk`

User-Agent change risk score (default: 0.3)

### application.yml Example

```yaml
spring:
  auth:
    state-type: OAUTH2
    token-transport-type: header_cookie
    access-token-validity: 3600000
    enable-refresh-token: true
    oauth2:
      client-id: my-client
      issuer-uri: https://auth.example.com
      jwk-key-store-path: classpath:keystore.jks
    mfa:
      session-timeout-ms: 600000
      otp-token-validity-seconds: 300
      session-storage-type: redis
```

[Previous ASEP Annotations](../../../docs/reference/identity/asep) [Next Authorization Overview](../../../docs/reference/iam/xacml)