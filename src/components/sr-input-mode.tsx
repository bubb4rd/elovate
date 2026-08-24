"use client";

export type EntryMode = "manual" | "photo";

export function SrInputMode({
  value,
  onChange,
}: {
  value: EntryMode;
  onChange: (next: EntryMode) => void;
}) {
  if (value === "photo") {
    return (
      <p className="text-xs text-muted">
        <button
          type="button"
          onClick={() => onChange("manual")}
          className="text-accent underline underline-offset-2 transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
        >
          Return to manual entry
        </button>
      </p>
    );
  }

  return (
    <p className="text-xs text-muted">
      Input your game summary with our features below, or{" "}
      <button
        type="button"
        onClick={() => onChange("photo")}
        className="text-accent underline underline-offset-2 transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
      >
        upload a photo
      </button>
      !
    </p>
  );
}
