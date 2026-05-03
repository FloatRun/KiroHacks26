import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime'

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION })
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID!
const TOP_K = 5

export interface RetrievalChunk {
  text: string
  score: number
}

/**
 * Stage 2: Knowledge Base Retrieval
 * Queries the Bedrock Knowledge Base with the normalized query.
 * Returns top K chunks with similarity scores.
 */
export async function retrieveFromKnowledgeBase(
  normalizedQuery: string,
): Promise<RetrievalChunk[]> {
  const command = new RetrieveCommand({
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: normalizedQuery,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: TOP_K,
      },
    },
  })

  const response = await client.send(command)

  if (!response.retrievalResults || response.retrievalResults.length === 0) {
    return []
  }

  return response.retrievalResults.map((result) => ({
    text: result.content?.text || '',
    score: result.score || 0,
  }))
}
