"use client";

import { Skeleton } from "boneyard-js/react";
import "@/lib/boneyard-config";

export default function WorkspaceLoading() {
  return (
    <Skeleton loading={true} className="w-full h-screen bg-zinc-950 p-4 space-y-4 flex flex-col">
      <div className="h-14 w-full bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse space-y-4">
          <div className="h-10 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-zinc-800/60 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse space-y-4">
          <div className="h-8 w-28 bg-zinc-800 rounded" />
          <div className="h-64 bg-zinc-800/50 rounded-xl" />
          <div className="h-12 w-full bg-[#E85002]/40 rounded-xl" />
        </div>
      </div>
    </Skeleton>
  );
}
