# FirstAid AI — Bedrock Tool Schemas

> **IMPORTANT:** These tool definitions and system prompts are hand-tuned design artifacts. Do NOT modify them via automated tooling. Changes require deliberate human review and testing against all five demo scenarios.

## Stage 1: parse_user_input

### Tool Definition

```typescript
const parseUserInputTool = {
  name: "parse_user_input",
  description: "Parse the user's described situation into either a normalized retrieval query or a clarification request.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["retrieve", "clarify"]
      },
      normalizedQuery: {
        type: "string",
        description: "A concise, retrieval-optimized phrasing of the user's situation. Required when action === 'retrieve'."
      },
      extractedContext: {
        type: "object",
        description: "Structured context extracted from input. Required when action === 'retrieve'.",
        properties: {
          scenario: {
            type: "string",
            description: "Primary scenario tag, e.g., 'burn', 'cut', 'allergic_reaction'"
          },
          severity_signals: {
            type: "array",
            items: { type: "string" },
            description: "Phrases indicating severity"
          },
          subject: {
            type: "string",
            description: "Who the situation is about, e.g., 'self', 'child', 'adult'"
          }
        }
      },
      clarificationQuestion: {
        type: "string",
        description: "A single short question to ask the user. Required when action === 'clarify'. Maximum 15 words."
      },
      clarificationReason: {
        type: "string",
        enum: ["too_vague", "missing_severity", "missing_subject", "non_medical", "ambiguous_scenario"],
        description: "Why clarification is needed. Required when action === 'clarify'."
      }
    },
    required: ["action"]
  }
};
```

### System Prompt (Hand-Tuned — Do Not Regenerate)

```
You are a medical triage input parser. Your only job is to call the parse_user_input tool.

Rules:
- Default to action "retrieve" when the scenario and at least one severity signal are reasonably inferable from the input.
- A short but clear input ("kid burned hand on stove") is sufficient to retrieve. Do not ask for clarification on clear inputs.
- Use action "clarify" only when: the input is non-medical, the scenario cannot be guessed, severity signals are entirely absent AND the answer depends on severity, or the subject is unclear in a way that materially affects triage.
- Clarification questions must be a single sentence, under 15 words, asking only for the single most diagnostically important missing piece of information.
- Bias toward retrieve. When in doubt, retrieve.
- Never produce prose. Only call the tool.
```

### Invocation

- SDK: `@aws-sdk/client-bedrock-runtime` `InvokeModelCommand`
- Model: `anthropic.claude-sonnet-4-20250514-v1:0`
- Force tool use via `tool_choice`
- On `action: "clarify"` → return clarification response immediately, skip KB and formatter

---

## Stage 3: submit_triage

### Tool Definition

```typescript
const submitTriageTool = {
  name: "submit_triage",
  description: "Submit the final triage card based strictly on the retrieved medical protocol context.",
  input_schema: {
    type: "object",
    properties: {
      severity: {
        type: "string",
        enum: ["self_care", "urgent_care", "emergency"]
      },
      steps: {
        type: "array",
        items: { type: "string", maxLength: 120 },
        minItems: 3,
        maxItems: 5,
        description: "Numbered first aid steps, each under 120 characters, written in clear imperative voice for a panicked layperson."
      },
      careTier: {
        type: "string",
        enum: ["self_care", "urgent_care", "emergency"]
      },
      reasoning: {
        type: "string",
        description: "Brief internal rationale for severity assignment. Logged server-side only."
      },
      outOfScope: {
        type: "boolean"
      }
    },
    required: ["severity", "steps", "careTier", "reasoning", "outOfScope"]
  }
};
```

### System Prompt (Hand-Tuned — Do Not Regenerate)

```
You are a medical triage formatter. Your only job is to call the submit_triage tool.

Rules:
- Answer ONLY from the provided retrieval context. Do not use your general medical knowledge.
- Each step must be under 120 characters, written in clear imperative voice, with no medical jargon.
- Produce exactly 3 to 5 steps. Distill the protocol — do not enumerate every sub-step.
- If the retrieval context is thin, ambiguous, or does not clearly address the scenario, set outOfScope to true.
- Bias toward over-escalation on severity. When uncertain between urgent_care and emergency, choose emergency.
- Never produce prose. Only call the tool.
```

### Invocation

- SDK: `@aws-sdk/client-bedrock-runtime` `InvokeModelCommand`
- Model: `anthropic.claude-sonnet-4-20250514-v1:0`
- Force tool use via `tool_choice`
- Pass retrieved KB chunks as context in the user message
- Extract `reasoning` → log to CloudWatch, strip from client response
- On `outOfScope: true` → return out-of-scope triage response
