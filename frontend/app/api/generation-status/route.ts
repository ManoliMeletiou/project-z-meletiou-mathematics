export async function GET() {
  const endpoint = process.env.AI_GENERATOR_ENDPOINT || '';
  const key = process.env.AI_GENERATOR_API_KEY || '';
  const model = process.env.AI_GENERATOR_MODEL || '';

  return Response.json({
    ok: true,
    configured: Boolean(endpoint && key && model),
    endpointConfigured: Boolean(endpoint),
    apiKeyConfigured: Boolean(key),
    modelConfigured: Boolean(model),
    model: model || null,
    provider: process.env.AI_GENERATOR_PROVIDER || 'OpenAI-compatible',
    fallbackEnabled: true
  });
}
