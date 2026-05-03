import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import type { ClarificationReason } from './types/api.js'

const bedrock = new BedrockRuntimeClient({})

/** Result when the parser decides to retrieve from the knowledge base. */
export interface ParseRetrieveResult {
  action: 'retrieve'
  normalizedQuery: string
  extractedContext: {
    scenario?: string
    severity_signals?: string[]
    subject?: string
  }
}

/** Result when the parser asks for clarification. */
export interface ParseClarifyResult {
  action: 'clarify'
  clarificationQuestion: string
  clarificationReason: ClarificationReason
}

export type ParseResult = ParseRetrieveResult | ParseClarifyResult

/**
 * Stage 1 — Invoke Bedrock Claude to parse the user's input into either
 * a normalized retrieval query or a clarification request.
 *
 * Uses forced tool_choice so the model must call parse_user_input.
 */
export async function invokeParser(query: string): Promise<ParseResult> {
  const modelId = process.env.CLAUDE_MODEL_ID ?? 'anthropic.claude-sonnet-4-20250514-v1:0'

  const tool = {
    name: 'parse_user_input',
    description:
      'Parse the user\'s described situation into either a normalized retrieval query or a clarification request.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['retrieve', 'clarify'],
        },
        normalizedQuery: {
          type: 'string',
          description:
            'A concise, retrieval-optimized phrasing of the user\'s situation. Required when action === \'retrieve\'.',
        },
        extractedContext: {
          type: 'object',
          description:
            'Structured context extracted from input. Required when action === \'retrieve\'.',
          properties: {
            scenario: {
              type: 'string',
              description: "Primary scenario tag, e.g., 'burn', 'cut', 'allergic_reaction'",
            },
            severity_signals: {
              type: 'array',
              items: { type: 'string' },
              description: 'Phrases indicating severity',
            },
            subject: {
              type: 'string',
              description: "Who the situation is about, e.g., 'self', 'child', 'adult'",
            },
          },
        },
        clarificationQuestion: {
          type: 'string',
          description:
            'A single short question to ask the user. Required when action === \'clarify\'. Maximum 15 words.',
        },
        clarificationReason: {
          type: 'string',
          enum: ['too_vague', 'missing_severity', 'missing_subject', 'non_medical', 'ambiguous_scenario'],
          description: 'Why clarification is needed. Required when action === \'clarify\'.',
        },
      },
      required: ['action'],
    },
  }

  // Hand-tuned system prompt — do not regenerate.
  const systemPrompt = `You are a medical triage input parser. Your only job is to call the parse_user_input tool.

Rules:
- Default to action "retrieve" when the scenario and at least one severity signal are reasonably inferable from the input.
- A short but clear input ("kid burned hand on stove") is sufficient to retrieve. Do not ask for clarification on clear inputs.
- Use action "clarify" only when: the input is non-medical, the scenario cannot be guessed, severity signals are entirely absent AND the answer depends on severity, or the subject is unclear in a way that materially affects triage.
- Clarification questions must be a single sentence, under 15 words, asking only for the single most diagnostically important missing piece of information.
- Bias toward retrieve. When in doubt, retrieve.
- Never produce prose. Only call the tool.`

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
    tools: [tool],
    tool_choice: { type: 'tool', name: 'parse_user_input' },
  })

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: new TextEncoder().encode(body),
  })

  const response = await bedrock.send(command)
  const responseBody = JSON.parse(new TextDecoder().decode(response.body))

  // Extract the tool_use block
  const toolUse = responseBody.content?.find(
    (block: { type: string }) => block.type === 'tool_use',
  )
  if (!toolUse?.input) {
    throw new Error('Parser did not return a tool_use block')
  }

  const input = toolUse.input as Record<string, unknown>

  if (input.action === 'clarify') {
    return {
      action: 'clarify',
      clarificationQuestion: (input.clarificationQuestion as string) ?? 'Can you describe what happened in more detail?',
      clarificationReason: (input.clarificationReason as ClarificationReason) ?? 'too_vague',
    }
  }

  return {
    action: 'retrieve',
    normalizedQuery: (input.normalizedQuery as string) ?? query,
    extractedContext: (input.extractedContext as ParseRetrieveResult['extractedContext']) ?? {},
  }
}
