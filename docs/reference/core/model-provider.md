---
title: "Model Providers"
---
contexa-core

# Model Providers

The model provider system manages LLM models across multiple backends. The `DynamicModelRegistry` auto-discovers Spring AI `ChatModel` beans and custom `ModelProvider` implementations, while the `DynamicModelSelectionStrategy` selects the optimal model for each request based on tier, availability, and priority.

## Overview

Contexa supports multiple LLM providers simultaneously. At startup, the `DynamicModelRegistry` discovers all available models through three mechanisms:

1.  **ModelProvider beans** — Custom provider implementations registered in the Spring context.
2.  **Spring AI ChatModel beans** — Auto-detected from `spring.ai.ollama.*`, `spring.ai.anthropic.*`, or `spring.ai.openai.*` configuration.
3.  **TieredLLMProperties** — Model names from the 3-tier configuration hierarchy.

The registry automatically infers the provider from the model class name (Ollama, Anthropic, OpenAI, Gemini, Mistral, Azure, Bedrock, HuggingFace) and performs health checks at initialization.

## ModelProvider

The interface for custom model provider implementations. Implement this to add support for providers not covered by Spring AI auto-configuration.

`public interface ModelProvider`

getProviderName() String

Returns the unique provider identifier (e.g., "ollama", "anthropic", "openai").

getAvailableModels() List<ModelDescriptor>

Returns all models available from this provider.

createModel(ModelDescriptor descriptor, Map<String, Object> config) ChatModel

Creates a `ChatModel` instance for the given descriptor. The config map provides runtime overrides.

supportsModel(String modelId) boolean

Returns whether this provider can serve the given model ID.

checkHealth(String modelId) HealthStatus

Performs a health check on the specified model and returns the result with response time metrics.

initialize(Map<String, Object> config) void

Initializes the provider with the given configuration. Called once during registry startup.

getPriority() int

Returns the provider priority. Lower values are preferred when multiple providers support the same model. Default: 100.

## ModelDescriptor

Describes a model's identity, capabilities, default options, and current status.

`@Data @Builder   public class ModelDescriptor`

Property

Type

Description

`modelId`

`String`

Unique model identifier (e.g., "llama3.1:8b", "claude-3-opus").

`displayName`

`String`

Human-readable model name.

`provider`

`String`

Provider name (ollama, anthropic, openai).

`tier`

`Integer`

The tier this model is assigned to (1, 2, or 3). Null if unassigned.

`version`

`String`

Model version string.

`capabilities`

`ModelCapabilities`

What the model supports (streaming, tool calling, multimodal, context window).

`options`

`ModelOptions`

Default sampling options (temperature, topP, topK, repetitionPenalty).

`status`

`ModelStatus`

`AVAILABLE` or `UNAVAILABLE`.

### ModelCapabilities

Field

Type

Default

`streaming`

`boolean`

true

`toolCalling`

`boolean`

false

`functionCalling`

`boolean`

false

`multiModal`

`boolean`

false

`maxTokens`

`int`

4096

`contextWindow`

`int`

4096

## DynamicModelRegistry

Central registry that discovers, manages, and provides access to all LLM models. Auto-initializes at application startup.

`public class DynamicModelRegistry`

getModel(String modelId) ChatModel

Returns the `ChatModel` for the given ID. Creates and caches the instance if not already loaded. Throws `ModelSelectionException` if not found.

getAllModels() Collection<ModelDescriptor>

Returns all registered model descriptors.

getModelsByProvider(String provider) List<ModelDescriptor>

Returns available models filtered by provider name.

registerModel(ModelDescriptor descriptor) void

Registers or merges a model descriptor. Configuration-defined tiers take precedence over provider-defined tiers.

refreshModels() void

Asks all providers to refresh their model lists and registers any newly discovered models.

updateModelStatus(String modelId, ModelStatus status) void

Updates the availability status of a registered model.

## ModelSelectionStrategy

Interface for model selection logic. The `DynamicModelSelectionStrategy` is the default implementation.

`public interface ModelSelectionStrategy`

selectModel(ExecutionContext context) ChatModel

Selects the best model for the given execution context. Returns null if no model is available.

getSupportedModels() Set<String>

Returns the set of all model IDs available for selection.

isModelAvailable(String modelName) boolean

Checks whether a specific model is currently available.

## DynamicModelSelectionStrategy

The default selection strategy that uses a priority-based fallback chain:

`public class DynamicModelSelectionStrategy implements ModelSelectionStrategy`

1.  **Tier-based** — If `ExecutionContext.tier` is set, resolve the model from `TieredLLMProperties`. Falls back to the backup model for that tier if the primary is unavailable.
2.  **Preferred model** — If `ExecutionContext.preferredModel` is set, attempt to use it directly.
3.  **Primary ChatModel** — Falls back to the auto-configured primary `ChatModel` bean from Spring AI.

## Configuration

### Tiered Model Hierarchy

```yaml
contexa:
  llm:
    layer1:
      model: tinyllama:latest
      backup:
        model: qwen2.5:0.5b
    layer2:
      model: llama3.1:8b
      backup:
        model: exaone3.5:7.8b
```

:::info
**Tier Selection Priority:** The model selection follows this order: `ExecutionContext.tier` → `SecurityTaskType.getDefaultTier()` → `AnalysisLevel.getDefaultTier()` → `preferredModel` → primary ChatModel fallback.
:::

## Related

[

### LLM Orchestrator

Uses ModelSelectionStrategy to choose models for each request.

](../../../docs/reference/core/llm-orchestrator)[

### AI Pipeline

Pipeline executors use the model system through the orchestrator.

](../../../docs/reference/core/pipeline)

[Previous AI Pipeline](../../../docs/reference/core/pipeline) [Next RAG & Vectors](../../../docs/reference/core/rag)