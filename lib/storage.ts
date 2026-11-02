import { openDB } from "idb";
export type Post={id:string;caption:string;date:string;mediaUrl?:string};
export type Archive={username:string;posts:Post[];messageFiles:number;followerFiles:number;followingFiles:number;mediaCount:number;fileCount:number;importedAt:string};
const DB="instavault";
async function database(){return openDB(DB,1,{upgrade(db){db.createObjectStore("archive");}})}
export async function saveArchive(a:Archive|null){const db=await database();if(a)await db.put("archive",a,"current");else await db.delete("archive","current");}
export async function getArchive(){return (await (await database()).get("archive","current")) as Archive|null??null;}