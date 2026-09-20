"use client";

import { configureBoneyard } from "boneyard-js/react";

// Boneyard.js responsive layout configuration
if (typeof window !== "undefined") {
  try {
    configureBoneyard({
      darkColor: "#18181b",
      animate: "pulse",
      select: "viewport",
    });
  } catch {
    // Ignore duplicate initialization
  }
}
