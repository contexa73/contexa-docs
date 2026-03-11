---
title: "Adaptive MFA"
---
contexa-identity

# Adaptive MFA

Multi-Factor Authentication (MFA) configuration guide. Combines secondary factors (OTT, Passkey) after primary authentication (Form/REST) to strengthen security. Supports AI-based adaptive policies, custom pages, Device Trust, and Step-up authentication.

## Overview

Contexa MFA consists of primary authentication + secondary factor(s). The policy engine determines whether MFA is required, and the state machine manages the authentication flow.

```

  MFA Architecture
  ================

  [Primary Auth: Form/REST]
          |
          v
  [MfaPolicyProvider] ---> MFA Not Required ---> Auth Complete
          |
          v (MFA Required)
  [Factor Selection: OTT / Passkey]
          |
          v
  [State Machine: Challenge -> Verification]
          |
          v
  [MFA Success] ---> Auth Complete
```

The default MFA order is **200**. Calling `.form()` or `.rest()` directly from `.mfa()` throws an `UnsupportedOperationException`. You must use `.primaryAuthentication()` instead.

## Quick Start

The simplest MFA configuration with Form primary authentication + Passkey secondary authentication.

```java
registry
    .mfa(mfa -> mfa
        .primaryAuthentication(primary -> primary
            .formLogin(form -> form.loginPage("/login")))
        .passkey(Customizer.withDefaults())
    )
    .session(Customizer.withDefaults())
    .build();
```

## Primary Authentication

Configures the primary authentication method via `primaryAuthentication()`. Only one of `formLogin()` or `restLogin()` can be selected (mutually exclusive).

### Form Primary

```java
.mfa(mfa -> mfa
    .primaryAuthentication(primary -> primary
        .formLogin(form -> form
            .loginPage("/login")
            .usernameParameter("email")
            .failureUrl("/login?error")))
    .ott(Customizer.withDefaults())
)
```

### REST Primary

```java
.mfa(mfa -> mfa
    .primaryAuthentication(primary -> primary
        .restLogin(rest -> rest
            .loginProcessingUrl("/api/auth/login")))
    .passkey(Customizer.withDefaults())
)
```
:::info
**Primary Authentication Order**
Primary authentication is automatically assigned order 0. Secondary factors are automatically assigned sequential order values (1, 2, 3...) via `currentStepOrderCounter`.
:::

## MFA Factors (Secondary Authentication)

Adds secondary authentication factors. At least one secondary factor is required, and multiple factors can be combined.

### Available Secondary Factors

Method

Factor

Description

`.ott()`

One-Time Token

Email/SMS one-time code

`.passkey()`

WebAuthn / Passkey

Biometric authentication / hardware key

### Multiple Factor Combination

```java
.mfa(mfa -> mfa
    .primaryAuthentication(primary -> primary
        .formLogin(form -> form.loginPage("/login")))
    .ott(ott -> ott
        .tokenService(emailTokenService))
    .passkey(passkey -> passkey
        .rpName("My App")
        .rpId("example.com"))
)
```

Each factor is automatically assigned a sequential order via `currentStepOrderCounter` (1, 2, 3...). Users select their preferred factor on the factor selection page.

## MFA Pages

Customizes the page URLs for each step of the MFA flow via `mfaPage()`.

Method

Description

`selectFactorPage(String)`

Factor selection page URL

`ottPages(String requestUrl, String verifyUrl)`

OTT request/verification page URLs (configured at once)

`ottRequestPage(String)`

OTT code request page URL

`ottVerifyPage(String)`

OTT code verification page URL

`passkeyChallengePages(String)`

Passkey challenge page URL

`configurePageUrl(String)`

MFA configuration page URL

`failurePageUrl(String)`

MFA failure page URL

```java
.mfa(mfa -> mfa
    .primaryAuthentication(primary -> primary
        .formLogin(form -> form.loginPage("/login")))
    .ott(Customizer.withDefaults())
    .mfaPage(page -> page
        .selectFactorPage("/mfa/select")
        .ottPages("/mfa/ott/request", "/mfa/ott/verify")
        .failurePageUrl("/mfa/failed"))
)
```

### Creating Custom MFA Pages

You can freely modify the CSS and layout of MFA pages. However, the following elements must be preserved.

#### Do Not Modify

-   CSRF meta tag: `<meta name="_csrf" th:content="${csrfToken}">`
-   `id="contexa-page-config"` div and `data-*` attributes
-   Input name attributes: `username`, `password`, `token`, `_csrf`, `mfaSessionId`
-   Form `id`, `method`, `th:action`
-   button id: `loginButton`, `sendCodeButton`, `verifyButton`, `resendButton`, `authButton`
-   `th:utext="${hiddenInputsHtml}"` — Auto-generates CSRF + mfaSessionId hidden inputs

#### Safe to Modify

-   CSS colors, layout, background
-   Logos, icons
-   Text content
-   Form field styles

#### Required JavaScript Files

File

Target Page

`/js/contexa-mfa-sdk.js`

All MFA pages (required)

`/js/contexa-login-page.js`

Login page

`/js/contexa-ott-request-page.js`

OTT code request page

`/js/contexa-ott-verify-page.js`

OTT code verification page

`/js/contexa-passkey-page.js`

Passkey challenge page

#### MFA Data Flow

```

  Login (/login)
    |
    v
  POST /login (API) ---> MFA Not Required ---> Home
    |
    v (MFA Required)
  /mfa/select-factor
    |
    +--- OTT ---+
    |            |
    |   /mfa/ott/request-code-ui
    |            |
    |   POST /mfa/ott/generate-code
    |            |
    |   /mfa/challenge/ott
    |            |
    |   POST /login/mfa-ott ---> Success/Failure
    |
    +--- Passkey ---+
                    |
       /mfa/challenge/passkey
                    |
       WebAuthn navigator.credentials.get()
                    |
       POST /mfa/webauthn/authenticate ---> Success/Failure
```

## MFA Policy Customization

Implement `MfaPolicyProvider` to customize MFA requirement decisions. Since it is registered with `@ConditionalOnMissingBean`, defining a bean of the same type automatically overrides it.

### Built-in Implementations

Implementation

Description

`DefaultMfaPolicyProvider`

Static rule-based. Determines MFA requirement based on user roles and MFA configuration

`AIAdaptiveMfaPolicyProvider`

AI risk analysis-based dynamic policy. Falls back to DefaultMfaPolicyProvider when AI Core is unavailable

### Custom Policy Implementation Example

```java
@Bean
public MfaPolicyProvider mfaPolicyProvider() {
    return new MfaPolicyProvider() {
        @Override
        public MfaDecision evaluateInitialMfaRequirement(FactorContext ctx) {
            String ip = ctx.getRequest().getRemoteAddr();
            if (trustedIpRanges.contains(ip)) {
                return MfaDecision.noMfaRequired();
            }
            return MfaDecision.challenged("Untrusted IP");
        }
        // ... other methods
    };
}
```

### MfaDecision Types

DecisionType

Description

`NO_MFA_REQUIRED`

MFA not required. Authentication completes immediately

`CHALLENGED`

MFA required. Secondary factor authentication demanded

`BLOCKED`

Authentication blocked. Access denied

`ESCALATED`

Escalated for administrator review. Only administrators can resolve

### Injecting Policy via DSL

```java
.mfa(mfa -> mfa
    .policyProvider(customMfaPolicyProvider)
    .primaryAuthentication(primary -> primary
        .formLogin(form -> form.loginPage("/login")))
    .passkey(Customizer.withDefaults())
)
```

## Device Trust

MFA can be skipped on trusted devices. Disabled by default.

```java
.mfa(mfa -> mfa
    .defaultDeviceTrustEnabled(true)
    .primaryAuthentication(primary -> primary
        .formLogin(form -> form.loginPage("/login")))
    .passkey(Customizer.withDefaults())
)
```
```

  Device Trust Flow
  =================

  Client                              Server
    |                                    |
    | [localStorage: deviceId]           |
    | X-Device-Id header  ------------->  |
    |                                    | JWT device_id claim verification
    |                                    | HCAD device behavior analysis
    |                                    |
    | Trusted Device -----> Skip MFA     |
    | Untrusted Device ---> Proceed MFA  |
```

### Configuration

Property

Default

Description

`spring.auth.mfa.device-remember-duration-ms`

2592000000 (30 days)

Device trust retention period

## Step-up Authentication

Requires additional authentication when an already authenticated user accesses sensitive resources.

```

  Step-up Authentication Flow
  ============================

  [Authenticated User] ---> [Sensitive Resource Access]
                           |
                           v
                  Server: 401 MFA_CHALLENGE_REQUIRED
                           |
                           v
            SDK Global Interceptor: Auto-detect fetch/XHR responses
                           |
                           v
                  Redirect to MFA factor selection page
                           |
                           v
                  Additional auth complete ---> Auto-retry original request
```

The ContexaMFA SDK Global Interceptor automatically detects `401`/`403`/`423` responses from all HTTP requests and redirects to the MFA challenge. After authentication completes, the original request is automatically retried.

## MFA State Machine Events

Use `@EventListener` to receive MFA state change events for implementing audit logs, notifications, and more.

### Event Types

Event

Description

`StateChangeEvent`

MFA state transition (e.g., FACTOR\_SELECTION -> OTT\_CHALLENGE)

`ErrorEvent`

Error occurred (SECURITY, TIMEOUT, LIMIT\_EXCEEDED, SYSTEM)

`PerformanceAlertEvent`

Performance warning (slow response, etc.)

`CustomEvent`

User-defined event

### Terminal States

State

Description

`MFA_SUCCESSFUL`

MFA succeeded. Full authentication complete

`MFA_NOT_REQUIRED`

MFA not required. Skipped by policy

`MFA_FAILED_TERMINAL`

MFA permanently failed. No retry allowed

`MFA_CANCELLED`

User cancelled MFA

`MFA_TIMEOUT`

Session timeout

`MFA_SESSION_EXPIRED`

MFA session expired

`MFA_ACCOUNT_LOCKED`

Account locked

`MFA_SYSTEM_ERROR`

System error

### Audit Log Implementation Example

```java
@EventListener
public void onMfaStateChange(MfaStateMachineEvents.StateChangeEvent event) {
    auditService.log(
        event.getUserId(),
        event.getFromState(),
        event.getToState()
    );
}

@EventListener
public void onMfaError(MfaStateMachineEvents.ErrorEvent event) {
    alertService.notify(
        event.getErrorType(),
        event.getMessage()
    );
}
```

## MFA + Single Authentication Co-configuration

Register both MFA and single authentication together to apply different authentication levels to different request paths.

```java
registry
    // Admin: Form + OAuth2 (Single Auth)
    .form(f -> f.order(20).loginPage("/admin/login")
        .rawHttp(http -> http.securityMatcher("/admin/**")))
    .oauth2(Customizer.withDefaults())

    // User: MFA (Form Primary + Passkey) + Session
    .mfa(m -> m.order(100)
        .primaryAuthentication(auth -> auth
            .formLogin(form -> form.loginPage("/login")))
        .passkey(Customizer.withDefaults()))
    .session(Customizer.withDefaults())

    .build();
```

Use `order()` to control filter chain priority, and `rawHttp()`'s `securityMatcher()` to determine which chain handles which requests. Different state management (session/oauth2) can be configured for each authentication method.

## MFA Handlers

Custom handlers can be specified for MFA success and failure.

```java
.mfa(mfa -> mfa
    .mfaSuccessHandler(customSuccessHandler)
    .mfaFailureHandler(customFailureHandler)
    .primaryAuthentication(primary -> primary
        .formLogin(form -> form.loginPage("/login")))
    .passkey(Customizer.withDefaults())
)
```

For handler interfaces and implementation guidance, refer to the handler auto-selection section in the [Authentication](authentication#automatic-handler-resolution) documentation.

## MFA REST API

Method

URL

Description

`GET`

`/api/mfa/config`

Retrieve MFA configuration

`GET`

`/api/mfa/status`

Retrieve MFA status

`POST`

`/mfa/select-factor`

Select MFA factor

`POST`

`/mfa/ott/generate-code`

Generate MFA OTT code

`POST`

`/login/mfa-ott`

Process MFA OTT login

`POST`

`/mfa/webauthn/authenticate`

MFA Passkey authentication

`POST`

`/mfa/cancel`

Cancel MFA

### Response Format

Scenario

Response

Authentication success

`{ "success": true, "redirectUrl": "..." }`

MFA required

`{ "mfaRequired": true, "selectFactorUrl": "...", "mfaSessionId": "..." }`

Authentication failure

`{ "success": false, "error": "...", "failureType": "..." }`

Step-up required

`401 MFA_CHALLENGE_REQUIRED`

## ContexaMFA JavaScript SDK

A JavaScript SDK (v2.2.0) that controls the MFA flow in the browser.

### Quick Start

```html
<script src="../../../js/contexa-mfa-sdk.js?v=1773190937296"></script>
<script>
const mfa = new ContexaMFA.Client({
    autoInit: true,
    tokenPersistence: 'localstorage'
});
mfa.loginForm('username', 'password')
    .then(result => { /* handle result */ });
</script>
```

### Client API

Method

Return Type

Description

`init()`

Promise

Initialize SDK, load server configuration

`login(username, password)`

Promise<LoginResult>

JSON login request

`loginForm(username, password)`

Promise<LoginResult>

Form POST login

`selectFactor(factorType)`

Promise<FactorResult>

Select MFA factor

`verifyOtt(token)`

Promise<VerifyResult>

Verify OTT token

`verifyPasskey()`

Promise<VerifyResult>

WebAuthn Passkey authentication

`requestOttCode(username)`

Promise<RequestResult>

Request OTT code resend

`logout()`

Promise

Logout

### Constructor Options

Option

Type

Description

`autoInit`

boolean

Whether to auto-initialize

`autoRedirect`

boolean

Auto-redirect after authentication

`tokenPersistence`

'memory' | 'localstorage'

Token storage (memory or localStorage)

### Global Interceptor

Automatically detects `401`/`403`/`423` responses from all `fetch`/`XMLHttpRequest` calls and redirects to the Step-up authentication page. After authentication completes, the original request is automatically retried.

:::info
**MFA Configuration Properties**
The `spring.auth.mfa.*` namespace provides 40+ configuration options including timeouts (sessionTimeoutMs, challengeTimeoutMs), retry settings (maxRetryAttempts, accountLockoutDurationMs), OTP (otpTokenValiditySeconds, otpTokenLength), session storage (sessionStorageType), and more. See the [State Management](state-management) documentation for the complete list.
:::

[Previous Authentication](../../../docs/reference/identity/authentication) [Next ASEP Annotations](../../../docs/reference/identity/asep)