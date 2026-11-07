import { openDB } from "idb";

export type Post = {
  id: string;
  caption: string;
  date: string;
  category?: "post" | "reel" | "story" | "video";
  mediaType?: string;
  mediaBlob?: Blob;
  mediaUrl?: string;
  savedUrl?: string;
};
export type MessageAttachment = { mediaType: string; mediaBlob?: Blob; mediaUrl?: string; name?: string };
export type ArchivedMessage = { sender: string; content: string; date: string; timestamp: number; attachments?: MessageAttachment[] };
export type Conversation = { id: string; title: string; participants: string[]; messages: ArchivedMessage[] };
export type Archive = {
  username: string;
  posts: Post[];
  savedPosts?: Post[];
  conversations: Conversation[];
  messageFiles: number;
  followerFiles: number;
  followingFiles: number;
  followerCount?: number;
  followingCount?: number;
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
    savedPosts: (archive.savedPosts || []).map(({ mediaUrl: _mediaUrl, ...post }) => post),
    conversations: archive.conversations.map((conversation) => ({ ...conversation, messages: conversation.messages.map((message) => ({ ...message, attachments: message.attachments?.map(({ mediaUrl: _mediaUrl, ...attachment }) => attachment) })) })),
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
    savedPosts: (archive.savedPosts || []).map((post) => ({
      ...post,
      mediaUrl: post.mediaBlob ? URL.createObjectURL(post.mediaBlob) : undefined,
    })),
    conversations: archive.conversations.map((conversation) => ({ ...conversation, messages: conversation.messages.map((message) => ({ ...message, attachments: message.attachments?.map((attachment) => ({ ...attachment, mediaUrl: attachment.mediaBlob ? URL.createObjectURL(attachment.mediaBlob) : undefined })) })) })),
  };
}
