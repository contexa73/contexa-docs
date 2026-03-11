---
title: "Identity DSL"
---
contexa-identity

# Identity DSL

Identity DSL is a fluent, type-safe Java API for configuring your entire authentication platform. Define authentication methods, state management, and Spring Security settings in a single `PlatformSecurityConfig` class.

## Quick Start

The simplest configuration — form login with session-based state:

```java
@Configuration
@EnableWebSecurity
public class PlatformSecurityConfig {

    @Bean
    public PlatformConfig platformDslConfig(
            IdentityDslRegistry<HttpSecurity> registry) throws Exception {
        return registry
            .form(form -> form.loginPage("/login").defaultSuccessUrl("/home"))
            .session(Customizer.withDefaults())
            .build();
    }
}
```

## Why Contexa DSL?

Spring Security requires a separate `@Bean` method for every `SecurityFilterChain`. Three login pages means three methods with repeated boilerplate. Contexa's Identity DSL eliminates this entirely — one fluent chain, one method, any number of filter chains.

### Spring Security: 3 Filter Chains

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean @Order(1)
    public SecurityFilterChain adminChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/admin/**")
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(form -> form.loginPage("/admin/login").defaultSuccessUrl("/admin"))
            .sessionManagement(session -> session.sessionFixation().changeSessionId())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .build();
    }

    @Bean @Order(2)
    public SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/api/**")
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(form -> form.loginPage("/api/login").defaultSuccessUrl("/api"))
            .sessionManagement(session -> session.sessionFixation().changeSessionId())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .build();
    }

    @Bean @Order(3)
    public SecurityFilterChain userChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/home"))
            .sessionManagement(session -> session.sessionFixation().changeSessionId())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .build();
    }
}
// 3 @Bean methods, ~40 lines, repeated boilerplate per chain
```

### Contexa Identity DSL: Same Result

```java
@Bean
public PlatformConfig platformDslConfig(
        IdentityDslRegistry<HttpSecurity> registry) throws Exception {
    return registry
        .global(http -> {
            http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionFixation().changeSessionId())
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
        })
        .form(f -> f.order(10).loginPage("/admin/login").defaultSuccessUrl("/admin")
            .rawHttp(http -> http.securityMatcher("/admin/**")))
        .session(Customizer.withDefaults())
        .form(f -> f.order(20).loginPage("/api/login").defaultSuccessUrl("/api")
            .rawHttp(http -> http.securityMatcher("/api/**")))
        .session(Customizer.withDefaults())
        .form(f -> f.order(30).loginPage("/login").defaultSuccessUrl("/home"))
        .session(Customizer.withDefaults())
        .build();
}
// 1 method, ~15 lines, zero boilerplate, 3 SecurityFilterChain beans registered at runtime
```

Fluent Chaining

`.form().session().form().session().build()` — one fluent chain creates multiple filter chains automatically

Dynamic Bean Registration

`SecurityFilterChainRegistrar` registers `SecurityFilterChain` beans at runtime via `BeanDefinitionRegistry`

Auth + State Decoupling

Any auth method pairs with any state (`.session()` or `.oauth2()`). Spring Security locks you into session-only.

## DSL Architecture

The DSL follows a **two-phase chained builder** pattern. Each `.auth().state()` pair creates an independent `SecurityFilterChain`, ordered by priority.

### Two-Phase Builder Pattern

IdentityDslRegistry

Entry point

.global()

Shared HttpSecurity settings

Auth Phase

form / rest / ott / passkey / mfa

State Phase

session / oauth2

.build()

PlatformConfig

### Multiple Chains from One Registry

Each `.auth().state()` pair produces a separate `SecurityFilterChain`. The registry collects all pairs and `SecurityFilterChainRegistrar` registers them as Spring beans at runtime.

IdentityDslRegistry

.global(http -> { /\* shared CSRF, authorization, context \*/ })

Chain 1 (order: 20)

.form()

loginPage("/admin/login")

.oauth2()

SecurityFilterChain

/admin/\*\*

Chain 2 (order: 50)

.rest()

loginProcessingUrl("/api/auth")

.oauth2()

SecurityFilterChain

/api/\*\*

Chain 3 (order: 100)

.mfa()

formLogin + passkey

.session()

SecurityFilterChain

/\*\* (catch-all)

:::info
Each chain is isolated with its own filters, authentication strategy, and state management. Requests are routed by `order()` and `securityMatcher` — the first matching chain handles the request.
:::

## How It Works: Dynamic Bean Registration

You write **one `@Bean` method** returning `PlatformConfig`. Contexa's bootstrap pipeline reads it and registers multiple `SecurityFilterChain` beans automatically — no extra `@Bean` annotations needed.

### What You Write vs. What Spring Sees

You Write

1 `@Bean` method
returns `PlatformConfig`

bootstrap pipeline

Contexa Generates

N `SecurityFilterChain` beans
registered at runtime

Spring sees

Spring Context

`formSecurityFilterChain1`
`restSecurityFilterChain2`
`ottSecurityFilterChain3`

### Bootstrap Pipeline

Build PlatformConfig

FlowConfig #1

form + session
order=10, matcher=/admin/\*\*

FlowConfig #2

rest + oauth2
order=20, matcher=/api/\*\*

FlowConfig #3

ott + session
order=30, matcher=/\*\*

Create HttpSecurity per Flow

HttpSecurity #1

isolated context
independent filters

HttpSecurity #2

isolated context
independent filters

HttpSecurity #3

isolated context
independent filters

Apply Configurations

global() + form()

CSRF, session fixation,
login page, filters

global() + rest()

CSRF, token validation,
bearer filters

global() + ott()

CSRF, OTT generation,
magic link filters

Register as Spring Beans

formSecurityFilterChain1

OrderedSecurityFilterChain
order=10

restSecurityFilterChain2

OrderedSecurityFilterChain
order=20

ottSecurityFilterChain3

OrderedSecurityFilterChain
order=30

:::info
**Key insight:** `SecurityFilterChainRegistrar` accesses Spring's `BeanDefinitionRegistry` directly. You write one `@Bean` method returning `PlatformConfig`, yet Spring sees multiple `SecurityFilterChain` beans — exactly as if you had written separate `@Bean` methods for each.
:::

## Global Configuration

`global()` applies shared HTTP security settings to **all** filter chains. Individual authentication method settings override global settings when they conflict (the `SecurityConfigurerOrchestrator` applies global first, then flow-specific).

```java
registry
    .global(http -> {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(authReq -> authReq
                .requestMatchers("/css/**", "/js/**", "/images/**").permitAll()
                .anyRequest().access(customAuthorizationManager))
            .securityContext(sc ->
                sc.securityContextRepository(customRepository));
    })
    // ... authentication methods follow
```

:::warning
**Override rule:** Global configurer runs first, then each flow's own configurer runs. If a flow sets `disableCsrf()` or `rawHttp()`, it overrides the global CSRF setting for that specific chain only.
:::

## Filter Chain Order & Request Routing

Each authentication method has a default `order()` value. Lower order = higher priority = intercepts requests first. When multiple filter chains are registered, Spring Security evaluates them in order and uses the first chain whose `securityMatcher` matches the request.

Auth Method

Default Order

Description

Form Login

100

Traditional form-based login

MFA

200

Multi-factor authentication

REST API

200

JSON credential submission

One-Time Token

300

Magic link / OTT

Passkey

400

WebAuthn / FIDO2

Use `order()` and `rawHttp(http -> http.securityMatcher(...))` to control which chain handles which requests:

```java
registry
    .global(http -> { /* shared settings */ })
    // Admin pages: Form login, order 20 (highest priority)
    .form(f -> f.order(20).loginPage("/admin/login")
        .rawHttp(http -> http.securityMatcher("/admin/**")))
    .session(Customizer.withDefaults())
    // API endpoints: REST login, order 50
    .rest(r -> r.order(50).loginProcessingUrl("/api/auth")
        .rawHttp(http -> http.securityMatcher("/api/**")))
    .oauth2(Customizer.withDefaults())
    // General users: MFA, order 100
    .mfa(m -> m.order(100)
        .primaryAuthentication(p -> p.formLogin(form -> form.loginPage("/login")))
        .passkey(Customizer.withDefaults()))
    .session(Customizer.withDefaults())
    .build();
```

:::info
Without `securityMatcher`, a chain matches **all** requests. Always set `securityMatcher` via `rawHttp()` when using multiple chains to avoid overlapping.
:::

## Authentication + State Combinations

Every authentication method can be paired with either session or OAuth2 state. You can mix different state strategies across different chains.

Auth Method

\+ Session

\+ OAuth2

Form Login

`.form(...).session(...)`

`.form(...).oauth2(...)`

REST API

`.rest(...).session(...)`

`.rest(...).oauth2(...)`

One-Time Token

`.ott(...).session(...)`

`.ott(...).oauth2(...)`

Passkey

`.passkey(...).session(...)`

`.passkey(...).oauth2(...)`

MFA

`.mfa(...).session(...)`

`.mfa(...).oauth2(...)`

**Per-flow state:** The `.state()` call applies to the *most recently registered* authentication method. This allows different state strategies per chain:

```java
registry
    .form(f -> f.loginPage("/login"))
    .session(Customizer.withDefaults())      // form -> Session
    .rest(r -> r.loginProcessingUrl("/api/auth"))
    .oauth2(Customizer.withDefaults())       // rest -> OAuth2
    .mfa(m -> m.primaryAuthentication(...).passkey(...))
    .session(Customizer.withDefaults())      // mfa -> Session
    .build();
```

The same authentication method can be registered multiple times (auto-named `form_flow`, `form_flow_2`, etc.).

### Spring Security: Session Only

Spring Security's `formLogin()` is hardwired to session-based state management. For token-based authentication, you must configure an entirely separate `SecurityFilterChain` with `oauth2ResourceServer()` manually.

```java
// Spring Security: session state is implicit, no way to switch per chain
http.formLogin(form -> form.loginPage("/login"));
// Always session-based. Period.

// For token-based auth, you need a completely separate chain:
@Bean
public SecurityFilterChain resourceServerChain(HttpSecurity http) throws Exception {
    return http
        .securityMatcher("/api/**")
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .build();
}
// Two different paradigms, two different configurations, no unification
```

### Contexa DSL: Any Auth x Any State

Contexa decouples authentication from state management. The same `.form()` can use `.session()` in one chain and `.oauth2()` in another — in a single method.

```java
registry
    // Admin: form login with OAuth2 token state
    .form(f -> f.order(20).loginPage("/admin/login")
        .rawHttp(http -> http.securityMatcher("/admin/**")))
    .oauth2(Customizer.withDefaults())

    // API: REST login with OAuth2 token state (stateless)
    .rest(r -> r.order(50).loginProcessingUrl("/api/auth")
        .rawHttp(http -> http.securityMatcher("/api/**")))
    .oauth2(Customizer.withDefaults())

    // Users: MFA with session state
    .mfa(m -> m.order(100)
        .primaryAuthentication(auth -> auth.formLogin(form -> form.loginPage("/login")))
        .passkey(Customizer.withDefaults()))
    .session(Customizer.withDefaults())
    .build();
// 5 auth methods x 2 state types = 10 combinations, all in one method
```

:::tip
**Any Auth x Any State:** Contexa treats authentication and state as orthogonal concerns. Form login with session, form login with OAuth2, REST with session, MFA with OAuth2 — any combination works. This is architecturally impossible in vanilla Spring Security without duplicating entire configuration classes.
:::

## rawHttp() — Full Spring Security Access

`rawHttp()` provides a `SafeHttpCustomizer<HttpSecurity>` hook that exposes the **entire** Spring Security `HttpSecurity` API. It supports checked exceptions and can be called multiple times (each call accumulates).

```java
.form(f -> f.order(20)
    .rawHttp(http -> http
        .securityMatcher("/admin/**")
        .sessionManagement(session ->
            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .addFilterBefore(customFilter, UsernamePasswordAuthenticationFilter.class))
    .rawHttp(http -> http
        .headers(headers -> headers.frameOptions(fo -> fo.deny())))
)
```

Available on every authentication method **and** in `global()`. For form login, there is also `rawFormLogin()` to customize `HttpSecurity.formLogin()` internals directly.

## SecurityFilterChain Customization

The `globalHttpCustomizer` lambda receives the `HttpSecurity` builder, giving you full access to Spring Security's configuration API. Below are common customization points.

### CSRF Configuration

The default configuration disables CSRF. For applications serving HTML forms, consider enabling CSRF with a cookie-based token repository:

```java
// Disable CSRF (default - suitable for stateless APIs)
http.csrf(AbstractHttpConfigurer::disable);

// Enable CSRF with cookie repository (for HTML form applications)
http.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
);
```

### Session Management with AISessionSecurityContextRepository

`AISessionSecurityContextRepository` extends Spring's `HttpSessionSecurityContextRepository` with AI-enhanced session tracking. It feeds behavioral data (session patterns, access frequency, anomaly scores) into the authorization pipeline.

```java
// Wire AI session context into the security filter chain
http.securityContext(sc ->
    sc.securityContextRepository(aiSessionSecurityContextRepository)
);

// For stateless REST APIs, use stateless session management
// in the form/rest chain configuration:
registry.form(form -> form
    .order(20)
    .loginPage("/admin/login")
    .defaultSuccessUrl("/admin")
    .rawHttp(http -> http.sessionManagement(session ->
        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)))
);
```

### CORS Settings

```java
SafeHttpCustomizer<HttpSecurity> globalHttpCustomizer = http -> {
    http
        .cors(cors -> cors.configurationSource(request -> {
            CorsConfiguration config = new CorsConfiguration();
            config.setAllowedOrigins(List.of("https://app.example.com"));
            config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
            config.setAllowCredentials(true);
            return config;
        }))
        .csrf(AbstractHttpConfigurer::disable)
        .authorizeHttpRequests(authReq -> authReq
            .requestMatchers("/css/**", "/js/**", "/images/**").permitAll()
            .anyRequest().access(customDynamicAuthorizationManager)
        )
        .securityContext(sc ->
            sc.securityContextRepository(aiSessionSecurityContextRepository));
};
```

### Custom Filters

Add custom filters using the `rawHttp` method on individual chain configurations, or include them in the global customizer for cross-chain application:

```java
// Add a custom filter before the authorization filter
SafeHttpCustomizer<HttpSecurity> globalHttpCustomizer = http -> {
    http
        .addFilterBefore(new TenantContextFilter(),
            AuthorizationFilter.class)
        .authorizeHttpRequests(authReq -> authReq
            .anyRequest().access(customDynamicAuthorizationManager)
        );
};
```

## Common Options

All authentication methods share these options (from `AbstractOptions`):

Option

Description

`order(int)`

Filter chain priority (lower = higher priority)

`loginProcessingUrl(String)`

URL that processes login requests

`defaultSuccessUrl(String)`

Redirect after successful login

`failureUrl(String)`

Redirect after failed login

`successHandler(PlatformAuthenticationSuccessHandler)`

Custom success handler

`failureHandler(PlatformAuthenticationFailureHandler)`

Custom failure handler

`securityContextRepository(SecurityContextRepository)`

Override security context storage

`disableCsrf()`

Disable CSRF for this chain

`cors(Customizer)`

Configure CORS

`headers(Customizer)`

Configure HTTP headers

`sessionManagement(Customizer)`

Configure session management

`logout(Customizer)`

Configure logout

`rawHttp(SafeHttpCustomizer)`

Full Spring Security API access (accumulates)

`authorizeStaticPermitAll(String...)`

Permit static resources without auth

`asep(Customizer)`

ASEP annotation attributes for this flow

## Complete Example

A production-ready configuration with admin form login (OAuth2), user MFA (Session), and API REST endpoint (OAuth2):

```java
@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
public class PlatformSecurityConfig {

    private final CustomDynamicAuthorizationManager authorizationManager;
    private final AISessionSecurityContextRepository securityContextRepository;

    @Bean
    public PlatformConfig platformDslConfig(
            IdentityDslRegistry<HttpSecurity> registry) throws Exception {

        return registry
            // Global: shared across all chains
            .global(http -> {
                http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(authReq -> authReq
                        .requestMatchers("/css/**", "/js/**", "/images/**").permitAll()
                        .anyRequest().access(authorizationManager))
                    .securityContext(sc ->
                        sc.securityContextRepository(securityContextRepository));
            })
            // Admin: form login with OAuth2, highest priority
            .form(f -> f.order(20).loginPage("/admin/login")
                .defaultSuccessUrl("/admin/dashboard")
                .rawHttp(http -> http.securityMatcher("/admin/**")))
            .oauth2(Customizer.withDefaults())
            // API: REST login with OAuth2
            .rest(r -> r.order(50).loginProcessingUrl("/api/auth")
                .rawHttp(http -> http
                    .securityMatcher("/api/**")
                    .sessionManagement(s ->
                        s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))))
            .oauth2(Customizer.withDefaults())
            // Users: MFA with session
            .mfa(m -> m.order(100)
                .primaryAuthentication(auth ->
                    auth.formLogin(form -> form
                        .loginPage("/login")
                        .defaultSuccessUrl("/home")))
                .passkey(Customizer.withDefaults()))
            .session(Customizer.withDefaults())
            .build();
    }
}
```

## Migration Guide

Migrating from a traditional Spring Security configuration to Contexa's `PlatformSecurityConfig` involves replacing your `SecurityFilterChain` bean with the DSL registry pattern and wiring in the dynamic authorization manager.

### Before: Traditional Spring Security

```java
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").hasRole("USER")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .defaultSuccessUrl("/admin")
            )
            .build();
    }
}
```

### After: Contexa PlatformSecurityConfig

```java
@EnableWebSecurity
@RequiredArgsConstructor
public class PlatformSecurityConfig {

    private final CustomDynamicAuthorizationManager customDynamicAuthorizationManager;
    private final AISessionSecurityContextRepository aiSessionSecurityContextRepository;

    @Bean
    public PlatformConfig platformDslConfig(
            IdentityDslRegistry<HttpSecurity> registry) throws Exception {

        SafeHttpCustomizer<HttpSecurity> globalHttpCustomizer = http -> {
            http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico")
                        .permitAll()
                    .anyRequest()
                        .access(customDynamicAuthorizationManager)
                )
                .securityContext(sc -> sc
                    .securityContextRepository(aiSessionSecurityContextRepository));
        };

        return registry
            .global(globalHttpCustomizer)
            .form(form -> form.order(20)
                .loginPage("/admin/login")
                .defaultSuccessUrl("/admin"))
            .oauth2(Customizer.withDefaults())
            .build();
    }
}
```

### Migration Steps

Add Contexa Dependencies

Add `spring-boot-starter-contexa` to your project. This transitively brings in contexa-iam, contexa-core, and contexa-identity modules.

Run Resource Scanner

Use the [Resource Scanner](../iam/resource-scanner) to discover all your existing endpoints and create initial XACML policies that match your current `hasRole()` / `hasAuthority()` rules.

Enable Shadow Mode

Set `security.zerotrust.mode=SHADOW` to run dynamic authorization in audit-only mode. Decisions are logged but not enforced, so you can verify policies match expected behavior.

Replace SecurityFilterChain

Replace your existing `SecurityFilterChain` bean with the `PlatformConfig` pattern. Move static `permitAll()` rules to `requestMatchers` and replace all `hasRole()` / `hasAuthority()` with `.anyRequest().access(customDynamicAuthorizationManager)`.

Verify in Shadow Mode

Run your application and review audit logs to confirm dynamic policies produce the same decisions as your previous static rules. Fix any policy gaps.

Switch to Enforce Mode

Set `security.zerotrust.mode=ENFORCE` to activate live policy enforcement. Monitor authorization audit logs closely during the transition period.

### Migration Checklist

Step

Action

Verification

Add `spring-boot-starter-contexa` dependency

Application starts without errors

Run Resource Scanner to discover endpoints

All endpoints visible in Admin Dashboard

Create XACML policies for each endpoint

Policies visible in Policy Builder

Enable shadow mode (`security.zerotrust.mode=SHADOW`)

Audit logs show authorization decisions

Replace `SecurityFilterChain` with `PlatformConfig`

All filter chains build successfully

Remove static `hasRole()` / `hasAuthority()` rules

No compile-time authorization annotations remain

Verify shadow mode audit logs match expected behavior

Zero unexpected deny/allow decisions

Switch to enforce mode (`security.zerotrust.mode=ENFORCE`)

Application behaves identically to shadow mode

## DSL API Reference

### IdentityAuthDsl

Authentication-phase interface. Each method returns `IdentityStateDsl` for state selection.

Method

Returns

Description

`global(SafeHttpCustomizer<HttpSecurity>)`

`IdentityAuthDsl`

Shared HTTP security settings for all chains

`form(Customizer<FormConfigurerConfigurer>)`

`IdentityStateDsl`

Register form login (default order: 100)

`rest(Customizer<RestConfigurerConfigurer>)`

`IdentityStateDsl`

Register REST API login (default order: 200)

`ott(Customizer<OttConfigurerConfigurer>)`

`IdentityStateDsl`

Register One-Time Token (default order: 300)

`passkey(Customizer<PasskeyConfigurerConfigurer>)`

`IdentityStateDsl`

Register Passkey/WebAuthn (default order: 400)

`mfa(Customizer<MfaDslConfigurer>)`

`IdentityStateDsl`

Register multi-factor auth (default order: 200)

`build()`

`PlatformConfig`

Finalize and produce immutable config

### IdentityStateDsl

State-management phase. Returned after registering an authentication method.

Method

Returns

Description

`session(Customizer<SessionStateConfigurer>)`

`IdentityAuthDsl`

Session-based state (auto: sessionFixation.changeSessionId)

`oauth2(Customizer<OAuth2StateConfigurer>)`

`IdentityAuthDsl`

OAuth2/JWT state (auto: Resource Server + Auth Server)

:::info
**Configuration Reference**
For `application.yml` properties (login/logout URIs, OAuth2 client settings, token endpoints, MFA settings), see [State Management](../../../docs/reference/identity/state-management) and [Identity Configuration](../../../docs/install/configuration/identity).
:::

[Previous Zero Trust Flow](../../../docs/reference/architecture/zero-trust-flow) [Next Authentication](../../../docs/reference/identity/authentication)