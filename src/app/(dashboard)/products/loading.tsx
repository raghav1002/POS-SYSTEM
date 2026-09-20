"use client";

import { Skeleton } from "boneyard-js/react";
import "@/lib/boneyard-config";

export default function ProductsLoading() {
  return (
    <Skeleton loading={true} className="w-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="h-10 w-32 bg-[#E85002]/30 rounded-xl animate-pulse" />
      </div>

      <div className="h-12 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 w-full bg-zinc-900/60 rounded-xl animate-pulse flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-zinc-800 rounded-lg" />
              <div className="space-y-1">
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="h-3 w-20 bg-zinc-800/60 rounded" />
              </div>
            </div>
            <div className="h-6 w-16 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
