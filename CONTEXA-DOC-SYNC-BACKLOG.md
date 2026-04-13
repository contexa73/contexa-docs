# CONTEXA 문서/메인 사이트 정합화 백로그

## 1. 목적

이 백로그의 목적은 `D:\contexa-doc` 문서 사이트와 `D:\contexa` OSS 코드를 완전히 동기화하고, `D:\contexa-enterprise\contexa-site` 공개 사이트의 노출면을 현재 제품 정체성에 맞게 정렬하는 것이다.

핵심 원칙은 다음과 같다.

- 기존 문서의 구조와 풍부한 설명은 임의로 삭제하거나 축소하지 않는다.
- 틀린 사실, 잘못된 속성, 잘못된 예제, 깨진 링크, 깨진 문자열만 교정한다.
- 코드에 존재하지만 문서에 빠진 필수 축만 추가한다.
- `contexa-enterprise` 전용 기능은 `contexa-doc`의 OSS 사실처럼 문서화하지 않는다.
- Anthropic가 문서를 보았을 때 `인증 이후 런타임 제어`, `요청 시점 제어 + 비동기 제어`, `검증 가능한 공개 증빙`을 즉시 이해할 수 있어야 한다.

## 2. 진실원천

문서 수정과 검증의 진실원천은 아래로 고정한다.

- OSS 코어: `D:\contexa`
- CLI: `D:\contexa-cli`
- 설치 엔드포인트: `D:\install-ctxa`
- 공개 사이트 점검: `D:\contexa-enterprise\contexa-site`

현재 확인된 OSS 모듈은 아래 6개다.

- `contexa-common`
- `contexa-autoconfigure`
- `contexa-core`
- `contexa-identity`
- `contexa-iam`
- `spring-boot-starter-contexa`

현재 확인된 실제 `@ConfigurationProperties` 축은 27개다.

- `contexa`
- `contexa.bridge`
- `contexa.cache`
- `contexa.opentelemetry`
- `spring.auth`
- `contexa.identity.statemachine`
- `contexa.iam.admin`
- `contexa.policy`
- `spring.ai`
- `spring.ai.security`
- `spring.ai.security.tiered`
- `spring.ai.security.mapping`
- `spring.ai.vectorstore.pgvector`
- `contexa.rag`
- `contexa.advisor`
- `contexa.streaming`
- `security.zerotrust`
- `security.session`
- `security.stepup`
- `security.redis`
- `security.kafka`
- `security.event`
- `security.router`
- `security.pipeline`
- `security.plane`
- `security.coldpath`
- `hcad`

## 3. 현재 확정 문제

### 3.1 `contexa-doc`

- EN 43페이지, KO 43페이지 전체가 코드 기준으로 전수 검증되지 않았다.
- `Get Started`, `Installation Guide`, `Configuration`, `Reference` 전반에 사실 오류 가능성이 남아 있다.
- `architecture/overview.html`, `architecture/zero-trust-flow.html`에는 과장 문구와 깨진 문자열이 확인되었다.
- `Common`, `Autoconfigure`, infrastructure/control-plane 축이 문서에 체계적으로 반영되지 않았다.
- 헤더, 사이드바, 모바일 메뉴, clean URL, 언어 경로는 전면 검증이 필요하다.
- `/en/en/...`, `/ko/ko/...` 같은 언어 중복 경로 문제가 재발하지 않도록 빌드/개발 서버 규칙을 고정해야 한다.

### 3.2 `contexa-site`

- 현재 `demo` 메뉴는 주내비에 없지만 관련 코드와 메시지는 남아 있다.
- `messages-demo` 로딩이 남아 있다.
- `Schedule Demo` CTA가 남아 있다.
- `company`는 실제 `#company` 섹션이 있으므로 깨진 링크가 아니다.
- 따라서 `demo`는 삭제 대상이 아니라 메뉴/주동선 비노출 점검 대상이다.

## 4. 작업 범위

### 4.1 포함

- `D:\contexa-doc` 전체 페이지 감사 및 교정
- 누락된 OSS 축 추가
- 아키텍처/다이어그램/흐름도 교정
- 메뉴/링크/경로 정합화
- `contexa-site`의 공개 노출면 점검

### 4.2 제외

- `contexa-enterprise` 기능을 OSS 사실처럼 문서화하는 작업
- `demo` 관련 코드를 삭제하는 작업
- 사용자가 명시하지 않은 대규모 문서 축소/재서사화

## 5. 구현 백로그

### P0. 기준선 고정

- `D:\contexa-doc\content\en`과 `D:\contexa-doc\content\ko`의 전체 페이지 목록을 고정한다.
- 헤더, 사이드바, 모바일 메뉴, footer의 현재 링크 구조를 스냅샷화한다.
- 각 페이지의 현재 섹션 제목과 순서를 기록한다.
- 이 단계 이후에는 기존 섹션을 임의 삭제하지 않는다.

### P1. 전수 감사표 작성

- EN 43페이지, KO 43페이지 전체를 아래 항목으로 판정한다.
- `정확`
- `사실 오류`
- `예제 불일치`
- `속성 불일치`
- `깨진 링크`
- `깨진 문자열`
- `과장/허위 표현`
- `필수 내용 누락`

- 페이지별로 코드 진실원천을 같이 기록한다.
- 예:
- 클래스
- 메서드
- 속성 prefix
- README/starter README
- CLI/installer 경로

### P2. 설치/시작 문서 교정

대상:

- `get-started.html`
- `docs/install/installation-guide.html`
- `docs/install/quickstart.html`
- `docs/install/spring-boot.html`
- `docs/install/index.html`

수정 기준:

- `curl -fsSL https://install.ctxa.ai | sh`는 유지한다.
- `contexa init`는 유지한다.
- starter 좌표는 `ai.ctxa:spring-boot-starter-contexa:0.1.0`으로 맞춘다.
- Java/Spring Boot 전제조건을 코드 기준으로 맞춘다.
- 실제로 존재하지 않는 Windows PowerShell one-liner는 넣지 않는다.
- Windows는 현재 지원 수준과 대체 경로를 분리해서 설명한다.

### P3. 설정 문서 전면 정합화

대상:

- `docs/install/configuration.html`
- `docs/install/configuration/identity.html`
- `docs/install/configuration/iam.html`
- `docs/install/configuration/infrastructure.html`
- 필요 시 하위 신규 페이지 추가

수정 기준:

- 27개 실제 `@ConfigurationProperties` 축을 기준으로 정리한다.
- 각 설정 페이지에 다음을 포함한다.
- owning class
- 실제 prefix
- 실제 필드
- 코드상 기본값만 기재
- 최소 YAML 예제
- YAML이 아닌 코드/DSL 설정은 별도 명시

### P4. 누락된 OSS 축 추가

대상:

- `contexa-common`
- `contexa-autoconfigure`
- infrastructure/control-plane

필수 설명 항목:

- `@EnableAISecurity`
- `@Protectable`
- `SecurityMode`
- bridge/cache 공통 계약
- `AiSecurityImportSelector`
- `AiSecurityConfiguration`
- `IdentitySecurityCoreAutoConfiguration`
- bootstrap wiring
- distributed event
- Redis/Kafka/router/pipeline/plane/cold-path
- observability/telemetry

반영 위치:

- `Reference` 랜딩
- 헤더 Docs 드롭다운
- 모바일 메뉴
- 좌측 사이드바
- 신규 reference 페이지

### P5. 아키텍처/다이어그램/흐름도 교정

대상:

- `docs/reference/architecture/overview.html`
- `docs/reference/architecture/zero-trust-flow.html`

수정 기준:

- 기존 섹션 구조는 유지한다.
- 아래 문제 문구를 사실 기준으로 교체한다.
- `every request is evaluated in real time by an AI engine`
- `first platform`
- `zero latency`
- `demo application`류 표현
- 깨진 `??` 문자열

추가할 코드 기준 도식:

- 모듈 경계도
- `starter -> @EnableAISecurity -> AiSecurityImportSelector -> AiSecurityConfiguration`
- request-time enforcement chain
- async analysis / decision persistence chain
- method authorization / scanner / policy flow
- pipeline / streaming / advisor / RAG flow
- SOAR execution flow

모든 도식에는 아래를 붙인다.

- 실제 클래스명
- 실제 메서드명
- 각 단계의 한국어 역할 설명

### P6. 메뉴/링크/경로 정합화

대상:

- `includes/header.html`
- `includes/docs-sidebar.html`
- 모바일 메뉴
- footer
- `build.js`
- 개발 서버 경로 처리

검증 규칙:

- `Common`, `Autoconfigure`, 추가된 참조 축이 모든 메뉴에 일관되게 노출되어야 한다.
- `/en/en/...`, `/ko/ko/...`는 금지한다.
- `/get-started`, `/en/get-started`, `/ko/get-started`는 정상 동작해야 한다.
- 빌드 결과와 개발 서버 결과가 같아야 한다.
- 캐시 때문에 이전 깨진 HTML이 재사용되지 않도록 해야 한다.

### P7. `contexa-site` 공개 동선 점검

대상:

- `site-nav.html`
- `home.html`
- `messages-site.properties`
- `messages-site_ko.properties`
- `WebMvcConfig`

수정 기준:

- `demo` 코드는 삭제하지 않는다.
- 메뉴/주동선에서 `demo`가 다시 노출되는지 여부만 점검한다.
- `messages-demo` 로딩 필요성을 확인한다.
- `Schedule Demo` CTA가 공개 첫인상에 남아 있는지 확인한다.
- `company`는 실제 섹션이 있으므로 제거하지 않는다.

## 6. 구현 순서

1. P0 기준선 고정
2. P1 전수 감사표 작성
3. P2 설치/시작 문서 교정
4. P3 설정 문서 교정
5. P4 누락된 OSS 축 추가
6. P5 아키텍처/다이어그램 교정
7. P6 메뉴/링크/경로 정합화
8. P7 `contexa-site` 공개 동선 점검

## 7. 검증 기준

### `contexa-doc`

- `npm run build` 성공
- `npm run check` 성공
- EN/KO 전체 페이지 생성 성공
- 내부 링크 오류 0
- `/en/en`, `/ko/ko` 0
- 깨진 문자열 0
- 허위 설치 경로 0
- 허위 속성/허위 예제 0

### `contexa-site`

- `:contexa-site:compileJava` 성공
- `:contexa-site:compileTestJava` 성공
- nav/CTA/실제 섹션 링크 점검 완료

### 수동 확인 경로

- `/`
- `/get-started`
- `/en/get-started`
- `/ko/get-started`
- `/docs/reference/index.html`
- `/docs/reference/architecture/overview.html`
- `/docs/reference/architecture/zero-trust-flow.html`

## 8. 완료 정의

- 문서 페이지별로 코드 진실원천 매핑이 존재한다.
- 기존 구조와 섹션을 임의 축소하지 않고 사실 오류만 교정되었다.
- 누락된 핵심 OSS 축이 문서 메뉴와 페이지에 반영되었다.
- 아키텍처 페이지가 과장 없는 코드 기준 설명으로 바뀌었다.
- `contexa-site`는 `demo` 코드를 유지하면서도 공개 첫인상이 현재 제품 정체성과 충돌하지 않게 정리된다.
