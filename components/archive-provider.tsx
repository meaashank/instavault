"use client";
import {createContext,useContext,useEffect,useState} from "react";
import {getArchive,saveArchive,type Archive} from "@/lib/storage";
type C={archive:Archive|null;setArchive:(a:Archive)=>void};
const Context=createContext<C>({archive:null,setArchive:()=>{}});
export function ArchiveProvider({children}:{children:React.ReactNode}){const [archive,set]=useState<Archive|null>(null);useEffect(()=>{getArchive().then(set).catch(()=>{});},[]);const setArchive=(a:Archive)=>{set(a);void saveArchive(a)};return <Context.Provider value={{archive,setArchive}}>{children}</Context.Provider>}
export const useArchive=()=>useContext(Context);