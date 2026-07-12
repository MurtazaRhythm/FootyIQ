import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption<T extends string> {
  id: T;
  label: string;
  /** small inline icon shown before the label */
  icon?: ReactNode;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** icon shown in the trigger next to the current label */
  triggerIcon?: ReactNode;
  /** phones: icon-only trigger so the header fits narrow viewports */
  compactOnMobile?: boolean;
  ariaLabel: string;
  className?: string;
}

export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  triggerIcon,
  compactOnMobile = false,
  ariaLabel,
  className,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = options.find((o) => o.id === value)!;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "glass-chip flex items-center gap-1.5 h-[34px] pl-2.5 pr-2 rounded-md text-[13px] font-medium text-primary",
          open && "glass-chip-active",
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {(active.icon ?? triggerIcon) && (
          <span className="text-muted">{active.icon ?? triggerIcon}</span>
        )}
        <span
          className={cn(
            "whitespace-nowrap",
            compactOnMobile && "hidden sm:inline",
          )}
        >
          {active.label}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="dropdown-menu absolute right-0 top-full mt-1.5 min-w-full w-max p-1 rounded-lg border border-border bg-surface/95 backdrop-blur-xl"
        >
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 pl-2.5 pr-2 py-[7px] rounded-md text-left text-[13px] transition-colors",
                  selected
                    ? "bg-accent/15 text-primary"
                    : "text-primary/85 hover:bg-primary/[0.06]",
                )}
              >
                {option.icon && (
                  <span
                    className={cn(
                      "shrink-0",
                      selected ? "text-accent" : "text-muted",
                    )}
                  >
                    {option.icon}
                  </span>
                )}
                <span className="flex-1 whitespace-nowrap">{option.label}</span>
                <Check
                  size={14}
                  className={cn("shrink-0 text-accent", !selected && "invisible")}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
