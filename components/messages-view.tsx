"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";
import type { Conversation } from "@/lib/storage";

export function MessagesView({ conversations, username }: { conversations: Conversation[]; username: string }) {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [mobileThread, setMobileThread] = useState(false);
  const filtered = useMemo(() => conversations.filter((conversation) =>
    (conversation.title + " " + conversation.participants.join(" ")).toLowerCase().includes(query.toLowerCase())
  ), [conversations, query]);
  const current = filtered[active] || filtered[0];

  if (!conversations.length) {
    return <div className="empty"><MessageCircle size={30}/><h2>No conversations found</h2><p>We could not find readable message threads in this export. Make sure Messages was included when requesting your Instagram data.</p></div>;
  }

  return (
    <div className={`messages-layout ${mobileThread ? "thread-open" : ""}`}>
      <aside className="thread-list">
        <div className="thread-list-head"><h2>Messages</h2><span>{conversations.length} chats</span></div>
        <label className="thread-search"><Search size={15}/><input value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Find a conversation"/></label>
        {filtered.map((conversation, index) => {
          const last = conversation.messages[conversation.messages.length - 1];
          return <button className={`thread-row ${current?.id === conversation.id ? "selected" : ""}`} key={conversation.id} onClick={() => { setActive(index); setMobileThread(true); }}>
            <span className="thread-avatar">{conversation.title.slice(0, 1).toUpperCase()}</span>
            <span className="thread-meta"><b>{conversation.title}</b><small>{last?.sender ? last.sender + ": " : ""}{last?.content || "Conversation"}</small></span>
            <time>{last?.timestamp ? new Date(last.timestamp).toLocaleDateString() : ""}</time>
          </button>;
        })}
        {!filtered.length && <p className="thread-no-results">No matching conversations.</p>}
      </aside>
      <section className="thread-panel">
        {current ? <>
          <header className="thread-header"><button className="thread-back" onClick={() => setMobileThread(false)} aria-label="Back to conversations"><ArrowLeft size={18}/></button><span className="thread-avatar">{current.title.slice(0, 1).toUpperCase()}</span><div><b>{current.title}</b><small>{current.participants.join(", ")}</small></div></header>
          <div className="message-history">
            {current.messages.map((message, index) => {
              const own = message.sender.toLowerCase() === username.toLowerCase() && Boolean(username);
              return <div className={`message-line ${own ? "own" : ""}`} key={index}><div className="message-bubble"><small>{message.sender}</small>{message.content && <p>{message.content}</p>}{message.attachments?.map((attachment, attachmentIndex) => <div className="message-attachment" key={attachmentIndex}>{attachment.mediaUrl && (attachment.mediaType.startsWith("video/") ? <video src={attachment.mediaUrl} controls playsInline /> : attachment.mediaType.startsWith("image/") ? <img src={attachment.mediaUrl} alt="Shared in conversation" loading="lazy" /> : <a href={attachment.mediaUrl} download={attachment.name || "attachment"}>Download attachment</a>)}</div>)}{message.date && <time>{message.date}</time>}</div></div>;
            })}
          </div>
          <div className="thread-footnote">Read-only archive · Messages are stored on this device</div>
        </> : <div className="empty"><MessageCircle/><h2>Select a conversation</h2></div>}
      </section>
    </div>
  );
}
