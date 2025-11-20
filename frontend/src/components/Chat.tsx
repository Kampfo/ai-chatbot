import { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/chatService';
import type { ChatSource } from '../services/chatService';
import { Send, Bot, User as UserIcon, Sparkles, Paperclip } from 'lucide-react';

interface ChatProps {
    auditId?: number;
    auditTitle?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: ChatSource[];
}

const Chat: React.FC<ChatProps> = ({ auditId, auditTitle }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string>();
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);

        try {
            await sendMessage(
                auditId || 0,
                userMsg,
                sessionId,
                (chunk) => {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.content += chunk;
                        }
                        return newMessages;
                    });
                },
                (metadata) => {
                    setSessionId(metadata.session_id);
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.sources = metadata.sources;
                        }
                        return newMessages;
                    });
                }
            );
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === 'assistant') {
                    lastMsg.content += "\n[Fehler: Etwas ist schiefgelaufen]";
                }
                return newMessages;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(undefined);
    };

    return (
        <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            AI Assistent
                        </h2>
                        {auditTitle && (
                            <p className="text-sm text-gray-600 mt-1">
                                Kontext: <span className="font-medium">{auditTitle}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleNewChat}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Neuer Chat
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Bot className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Wie kann ich Ihnen helfen?</p>
                        <p className="text-sm mt-2">Stellen Sie Fragen zu Prüfungen oder allgemeine Fragen</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div
                                className={`
                                    max-w-[70%] rounded-2xl px-4 py-3
                                    ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-800'
                                    }
                                `}
                            >
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                        <p className="text-xs font-semibold text-gray-600 mb-2">Quellen:</p>
                                        <div className="space-y-1">
                                            {msg.sources.map((source, i) => (
                                                <div key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                    <span className="font-medium">[{i + 1}]</span>
                                                    <span className="line-clamp-2">{source.filename}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <UserIcon className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
                <form onSubmit={handleSend} className="flex gap-3">
                    <button
                        type="button"
                        className="p-3 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Datei anhängen"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Nachricht eingeben..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Send className="w-5 h-5" />
                        Senden
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
