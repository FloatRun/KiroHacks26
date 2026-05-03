import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

const client = new SSMClient({ region: process.env.AWS_REGION })
const PLACES_API_KEY_PARAM = process.env.PLACES_API_KEY_PARAM || '/firstaid-ai/places-api-key'

// Cache the API key in module scope after cold start
let cachedApiKey: string | null = null

/**
 * Reads the Google Places API key from SSM Parameter Store.
 * Caches the result in module scope to avoid repeated SSM calls.
 */
export async function getPlacesApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey
  }

  const command = new GetParameterCommand({
    Name: PLACES_API_KEY_PARAM,
    WithDecryption: true,
  })

  const response = await client.send(command)
  if (!response.Parameter?.Value) {
    throw new Error('Places API key not found in SSM')
  }

  cachedApiKey = response.Parameter.Value
  return cachedApiKey
}
