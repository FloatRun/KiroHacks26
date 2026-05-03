import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime'

const client = new BedrockAgentRuntimeClient({})

export interface RetrievalChunk {
  text: string
  score: number
  sourceUri?: string
}

export interface RetrievalResult {
  chunks: RetrievalChunk[]
  maxScore: number
}

/**
 * Stage 2 — Retrieve relevant chunks from the Bedrock Knowledge Base.
 *
 * Returns the top-K chunks with their similarity scores.
 * The caller is responsible for the similarity threshold gate.
 */
export async function retrieveFromKnowledgeBase(
  normalizedQuery: string,
  topK = 5,
): Promise<RetrievalResult> {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID
  if (!knowledgeBaseId) {
    throw new Error('KNOWLEDGE_BASE_ID environment variable is not set')
  }

  const command = new RetrieveCommand({
    knowledgeBaseId,
    retrievalQuery: { text: normalizedQuery },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: topK,
      },
    },
  })

  const response = await client.send(command)

  const chunks: RetrievalChunk[] = (response.retrievalResults ?? []).map((result) => ({
    text: result.content?.text ?? '',
    score: result.score ?? 0,
    sourceUri: result.location?.s3Location?.uri
      ?? result.location?.webLocation?.url
      ?? undefined,
  }))

  const maxScore = chunks.length > 0
    ? Math.max(...chunks.map((c) => c.score))
    : 0

  return { chunks, maxScore }
}
