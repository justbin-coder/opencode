# AI SDK Dependency Update Report

Generated: April 11, 2026

## Overview

This report identifies minor/patch version upgrades available for AI SDK dependencies in the opencode project.

**Note**: All updates are **patch or minor** versions only. No major version upgrades included.

---

## Root Package (package.json)

| Dependency | Current           | Latest (minor/patch) | Changelog                                                                    |
| ---------- | ----------------- | -------------------- | ---------------------------------------------------------------------------- |
| `ai`       | 6.0.138 (catalog) | 6.0.148              | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md) |

**Changes**: 10 patch versions behind. Recent fixes include streaming improvements, MCP tool approval, provider metadata updates.

---

## packages/opencode/package.json

### Core AI SDK Packages

| Dependency               | Current | Latest | Upgrade                | Changelog                                                                                |
| ------------------------ | ------- | ------ | ---------------------- | ---------------------------------------------------------------------------------------- |
| `@ai-sdk/provider`       | 3.0.8   | 3.0.8  | ✅ Already latest      | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/provider/CHANGELOG.md)       |
| `@ai-sdk/provider-utils` | 4.0.21  | 4.0.23 | 🟢 `4.0.22` → `4.0.23` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/provider-utils/CHANGELOG.md) |

**Provider-utils 4.0.22-4.0.23 changes**: Grammar fixes in error messages, tool set utility types moved from `ai` package.

---

### OpenAI & Compatible Providers

| Dependency       | Current | Latest | Upgrade                | Changelog                                                                        |
| ---------------- | ------- | ------ | ---------------------- | -------------------------------------------------------------------------------- |
| `@ai-sdk/openai` | 3.0.48  | 3.0.50 | 🟢 `3.0.49` → `3.0.50` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/openai/CHANGELOG.md) |

**OpenAI 3.0.49-3.0.50 changes**: Added GPT-5.4 models, gpt-5.3-chat-latest, MCP tool approval support.

| `@ai-sdk/openai-compatible` | 2.0.37 | 2.0.41 | 🟢 `2.0.38` → `2.0.41` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/openai-compatible/CHANGELOG.md) |

**OpenAI-compatible changes**: Various bug fixes, updated dependencies.

| `@ai-sdk/azure` | 3.0.49 | 3.0.51 | 🟢 `3.0.50` → `3.0.51` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/azure/CHANGELOG.md) |

**Azure changes**: Updated API version defaults, provider metadata improvements.

---

### Anthropic & Google

| Dependency          | Current | Latest | Upgrade                | Changelog                                                                           |
| ------------------- | ------- | ------ | ---------------------- | ----------------------------------------------------------------------------------- |
| `@ai-sdk/anthropic` | 3.0.64  | 3.0.68 | 🟢 `3.0.65` → `3.0.68` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/anthropic/CHANGELOG.md) |

**Anthropic 3.0.65-3.0.68 changes**: claude-haiku-4-5 model group fix, tool search beta header handling, MCP tool approval.

| `@ai-sdk/google` | 3.0.53 | 3.0.60 | 🟢 `3.0.54` → `3.0.60` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/google/CHANGELOG.md) |

**Google 3.0.54-3.0.60 changes**: Model ID autocomplete improvements, grammar fixes in error messages.

| `@ai-sdk/google-vertex` | 4.0.95 | 4.0.103 | 🟢 `4.0.96` → `4.0.103` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/google-vertex/CHANGELOG.md) |

**Google-Vertex changes**: Similar to google provider, updated dependencies.

---

### AWS & Cloud Providers

| Dependency               | Current | Latest | Upgrade                | Changelog                                                                                |
| ------------------------ | ------- | ------ | ---------------------- | ---------------------------------------------------------------------------------------- |
| `@ai-sdk/amazon-bedrock` | 4.0.83  | 4.0.89 | 🟢 `4.0.84` → `4.0.89` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/amazon-bedrock/CHANGELOG.md) |

**Bedrock changes**: Model updates, provider utils updates.

| `@ai-sdk/gateway` | 3.0.80 | 3.0.82 | 🟢 `3.0.81` → `3.0.82` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/gateway/CHANGELOG.md) |

---

### Other Model Providers

| Dependency        | Current | Latest | Upgrade                | Changelog                                                                         |
| ----------------- | ------- | ------ | ---------------------- | --------------------------------------------------------------------------------- |
| `@ai-sdk/groq`    | 3.0.31  | 3.0.32 | 🟢 Already latest      | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/groq/CHANGELOG.md)    |
| `@ai-sdk/mistral` | 3.0.27  | 3.0.29 | 🟢 `3.0.28` → `3.0.29` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/mistral/CHANGELOG.md) |

**Mistral 3.0.28-3.0.29 changes**: Reasoning configuration support for mistral-small-latest.

| `@ai-sdk/cerebras` | 2.0.41 | 2.0.41 | ✅ Already latest | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/cerebras/CHANGELOG.md) |
| `@ai-sdk/cohere` | 3.0.27 | 3.0.27 | ⚠️ Check latest | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/cohere/CHANGELOG.md) |
| `@ai-sdk/deepinfra` | 2.0.41 | 2.0.41 | ⚠️ Check latest | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/deepinfra/CHANGELOG.md) |
| `@ai-sdk/perplexity` | 3.0.26 | 3.0.26 | ✅ Already latest | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/perplexity/CHANGELOG.md) |

| `@ai-sdk/togetherai` | 2.0.41 | 2.0.45 | 🟢 `2.0.42` → `2.0.45` | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/togetherai/CHANGELOG.md) |

**TogetherAI 2.0.42-2.0.45 changes**: AI Gateway hint added to README, dependency updates.

| `@ai-sdk/vercel` | 2.0.39 | 2.0.39 | ✅ Already latest | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/vercel/CHANGELOG.md) |

| `@ai-sdk/xai` | 3.0.75 | 3.0.74 | 🔽 Already ahead | [CHANGELOG](https://github.com/vercel/ai/blob/main/packages/xai/CHANGELOG.md) |

**Note**: `@ai-sdk/xai` is already ahead of latest stable (3.0.74).

---

### Third-Party Providers

| Dependency                    | Current | Latest | Upgrade              | Changelog                                                                             |
| ----------------------------- | ------- | ------ | -------------------- | ------------------------------------------------------------------------------------- |
| `@openrouter/ai-sdk-provider` | 2.3.3   | 2.5.1  | 🟢 `2.3.4` → `2.5.1` | [CHANGELOG](https://github.com/OpenRouterTeam/ai-sdk-provider/blob/main/CHANGELOG.md) |

**OpenRouter 2.3.4-2.5.1 changes**:

- Raw response body included in `response.body` (access to provider-specific fields)
- Removed `@openrouter/sdk` dependency (reduced footprint)
- Fixed undefined cost field in providerMetadata
- Fixed AI peer dependency from exact to ^6.0.0
- Added `engine` option for web search

---

### Related Packages

| Dependency            | Current | Latest | Upgrade           |
| --------------------- | ------- | ------ | ----------------- |
| `ai-gateway-provider` | 3.1.2   | -      | ⚠️ Check manually |
| `gitlab-ai-provider`  | 6.0.0   | -      | ⚠️ Check manually |

---

## Summary

### Recommended Updates

| Priority | Package                       | Current → New    |
| -------- | ----------------------------- | ---------------- |
| High     | `@ai-sdk/anthropic`           | 3.0.64 → 3.0.68  |
| High     | `@ai-sdk/google`              | 3.0.53 → 3.0.60  |
| High     | `@ai-sdk/google-vertex`       | 4.0.95 → 4.0.103 |
| High     | `@openrouter/ai-sdk-provider` | 2.3.3 → 2.5.1    |
| Medium   | `@ai-sdk/amazon-bedrock`      | 4.0.83 → 4.0.89  |
| Medium   | `@ai-sdk/mistral`             | 3.0.27 → 3.0.29  |
| Medium   | `@ai-sdk/togetherai`          | 2.0.41 → 2.0.45  |
| Low      | `@ai-sdk/provider-utils`      | 4.0.21 → 4.0.23  |
| Low      | `@ai-sdk/openai`              | 3.0.48 → 3.0.50  |
| Low      | `@ai-sdk/azure`               | 3.0.49 → 3.0.51  |
| Low      | `@ai-sdk/gateway`             | 3.0.80 → 3.0.82  |

### Already Latest

- `@ai-sdk/provider`
- `@ai-sdk/cerebras`
- `@ai-sdk/groq`
- `@ai-sdk/perplexity`
- `@ai-sdk/vercel`
- `@ai-sdk/xai` (already ahead)

---

## Verification Commands

To verify and install updates:

```bash
# Check for outdated packages
cd packages/opencode
bun outdate

# Install specific updates
bun add @ai-sdk/anthropic@3.0.68 @ai-sdk/google@3.0.60 @openrouter/ai-sdk-provider@2.5.1
```

---

## Notes

1. **Patched dependencies**: The following packages have patches in the repository:
   - `@ai-sdk/provider-utils@4.0.21`
   - `@ai-sdk/anthropic@3.0.64`

   After upgrading, verify patches still apply correctly.

2. **Breaking changes**: No breaking changes detected in minor/patch updates for AI SDK v3/v4.

3. **Beta versions**: There are v4.0.0-beta versions available for several packages, but these are not included as they are pre-releases.
