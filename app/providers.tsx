"use client";
import { ArchiveProvider } from "@/components/archive-provider";
export function Providers({children}:{children:React.ReactNode}) { return <ArchiveProvider>{children}</ArchiveProvider>; }