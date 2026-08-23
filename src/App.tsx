import { useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FolderPlus,
  Grid3X3,
  Lightbulb,
  Loader2,
  Mic,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCw,
  Search,
  Share2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import './App.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
  durationSec?: number
}

type ChatSession = {
  id: string
  title: string
  messages: Message[]
}

const createSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

const createTitle = (prompt: string) => {
  const clean = prompt.replace(/\s+/g, ' ').trim()
  return clean.length > 22 ? `${clean.slice(0, 22)}...` : clean
}

function App() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const activeSession = chatSessions.find((session) => session.id === currentChatId) || null
  const filteredSessions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return chatSessions
    return chatSessions.filter((session) => session.title.toLowerCase().includes(query))
  }, [chatSessions, searchQuery])

  const actionDisabled = !isGenerating && input.trim().length === 0

  const appendAssistantMessage = (chatId: string, message: Message) => {
    setChatSessions((previous) =>
      previous.map((session) =>
        session.id === chatId
          ? { ...session, messages: [...session.messages, message] }
          : session,
      ),
    )
  }

  const stopGeneration = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsGenerating(false)
  }

  const createNewChatSession = () => {
    if (isGenerating) stopGeneration()
    setCurrentChatId(null)
    setInput('')
    setSearchQuery('')
  }

  const switchChatSession = (id: string) => {
    if (isGenerating) stopGeneration()
    setCurrentChatId(id)
  }

  const handleSend = async () => {
    const prompt = input.trim()
    if (!prompt || isGenerating) return

    const chatId = currentChatId || createSessionId()
    const existingSession = chatSessions.find((session) => session.id === chatId)
    const userMessage: Message = { role: 'user', content: prompt }
    const nextMessages = [...(existingSession?.messages || []), userMessage]

    if (existingSession) {
      setChatSessions((previous) =>
        previous.map((session) =>
          session.id === chatId
            ? { ...session, messages: nextMessages }
            : session,
        ),
      )
    } else {
      setChatSessions((previous) => [
        {
          id: chatId,
          title: createTitle(prompt),
          messages: nextMessages,
        },
        ...previous,
      ])
      setCurrentChatId(chatId)
    }

    setInput('')
    setIsGenerating(true)

    const controller = new AbortController()
    abortControllerRef.current = controller
    const startTime = performance.now()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          temperature: 0.7,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })

      const data = await response.json()
      const durationSec = (performance.now() - startTime) / 1000

      if (!response.ok) {
        throw new Error(data?.error || 'Request failed')
      }

      appendAssistantMessage(chatId, {
        role: 'assistant',
        content: data.text || 'No response returned.',
        durationSec,
      })
    } catch (error) {
      if (controller.signal.aborted) return

      appendAssistantMessage(chatId, {
        role: 'assistant',
        content: `Error: ${String(error)}`,
        durationSec: (performance.now() - startTime) / 1000,
      })
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setIsGenerating(false)
      }
    }
  }

  const chatInput = (
    <div className="input-box" id="shared-input-box">
      <button className="plus-btn" title="Uploading files disabled" type="button">
        <Plus size={18} />
      </button>

      <input
        type="text"
        id="chat-input"
        className="chat-input"
        placeholder="Ask Qwen3.5 anything..."
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !actionDisabled) {
            handleSend()
          }
        }}
      />

      <div className="input-controls">
        <div className="auto-dropdown">
          <span>Auto</span>
          <ChevronDown size={12} />
        </div>

        <button className="icon-circle-btn" id="voice-btn" title="Voice Input" type="button">
          <Mic size={16} />
        </button>

        <button
          className={`send-btn${isGenerating ? ' streaming' : ''}`}
          id="action-btn"
          disabled={actionDisabled}
          onClick={() => {
            if (isGenerating) {
              stopGeneration()
            } else {
              handleSend()
            }
          }}
          type="button"
        >
          {isGenerating ? <Square size={12} fill="#ffffff" /> : <ArrowUp size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside id="sidebar" className={sidebarCollapsed ? 'collapsed' : undefined}>
        <div className="sidebar-top">
          <div className="sidebar-header">
            <div className="brand-logo">
              <Sparkles size={18} />
            </div>

            <button
              className="sidebar-toggle-btn"
              id="close-sidebar-btn"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              type="button"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="nav-list">
            <a className="nav-item" id="new-chat-btn" title="New Chat" onClick={createNewChatSession}>
              <Plus size={16} />
              <span>New Chat</span>
            </a>

            <a
              className="nav-item"
              id="search-chats-btn"
              title="Search Chats"
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false)
                setSearchOpen((open) => !open)
              }}
            >
              <Search size={16} />
              <span>Search Chats</span>
            </a>

            <a className="nav-item disabled">
              <Grid3X3 size={16} />
              <span>Community</span>
            </a>

            <a className="nav-item disabled">
              <Code2 size={16} />
              <span>Coder</span>
            </a>
          </nav>

          <div
            className="search-box-container"
            id="search-box-container"
            style={{ display: searchOpen && !sidebarCollapsed ? 'block' : undefined }}
          >
            <div className="search-input-wrapper">
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                id="search-input"
                placeholder="Search saved chats..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-section-title">
            <span>Projects</span>
            <ChevronDown size={14} />
          </div>

          <a className="nav-item disabled">
            <FolderPlus size={16} />
            <span>New Project</span>
          </a>

          <div className="sidebar-section-title">
            <span>All chats</span>
            <ChevronDown size={14} />
          </div>

          <div className="history-section" id="history-container">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px' }}>
              Today
            </div>
            <div className="history-list" id="history-list">
              {filteredSessions.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px' }}>
                  No chats found
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`history-item ${session.id === currentChatId ? 'active' : ''}`}
                    onClick={() => switchChatSession(session.id)}
                  >
                    <span>{session.title}</span>
                    <MoreHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="user-profile" title="User">
            <div className="avatar">A</div>
            <span className="user-name">User</span>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header>
          <div className="header-left">
            <button className="model-selector" type="button">
              <span>Qwen3.5-4B</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="header-icons">
            <MoreHorizontal size={18} style={{ cursor: 'pointer' }} />
          </div>
        </header>

        <main className="content-area" id="content-area">
          {!activeSession && (
            <div className="welcome-container" id="welcome-screen">
              <h1 className="welcome-title">Ready to get started?</h1>

              <div className="welcome-input-host" id="welcome-input-host">
                {chatInput}
              </div>
            </div>
          )}

          {activeSession && (
            <div className="chat-container" id="chat-container">
              {activeSession.messages.map((message, index) =>
                message.role === 'user' ? (
                  <div className="user-msg-row" key={`${message.role}-${index}`}>
                    <div className="user-bubble">{message.content}</div>
                  </div>
                ) : (
                  <div className="assistant-msg-row" key={`${message.role}-${index}`}>
                    <div className="thinking-status">
                      <Lightbulb size={15} />
                      <span>Thought for {message.durationSec?.toFixed(2) || '0.00'}s</span>
                      <ChevronRight size={14} />
                    </div>

                    <div className="assistant-text">{message.content}</div>

                    <div className="action-bar">
                      <button title="Copy" type="button">
                        <Copy size={15} />
                      </button>
                      <button title="Thumbs up" type="button">
                        <ThumbsUp size={15} />
                      </button>
                      <button title="Thumbs down" type="button">
                        <ThumbsDown size={15} />
                      </button>
                      <button title="Share" type="button">
                        <Share2 size={15} />
                      </button>
                      <button title="Retry" type="button">
                        <RotateCw size={15} />
                      </button>
                    </div>
                  </div>
                ),
              )}

              {isGenerating && currentChatId === activeSession.id && (
                <div className="assistant-msg-row">
                  <div className="thinking-status loading">
                    <Loader2 className="spin-icon" size={15} />
                    <span>Thinking...</span>
                  </div>

                  <div className="assistant-text" id="stream-target"></div>
                </div>
              )}
            </div>
          )}
        </main>

        {activeSession && (
          <div className="bottom-dock" id="bottom-dock" style={{ display: 'flex' }}>
            <div className="bottom-input-host" id="bottom-input-host">
              {chatInput}
            </div>

            <div className="disclaimer-text" id="disclaimer">
              AI-generated content may not be accurate.
            </div>

            <div className="help-icon">?</div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
