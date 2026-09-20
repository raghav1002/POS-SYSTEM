"use client";

import { Skeleton } from "boneyard-js/react";
import "@/lib/boneyard-config";

export default function SalesLoading() {
  return (
    <Skeleton loading={true} className="w-full space-y-4 p-6">
      <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 w-full bg-zinc-900/60 rounded-xl animate-pulse flex items-center justify-between px-4">
            <div className="space-y-1">
              <div className="h-4 w-28 bg-zinc-800 rounded" />
              <div className="h-3 w-36 bg-zinc-800/60 rounded" />
            </div>
            <div className="h-6 w-20 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
