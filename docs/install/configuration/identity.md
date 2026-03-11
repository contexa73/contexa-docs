---
title: "Identity Configuration"
---
# Identity Configuration

Configuration properties for the Contexa identity module, covering authentication context, token management, MFA (Multi-Factor Authentication), and the state machine engine.

## Auth Context Properties

Properties under the `spring.auth` prefix, bound to `AuthContextProperties`. Controls the authentication context including state type, token transport, token lifecycle, and concurrent login policies.

### Core Authentication Settings

Property

Type

Default

Description

`spring.auth`

`.stateType`

`StateType`

`OAUTH2`

Authentication state management strategy. `SESSION` uses server-side sessions; `OAUTH2` uses token-based OAuth 2.0 flow

`.tokenTransportType`

`TokenTransportType`

`HEADER`

How tokens are transmitted between client and server. `HEADER` uses Authorization header; `COOKIE` uses HTTP cookies

`.accessTokenValidity`

`long`

`3600000`

Access token validity duration in milliseconds (default: 1 hour)

`.refreshTokenValidity`

`long`

`604800000`

Refresh token validity duration in milliseconds (default: 7 days)

`.enableRefreshToken`

`boolean`

`true`

Whether refresh tokens are issued alongside access tokens

`.allowMultipleLogins`

`boolean`

`false`

Whether a user can have multiple concurrent active sessions

`.maxConcurrentLogins`

`int`

`3`

Maximum number of concurrent login sessions per user (applies when `allowMultipleLogins` is true)

`.cookieSecure`

`boolean`

`true`

Whether authentication cookies require HTTPS transport

`.tokenPersistence`

`String`

`"memory"`

Token persistence strategy. Supported values: `memory`, `redis`, `jdbc`

`.oauth2Csrf`

`boolean`

`false`

Whether CSRF protection is enabled for OAuth2 endpoints

```yaml
spring:
  auth:
    stateType: OAUTH2
    tokenTransportType: HEADER
    accessTokenValidity: 3600000
    refreshTokenValidity: 604800000
    enableRefreshToken: true
    allowMultipleLogins: false
    maxConcurrentLogins: 3
    cookieSecure: true
    tokenPersistence: memory
    oauth2Csrf: false
```

See also: [AuthContext Reference](/docs/reference/identity/authentication)

### URL Configuration

Nested URL configuration objects under `spring.auth.urls` that define endpoint paths for different authentication flows.

Property

Type

Default

Description

`spring.auth.urls`

`.single`

`SingleAuthUrls`

\-

Login and logout URL paths for single-factor authentication flows

`.primary`

`PrimaryAuthUrls`

\-

URL paths for primary authentication endpoints

`.mfa`

`MfaUrls`

\-

URL paths for MFA challenge, verification, and enrollment endpoints

`.factors`

`FactorUrls`

\-

URL paths for individual factor-specific endpoints (SMS, email, TOTP)

See also: [Authentication URLs Reference](/docs/reference/identity/authentication)

### OAuth2 Token Settings

Nested settings under `spring.auth.oauth2`, bound to `OAuth2TokenSettings`. Configures the OAuth 2.0 authorization server connection, client credentials, and JWK key store.

Property

Type

Default

Description

`spring.auth.oauth2`

`.clientId`

`String`

`"default-client"`

OAuth2 client identifier registered with the authorization server

`.clientSecret`

`String`

(auto-generated)

OAuth2 client secret. Auto-generated at startup if not specified

`.issuerUri`

`String`

`"http://localhost:9000"`

Base URI of the OAuth2 authorization server issuer

`.tokenEndpoint`

`String`

`"/oauth2/token"`

Token endpoint path on the authorization server

`.scope`

`String`

`"read"`

Default OAuth2 scope requested during token exchange

`.redirectUri`

`String`

`"http://localhost:8080"`

URI to redirect to after successful OAuth2 authorization

`.authorizedUri`

`String`

`null`

URI for post-authorization redirect (overrides `redirectUri` when set)

`.jwkKeyStorePath`

`String`

`null`

File system path to the JWK key store (PKCS12 or JKS format)

`.jwkKeyStorePassword`

`String`

`null`

Password for the JWK key store file

`.jwkKeyAlias`

`String`

`null`

Alias of the key entry within the JWK key store

`.jwkKeyPassword`

`String`

`null`

Password for the specific key entry (if different from the key store password)

```yaml
spring:
  auth:
    oauth2:
      clientId: my-client-app
      clientSecret: ${OAUTH2_CLIENT_SECRET}
      issuerUri: https://auth.example.com
      tokenEndpoint: /oauth2/token
      scope: read
      redirectUri: https://app.example.com/callback
      authorizedUri: https://app.example.com/dashboard
      jwkKeyStorePath: /etc/contexa/keys/jwk-keystore.p12
      jwkKeyStorePassword: ${JWK_STORE_PASSWORD}
      jwkKeyAlias: contexa-signing-key
      jwkKeyPassword: ${JWK_KEY_PASSWORD}
```

See also: [OAuth2 Token Reference](/docs/reference/identity/authentication)

### MFA Timeouts and Lifecycle

Nested settings under `spring.auth.mfa`, bound to `MfaSettings`. Controls session timeouts, challenge windows, and device remember durations for the MFA flow.

Property

Type

Default

Description

`spring.auth.mfa`

`.sessionTimeoutMs`

`long`

`600000`

MFA session timeout in milliseconds (default: 10 minutes). The session expires if not completed within this window

`.challengeTimeoutMs`

`long`

`300000`

Individual MFA challenge timeout in milliseconds (default: 5 minutes). Each challenge must be answered within this window

`.inactivityTimeout`

`long`

`900000`

Inactivity timeout in milliseconds (default: 15 minutes). MFA session is invalidated after this period of no activity

`.cacheTtl`

`long`

`300000`

Time-to-live for MFA cache entries in milliseconds (default: 5 minutes)

`.sessionRefreshIntervalMs`

`long`

`30000`

Interval for refreshing MFA session metadata in milliseconds (default: 30 seconds)

`.stateMachineTimeoutMs`

`long`

`10000`

Timeout for state machine transitions in milliseconds (default: 10 seconds)

`.deviceRememberDurationMs`

`long`

`2592000000`

Duration a trusted device is remembered in milliseconds (default: 30 days). Users skip MFA on remembered devices

```yaml
spring:
  auth:
    mfa:
      sessionTimeoutMs: 600000
      challengeTimeoutMs: 300000
      inactivityTimeout: 900000
      cacheTtl: 300000
      sessionRefreshIntervalMs: 30000
      stateMachineTimeoutMs: 10000
      deviceRememberDurationMs: 2592000000
```

See also: [MFA Lifecycle Reference](/docs/reference/identity/mfa)

### MFA Retry and Lockout

Controls retry limits, account lockout behavior, and minimum delay between MFA attempts to prevent brute-force attacks.

Property

Type

Default

Description

`spring.auth.mfa`

`.maxRetryAttempts`

`int`

`5`

Maximum number of MFA verification retry attempts before lockout

`.accountLockoutDurationMs`

`long`

`900000`

Duration of account lockout after exceeding retry attempts in milliseconds (default: 15 minutes)

`.minimumDelayMs`

`long`

`500`

Minimum delay between consecutive MFA verification attempts in milliseconds. Mitigates timing attacks

```yaml
spring:
  auth:
    mfa:
      maxRetryAttempts: 5
      accountLockoutDurationMs: 900000
      minimumDelayMs: 500
```

See also: [MFA Security Reference](/docs/reference/identity/mfa)

### OTP Configuration

One-Time Password settings controlling token validity, length, and resend intervals for SMS and email delivery channels.

Property

Type

Default

Description

`spring.auth.mfa`

`.otpTokenValiditySeconds`

`int`

`300`

OTP token validity duration in seconds (default: 5 minutes)

`.otpTokenLength`

`int`

`6`

Number of digits in generated OTP tokens

`.smsResendIntervalSeconds`

`int`

`60`

Minimum interval in seconds before an SMS OTP can be resent

`.emailResendIntervalSeconds`

`int`

`120`

Minimum interval in seconds before an email OTP can be resent

```yaml
spring:
  auth:
    mfa:
      otpTokenValiditySeconds: 300
      otpTokenLength: 6
      smsResendIntervalSeconds: 60
      emailResendIntervalSeconds: 120
```

See also: [OTP Configuration Reference](/docs/reference/identity/mfa)

### State Machine Pool and Circuit Breaker

Controls the MFA state machine object pool size and circuit breaker thresholds within the `spring.auth.mfa` namespace.

Property

Type

Default

Description

`spring.auth.mfa`

`.stateMachinePoolSize`

`int`

`100`

Maximum number of state machine instances in the object pool

`.stateMachineCacheTtlMs`

`long`

`300000`

Time-to-live for cached state machine instances in milliseconds (default: 5 minutes)

`.circuitBreakerFailureThreshold`

`int`

`5`

Number of consecutive failures before the MFA circuit breaker opens

`.circuitBreakerTimeoutSeconds`

`int`

`30`

Duration in seconds the circuit breaker remains open before transitioning to half-open

```yaml
spring:
  auth:
    mfa:
      stateMachinePoolSize: 100
      stateMachineCacheTtlMs: 300000
      circuitBreakerFailureThreshold: 5
      circuitBreakerTimeoutSeconds: 30
```

See also: [State Machine Reference](/docs/reference/identity/state-management)

### MFA Session Storage

Session storage configuration for the MFA flow. Supports three repository backends: HTTP Session, Redis, and in-memory. The active repository is selected via `autoSelectRepository` and `repositoryPriority`.

Property

Type

Default

Description

`spring.auth.mfa`

`.sessionStorageType`

`String`

`"http-session"`

Default session storage backend type

`.autoSelectRepository`

`boolean`

`false`

Whether to automatically select the best available repository based on priority

`.repositoryPriority`

`String`

`"redis,memory,http-session"`

Comma-separated list defining repository selection priority order

`.fallbackRepositoryType`

`String`

`"http-session"`

Fallback repository type when the primary repository is unavailable

#### HTTP Session

Property

Type

Default

Description

`spring.auth.mfa.httpSession`

`.enabled`

`boolean`

`true`

Enable the HTTP session-based MFA session repository

`.createSessionIfNotExists`

`boolean`

`true`

Whether to create a new HTTP session if one does not already exist

`.sessionAttributeName`

`String`

`"MFA_SESSION_ID"`

HTTP session attribute name used to store the MFA session identifier

#### Redis

Property

Type

Default

Description

`spring.auth.mfa.redis`

`.enabled`

`boolean`

`true`

Enable the Redis-based MFA session repository

`.keyPrefix`

`String`

`"mfa:session:"`

Redis key prefix for MFA session entries

`.cookieName`

`String`

`"MFA_SID"`

Cookie name used to transmit the Redis-backed MFA session identifier

`.secureCookie`

`boolean`

`true`

Whether the MFA session cookie requires HTTPS transport

`.httpOnlyCookie`

`boolean`

`true`

Whether the MFA session cookie is inaccessible to client-side JavaScript

`.sameSite`

`String`

`"Strict"`

SameSite attribute for the MFA session cookie. Values: `Strict`, `Lax`, `None`

`.connectionTimeout`

`int`

`3000`

Redis connection timeout in milliseconds

`.maxRetries`

`int`

`3`

Maximum number of Redis connection retry attempts

#### In-Memory

Property

Type

Default

Description

`spring.auth.mfa.memory`

`.enabled`

`boolean`

`true`

Enable the in-memory MFA session repository

`.cleanupIntervalMinutes`

`int`

`5`

Interval in minutes between expired session cleanup cycles

`.maxSessions`

`int`

`10000`

Maximum number of concurrent MFA sessions held in memory

`.enableMetrics`

`boolean`

`true`

Whether to expose metrics for the in-memory session repository

```yaml
spring:
  auth:
    mfa:
      sessionStorageType: http-session
      autoSelectRepository: false
      repositoryPriority: redis,memory,http-session
      fallbackRepositoryType: http-session
      httpSession:
        enabled: true
        createSessionIfNotExists: true
        sessionAttributeName: MFA_SESSION_ID
      redis:
        enabled: true
        keyPrefix: "mfa:session:"
        cookieName: MFA_SID
        secureCookie: true
        httpOnlyCookie: true
        sameSite: Strict
        connectionTimeout: 3000
        maxRetries: 3
      memory:
        enabled: true
        cleanupIntervalMinutes: 5
        maxSessions: 10000
        enableMetrics: true
```

See also: [MFA Session Storage Reference](/docs/reference/identity/mfa)

### MFA Factor Settings

Configuration for individual MFA factor providers including SMS and email delivery channels.

#### SMS Factor

Property

Type

Default

Description

`spring.auth.mfa.smsFactor`

`.provider`

`String`

`"default"`

SMS delivery provider identifier (e.g., `twilio`, `aws-sns`, `default`)

`.templateId`

`String`

`"mfa_sms_template"`

Message template identifier for SMS OTP delivery

`.maxDailyAttempts`

`int`

`10`

Maximum number of SMS OTP delivery attempts per user per day

`.enabled`

`boolean`

`true`

Whether the SMS factor is available for MFA enrollment and verification

#### Email Factor

Property

Type

Default

Description

`spring.auth.mfa.emailFactor`

`.fromAddress`

`String`

`"noreply@company.com"`

Sender email address for MFA OTP messages

`.templateId`

`String`

`"mfa_email_template"`

Email template identifier for OTP delivery

`.maxDailyAttempts`

`int`

`5`

Maximum number of email OTP delivery attempts per user per day

`.enabled`

`boolean`

`true`

Whether the email factor is available for MFA enrollment and verification

```yaml
spring:
  auth:
    mfa:
      smsFactor:
        provider: twilio
        templateId: mfa_sms_template
        maxDailyAttempts: 10
        enabled: true
      emailFactor:
        fromAddress: noreply@company.com
        templateId: mfa_email_template
        maxDailyAttempts: 5
        enabled: true
```

See also: [MFA Factor Configuration Reference](/docs/reference/identity/mfa)

### Monitoring and Diagnostics

Controls metrics collection, audit logging, and detailed diagnostic logging for the MFA subsystem.

Property

Type

Default

Description

`spring.auth.mfa`

`.detailedLoggingEnabled`

`boolean`

`false`

Enable detailed diagnostic logging for MFA operations. Should remain disabled in production

`.metricsEnabled`

`boolean`

`true`

Whether to expose MFA metrics via the metrics endpoint (e.g., Micrometer/Prometheus)

`.auditLoggingEnabled`

`boolean`

`true`

Whether to record MFA events (challenges, verifications, failures) to the audit log

```yaml
spring:
  auth:
    mfa:
      detailedLoggingEnabled: false
      metricsEnabled: true
      auditLoggingEnabled: true
```

See also: [MFA Monitoring Reference](/docs/reference/identity/mfa)

## State Machine Properties

Properties under the `contexa.identity.statemachine` prefix, bound to `StateMachineProperties`. Controls the MFA state machine engine.

### Core Settings

Property

Type

Default

Description

`contexa.identity.statemachine`

`.enabled`

`boolean`

`true`

Enable or disable the state machine engine entirely

`.mfa.transitionTimeoutSeconds`

`Integer`

`10`

Timeout in seconds for individual state transitions within an MFA flow

```yaml
contexa:
  identity:
    statemachine:
      enabled: true
      mfa:
        transitionTimeoutSeconds: 10
```

See also: [State Machine Reference](/docs/reference/identity/state-management) | [MFA State Machine Reference](/docs/reference/identity/mfa)

[Previous AI Engine Configuration](../../../docs/install/configuration/ai) [Next IAM Configuration](../../../docs/install/configuration/iam)