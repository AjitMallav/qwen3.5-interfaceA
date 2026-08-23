import { useRef, useState } from 'react';                                                                                                                         
import { Loader2, Send, Trash2 } from 'lucide-react';                                                                                                             
import '.src/App.css';                                                                                                                                               
                                                                                                                                                                  
type Message = {                                                                                                                                                  
  role: 'user' | 'assistant';                                                                                                                                     
  content: string;                                                                                                                                                
};                                                                                                                                                                
                                                                                                                                                                  
const STARTER_MESSAGES: Message[] = [                                                                                                                             
  {                                                                                                                                                               
    role: 'assistant',                                                                                                                                            
    content: 'Hi — I am a public Qwen chat demo. Ask me anything.',                                                                                               
  },                                                                                                                                                              
];                                                                                                                                                                
                                                                                                                                                                  
export default function App() {                                                                                                                                   
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);                                                                                          
  const [input, setInput] = useState('');                                                                                                                         
  const [isLoading, setIsLoading] = useState(false);                                                                                                              
  const textareaRef = useRef<HTMLTextAreaElement>(null);                                                                                                          
                                                                                                                                                                  
  const sendMessage = async () => {                                                                                                                               
    const content = input.trim();                                                                                                                                 
    if (!content || isLoading) return;                                                                                                                            
                                                                                                                                                                  
    const nextMessages: Message[] = [...messages, { role: 'user', content }];                                                                                     
                                                                                                                                                                  
    setMessages(nextMessages);                                                                                                                                    
    setInput('');                                                                                                                                                 
    setIsLoading(true);                                                                                                                                           
                                                                                                                                                                  
    try {                                                                                                                                                         
      const response = await fetch('/api/chat', {                                                                                                                 
        method: 'POST',                                                                                                                                           
        headers: { 'Content-Type': 'application/json' },                                                                                                          
        body: JSON.stringify({                                                                                                                                    
          messages: nextMessages,                                                                                                                                 
          temperature: 0.7,                                                                                                                                       
          max_tokens: 800,                                                                                                                                        
        }),                                                                                                                                                       
      });                                                                                                                                                         
                                                                                                                                                                  
      const data = await response.json();                                                                                                                         
                                                                                                                                                                  
      if (!response.ok) {                                                                                                                                         
        throw new Error(data?.error || 'Request failed');                                                                                                         
      }                                                                                                                                                           
                                                                                                                                                                  
      setMessages([                                                                                                                                               
        ...nextMessages,                                                                                                                                          
        {                                                                                                                                                         
          role: 'assistant',                                                                                                                                      
          content: data.text || 'No response returned.',                                                                                                          
        },                                                                                                                                                        
      ]);                                                                                                                                                         
    } catch (error) {                                                                                                                                             
      setMessages([                                                                                                                                               
        ...nextMessages,                                                                                                                                          
        {                                                                                                                                                         
          role: 'assistant',                                                                                                                                      
          content: `Error: ${String(error)}`,                                                                                                                     
        },                                                                                                                                                        
      ]);                                                                                                                                                         
    } finally {                                                                                                                                                   
      setIsLoading(false);                                                                                                                                        
      textareaRef.current?.focus();                                                                                                                               
    }                                                                                                                                                             
  };                                                                                                                                                              
                                                                                                                                                                  
  const clearChat = () => {                                                                                                                                       
    if (isLoading) return;                                                                                                                                        
    setMessages(STARTER_MESSAGES);                                                                                                                                
    setInput('');                                                                                                                                                 
    textareaRef.current?.focus();                                                                                                                                 
  };                                                                                                                                                              
                                                                                                                                                                  
  return (                                                                                                                                                        
    <main className="app">                                                                                                                                        
      <section className="chat-shell">                                                                                                                            
        <header className="topbar">                                                                                                                               
          <div>                                                                                                                                                   
            <h1>Qwen 3.5 Interface A</h1>                                                                                                                         
            <p>Public chat interface with a server-side Qwen API backend.</p>                                                                                     
          </div>                                                                                                                                                  
                                                                                                                                                                  
          <button                                                                                                                                                 
            className="clear-button"                                                                                                                              
            onClick={clearChat}                                                                                                                                   
            disabled={isLoading}                                                                                                                                  
            title="Clear chat"                                                                                                                                    
          >                                                                                                                                                       
            <Trash2 size={16} />                                                                                                                                  
            Clear                                                                                                                                                 
          </button>                                                                                                                                               
        </header>                                                                                                                                                 
                                                                                                                                                                  
        <div className="messages" aria-live="polite">                                                                                                             
          {messages.map((message, index) => (                                                                                                                     
            <article key={index} className={`message ${message.role}`}>                                                                                           
              <div className="message-label">                                                                                                                     
                {message.role === 'user' ? 'You' : 'Qwen'}                                                                                                        
              </div>                                                                                                                                              
              <div className="message-content">{message.content}</div>                                                                                            
            </article>                                                                                                                                            
          ))}                                                                                                                                                     
                                                                                                                                                                  
          {isLoading && (                                                                                                                                         
            <article className="message assistant">                                                                                                               
              <div className="message-label">Qwen</div>                                                                                                           
              <div className="message-content loading">                                                                                                           
                <Loader2 size={16} className="spinner" />                                                                                                         
                Thinking…                                                                                                                                         
              </div>                                                                                                                                              
            </article>                                                                                                                                            
          )}                                                                                                                                                      
        </div>                                                                                                                                                    
                                                                                                                                                                  
        <footer className="composer-wrap">                                                                                                                        
          <div className="composer">                                                                                                                              
            <textarea                                                                                                                                             
              ref={textareaRef}                                                                                                                                   
              value={input}                                                                                                                                       
              onChange={(event) => setInput(event.target.value)}                                                                                                  
              onKeyDown={(event) => {                                                                                                                             
                if (event.key === 'Enter' && !event.shiftKey) {                                                                                                   
                  event.preventDefault();                                                                                                                         
                  sendMessage();                                                                                                                                  
                }                                                                                                                                                 
              }}                                                                                                                                                  
              placeholder="Ask Qwen something…"                                                                                                                   
              rows={2}                                                                                                                                            
              disabled={isLoading}                                                                                                                                
            />                                                                                                                                                    
                                                                                                                                                                  
            <button                                                                                                                                               
              className="send-button"                                                                                                                             
              onClick={sendMessage}                                                                                                                               
              disabled={!input.trim() || isLoading}                                                                                                               
              title="Send"                                                                                                                                        
            >                                                                                                                                                     
              {isLoading ? (                                                                                                                                      
                <Loader2 size={18} className="spinner" />                                                                                                         
              ) : (                                                                                                                                               
                <Send size={18} />                                                                                                                                
              )}                                                                                                                                                  
            </button>                                                                                                                                             
          </div>                                                                                                                                                  
                                                                                                                                                                  
          <p className="hint">                                                                                                                                    
            Press Enter to send. Shift + Enter for a new line.                                                                                                    
          </p>                                                                                                                                                    
        </footer>                                                                                                                                                 
      </section>                                                                                                                                                  
    </main>                                                                                                                                                       
  );                                                                                                                                                              
}                                                                                                                                                                 

