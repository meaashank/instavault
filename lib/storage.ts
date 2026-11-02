import { openDB } from "idb";

export type Post = {
  id: string;
  caption: string;
  date: string;
  mediaType?: string;
  mediaBlob?: Blob;
  mediaUrl?: string;
};
export type Archive = {
  username: string;
  posts: Post[];
  messageFiles: number;
  followerFiles: number;
  followingFiles: number;
  mediaCount: number;
  fileCount: number;
  importedAt: string;
};

const DB = "instavault";
async function database() {
  return openDB(DB, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("archive")) db.createObjectStore("archive");
    },
  });
}

export async function saveArchive(archive: Archive | null) {
  const db = await database();
  if (!archive) {
    await db.delete("archive", "current");
    return;
  }
  // Object URLs are temporary browser handles; persist the original media Blobs instead.
  const durable: Archive = {
    ...archive,
    posts: archive.posts.map(({ mediaUrl: _mediaUrl, ...post }) => post),
  };
  await db.put("archive", durable, "current");
}

export async function getArchive(): Promise<Archive | null> {
  const db = await database();
  const archive = (await db.get("archive", "current")) as Archive | undefined;
  if (!archive) return null;
  return {
    ...archive,
    posts: archive.posts.map((post) => ({
      ...post,
      mediaUrl: post.mediaBlob ? URL.createObjectURL(post.mediaBlob) : undefined,
    })),
  };
}
