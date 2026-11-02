"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { X, Upload, ShieldCheck, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useArchive } from "./archive-provider";
import type { Archive, Post, Conversation } from "@/lib/storage";

const isMedia = (name: string) => /\.(jpe?g|png|webp|gif|mp4|mov|m4v)$/i.test(name);
const mimeFor = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "png" ? "image/png" : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif" : ext === "mov" ? "video/quicktime"
    : ext === "m4v" ? "video/x-m4v" : "video/mp4";
};
const basename = (value: string) => value.replace(/\\/g, "/").split("/").pop()?.toLowerCase() || "";

function textValue(value: any): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("");
  if (value && typeof value === "object") {
    if (typeof value.value === "string") return value.value;
    if (typeof value.title === "string") return value.title;
  }
  return "";
}

function rowsFrom(value: any): any[] {
  if (Array.isArray(value)) return value;
  for (const key of ["posts", "reels", "photos", "videos", "ig_reels_media", "media"]) {
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

      const mediaByName = new Map<string, typeof mediaFiles>();
      for (const entry of mediaFiles) {
        const key = basename(entry.name);
        mediaByName.set(key, [...(mediaByName.get(key) || []), entry]);
      }

      const posts: Post[] = [];
      const seen = new Set<string>();
      for (const { path, value } of parsed) {
        if (!/(^|\/)(posts|reels|videos|archived_posts|stories)(_|\/|\.)/i.test(path) &&
            !/(posts|reels|videos|archived_posts|stories)/i.test(path)) continue;

        for (const row of rowsFrom(value)) {
          const items = Array.isArray(row?.media) ? row.media : [row];
          for (const item of items) {
            const uri = item?.uri || item?.path || item?.media?.uri || "";
            const mediaEntry = uri ? mediaByName.get(basename(String(uri)))?.[0] : undefined;
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
              mediaType,
              mediaBlob,
            });
          }
        }
      }

      const conversations: Conversation[] = parsed
        .filter(({ path }) => /messages\/inbox\/.*\.json$/i.test(path))
        .map(({ path, value }) => {
          const messages = Array.isArray(value?.messages) ? value.messages : [];
          const participants = Array.isArray(value?.participants)
            ? value.participants.map((person: any) => person?.name).filter(Boolean)
            : [];
          const threadName = path.split("/").filter(Boolean).slice(-2, -1)[0]
            ?.replace(/_/g, " ") || "Conversation";
          return {
            id: path,
            title: textValue(value?.title) || threadName,
            participants,
            messages: messages.map((message: any) => {
              const timestamp = Number(message?.timestamp_ms || 0);
              const attachments = [
                ...(Array.isArray(message?.photos) ? message.photos : []),
                ...(Array.isArray(message?.videos) ? message.videos : []),
                ...(Array.isArray(message?.audio_files) ? message.audio_files : []),
              ].length;
              const content = textValue(message?.content) ||
                (attachments ? `[${attachments} attachment${attachments === 1 ? "" : "s"}]` : "");
              return {
                sender: textValue(message?.sender_name) || "Unknown",
                content,
                timestamp,
                date: timestamp ? new Date(timestamp).toLocaleString() : "",
              };
            }).filter((message: any) => message.content || message.date)
              .sort((a: any, b: any) => a.timestamp - b.timestamp),
          };
        }).filter((conversation) => conversation.messages.length > 0);

      const username = parsed.map(({ value }) =>
        value?.profile_user?.username || value?.profile?.username || value?.username
      ).find(Boolean) || "";
      const archive: Archive = {
        username,
        posts,
        conversations,
        messageFiles: parsed.filter(({ path }) => /messages\/inbox\/.*\.json$/i.test(path)).length,
        followerFiles: parsed.filter(({ path }) => /followers(_\d+)?\.json$/i.test(path)).length,
        followingFiles: parsed.filter(({ path }) => /following(_\d+)?\.json$/i.test(path)).length,
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
