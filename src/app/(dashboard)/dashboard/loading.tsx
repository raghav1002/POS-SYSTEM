"use client";

import { Skeleton } from "boneyard-js/react";
import "@/lib/boneyard-config";

export default function DashboardLoading() {
  return (
    <Skeleton loading={true} className="w-full space-y-6 p-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 animate-pulse space-y-2">
            <div className="h-4 w-24 bg-zinc-800 rounded" />
            <div className="h-8 w-32 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Chart & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 animate-pulse" />
        <div className="h-72 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 animate-pulse" />
      </div>
    </Skeleton>
  );
}
