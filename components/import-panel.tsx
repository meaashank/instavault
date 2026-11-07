"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { X, Upload, ShieldCheck, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useArchive } from "./archive-provider";
import type { Archive, Post, Conversation } from "@/lib/storage";

const isMedia = (name: string) => /\.(jpe?g|png|webp|gif|mp4|mov|m4v|mp3|m4a|wav|ogg|aac)$/i.test(name);
const mimeFor = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "png" ? "image/png" : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif" : ext === "mov" ? "video/quicktime"
    : ext === "m4v" ? "video/x-m4v" : ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : ext === "aac" ? "audio/aac" : "video/mp4";
};
const normalizePath = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
const basename = (value: string) => normalizePath(value).split("/").pop() || "";

function textValue(value: any): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("");
  if (value && typeof value === "object") {
    if (typeof value.value === "string") return value.value;
    if (typeof value.title === "string") return value.title;
    if (typeof value.uri === "string") return value.uri;
    if (typeof value.href === "string") return value.href;
  }
  return "";
}

function safeHttpUrl(value: any): string | undefined {
  const candidate = textValue(value);
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function rowsFrom(value: any): any[] {
  if (Array.isArray(value)) return value;
  for (const key of ["posts", "reels", "photos", "videos", "ig_reels_media", "media", "saved_saved_media", "saved_media", "saved_posts"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

export function ImportPanel({ close }: { close: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { setArchive } = useArchive();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function run(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setStatus("Opening archive…");
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter((entry) => !entry.dir);
      const jsonFiles = entries.filter((entry) => entry.name.toLowerCase().endsWith(".json"));
      const mediaFiles = entries.filter((entry) => isMedia(entry.name));
      const parsed: Array<{ path: string; value: any }> = [];

      for (let index = 0; index < jsonFiles.length; index++) {
        setStatus(`Reading JSON ${index + 1} of ${jsonFiles.length}…`);
        try {
          parsed.push({ path: jsonFiles[index].name, value: JSON.parse(await jsonFiles[index].async("string")) });
        } catch {
          // Ignore malformed or non-JSON files without aborting the whole import.
        }
      }

      const mediaByPath = new Map(mediaFiles.map((entry) => [normalizePath(entry.name), entry]));
      const mediaByName = new Map<string, typeof mediaFiles>();
      for (const entry of mediaFiles) {
        const key = basename(entry.name);
        mediaByName.set(key, [...(mediaByName.get(key) || []), entry]);
      }
      const findMedia = (uri: string, threadPath = "") => {
        const normalized = normalizePath(uri);
        const exact = mediaByPath.get(normalized) || mediaByPath.get(normalizePath("your_instagram_activity/" + normalized));
        if (exact) return exact;
        const threadDir = threadPath.slice(0, threadPath.lastIndexOf("/"));
        const relative = threadDir ? mediaByPath.get(normalizePath(threadDir + "/" + normalized)) : undefined;
        if (relative) return relative;
        const matches = mediaByName.get(basename(uri)) || [];
        return matches.find((entry) => threadDir && entry.name.startsWith(threadDir + "/")) || matches[0];
      };

      const posts: Post[] = [];
      const seen = new Set<string>();
      for (const { path, value } of parsed) {
        if (!/(^|\/)(posts|reels|videos|archived_posts|stories)(_|\/|\.)/i.test(path) &&
            !/(posts|reels|videos|archived_posts|stories)/i.test(path)) continue;

        for (const row of rowsFrom(value)) {
          const items = Array.isArray(row?.media) ? row.media : [row];
          for (const item of items) {
            const uri = item?.uri || item?.path || item?.media?.uri || "";
            const mediaEntry = uri ? findMedia(String(uri)) : undefined;
            const caption = textValue(row?.caption) || textValue(row?.title) ||
              textValue(item?.title) || textValue(item?.caption) || "";
            const timestamp = row?.creation_timestamp || row?.timestamp ||
              item?.creation_timestamp || item?.timestamp;
            if (!caption && !mediaEntry) continue;

            const identity = String(uri || `${path}:${timestamp || posts.length}:${caption}`);
            if (seen.has(identity)) continue;
            seen.add(identity);

            let mediaBlob: Blob | undefined;
            let mediaType: string | undefined;
            if (mediaEntry) {
              mediaType = mimeFor(mediaEntry.name);
              mediaBlob = await mediaEntry.async("blob").then((blob) =>
                new Blob([blob], { type: mediaType })
              );
            }
            posts.push({
              id: identity,
              caption,
              date: timestamp ? new Date(Number(timestamp) * 1000).toLocaleDateString() : "",
              category: /stories/i.test(path) ? "story" : /reels/i.test(path) ? "reel" : /videos/i.test(path) ? "video" : "post",
              mediaType,
              mediaBlob,
            });
          }
        }
      }

      const savedPosts: Post[] = [];
      const savedSeen = new Set<string>();
      for (const { path, value } of parsed) {
        if (!/saved/i.test(path)) continue;
        for (const row of rowsFrom(value)) {
          const items = Array.isArray(row?.media) ? row.media : [row];
          for (const item of items) {
            const uri = item?.uri || item?.path || item?.media?.uri || "";
            const mediaEntry = uri ? mediaByName.get(basename(String(uri)))?.[0] : undefined;
            const linkData = Array.isArray(row?.string_list_data) ? row.string_list_data[0] : undefined;
            const savedUrl = textValue(linkData?.href) || textValue(row?.href) || textValue(item?.href);
            const caption = textValue(row?.title) || textValue(row?.caption) || textValue(item?.title) || "Saved Instagram post";
            const timestamp = linkData?.timestamp || row?.timestamp || item?.timestamp;
            const identity = String(uri || savedUrl || `saved:${path}:${timestamp || savedPosts.length}`);
            if (savedSeen.has(identity)) continue;
            savedSeen.add(identity);
            let mediaBlob: Blob | undefined;
            let mediaType: string | undefined;
            if (mediaEntry) {
              mediaType = mimeFor(mediaEntry.name);
              const blob = await mediaEntry.async("blob");
              mediaBlob = new Blob([blob], { type: mediaType });
            }
            savedPosts.push({ id: identity, caption, date: timestamp ? new Date(Number(timestamp) * 1000).toLocaleDateString() : "", category: "post", mediaType, mediaBlob, savedUrl: savedUrl || undefined });
          }
        }
      }

      const conversationPromises = parsed
        .filter(({ path }) => /messages\/inbox\/.*\.json$/i.test(path))
        .map(async ({ path, value }) => {
          const messages = Array.isArray(value?.messages) ? value.messages : [];
          const participants = Array.isArray(value?.participants)
            ? value.participants.map((person: any) => person?.name).filter(Boolean)
            : [];
          const threadName = path.split("/").filter(Boolean).slice(-2, -1)[0]?.replace(/_/g, " ") || "Conversation";
          const resolvedMessages = await Promise.all(messages.map(async (message: any) => {
            const timestamp = Number(message?.timestamp_ms || 0);
            const rawAttachments = [
              ...(Array.isArray(message?.photos) ? message.photos.map((item: any) => ({ ...item, kind: "image" })) : []),
              ...(Array.isArray(message?.videos) ? message.videos.map((item: any) => ({ ...item, kind: "video" })) : []),
              ...(Array.isArray(message?.audio_files) ? message.audio_files.map((item: any) => ({ ...item, kind: "audio" })) : []),
            ];
            const attachments = await Promise.all(rawAttachments.map(async (item: any) => {
              const entry = item?.uri ? findMedia(String(item.uri), path) : undefined;
              if (!entry) return undefined;
              const mediaType = mimeFor(entry.name);
              const blob = await entry.async("blob");
              return { mediaType, mediaBlob: new Blob([blob], { type: mediaType }), name: basename(entry.name) };
            }));
            return {
              sender: textValue(message?.sender_name) || "Unknown",
              content: textValue(message?.content),
              timestamp,
              date: timestamp ? new Date(timestamp).toLocaleString() : "",
              attachments: attachments.filter(Boolean),
              shareUrl: safeHttpUrl(message?.share?.link) || safeHttpUrl(message?.share?.url),
              shareTitle: textValue(message?.share?.title) || textValue(message?.share?.share_text) || textValue(message?.share?.original_content_owner) || undefined,
              reactions: Array.isArray(message?.reactions) ? message.reactions.map((reaction: any) => ({
                actor: textValue(reaction?.actor),
                reaction: textValue(reaction?.reaction),
              })).filter((reaction: any) => reaction.reaction) : [],
            };
          }));
          return {
            id: path,
            title: textValue(value?.title) || threadName,
            participants,
            messages: resolvedMessages.filter((message: any) => message.content || message.attachments?.length || message.date).sort((a: any, b: any) => a.timestamp - b.timestamp),
          };
        });
      const conversations: Conversation[] = (await Promise.all(conversationPromises)).filter((conversation) => conversation.messages.length > 0);

      const directUsername = parsed.map(({ value }) =>
        value?.profile_user?.username || value?.profile?.username || value?.username
      ).find(Boolean);
      const profileUsername = parsed
        .filter(({ path }) => /instagram_profile_information\.json$/i.test(path))
        .flatMap(({ value }) => Array.isArray(value) ? value : [])
        .find((item: any) => /user(name)?/i.test(String(item?.label || "")));
      const username = String(directUsername || textValue(profileUsername?.value) || "");
      const followerCount = parsed
        .filter(({ path }) => /followers(_\d+)?\.json$/i.test(path))
        .reduce((total, item) => total + rowsFrom(item.value).length, 0);
      const followingCount = parsed
        .filter(({ path }) => /following(_\d+)?\.json$/i.test(path))
        .reduce((total, item) => total + rowsFrom(item.value).length, 0);
      const archive: Archive = {
        username,
        posts,
        savedPosts,
        conversations,
        messageFiles: parsed.filter(({ path }) => /messages\/inbox\/.*\.json$/i.test(path)).length,
        followerFiles: parsed.filter(({ path }) => /followers(_\d+)?\.json$/i.test(path)).length,
        followingFiles: parsed.filter(({ path }) => /following(_\d+)?\.json$/i.test(path)).length,
        followerCount,
        followingCount,
        mediaCount: mediaFiles.length,
        fileCount: entries.length,
        importedAt: new Date().toISOString(),
      };

      setStatus("Saving your archive locally…");
      setArchive(archive);
      setStatus(`Imported ${posts.length} posts and ${mediaFiles.length} media files.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this ZIP. Try downloading your Instagram export in JSON format.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shade" onClick={close}>
      <section className="import-card" onClick={(event) => event.stopPropagation()}>
        <button className="x" onClick={close} aria-label="Close"><X /></button>
        <div className="eyebrow">YOUR DATA, YOUR SPACE</div>
        <h2>Import your Instagram</h2>
        <p>Choose the ZIP file from Instagram. Processing happens in this browser; your archive is not uploaded.</p>
        <button className="drop" disabled={busy} onClick={() => ref.current?.click()}>
          <Upload size={25} /><b>{busy ? "Importing…" : "Choose Instagram ZIP"}</b><small>JSON export recommended</small>
        </button>
        <input ref={ref} hidden type="file" accept=".zip,application/zip" onChange={(event) => run(event.target.files?.[0])} />
        <div className="privacy"><ShieldCheck /><span><b>Private by design</b><small>Stored in this browser on this device.</small></span></div>
        {busy && <p className="status"><LoaderCircle className="spin" />{status}</p>}
        {!busy && status && <p className="status"><CheckCircle2 />{status}</p>}
        {error && <p className="error"><AlertCircle />{error}</p>}
        <small className="hint">Large exports may take a few minutes. Keep this tab open.</small>
      </section>
    </div>
  );
}
