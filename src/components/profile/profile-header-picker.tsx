"use client";

import { Check, Lock } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { ProfileBanner } from "@/components/profile/profile-banner";
import { PROFILE_HEADERS, type ProfileHeaderId } from "@/lib/profile/headers";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Figma banner artboard — keeps the collapsed preview proportional. */
const BANNER_ASPECT = "aspect-[1360/200]";
/** Fixed height for grid thumbs so cqh scaling stays readable in narrow columns. */
const THUMB_HEIGHT = "h-[75px]";

function PickerBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProfileHeaderPicker({
  ownedHeaderIds,
  equippedHeaderId,
  onSelect,
}: {
  ownedHeaderIds: readonly ProfileHeaderId[];
  equippedHeaderId: ProfileHeaderId;
  onSelect: (id: ProfileHeaderId) => void;
}) {
  const owned = new Set(ownedHeaderIds);
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const hintId = useId();

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.75 };

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-describedby={hintId}
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "group relative w-full rounded-[6px] text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]",
        )}
      >
        <motion.div layout transition={spring} className="relative overflow-hidden rounded-[6px]">
          <ProfileBanner
            headerId={equippedHeaderId}
            className={cn("h-auto w-full rounded-[6px]", BANNER_ASPECT)}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10"
          />
        </motion.div>
      </button>
      <p id={hintId} className="text-[11px] text-zinc-500">
        {expanded ? "Pick a banner you own." : "Tap to browse banners."}
      </p>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.ul
            key="grid"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
            className="grid grid-cols-2 gap-3 overflow-visible sm:grid-cols-3"
          >
            {PROFILE_HEADERS.map((header, index) => {
              const isOwned = owned.has(header.id);
              const isEquipped = equippedHeaderId === header.id;
              return (
                <motion.li
                  key={header.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduce ? 0 : index * 0.04,
                    duration: reduce ? 0 : 0.22,
                    ease: EASE,
                  }}
                >
                  <button
                    type="button"
                    disabled={!isOwned}
                    aria-pressed={isEquipped}
                    aria-label={
                      isOwned
                        ? isEquipped
                          ? `${header.label} header selected`
                          : `Equip ${header.label} header`
                        : `${header.label} header locked`
                    }
                    onClick={() => {
                      if (!isOwned) return;
                      onSelect(header.id);
                      setExpanded(false);
                    }}
                    className={cn(
                      "relative w-full rounded-[6px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]",
                      "transition-transform duration-150 active:scale-[0.98]",
                      !isOwned && "cursor-not-allowed",
                    )}
                  >
                    <span className="block overflow-hidden rounded-[6px]">
                      <ProfileBanner
                        headerId={header.id}
                        variant="preview"
                        className={cn("w-full rounded-[6px]", THUMB_HEIGHT)}
                      />
                    </span>

                    {isEquipped ? (
                      <>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[6px] bg-black/45"
                        />
                        <span className="pointer-events-none absolute inset-x-0 top-2.5 flex justify-center">
                          <PickerBadge>
                            <Check weight="bold" className="size-3.5 text-accent" aria-hidden />
                            <span className="text-[10px] font-semibold tracking-wide text-accent">
                              Selected
                            </span>
                          </PickerBadge>
                        </span>
                      </>
                    ) : null}

                    {!isOwned ? (
                      <>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[6px] bg-black/35"
                        />
                        <span className="pointer-events-none absolute inset-x-0 top-2.5 flex justify-center">
                          <PickerBadge>
                            <Lock weight="bold" className="size-3.5 text-zinc-200" aria-hidden />
                          </PickerBadge>
                        </span>
                      </>
                    ) : null}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
