import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

const ssm = new SSMClient({})

/** Module-scoped cache — survives across warm Lambda invocations. */
let cachedApiKey: string | undefined

/**
 * Reads the Google Places API key from SSM Parameter Store.
 * The value is fetched once on cold start and cached for subsequent invocations.
 */
export async function getPlacesApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey

  const paramName = process.env.PLACES_API_KEY_PARAM ?? '/firstaid-ai/places-api-key'

  const result = await ssm.send(
    new GetParameterCommand({ Name: paramName, WithDecryption: true }),
  )

  const value = result.Parameter?.Value
  if (!value) throw new Error(`SSM parameter ${paramName} not found or empty`)

  cachedApiKey = value
  return cachedApiKey
}
