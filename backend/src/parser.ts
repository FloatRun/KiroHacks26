import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION })
const MODEL_ID = process.env.CLAUDE_MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0'

/**
 * Parser system prompt — hand-tuned, do NOT auto-generate.
 * Calibrates retrieve/clarify bias. Must pass all 5 demo scenarios.
 */
function getParserSystemPrompt(language: 'en' | 'es'): string {
  const basePrompt = `You are a medical triage input parser. Your only job is to call the parse_user_input tool.

Rules:
- Default to action "retrieve" when the scenario and at least one severity signal are reasonably inferable from the input.
- A short but clear input ("kid burned hand on stove") is sufficient to retrieve. Do not ask for clarification on clear inputs.
- Use action "clarify" only when: the input is non-medical, the scenario cannot be guessed, severity signals are entirely absent AND the answer depends on severity, or the subject is unclear in a way that materially affects triage.
- Clarification questions must be a single sentence, under 15 words, asking only for the single most diagnostically important missing piece of information.
- Bias toward retrieve. When in doubt, retrieve.
- Never produce prose. Only call the tool.`

  if (language === 'es') {
    return basePrompt + `

IMPORTANT: If action is "clarify", respond in Spanish. The clarification question should be in Spanish and appropriate for Spanish-speaking users.`
  }

  return basePrompt
}

const PARSE_USER_INPUT_TOOL = {
  name: 'parse_user_input',
  description:
    "Parse the user's described situation into either a normalized retrieval query or a clarification request.",
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['retrieve', 'clarify'],
      },
      normalizedQuery: {
        type: 'string',
        description:
          "A concise, retrieval-optimized phrasing of the user's situation. Required when action === 'retrieve'.",
      },
      extractedContext: {
        type: 'object',
        description: "Structured context extracted from input. Required when action === 'retrieve'.",
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
          "A single short question to ask the user. Required when action === 'clarify'. Maximum 15 words.",
      },
      clarificationReason: {
        type: 'string',
        enum: [
          'too_vague',
          'missing_severity',
          'missing_subject',
          'non_medical',
          'ambiguous_scenario',
        ],
        description: "Why clarification is needed. Required when action === 'clarify'.",
      },
    },
    required: ['action'],
  },
}

export interface ParserRetrieveResult {
  action: 'retrieve'
  normalizedQuery: string
  extractedContext: {
    scenario: string
    severity_signals: string[]
    subject: string
  }
}

export interface ParserClarifyResult {
  action: 'clarify'
  clarificationQuestion: string
  clarificationReason: string
}

export type ParserResult = ParserRetrieveResult | ParserClarifyResult

/**
 * Stage 1: Parser
 * Invokes Bedrock Claude with the parse_user_input tool.
 * Returns either a normalized query for retrieval or a clarification request.
 */
export async function invokeParser(query: string, language: 'en' | 'es' = 'en'): Promise<ParserResult> {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: getParserSystemPrompt(language),
    messages: [
      {
        role: 'user',
        content: query,
      },
    ],
    tools: [PARSE_USER_INPUT_TOOL],
    tool_choice: { type: 'tool', name: 'parse_user_input' },
  }

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })

  const response = await client.send(command)
  const responseBody = JSON.parse(new TextDecoder().decode(response.body))

  // Extract tool use from response
  const toolUse = responseBody.content?.find((block: any) => block.type === 'tool_use')
  if (!toolUse || toolUse.name !== 'parse_user_input') {
    throw new Error('Parser did not return expected tool use')
  }

  return toolUse.input as ParserResult
}
