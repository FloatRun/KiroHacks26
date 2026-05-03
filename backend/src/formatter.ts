import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import type { RetrievalChunk } from './retrieval.js'
import type { Severity } from './types/api.js'

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION })
const MODEL_ID = process.env.CLAUDE_MODEL_ID || 'us.anthropic.claude-sonnet-4-20250514-v1:0'

/**
 * Formatter system prompt — hand-tuned, do NOT auto-generate.
 * Enforces step count, character limits, over-escalation bias.
 */
function getFormatterSystemPrompt(language: 'en' | 'es'): string {
  const basePrompt = `You are a medical triage formatter. Your only job is to call the submit_triage tool.

Rules:
- Answer ONLY from the provided retrieval context. Do not use your general medical knowledge.
- Each step must be under 120 characters, written in clear imperative voice, with no medical jargon.
- Produce exactly 3 to 5 steps. Distill the protocol — do not enumerate every sub-step.
- If the retrieval context is thin, ambiguous, or does not clearly address the scenario, set outOfScope to true.
- Bias toward over-escalation on severity. When uncertain between urgent_care and emergency, choose emergency.
- Never produce prose. Only call the tool.`

  if (language === 'es') {
    return basePrompt + `

IMPORTANT: Respond in Spanish. All steps must be written in clear, simple Spanish that a panicked Spanish-speaking person can understand. Use imperative voice (commands) in Spanish. Keep medical terms simple and accessible.`
  }

  return basePrompt
}

const SUBMIT_TRIAGE_TOOL = {
  name: 'submit_triage',
  description:
    'Submit the final triage card based strictly on the retrieved medical protocol context.',
  input_schema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: ['self_care', 'urgent_care', 'emergency'],
      },
      steps: {
        type: 'array',
        items: { type: 'string', maxLength: 120 },
        minItems: 3,
        maxItems: 5,
        description:
          'Numbered first aid steps, each under 120 characters, written in clear imperative voice for a panicked layperson.',
      },
      careTier: {
        type: 'string',
        enum: ['self_care', 'urgent_care', 'emergency'],
      },
      reasoning: {
        type: 'string',
        description:
          'Brief internal rationale for severity assignment. Logged server-side only.',
      },
      outOfScope: {
        type: 'boolean',
      },
    },
    required: ['severity', 'steps', 'careTier', 'reasoning', 'outOfScope'],
  },
}

export interface FormatterResult {
  severity: Severity
  steps: string[]
  careTier: Severity
  reasoning: string
  outOfScope: boolean
}

/**
 * Stage 3: Formatter
 * Invokes Bedrock Claude with the submit_triage tool.
 * Passes retrieved chunks as context.
 * Returns structured triage card.
 */
export async function invokeFormatter(
  chunks: RetrievalChunk[],
  extractedContext: any,
  language: 'en' | 'es' = 'en',
): Promise<FormatterResult> {
  // Build context from retrieved chunks
  const contextText = chunks
    .map((chunk, i) => `[Chunk ${i + 1}, score ${chunk.score.toFixed(2)}]\n${chunk.text}`)
    .join('\n\n---\n\n')

  const userMessage = `Retrieved medical protocol context:\n\n${contextText}\n\nExtracted context from user query:\nScenario: ${extractedContext.scenario}\nSeverity signals: ${extractedContext.severity_signals.join(', ')}\nSubject: ${extractedContext.subject}\n\nProvide triage guidance based strictly on the retrieved context above.`

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    system: getFormatterSystemPrompt(language),
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
    tools: [SUBMIT_TRIAGE_TOOL],
    tool_choice: { type: 'tool', name: 'submit_triage' },
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
  if (!toolUse || toolUse.name !== 'submit_triage') {
    throw new Error('Formatter did not return expected tool use')
  }

  return toolUse.input as FormatterResult
}
