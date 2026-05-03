import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import type { Severity } from './types/api.js'
import type { RetrievalChunk } from './retrieval.js'

const bedrock = new BedrockRuntimeClient({})

export interface FormatterResult {
  severity: Severity
  steps: string[]
  careTier: Severity
  reasoning: string
  outOfScope: boolean
}

/**
 * Stage 3 — Invoke Bedrock Claude to produce the final triage card
 * based on retrieved knowledge base chunks.
 *
 * Uses forced tool_choice so the model must call submit_triage.
 * The `reasoning` field is returned for CloudWatch logging but must
 * be stripped before sending to the client.
 */
export async function invokeFormatter(
  chunks: RetrievalChunk[],
  extractedContext: { scenario?: string; severity_signals?: string[]; subject?: string },
): Promise<FormatterResult> {
  const modelId = process.env.CLAUDE_MODEL_ID ?? 'anthropic.claude-sonnet-4-20250514-v1:0'

  const tool = {
    name: 'submit_triage',
    description:
      'Submit the final triage card based strictly on the retrieved medical protocol context.',
    input_schema: {
      type: 'object' as const,
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
          description: 'Brief internal rationale for severity assignment. Logged server-side only.',
        },
        outOfScope: {
          type: 'boolean',
        },
      },
      required: ['severity', 'steps', 'careTier', 'reasoning', 'outOfScope'],
    },
  }

  // Hand-tuned system prompt — do not regenerate.
  const systemPrompt = `You are a medical triage formatter. Your only job is to call the submit_triage tool.

Rules:
- Answer ONLY from the provided retrieval context. Do not use your general medical knowledge.
- Each step must be under 120 characters, written in clear imperative voice, with no medical jargon.
- Produce exactly 3 to 5 steps. Distill the protocol — do not enumerate every sub-step.
- If the retrieval context is thin, ambiguous, or does not clearly address the scenario, set outOfScope to true.
- Bias toward over-escalation on severity. When uncertain between urgent_care and emergency, choose emergency.
- Never produce prose. Only call the tool.`

  // Build the user message with retrieval context + extracted context
  const contextBlock = chunks
    .map((c, i) => `[Source ${i + 1} (score: ${c.score.toFixed(3)})]:\n${c.text}`)
    .join('\n\n')

  const contextSummary = [
    extractedContext.scenario && `Scenario: ${extractedContext.scenario}`,
    extractedContext.subject && `Subject: ${extractedContext.subject}`,
    extractedContext.severity_signals?.length &&
      `Severity signals: ${extractedContext.severity_signals.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n')

  const userMessage = `Retrieved medical protocol context:\n\n${contextBlock}\n\n${contextSummary ? `Extracted context:\n${contextSummary}` : ''}`

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_triage' },
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
    throw new Error('Formatter did not return a tool_use block')
  }

  const input = toolUse.input as Record<string, unknown>

  return {
    severity: (input.severity as Severity) ?? 'emergency',
    steps: (input.steps as string[]) ?? [],
    careTier: (input.careTier as Severity) ?? 'emergency',
    reasoning: (input.reasoning as string) ?? '',
    outOfScope: (input.outOfScope as boolean) ?? false,
  }
}
