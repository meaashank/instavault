"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getArchive, saveArchive, type Archive } from "@/lib/storage";

type ContextValue = { archive: Archive | null; setArchive: (archive: Archive) => void; clearArchive: () => void };
const Context = createContext<ContextValue>({ archive: null, setArchive: () => undefined, clearArchive: () => undefined });

export function ArchiveProvider({ children }: { children: React.ReactNode }) {
  const [archive, set] = useState<Archive | null>(null);

  useEffect(() => {
    let active = true;
    getArchive().then((saved) => {
      if (active) set(saved);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setArchive = (next: Archive) => {
    const withUrls = (items: Archive["posts"]) => items.map((post) => ({
      ...post,
      mediaUrl: post.mediaBlob ? URL.createObjectURL(post.mediaBlob) : undefined,
    }));
    const presented: Archive = {
      ...next,
      posts: withUrls(next.posts || []),
      savedPosts: withUrls(next.savedPosts || []),
    };
    set(presented);
    void saveArchive(presented);
  };

  const clearArchive = () => {
    set(null);
    void saveArchive(null);
  };

  return <Context.Provider value={{ archive, setArchive, clearArchive }}>{children}</Context.Provider>;
}

export const useArchive = () => useContext(Context);
