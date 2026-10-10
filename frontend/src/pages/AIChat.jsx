import { useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import { useAsync } from "../hooks/useAsync.js";
import Button from "../components/ui/Button.jsx";
import Notice from "../components/ui/Notice.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const STARTERS = [
  "Why are the leaves on my chilli plant turning yellow?",
  "How often should I water herbs on a balcony?",
  "What can I do outside today to help my plants?",
];

function AssistantMessage({ msg, onAddTask }) {
  const [added, setAdded] = useState({});
  return (
    <div className="max-w-prose rounded-3xl bg-white p-5 ring-1 ring-ink/10">
      <p className="whitespace-pre-line">{msg.answer}</p>
      {msg.possible_causes?.length > 0 && (
        <div className="mt-3">
          <p className="font-semibold">Possible causes</p>
          <ul className="list-disc pl-5 text-ink/85">
            {msg.possible_causes.map((c) => (<li key={c}>{c}</li>))}
          </ul>
        </div>
      )}
      {msg.next_steps?.length > 0 && (
        <div className="mt-3">
          <p className="font-semibold">Try this outside</p>
          <ul className="mt-1 space-y-2">
            {msg.next_steps.map((s) => (
              <li key={s} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-moss-light px-3 py-2">
                <span>{s}</span>
                {added[s] ? (
                  <span className="text-sm font-semibold text-moss">Added to tasks</span>
                ) : (
                  <Button size="sm" variant="quiet" onClick={async () => { await onAddTask(s); setAdded((a) => ({ ...a, [s]: true })); }}>
                    Add as task
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg.requires_verification && (
        <p className="mt-3 text-sm text-ink/60">This is guidance, not a diagnosis. Check the plant yourself before treating it.</p>
      )}
    </div>
  );
}

export default function AIChat() {
  const garden = useAsync(() => api.getGarden(), []);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [research, setResearch] = useState(null);
  const [researchError, setResearchError] = useState(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, sending]);

  const send = async (question) => {
    const message = (question ?? text).trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    const history = messages.slice(-6).map((m) =>
      m.role === "user" ? { role: "user", content: m.text } : { role: "assistant", content: m.answer }
    );
    setMessages((m) => [...m, { role: "user", text: message }]);
    setText("");
    try {
      const reply = await api.chat({ garden_id: garden.data?.id ?? null, message, history });
      setMessages((m) => [...m, { role: "assistant", ...reply }]);
    } catch (e) {
      setError(e);
      setText(message); // keep the question so it can be resent
      setMessages((m) => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const addTask = (title) => api.createTask({ title: title.slice(0, 120), frequency: "once" });

  const lookUp = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3) {
      setResearchError({ message: "Enter at least 3 characters." });
      return;
    }
    setSearching(true);
    setResearchError(null);
    try {
      setResearch(await api.research(query.trim()));
    } catch (err) {
      setResearch(null);
      setResearchError(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ask your gardener</h1>
        <p className="mt-1 max-w-prose text-ink/70">
          Answers come from Gemma running on your computer{garden.data ? `, using what you told us about your ${garden.data.garden_type} garden` : ""}.
        </p>
      </div>

      <div className="space-y-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} disabled={sending} className="rounded-full bg-white px-4 py-2 text-left text-sm font-medium ring-1 ring-ink/20 hover:bg-ink/5">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-prose rounded-3xl bg-moss px-5 py-3 text-white">{m.text}</div>
          ) : (
            <AssistantMessage key={i} msg={m} onAddTask={addTask} />
          )
        )}
        {sending && <Spinner label="Gemma is thinking" />}
        <div ref={endRef} />
      </div>

      {error && (
        <Notice tone="error" error={error} action={text ? <Button size="sm" variant="quiet" onClick={() => send()}>Try again</Button> : null} />
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="question" className="mb-1 block text-sm font-semibold">Your question</label>
          <textarea id="question" rows={2} maxLength={1000} className="input resize-y" value={text} onChange={(e) => setText(e.target.value)} placeholder="What's going on with your plants?" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        </div>
        <Button type="submit" disabled={sending || !text.trim()}>{sending ? "Asking" : "Ask"}</Button>
      </form>

      <section className="panel" aria-labelledby="research-h">
        <h2 id="research-h" className="text-xl font-bold">Find sources</h2>
        <p className="mt-1 max-w-prose text-sm text-ink/70">Search the web for gardening references. This is the one part that needs internet and a SerpApi key.</p>
        <form onSubmit={lookUp} className="mt-3 flex flex-wrap gap-2" noValidate>
          <label htmlFor="research-q" className="sr-only">Search topic</label>
          <input id="research-q" className="input min-w-[12rem] flex-1" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. yellow leaves on chilli plants" />
          <Button type="submit" variant="quiet" disabled={searching}>{searching ? "Searching" : "Search"}</Button>
        </form>
        {researchError && <div className="mt-3"><Notice tone="warn" error={researchError} /></div>}
        {research && (
          <div className="mt-4">
            {research.results.length === 0 ? (
              <p className="text-ink/70">No results found.</p>
            ) : (
              <ul className="space-y-3">
                {research.results.map((r) => (
                  <li key={r.link}>
                    <a className="font-semibold text-moss underline" href={r.link} target="_blank" rel="noreferrer noopener">{r.title}</a>
                    {r.date && <span className="text-sm text-ink/60"> ({r.date})</span>}
                    <p className="text-sm text-ink/75">{r.snippet}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-ink/60">{research.note}</p>
          </div>
        )}
      </section>
    </div>
  );
}
