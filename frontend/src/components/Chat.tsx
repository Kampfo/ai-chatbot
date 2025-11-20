import { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/chatService';
import type { ChatSource } from '../services/chatService';
import { Send, Bot, FileText } from 'lucide-react';

interface ChatProps {
    auditId: number;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: ChatSource[];
}

const Chat: React.FC<ChatProps> = ({ auditId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        // Add placeholder for assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);

        try {
            await sendMessage(
                auditId,
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
                    lastMsg.content += "\n[Error: Something went wrong]";
                }
                return newMessages;
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-96">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">AI Audit Assistant</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 max-w-[85%]">
                                <p className="font-semibold mb-1">Sources:</p>
                                <ul className="space-y-1">
                                    {msg.sources.map((src, i) => (
                                        <li key={i} className="flex items-start gap-1 bg-gray-50 p-1 rounded border border-gray-200">
                                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            <span className="truncate" title={src.snippet}>{src.label} {src.filename}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start">
                        <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about risks, findings..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
