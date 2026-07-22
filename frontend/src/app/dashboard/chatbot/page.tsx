'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  FileText,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  User,
  Bot,
  Volume2,
  VolumeX,
  Plus,
  MessageCircle,
  History,
  MoreHorizontal,
  Trash2,
  X
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAnalyses } from '@/hooks/useAnalyses';
import { useConversations, useMessages } from '@/hooks/useConversations';
import { apiClient } from '@/lib/api-client';

export default function ChatbotPage() {
  const { user } = useAuth();
  const { analyses } = useAnalyses(user);
  const { conversations, loading: convsLoading, createConversation } = useConversations(user);
  
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { messages, loading: msgsLoading, addMessage } = useMessages(currentConversationId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Chat state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'elevenlabs'>('openai');
  const [ttsVoice, setTtsVoice] = useState('nova');
  const [availableVoices, setAvailableVoices] = useState<{ id: string; name: string }[]>([]);
  const [availableLLMs, setAvailableLLMs] = useState<{ id: string; name: string }[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load available voices and LLMs
  useEffect(() => {
    if (user) {
      const loadOptions = async () => {
        try {
          const voicesRes = await apiClient(`/chat/voices?provider=${ttsProvider}`);
          const llmsRes = await apiClient('/chat/llms');
          setAvailableVoices((voicesRes as any).voices || []);
          setAvailableLLMs((llmsRes as any).llms || []);
        } catch (err) {
          console.error('Failed to load voices/llms', err);
        }
      };
      loadOptions();
    }
  }, [ttsProvider, user]);
  
  // Auto-create first conversation if none exists
  useEffect(() => {
    if (!convsLoading && conversations.length === 0 && user) {
      const initConversation = async () => {
        const conv = await createConversation('Nouvelle conversation');
        if (conv) setCurrentConversationId(conv.id);
      };
      initConversation();
    } else if (!convsLoading && conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, convsLoading, user, currentConversationId, createConversation]);

  // Play audio helper
  const playAudio = (base64Audio: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audioBlob = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      audio.play();
    } catch (err) {
      console.error('Failed to play audio', err);
    }
  };

  const handleNewConversation = async () => {
    if (!user) return;
    const conv = await createConversation('Nouvelle conversation');
    if (conv) setCurrentConversationId(conv.id);
    setInputValue('');
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !user || !currentConversationId) return;

    // Add user message to local state
    const userMessageData = {
      sender: 'user' as const,
      text: textToSend,
      createdAt: new Date(),
    };
    await addMessage(userMessageData);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call backend
      const response = await apiClient('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          userId: user.uid,
          analyseId: null,
          history: messages.map(m => ({ role: m.sender, content: m.text })),
          voiceProvider: ttsEnabled ? ttsProvider : null,
          voiceId: ttsEnabled ? ttsVoice : null,
        }),
      }) as {
        message: string;
        content: string;
        model?: string;
        voiceBytes?: string;
      };

      // Add assistant message
      const assistantMessageData = {
        sender: 'assistant' as const,
        text: response.message || response.content || 'Erreur de génération',
        createdAt: new Date(),
        voiceBytes: response.voiceBytes,
      };
      await addMessage(assistantMessageData);

      // Auto-play if TTS is enabled
      if (ttsEnabled && response.voiceBytes) {
        playAudio(response.voiceBytes);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessageData = {
        sender: 'assistant' as const,
        text: "Désolé, je n'ai pas pu joindre le service de diagnostic IA. Veuillez vérifier votre connexion avec le serveur FastAPI.",
        createdAt: new Date(),
      };
      await addMessage(errorMessageData);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    {
      text: "Quelle est ma liquidité actuelle ?",
      icon: TrendingUp,
      desc: "Analyse du BFR et du ratio de liquidité"
    },
    {
      text: "Quelles sont les recommandations ?",
      icon: Sparkles,
      desc: "Actions concrètes d'optimisation"
    },
    {
      text: "Quel est mon niveau d'endettement ?",
      icon: ShieldAlert,
      desc: "Diagnostic de solvabilité"
    },
    {
      text: "Comment optimiser mon BFR ?",
      icon: RefreshCw,
      desc: "Cycle d'exploitation et délais"
    }
  ];

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      {/* Sidebar - Conversations */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ ease: 'easeInOut', duration: 0.25 }}
            className="w-72 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col"
          >
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-[var(--text)]">Conversations</h2>
                <Button variant="primary" size="sm" onClick={handleNewConversation}>
                  <Plus className="w-4 h-4 mr-1" /> Nouvelle
                </Button>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {convsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-3 rounded-xl bg-[var(--bg-muted)] h-12" />
                ))
              ) : conversations.length === 0 ? (
                <div className="text-center p-6 text-[var(--text-muted)] text-sm">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  Aucune conversation
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setCurrentConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      currentConversationId === conv.id
                        ? 'bg-[var(--violet-soft)] border border-[var(--violet-border-strong)]'
                        : 'bg-[var(--bg-card)] border border-transparent hover:border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate ${
                        currentConversationId === conv.id ? 'text-[var(--violet)]' : 'text-[var(--text)]'
                      }`}>
                        {conv.title}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {conv.updatedAt.toLocaleDateString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          title="Assistant IA Financier"
          subtitle="Posez vos questions et obtenez des diagnostics instantanés selon les normes SYSCOHADA"
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-3 p-2 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <History className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          )}
        </DashboardHeader>

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] mx-auto w-full space-y-6">
          {/* Top Bar - TTS Settings */}
          <Card className="w-full">
            <CardContent className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--violet-soft)] border border-[var(--violet-border)]">
                  <Volume2 className="w-5 h-5 text-[var(--violet)]" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-[var(--text)]">Synthèse Vocale</h4>
                  <p className="text-xs text-[var(--text-muted)]">Écoutez les réponses de l'IA avec une voix naturelle</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                    ttsEnabled
                      ? 'bg-[var(--violet-soft)] border-[var(--violet-border-strong)] text-[var(--violet)]'
                      : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {ttsEnabled ? 'Activé' : 'Désactivé'}
                </button>

                {ttsEnabled && (
                  <>
                    <select
                      value={ttsProvider}
                      onChange={(e) => setTtsProvider(e.target.value as 'openai' | 'elevenlabs')}
                      className="bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-3 py-2 outline-none focus:border-[var(--violet)]"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="elevenlabs">ElevenLabs</option>
                    </select>

                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-3 py-2 outline-none focus:border-[var(--violet)] min-w-[180px]"
                    >
                      {availableVoices.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-260px)]">
            {/* Suggestions - only on large screens or mobile top */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <h3 className="font-display font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider px-1">
                Suggestions rapides
              </h3>
              
              {suggestions.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.text)}
                    disabled={isLoading}
                    className="flex items-start text-left gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--violet-border-strong)] hover:bg-[var(--violet-soft)]/20 transition-all duration-300 group disabled:opacity-50"
                  >
                    <div className="p-2.5 rounded-xl bg-[var(--bg-muted)] group-hover:bg-[var(--violet-soft)] transition-colors">
                      <Icon className="w-4 h-4 text-[var(--text-2)] group-hover:text-[var(--violet)]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--violet)] transition-colors">
                        {s.text}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                  </button>
                );
              })}
            </div>

            {/* Messages */}
            <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden border-[var(--border)]">
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
                {msgsLoading ? (
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl border bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-2)] flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-4 rounded-xl rounded-tl-none animate-pulse">
                      <div className="h-4 bg-[var(--bg-muted)] rounded mb-2" />
                      <div className="h-4 bg-[var(--bg-muted)] rounded w-3/4" />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Sparkles className="w-16 h-16 text-[var(--violet)] mb-4" />
                    <h3 className="text-xl font-display font-bold text-[var(--text)] mb-2">
                      Comment puis-je vous aider aujourd'hui ?
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-md">
                      Posez une question sur vos finances, vos ratios, ou choisissez une suggestion rapide à gauche.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-start gap-3.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                          m.sender === 'user'
                            ? 'bg-[var(--violet-soft)] border-[var(--violet-border)] text-[var(--violet)]'
                            : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-2)]'
                        }`}>
                          {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div className={`max-w-[75%] p-4 rounded-xl ${
                          m.sender === 'user'
                            ? 'bg-[var(--violet-strong)] text-white rounded-tr-none'
                            : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] rounded-tl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                          
                          <div className="mt-3 flex items-center justify-between gap-2">
                            {m.sender === 'assistant' && m.voiceBytes && (
                              <button
                                onClick={() => playAudio(m.voiceBytes!)}
                                disabled={isPlaying}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)] hover:opacity-80 transition-opacity disabled:opacity-50"
                              >
                                {isPlaying ? <Sparkles className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                                Écouter
                              </button>
                            )}
                            
                            <span className="block text-[10px] opacity-60 text-right">
                              {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {isLoading && (
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl border bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-2)] flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-4 rounded-xl rounded-tl-none">
                      <div className="flex gap-1.5 items-center py-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--violet)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--violet)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--violet)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Posez votre question sur la liquidité, l'endettement..."
                    disabled={isLoading}
                    className="flex-1 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)] py-3 px-4 rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    variant="primary"
                    className="px-5 rounded-xl flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
