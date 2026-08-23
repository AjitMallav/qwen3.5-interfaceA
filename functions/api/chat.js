const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function onRequestPost({ request, env }) {
  if (!env.QWEN_API_KEY) {
    return json({ error: 'Missing QWEN_API_KEY on server' }, 500)
  }

  let body

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const messages = Array.isArray(body.messages) ? body.messages : []

  if (messages.length === 0) {
    return json({ error: 'messages is required' }, 400)
  }

  const sanitizedMessages = messages.slice(-12).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content || '').slice(0, 4000),
  }))

  const totalChars = sanitizedMessages.reduce(
    (sum, message) => sum + message.content.length,
    0,
  )

  if (totalChars > 12000) {
    return json({ error: 'Conversation too long. Please start a new chat.' }, 413)
  }

  const baseUrl = env.QWEN_BASE_URL || 'https://openrouter.ai/api/v1'
  const model = env.QWEN_MODEL || 'REPLACE_WITH_FREE_QWEN_MODEL_ID'

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.QWEN_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.PUBLIC_SITE_URL || 'http://localhost',
        'X-Title': 'Qwen 3.5 Interface A',
      },
      body: JSON.stringify({
        model,
        messages: sanitizedMessages,
        temperature: Math.min(Number(body.temperature ?? 0.7), 1.2),
        max_tokens: Math.min(Number(body.max_tokens ?? 800), 1000),
        stream: false,
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return json(
        {
          error: 'Qwen provider request failed',
          status: response.status,
          details: data,
        },
        response.status,
      )
    }

    const text = data?.choices?.[0]?.message?.content || ''

    return json({ text })
  } catch (error) {
    return json(
      {
        error: 'Backend failed to reach Qwen provider',
        details: String(error),
      },
      500,
    )
  }
}
