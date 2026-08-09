import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Recycle, Clock, Search, Leaf } from '@/lib/icons';

type Msg = { role: 'user' | 'ai'; text: string };

const suggestions = [
  { icon: MessageSquare, text: 'Report garbage', prompt: 'I want to report a garbage issue' },
  { icon: Clock, text: 'Collection timing', prompt: 'When is my next garbage collection?' },
  { icon: Recycle, text: 'Recycling tips', prompt: 'Give me some recycling tips' },
  { icon: Search, text: 'Track complaint', prompt: 'Track my complaint CMP-4821' },
];

const aiResponses: Record<string, string> = {
  'report garbage': "I can help you report garbage! Tap the 'Report Garbage' button on your home screen, upload a photo of the issue, and I'll analyze it to identify the waste type, overflow level, and priority — then auto-generate a complaint with a tracking ID.",
  'next garbage collection': "Your next collection is scheduled for **tomorrow at 7:30 AM** in Zone 4 — Riverside. You'll receive a notification 30 minutes before the truck arrives. Please keep your bin accessible by the curb.",
  'collection timing': "Your next collection is scheduled for **tomorrow at 7:30 AM** in Zone 4 — Riverside. The sanitation worker assigned is Ravi Kumar (SW-2041). You'll get a notification when collection is complete.",
  'recycling tips': "Here are 5 quick recycling tips:\n\n1. Rinse food containers before recycling\n2. Flatten cardboard boxes to save space\n3. Keep paper dry — wet paper can't be recycled\n4. Separate glass by color when possible\n5. Don't bag recyclables — place them loose in the bin\n\nYou'll earn Green Points for each correct recycling action!",
  'track complaint': "Complaint **CMP-4821** is currently **Pending**.\n\n• Type: Overflow Bin\n• Location: MG Road, Sector 4\n• Priority: High\n• Reported: Today, 9:12 AM\n\nIt's been escalated to the Municipal Admin and a worker will be assigned shortly. You'll be notified when status changes.",
  'recycling': "Here are 5 quick recycling tips:\n\n1. Rinse food containers before recycling\n2. Flatten cardboard boxes to save space\n3. Keep paper dry — wet paper can't be recycled\n4. Separate glass by color when possible\n5. Don't bag recyclables — place them loose in the bin\n\nYou'll earn Green Points for each correct recycling action!",
  'track': "Complaint **CMP-4821** is currently **Pending**.\n\n• Type: Overflow Bin\n• Location: MG Road, Sector 4\n• Priority: High\n• Reported: Today, 9:12 AM\n\nIt's been escalated to the Municipal Admin and a worker will be assigned shortly.",
};

function getAIResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const key of Object.keys(aiResponses)) {
    if (lower.includes(key)) return aiResponses[key];
  }
  return "I'm your CleanOS AI assistant. I can help you report garbage issues, check collection timings, share recycling tips, and track complaints. Try one of the suggested prompts below, or ask me anything about waste management!";
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: "Hi! I'm your CleanOS AI Assistant. How can I help you with waste management today?" },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', text: getAIResponse(text) }]);
      setTyping(false);
    }, 1100);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      <div className="text-center mb-4 animate-fade-up">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 shadow-lg shadow-emerald-500/30 mb-3">
          <Sparkles className="text-white" size={26} />
        </div>
        <h1 className="text-xl font-bold font-display text-primary-c">AI Assistant</h1>
        <p className="text-sm text-secondary-c">Ask about reports, collections, recycling & more</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar space-y-4 px-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
            {m.role === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                <Sparkles size={15} className="text-white" />
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-br-md'
                : 'glass text-primary-c rounded-bl-md'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center shrink-0 mr-2.5">
              <Sparkles size={15} className="text-white" />
            </div>
            <div className="glass px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-2 gap-2.5 my-4 stagger">
          {suggestions.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.text}
                onClick={() => send(s.prompt)}
                className="glass-card p-3 flex items-center gap-2.5 text-left hover:scale-[1.02] transition"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                  <Icon size={16} />
                </div>
                <span className="text-xs font-medium text-primary-c">{s.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="glass-card p-2 flex items-center gap-2 mt-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
          <Leaf size={16} />
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask me anything..."
          className="flex-1 bg-transparent outline-none text-sm text-primary-c placeholder:text-muted-c"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 flex items-center justify-center text-white disabled:opacity-40 transition hover:scale-105"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
