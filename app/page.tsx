"use client";

import { useMemo, useState } from "react";
import { Home, Compass, Video, MessageCircle, Bookmark, UserRound, Upload, Search, Grid3X3, ShieldCheck, Image as ImageIcon, Heart, Send, MoreHorizontal, Sun, Moon } from "lucide-react";
import { useArchive } from "@/components/archive-provider";
import { ImportPanel } from "@/components/import-panel";
import { MessagesView } from "@/components/messages-view";
import type { Post } from "@/lib/storage";

type Tab = "Home" | "Explore" | "Reels" | "Messages" | "Saved" | "Profile";
const nav = [["Home",Home],["Explore",Compass],["Reels",Video],["Messages",MessageCircle],["Saved",Bookmark],["Profile",UserRound]] as const;

export default function Page() {
  const { archive, clearArchive } = useArchive();
  const [tab,setTab] = useState<Tab>("Home");
  const [importing,setImporting] = useState(false);
  const [query,setQuery] = useState("");
  const [dark,setDark] = useState(false);
  const [selected,setSelected] = useState<Post|null>(null);
  const [profileMode,setProfileMode] = useState<"posts"|"reels">("posts");
  const posts = archive?.posts || [];
  const savedPosts = archive?.savedPosts || [];
  const filtered = useMemo(() => posts.filter(p => (p.caption+" "+p.date).toLowerCase().includes(query.toLowerCase())),[posts,query]);
  const feedPosts = filtered.filter(p => p.category !== "story" && p.category !== "reel");
  const profilePosts = posts.filter(p => p.category === "post" || p.category === "video");
  const profileReels = posts.filter(p => p.category === "reel");
  const gridPosts = tab === "Saved" ? savedPosts : tab === "Reels" ? filtered.filter(p=>p.category==="reel") : filtered.filter(p=>p.category!=="story");
  const stories = posts.filter(p=>p.category==="story").slice(0,12);
  const displayName = archive?.username || "Your archive";
  const media = (post:Post, compact=false) => post.mediaUrl
    ? post.mediaType?.startsWith("video/") ? <video src={post.mediaUrl} muted={!selected} controls={!!selected} playsInline preload="metadata"/>
      : <img src={post.mediaUrl} alt={post.caption || "Archived Instagram post"} loading="lazy"/>
    : <div className="post-placeholder"><ImageIcon size={28}/><span>Media not included in export</span></div>;
  const openImport = () => setImporting(true);

  return <main className={dark?"shell dark":"shell"}>
    <aside className="side">
      <a className="logo" onClick={()=>setTab("Home")}>Instagram</a>
      <nav>{nav.map(([name,Icon])=><button key={name} onClick={()=>setTab(name)} className={tab===name?"nav active":"nav"}><Icon size={24} strokeWidth={tab===name?2.5:1.8}/><span>{name}</span></button>)}</nav>
      <div className="side-bottom">
        <button className="nav" onClick={()=>setDark(!dark)}>{dark?<Sun size={22}/>:<Moon size={22}/>}<span>Switch appearance</span></button>
        <button className="nav" onClick={openImport}><Upload size={22}/><span>Import archive</span></button>
        {archive&&<button className="nav" onClick={()=>{if(window.confirm("Clear the locally stored Instagram archive from this browser? This cannot be undone.")){clearArchive();setTab("Home");setSelected(null);}}}><ShieldCheck size={22}/><span>Clear local archive</span></button>}
        <p><ShieldCheck size={15}/> Private archive · Stored on this device</p>
      </div>
    </aside>

    <section className="main">
      <header className="topbar">
        <button className="mobile-logo" onClick={()=>setTab("Home")}>Instagram</button>
        <div className="topbar-title">{archive ? tab : "Your private archive"}</div>
        <div className="actions">
          {archive&&<label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></label>}
          <button onClick={openImport} aria-label="Import archive"><Upload size={21}/></button>
        </div>
      </header>

      <div className="content">
        {!archive ? <section className="empty-state">
          <div className="empty-state-icon"><ImageIcon size={32}/></div>
          <h1>Your Instagram archive</h1>
          <p>Bring your downloaded Instagram information into a private, offline space. Import your ZIP to browse the photos, videos and conversations included in your export.</p>
          <button className="primary" onClick={openImport}><Upload size={17}/> Import Instagram ZIP</button>
          <div className="import-details"><span><ShieldCheck size={16}/> Stored on this device</span><span>No Instagram login</span><span>Works offline after import</span></div>
        </section> : <>
          {tab==="Home" && <div className="home-layout">
            <section className="feed">
              {stories.length>0&&<div className="stories">{stories.map((story,i)=><button key={story.id} className="story" onClick={()=>setSelected(story)}><span>{story.mediaUrl?<img src={story.mediaUrl} alt=""/>:<span className="story-fallback">{displayName[0]?.toUpperCase()}</span>}</span><small>{i===0?displayName:"Archive "+(i+1)}</small></button>)}</div>}
              {feedPosts.length ? feedPosts.map((post,i)=><article className="feed-post" key={post.id}>
                <div className="feed-post-head"><div className="avatar">{displayName[0]?.toUpperCase()}</div><div className="feed-account"><b>{displayName}</b><small>{post.date||"From your archive"}</small></div><button aria-label="More options"><MoreHorizontal size={22}/></button></div>
                <button className="feed-media" onClick={()=>setSelected(post)}>{media(post,true)}</button>
                <div className="feed-actions"><button aria-label="Like (archived)"><Heart size={24}/></button><button aria-label="Comment (read only)"><MessageCircle size={24}/></button><button aria-label="Share (read only)"><Send size={23}/></button><button className="save-action" aria-label="Saved status"><Bookmark size={24}/></button></div>
                <div className="feed-caption">{post.caption&&<p><b>{displayName}</b> {post.caption}</p>}<small>{post.date}</small></div>
              </article>) : <div className="empty"><ImageIcon size={30}/><h2>No posts in this archive</h2><p>Posts and media will appear here when they are included in your Instagram export.</p></div>}
            </section>
            <aside className="feed-side"><div className="suggestion-user"><div className="avatar large">{displayName[0]?.toUpperCase()}</div><div><b>{displayName}</b><small>Personal archive</small></div><span>LOCAL</span></div><p>Archive overview</p><div className="archive-stats"><span><b>{profilePosts.length}</b> posts</span><span><b>{archive.mediaCount}</b> media files</span><span><b>{archive.conversations.length}</b> chats</span></div><small className="local-note"><ShieldCheck size={14}/> Your archive stays on this device.</small></aside>
          </div>}

          {tab==="Messages" && <MessagesView conversations={archive.conversations||[]} username={archive.username}/>}
          {tab==="Profile" && <section className="profile-page">
            <div className="profile-top"><div className="profile-pic">{displayName[0]?.toUpperCase()}</div><div className="profile-info"><h1>{displayName}</h1><div className="profile-stats"><span><b>{posts.length}</b> posts</span><span><b>{archive.followerCount ?? archive.followerFiles}</b> followers</span><span><b>{archive.followingCount ?? archive.followingFiles}</b> following</span></div><p><b>{displayName}</b><br/>Personal Instagram archive</p></div></div>
            <div className="profile-tabs"><button className={profileMode==="posts"?"active":""} onClick={()=>setProfileMode("posts")}><Grid3X3 size={13}/> POSTS</button><button className={profileMode==="reels"?"active":""} onClick={()=>setProfileMode("reels")}><Video size={13}/> REELS</button></div>
            <div className="posts">{(profileMode==="posts"?profilePosts:profileReels).map((p,i)=><button key={p.id} onClick={()=>setSelected(p)}>{media(p,true)}<i><Heart size={18}/></i></button>)}</div>
          </section>}

          {(tab==="Explore"||tab==="Reels"||tab==="Saved") && <section className="browse-page">
            <div className="browse-title"><h1>{tab}</h1>{tab==="Saved"&&<p>Only items explicitly present in your export appear here.</p>}</div>
            {gridPosts.length ? <div className={tab==="Reels"?"reels-grid":"explore-grid"}>{gridPosts.map(p=><button key={p.id} onClick={()=>setSelected(p)}>{media(p,true)}<i>{tab==="Saved"?<Bookmark size={19}/>:<Heart size={19}/>}</i></button>)}</div>
            : <div className="empty"><ImageIcon size={30}/><h2>{tab==="Saved"?"No saved posts found":"Nothing to show here yet"}</h2><p>{tab==="Saved"?"Your export did not include a saved-post collection. Liked posts are not the same as saved posts.":"Media included in your export will appear here."}</p></div>}
          </section>}
        </>}
      </div>
    </section>

    <nav className="mobile-nav">{nav.map(([name,Icon])=><button key={name} onClick={()=>setTab(name)} aria-label={name} className={tab===name?"active":""}><Icon size={23} strokeWidth={tab===name?2.5:1.8}/></button>)}</nav>
    {importing&&<ImportPanel close={()=>setImporting(false)}/>}
    {selected&&<div className="shade" onClick={()=>setSelected(null)}><div className="post-modal instagram-modal" onClick={e=>e.stopPropagation()}><button className="x" onClick={()=>setSelected(null)}>×</button><div className="modal-media">{media(selected)}</div><div className="modal-caption"><b>{displayName}</b><p>{selected.caption}</p><small>{selected.date}</small></div></div></div>}
  </main>;
}
