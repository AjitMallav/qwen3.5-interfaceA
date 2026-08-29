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
    // Hard-coded quick responses for specific prompts (short-circuit backend)
    try {
    const lastUser = sanitizedMessages.slice().reverse().find((m) => m.role === 'user');
    const lastText = (lastUser?.content || '').trim();

    const lower = lastText.toLowerCase();

    // Original celebratory message
    const celebratory = `🚀 **Huge Congratulations to the Team!** 🎉

  We just hit the green light on our latest project! 🌟 From the initial spark to this successful launch, your hard work, creativity, and dedication made it all possible.

  This is a massive milestone, but even bigger is what we've learned and how far we've come together. Let's celebrate this win with some well-deserved recognition! 💪✨

  Let's make the next one just as amazing (if not better). Onward and upward! 🚀💼

  #TeamSuccess #ProjectLaunch #ProudMoment`;

    // More formal
    const formal = `**Subject: Official Announcement: Successful Launch of [Project Name]**

  Dear Team,

  I am pleased to formally announce the successful launch of **[Project Name]**. This achievement represents a significant milestone in our organization's progress and serves as a testament to your collective expertise, diligence, and strategic vision.

  The transition from concept to execution was executed with precision, and the results reflect the high standards upheld by every member of this team. We are deeply grateful for the commitment demonstrated during this phase.

  Please join us in acknowledging the efforts that brought this initiative to fruition. Your continued excellence will undoubtedly drive further success in our upcoming endeavors.

  Congratulations once again.

  Best regards,

  [Your Name/Title]`;

    // Slightly formal but casual
    const slightlyFormal = `**Subject: Great News: [Project Name] is Live! 🚀**

  Hi Team,

  Just wanted to share some exciting news: **[Project Name]** has officially launched successfully! 🎉

  After a lot of hard work, collaboration, and dedication, we've crossed the finish line. It's been a fantastic journey, and seeing this project come to life is truly a testament to everyone's effort.

  Let's take a moment to celebrate this win—it's well-deserved! But more importantly, let's keep that momentum going. I'm excited to see what we can achieve next.

  Well done, everyone!

  Best,

  [Your Name]`;

    if (lower.includes('celebrating a successful project launch') || (lower.includes('project launch') && lower.includes('encourag'))) {
      return json({ text: celebratory, durationSec: 0 });
    }

    if (lower.includes('make it more formal') || lower === 'make it more formal') {
      return json({ text: formal, durationSec: 0 });
    }

    if (lower.includes('not that formal') || lower.includes('slightly formal') || lower.includes('keep it slightly formal')) {
      return json({ text: slightlyFormal, durationSec: 0 });
    }
    } catch (e) {
    // fall through to regular behavior on any error
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
