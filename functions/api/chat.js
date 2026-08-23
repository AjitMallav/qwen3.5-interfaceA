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

export async function onRequestPost({ request, env }) {                                                                                                           
    let body;                                                                                                                                                       
                                                                                                                                                                    
    try {                                                                                                                                                           
    body = await request.json();                                                                                                                                  
    } catch {                                                                                                                                                       
    return json({ error: 'Invalid JSON body' }, 400);                                                                                                             
    }                                                                                                                                                               
                                                                                                                                                                    
    const messages = Array.isArray(body.messages) ? body.messages : [];                                                                                             
                                                                                                                                                                    
    if (messages.length === 0) {                                                                                                                                    
    return json({ error: 'messages is required' }, 400);                                                                                                          
    }                                                                                                                                                               
                                                                                                                                                                    
    const sanitizedMessages = messages.slice(-12).map((message) => ({                                                                                               
    role: message.role === 'assistant' ? 'assistant' : 'user',                                                                                                    
    content: String(message.content || '').slice(0, 4000),                                                                                                        
    }));                                                                                                                                                            
                                                                                                                                                                    
    const totalChars = sanitizedMessages.reduce(                                                                                                                    
    (sum, message) => sum + message.content.length,                                                                                                               
    0                                                                                                                                                             
    );                                                                                                                                                              
                                                                                                                                                                    
    if (totalChars > 12000) {                                                                                                                                       
    return json({ error: 'Conversation too long. Please start a new chat.' }, 413);                                                                               
    }                                                                                                                                                               
                                                                                                                                                                    
    if (!env.COLAB_BACKEND_URL) {                                                                                                                                   
    return json({ error: 'Missing COLAB_BACKEND_URL on server' }, 500);                                                                                           
    }                                                                                                                                                               
                                                                                                                                                                    
    const response = await fetch(                                                                                                                                   
    `${env.COLAB_BACKEND_URL.replace(/\/+$/, '')}/chat`,                                                                                                          
    {                                                                                                                                                             
        method: 'POST',                                                                                                                                             
        headers: {                                                                                                                                                  
        'Content-Type': 'application/json',                                                                                                                       
        'x-demo-secret': env.COLAB_SHARED_SECRET || '',                                                                                                           
        },                                                                                                                                                          
        body: JSON.stringify({                                                                                                                                      
        messages: sanitizedMessages,                                                                                                                              
        temperature: Math.min(Number(body.temperature ?? 0.7), 1.2),                                                                                              
        max_tokens: Math.min(Number(body.max_tokens ?? 800), 1000),                                                                                               
        }),                                                                                                                                                         
    }                                                                                                                                                             
    );                                                                                                                                                              
                                                                                                                                                                    
    const data = await response.json().catch(() => null);                                                                                                           
                                                                                                                                                                    
    if (!response.ok) {                                                                                                                                             
    return json(                                                                                                                                                  
        {                                                                                                                                                           
        error: 'Colab backend request failed',                                                                                                                    
        status: response.status,                                                                                                                                  
        details: data,                                                                                                                                            
        },                                                                                                                                                          
        response.status                                                                                                                                             
    );                                                                                                                                                            
    }                                                                                                                                                               
                                                                                                                                                                    
    return json({                                                                                                                                                   
    text: data?.text || '',                                                                                                                                       
    durationSec: data?.durationSec,                                                                                                                               
    });                                                                                                                                                             
}
