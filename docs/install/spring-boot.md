---
title: "Spring Boot Integration"
---
# Spring Boot Integration

Contexa integrates with Spring Security through the Identity DSL — a fluent API that composes authentication, authorization, and session management into a unified `PlatformConfig`. This page covers the core integration points. For detailed configuration of each component, see the linked reference pages.

## PlatformSecurityConfig

The central security configuration bean uses `IdentityDslRegistry` to build a `PlatformConfig`. This config drives how Spring Security filter chains are constructed and how Contexa's Zero Trust layer intercepts requests.

```java
@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
public class PlatformSecurityConfig {

    private final CustomDynamicAuthorizationManager customDynamicAuthorizationManager;
    private final AISessionSecurityContextRepository aiSessionSecurityContextRepository;

    @Bean
    public PlatformConfig platformDslConfig(IdentityDslRegistry<HttpSecurity> registry) throws Exception {

        SafeHttpCustomizer<HttpSecurity> globalHttpCustomizer = http -> {
            http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authReq -> authReq
                    .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
                    .anyRequest().access(customDynamicAuthorizationManager)
                )
                .securityContext(sc -> sc.securityContextRepository(aiSessionSecurityContextRepository));
        };

        return registry
            .global(globalHttpCustomizer)
            .mfa(mfa -> mfa
                .primaryAuthentication(auth -> auth.formLogin(Customizer.withDefaults()))
                .passkey(Customizer.withDefaults())
            )
            .session(Customizer.withDefaults())
            .build();
    }
}
```

:::note
**Default behavior** — If you annotate your application with `@EnableAISecurity` and do not define a `PlatformConfig` bean, a default configuration is created automatically. Define your own bean only when you need to customize authentication flows or authorization rules.
:::

## Three Integration Pillars

The example above demonstrates the three core integration points that Contexa provides on top of Spring Security:

### 1\. Identity DSL — Authentication Flows

`IdentityDslRegistry` is a fluent API for composing authentication flows. Each DSL method — `form()`, `rest()`, `mfa()`, `ott()`, `passkey()` — creates a separate `SecurityFilterChain` with configurable ordering. Combine them to support multiple authentication strategies in a single application.

```java
// Example: REST API + Form Login with MFA
return registry
    .global(globalHttpCustomizer)
    .rest(rest -> rest.order(10))
    .mfa(mfa -> mfa
        .primaryAuthentication(auth -> auth.formLogin(form ->
            form.defaultSuccessUrl("/dashboard")))
        .passkey(Customizer.withDefaults())
    )
    .session(Customizer.withDefaults())
    .build();
```

[Identity DSL Reference →](/docs/reference/identity/dsl)  |  [Authentication Flows →](/docs/reference/identity/authentication)  |  [Adaptive MFA →](/docs/reference/identity/mfa)

### 2\. Dynamic Authorization — AI-Driven Access Control

`CustomDynamicAuthorizationManager` replaces static Spring Security rules with AI-driven decisions. Registered via `.anyRequest().access(customDynamicAuthorizationManager)`, it evaluates every request through the XACML policy engine, Zero Trust evaluation, and HCAD anomaly detection before reaching your application code.

Use the `@Protectable` annotation on controller methods to define fine-grained security policies per endpoint.

[Dynamic Authorization →](/docs/reference/iam/dynamic-authorization)  |  [XACML Engine →](/docs/reference/iam/xacml)  |  [@Protectable Reference →](/docs/reference/iam/protectable)

### 3\. AI Session Context — Continuous Trust Assessment

`AISessionSecurityContextRepository` replaces the default Spring Security context repository. It augments session-based context with AI-computed trust scores, behavioral baselines, and threat assessments — enabling continuous authentication awareness across requests.

Registered via `.securityContext(sc -> sc.securityContextRepository(aiSessionSecurityContextRepository))` in the global HTTP customizer.

[State Management →](/docs/reference/identity/state-management)  |  [Zero Trust Filters →](/docs/reference/identity/dsl)

## Static Resource Configuration

Static resources should be excluded from AI security evaluation to prevent unnecessary LLM calls. Use the global customizer to permit access to asset paths:

```java
.authorizeHttpRequests(authReq -> authReq
    .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
    .requestMatchers("/api/public/**").permitAll()
    .anyRequest().access(customDynamicAuthorizationManager)
)
```

## Required Imports

```java
import io.contexa.contexacore.security.AISessionSecurityContextRepository;
import io.contexa.contexaiam.security.xacml.pep.CustomDynamicAuthorizationManager;
import io.contexa.contexaidentity.security.core.config.PlatformConfig;
import io.contexa.contexaidentity.security.core.dsl.IdentityDslRegistry;
import io.contexa.contexaidentity.security.core.dsl.common.SafeHttpCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
```

[Previous Quick Start](quickstart) [Next Configuration](configuration)