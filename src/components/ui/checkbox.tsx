"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center justify-center cursor-pointer select-none">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-zinc-700 bg-zinc-900 transition-all flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-[#E85002] peer-checked:bg-[#E85002] peer-checked:border-[#E85002]",
            className
          )}
        >
          {checked && <Check className="h-3 w-3 text-white font-extrabold stroke-[3]" />}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
