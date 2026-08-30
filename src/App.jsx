import { useEffect, useRef, useState } from "react";

const copy = {
  en: {
    eyebrow: "Personal intelligence system",
    greeting: "Good to see you, Ahmad.",
    prompt: "What are we solving today?",
    placeholder: "Message Jarvis...",
    listening: "Listening...",
    thinking: "Synthesizing response",
    disclaimer: "Jarvis can make mistakes. Verify important information.",
    status: "Systems online",
    newChat: "New conversation",
    empty: "Ask a question, map a plan, or think through a difficult decision.",
    voiceUnavailable: "Voice input is not supported in this browser.",
    error: "I couldn't reach the intelligence service. Please try again.",
    suggestions: [
      "Build my focus plan",
      "Help me learn faster",
      "Draft a clear message",
    ],
  },
  ur: {
    eyebrow: "ذاتی ذہانت کا نظام",
    greeting: "احمد، آپ کو دیکھ کر خوشی ہوئی۔",
    prompt: "آج ہم کیا حل کر رہے ہیں؟",
    placeholder: "جاروس کو پیغام لکھیں...",
    listening: "سن رہا ہوں...",
    thinking: "جواب تیار ہو رہا ہے",
    disclaimer: "جاروس سے غلطی ہو سکتی ہے۔ اہم معلومات کی تصدیق کریں۔",
    status: "تمام نظام فعال ہیں",
    newChat: "نئی گفتگو",
    empty: "سوال پوچھیں، منصوبہ بنائیں، یا کسی مشکل فیصلے پر غور کریں۔",
    voiceUnavailable: "اس براؤزر میں آواز کی سہولت دستیاب نہیں۔",
    error: "ذہانت کی سروس سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    suggestions: ["میرا فوکس پلان بنائیں", "تیزی سے سیکھنے میں مدد کریں", "واضح پیغام لکھیں"],
  },
};

const initialMessages = [];

function Icon({ name, size = 20 }) {
  const paths = {
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    mic: <><rect width="8" height="13" x="8" y="2" rx="4"/><path d="M4 10a8 8 0 0 0 16 0M12 18v4M8 22h8"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.42"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>,
    volume: <><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    stop: <rect width="12" height="12" x="6" y="6" rx="2"/>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Orb({ compact = false, active = false }) {
  return (
    <div className={`orb ${compact ? "orb--compact" : ""} ${active ? "is-active" : ""}`} aria-hidden="true">
      <span className="orb__ring orb__ring--one" />
      <span className="orb__ring orb__ring--two" />
      <span className="orb__ring orb__ring--three" />
      <span className="orb__core"><span /></span>
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState(() => localStorage.getItem("jarvis-theme") || "dark");
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [notice, setNotice] = useState("");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const text = copy[language];
  const isUrdu = language === "ur";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("jarvis-theme", theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const resetConversation = () => {
    setMessages([]);
    setInput("");
    setNotice("");
    window.speechSynthesis?.cancel();
  };

  const speak = (content) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/[*#`]/g, ""));
    utterance.lang = isUrdu ? "ur-PK" : "en-US";
    utterance.rate = 0.96;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice(text.voiceUnavailable);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = isUrdu ? "ur-PK" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      setNotice("");
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const submitMessage = async (messageText = input) => {
    const cleanInput = messageText.trim();
    if (!cleanInput || isLoading) return;

    const nextMessages = [...messages, { role: "user", content: cleanInput }];
    setMessages(nextMessages);
    setInput("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-8), language }),
      });

      if (!response.ok || !response.body) throw new Error("Chat request failed");

      setMessages((current) => [...current, { role: "assistant", content: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) => {
          const updated = [...current];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = { ...updated[lastIndex], content: updated[lastIndex].content + chunk };
          return updated;
        });
      }
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: text.error, error: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    submitMessage();
  };

  return (
    <main className="app-shell" dir={isUrdu ? "rtl" : "ltr"}>
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <div className="grid-plane" />

      <header className="topbar">
        <button className="brand" onClick={resetConversation} aria-label={text.newChat}>
          <Orb compact />
          <span><strong>JARVIS</strong><small>PRO / AHMAD</small></span>
        </button>
        <div className="topbar__actions">
          <span className="system-status"><i />{text.status}</span>
          <div className="language-switch" aria-label="Language">
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
            <button className={language === "ur" ? "active" : ""} onClick={() => setLanguage("ur")}>اردو</button>
          </div>
          <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button className="icon-button new-chat" onClick={resetConversation} aria-label={text.newChat} title={text.newChat}>
            <Icon name="plus" />
          </button>
        </div>
      </header>

      <section className={`workspace ${messages.length ? "workspace--chat" : ""}`}>
        {!messages.length && (
          <div className="hero">
            <div className="hero__orb"><Orb active={isLoading || isListening} /></div>
            <p className="eyebrow">{text.eyebrow}</p>
            <h1>{text.greeting}</h1>
            <p className="hero__prompt">{text.prompt}</p>
            <p className="hero__description">{text.empty}</p>
            <div className="suggestions">
              {text.suggestions.map((suggestion, index) => (
                <button key={suggestion} onClick={() => submitMessage(suggestion)}>
                  <span>0{index + 1}</span>{suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {!!messages.length && (
          <div className="conversation" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`message message--${message.role} ${message.error ? "message--error" : ""}`} key={`${message.role}-${index}`}>
                <div className="message__identity">{message.role === "assistant" ? <Orb compact active={isLoading && index === messages.length - 1} /> : <span>AH</span>}</div>
                <div className="message__body">
                  <span className="message__label">{message.role === "assistant" ? "JARVIS" : "AHMAD"}</span>
                  <p>{message.content || text.thinking}</p>
                  {message.role === "assistant" && message.content && (
                    <button className="speak-button" onClick={() => speak(message.content)} aria-label="Read response aloud"><Icon name="volume" size={17} /></button>
                  )}
                </div>
              </article>
            ))}
            {isLoading && messages.at(-1)?.role !== "assistant" && (
              <div className="thinking"><i /><i /><i /><span>{text.thinking}</span></div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      <footer className="composer-wrap">
        {notice && <p className="notice">{notice}</p>}
        <form className={`composer ${isListening ? "is-listening" : ""}`} onSubmit={onSubmit}>
          <button type="button" className="voice-button" onClick={toggleVoice} aria-label={isListening ? "Stop listening" : "Start voice input"}>
            <Icon name={isListening ? "stop" : "mic"} />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
            placeholder={isListening ? text.listening : text.placeholder}
            rows="1"
            aria-label={text.placeholder}
          />
          <button className="send-button" type="submit" disabled={!input.trim() || isLoading} aria-label="Send message">
            <Icon name="send" />
          </button>
        </form>
        <p className="disclaimer">{text.disclaimer}</p>
      </footer>
    </main>
  );
}

export default App;
