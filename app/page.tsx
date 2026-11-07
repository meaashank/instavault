"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Compass,
  Grid3X3,
  Heart,
  Home,
  Image as ImageIcon,
  MessageCircle,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sun,
  Upload,
  UserRound,
  Video,
} from "lucide-react";
import { useArchive } from "@/components/archive-provider";
import { ImportPanel } from "@/components/import-panel";
import { MessagesView } from "@/components/messages-view";
import type { Post } from "@/lib/storage";

type Tab = "Home" | "Explore" | "Reels" | "Messages" | "Saved" | "Profile";
const nav = [
  ["Home", Home],
  ["Explore", Compass],
  ["Reels", Video],
  ["Messages", MessageCircle],
  ["Saved", Bookmark],
  ["Profile", UserRound],
] as const;
const EMPTY_POSTS: Post[] = [];

export default function Page() {
  const { archive, clearArchive } = useArchive();
  const [tab, setTab] = useState<Tab>("Home");
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [selected, setSelected] = useState<Post | null>(null);
  const [profileMode, setProfileMode] = useState<"posts" | "reels">("posts");

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const posts = archive?.posts ?? EMPTY_POSTS;
  const savedPosts = archive?.savedPosts ?? EMPTY_POSTS;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () => posts.filter((post) => `${post.caption} ${post.date}`.toLowerCase().includes(normalizedQuery)),
    [posts, normalizedQuery],
  );
  const filteredSaved = useMemo(
    () => savedPosts.filter((post) => `${post.caption} ${post.date}`.toLowerCase().includes(normalizedQuery)),
    [savedPosts, normalizedQuery],
  );
  const profilePosts = filtered.filter((post) => post.category === "post" || post.category === "video");
  const profileReels = filtered.filter((post) => post.category === "reel");
  const gridPosts =
    tab === "Saved"
      ? filteredSaved
      : tab === "Reels"
        ? filtered.filter((post) => post.category === "reel")
        : filtered.filter((post) => post.category !== "story");
  const feedPosts = filtered.filter((post) => post.category !== "story" && post.category !== "reel");
  const stories = posts.filter((post) => post.category === "story").slice(0, 12);
  const displayName = archive?.username || "Your archive";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";
  const openImport = () => setImporting(true);
  const clearLocalArchive = () => {
    if (!archive || !window.confirm("Clear the locally stored Instagram archive from this browser? This cannot be undone.")) return;
    clearArchive();
    setTab("Home");
    setSelected(null);
    setQuery("");
    setProfileMode("posts");
  };

  const media = (post: Post) =>
    post.mediaUrl ? (
      post.mediaType?.startsWith("video/") ? (
        <video
          src={post.mediaUrl}
          muted={!selected}
          controls={!!selected}
          playsInline
          preload="metadata"
          aria-label={post.caption || "Archived video"}
        />
      ) : (
        <img src={post.mediaUrl} alt={post.caption || "Archived Instagram post"} loading="lazy" />
      )
    ) : (
      <div className="post-placeholder">
        <ImageIcon size={28} aria-hidden="true" />
        <span>Media wasn’t included in this export</span>
      </div>
    );

  return (
    <main className={dark ? "shell dark" : "shell"}>
      <aside className="side" aria-label="Main navigation">
        <button className="logo" type="button" onClick={() => setTab("Home")} aria-label="InstaVault home">
          <span className="brand-mark"><ShieldCheck size={21} aria-hidden="true" /></span>
          <span className="brand-name">InstaVault</span>
        </button>
        <nav aria-label="Archive sections">
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={tab === name ? "nav active" : "nav"}
              aria-current={tab === name ? "page" : undefined}
            >
              <Icon size={21} strokeWidth={tab === name ? 2.3 : 1.8} aria-hidden="true" />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="nav" type="button" onClick={() => setDark((value) => !value)} aria-pressed={dark}>
            {dark ? <Sun size={21} aria-hidden="true" /> : <Moon size={21} aria-hidden="true" />}
            <span>{dark ? "Light appearance" : "Dark appearance"}</span>
          </button>
          <button className="nav" type="button" onClick={openImport}>
            <Upload size={21} aria-hidden="true" />
            <span>Import archive</span>
          </button>
          {archive && (
            <button
              className="nav"
              type="button"
              onClick={clearLocalArchive}
            >
              <ShieldCheck size={21} aria-hidden="true" />
              <span>Clear local archive</span>
            </button>
          )}
          <p><ShieldCheck size={15} aria-hidden="true" /> Private archive · Stored on this device</p>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <button className="mobile-logo" type="button" onClick={() => setTab("Home")} aria-label="InstaVault home">
            InstaVault
          </button>
          <div className="topbar-title">{archive ? tab : "Your private archive"}</div>
          <div className="actions">
            {archive && (
              <label>
                <Search size={17} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search archive"
                  aria-label="Search captions and dates"
                  />
                </label>
              )}
            <button
              className="mobile-theme-toggle"
              type="button"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"}
              aria-pressed={dark}
            >
              {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
            </button>
            <button type="button" onClick={openImport} aria-label="Import archive">
              <Upload size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="content">
          {!archive ? (
            <section className="empty-state">
              <div className="empty-state-icon"><ShieldCheck size={34} aria-hidden="true" /></div>
              <h1>Your memories, kept close.</h1>
              <p>
                Bring your downloaded Instagram information into a private, offline space. Import your ZIP to browse
                the photos, videos, and conversations included in your export.
              </p>
              <button className="primary" type="button" onClick={openImport}>
                <Upload size={17} aria-hidden="true" /> Import Instagram ZIP
              </button>
              <div className="import-details">
                <span><ShieldCheck size={15} aria-hidden="true" /> Stored on this device</span>
                <span>No Instagram login</span>
                <span>Works offline after import</span>
              </div>
            </section>
          ) : (
            <>
              {tab === "Home" && (
                <div className="home-layout">
                  <section className="feed" aria-label="Archived posts">
                    {stories.length > 0 && (
                      <div className="stories" aria-label="Archived stories">
                        {stories.map((story, index) => (
                          <button key={story.id} className="story" type="button" onClick={() => setSelected(story)}>
                            <span>
                              {story.mediaUrl ? (
                                <img src={story.mediaUrl} alt="" />
                              ) : (
                                <span className="story-fallback" aria-hidden="true">{initial}</span>
                              )}
                            </span>
                            <small>{index === 0 ? displayName : `Archive ${index + 1}`}</small>
                          </button>
                        ))}
                      </div>
                    )}
                    {feedPosts.length ? (
                      feedPosts.map((post) => (
                        <article className="feed-post" key={post.id}>
                          <div className="feed-post-head">
                            <div className="avatar" aria-hidden="true">{initial}</div>
                            <div className="feed-account">
                              <b>{displayName}</b>
                              <small>{post.date || "From your archive"}</small>
                            </div>
                            <span className="read-only-tag">Read only</span>
                          </div>
                          <button
                            className="feed-media"
                            type="button"
                            onClick={() => setSelected(post)}
                            aria-label={`Open archived post${post.caption ? `: ${post.caption.slice(0, 80)}` : ""}`}
                          >
                            {media(post)}
                          </button>
                          <div className="feed-actions" aria-hidden="true">
                            <Heart size={23} />
                            <MessageCircle size={22} />
                            <Send size={21} />
                            <Bookmark size={22} />
                          </div>
                          <div className="feed-caption">
                            {post.caption && <p><b>{displayName}</b> {post.caption}</p>}
                            {post.date && <small>{post.date}</small>}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="empty">
                        <ImageIcon size={30} aria-hidden="true" />
                        <h2>{query ? "No matching posts" : "No posts in this archive"}</h2>
                        <p>
                          {query
                            ? "Try a different search term or clear the search field."
                            : "Posts and media will appear here when they are included in your Instagram export."}
                        </p>
                      </div>
                    )}
                  </section>
                  <aside className="feed-side" aria-label="Archive overview">
                    <div className="suggestion-user">
                      <div className="avatar large" aria-hidden="true">{initial}</div>
                      <div><b>{displayName}</b><small>Personal archive</small></div>
                      <span>LOCAL</span>
                    </div>
                    <p>Archive overview</p>
                    <div className="archive-stats">
                      <span><b>{posts.filter((post) => post.category === "post" || post.category === "video").length}</b> posts</span>
                      <span><b>{archive.mediaCount || 0}</b> media files</span>
                      <span><b>{archive.conversations?.length || 0}</b> chats</span>
                    </div>
                    <small className="local-note"><ShieldCheck size={14} aria-hidden="true" /> Your archive stays on this device.</small>
                  </aside>
                </div>
              )}

              {tab === "Messages" && <MessagesView conversations={archive.conversations || []} username={archive.username} />}

              {tab === "Profile" && (
                <section className="profile-page" aria-label="Archived profile">
                  <div className="profile-top">
                    <div className="profile-pic" aria-hidden="true">{initial}</div>
                    <div className="profile-info">
                      <h1>{displayName}</h1>
                      <div className="profile-stats">
                        <span><b>{posts.filter((post) => post.category === "post" || post.category === "video").length}</b> posts</span>
                        <span><b>{archive.followerCount ?? archive.followerFiles}</b> followers</span>
                        <span><b>{archive.followingCount ?? archive.followingFiles}</b> following</span>
                      </div>
                      <p><b>{displayName}</b><br />Personal Instagram archive</p>
                    </div>
                  </div>
                  <div className="profile-tabs" role="tablist" aria-label="Profile media type">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileMode === "posts"}
                      className={profileMode === "posts" ? "active" : ""}
                      onClick={() => setProfileMode("posts")}
                    >
                      <Grid3X3 size={13} aria-hidden="true" /> POSTS
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileMode === "reels"}
                      className={profileMode === "reels" ? "active" : ""}
                      onClick={() => setProfileMode("reels")}
                    >
                      <Video size={13} aria-hidden="true" /> REELS
                    </button>
                  </div>
                  {(profileMode === "posts" ? profilePosts : profileReels).length ? (
                    <div className="posts">
                      {(profileMode === "posts" ? profilePosts : profileReels).map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelected(post)}
                          aria-label={`Open archived ${profileMode === "reels" ? "reel" : "post"}${post.caption ? `: ${post.caption.slice(0, 80)}` : ""}`}
                        >
                          {media(post)}
                          <i aria-hidden="true"><Heart size={18} /></i>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <ImageIcon size={28} aria-hidden="true" />
                      <h2>{query ? "No matching media" : `No ${profileMode} in this archive`}</h2>
                      <p>{query ? "Try another search term." : "Included profile media will appear here after import."}</p>
                    </div>
                  )}
                  <button className="clear-local" type="button" onClick={clearLocalArchive}>
                    <ShieldCheck size={16} aria-hidden="true" /> Clear archive from this device
                  </button>
                </section>
              )}

              {(tab === "Explore" || tab === "Reels" || tab === "Saved") && (
                <section className="browse-page" aria-label={`${tab} archive`}>
                  <div className="browse-title">
                    <h1>{tab}</h1>
                    {tab === "Saved" && <p>Only items explicitly present in your export appear here.</p>}
                  </div>
                  {gridPosts.length ? (
                    <div className={tab === "Reels" ? "reels-grid" : "explore-grid"}>
                      {gridPosts.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelected(post)}
                          aria-label={`Open archived ${tab === "Saved" ? "saved item" : "post"}${post.caption ? `: ${post.caption.slice(0, 80)}` : ""}`}
                        >
                          {media(post)}
                          <i aria-hidden="true">{tab === "Saved" ? <Bookmark size={19} /> : <Heart size={19} />}</i>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty">
                      <ImageIcon size={30} aria-hidden="true" />
                      <h2>
                        {query
                          ? "No matching media"
                          : tab === "Saved"
                            ? "No saved posts found"
                            : "Nothing to show here yet"}
                      </h2>
                      <p>
                        {query
                          ? "Try a different search term or clear the search field."
                          : tab === "Saved"
                            ? "Your export did not include a saved-post collection. Liked posts are not the same as saved posts."
                            : "Media included in your export will appear here."}
                      </p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile archive navigation">
        {nav.map(([name, Icon]) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            aria-label={name}
            aria-current={tab === name ? "page" : undefined}
            className={tab === name ? "active" : ""}
          >
            <Icon size={21} strokeWidth={tab === name ? 2.3 : 1.8} aria-hidden="true" />
          </button>
        ))}
      </nav>

      {importing && <ImportPanel close={() => setImporting(false)} />}
      {selected && (
        <div className="shade" onClick={() => setSelected(null)}>
          <section
            className="post-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Archived post from ${displayName}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="x" type="button" onClick={() => setSelected(null)} aria-label="Close post">
              ×
            </button>
            <div className="modal-media">{media(selected)}</div>
            <div className="modal-caption">
              <b>{displayName}</b>
              {selected.caption && <p>{selected.caption}</p>}
              {selected.date && <small>{selected.date}</small>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
