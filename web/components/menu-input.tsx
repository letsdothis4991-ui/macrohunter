"use client";
/** The other ways to give MacroHunter a menu when the website doesn't have one. */
import { useRef, useState } from "react";

import { prepareImage, type PreparedImage } from "~/lib/image";

export type MenuSubmission =
  | { kind: "website" }
  | { kind: "link"; url: string }
  | { kind: "pasted"; text: string }
  | { kind: "photos"; images: { mediaType: string; base64: string }[] };

export function MenuInput({
  hasWebsite,
  busy,
  onSubmit,
  initialTab,
}: {
  hasWebsite: boolean;
  busy: boolean;
  onSubmit: (s: MenuSubmission) => void;
  initialTab?: "photos" | "pasted" | "link";
}) {
  const [tab, setTab] = useState<"photos" | "pasted" | "link">(initialTab ?? "photos");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [photos, setPhotos] = useState<PreparedImage[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setPhotoError(null);
    const next = [...photos];
    for (const f of Array.from(files).slice(0, 6 - photos.length)) {
      try {
        next.push(await prepareImage(f));
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : "Couldn't use that photo.");
      }
    }
    setPhotos(next);
  }

  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        {hasWebsite && (
          <button className="chip" onClick={() => onSubmit({ kind: "website" })} disabled={busy}>
            ↻ Try the website again
          </button>
        )}
        {(
          [
            ["photos", "📷 Photos of the menu"],
            ["pasted", "📝 Paste menu text"],
            ["link", "🔗 Link to a menu"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`chip${tab === id ? " on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "photos" && (
        <div className="stack">
          <div
            className="drop"
            role="button"
            tabIndex={0}
            onClick={() => file.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && file.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            <div style={{ fontSize: "1.6rem" }}>📷</div>
            <div>
              <strong>Take or choose photos of the menu</strong>
            </div>
            <div className="small muted">Up to 6 photos. A menu board, a printed menu, or screenshots all work.</div>
            <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </div>
          {photoError && <div className="notice bad small">{photoError}</div>}
          {photos.length > 0 && (
            <div className="thumbs">
              {photos.map((p, i) => (
                <div className="thumb" key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt={`Menu photo ${i + 1}`} />
                  <button aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn primary"
            disabled={busy || photos.length === 0}
            onClick={() => onSubmit({ kind: "photos", images: photos.map((p) => ({ mediaType: p.mediaType, base64: p.base64 })) })}
          >
            Read {photos.length || ""} photo{photos.length === 1 ? "" : "s"}
          </button>
        </div>
      )}

      {tab === "pasted" && (
        <div className="stack">
          <textarea
            className="textarea"
            placeholder={"Paste the menu here, for example:\n\nChicken Bowl  $19\nGrilled chicken, brown rice, avocado, greens, tahini\n…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
          />
          <button className="btn primary" disabled={busy || text.trim().length < 40} onClick={() => onSubmit({ kind: "pasted", text })}>
            Read this menu
          </button>
        </div>
      )}

      {tab === "link" && (
        <div className="stack">
          <input
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://… (the venue's menu page or PDF)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="tiny muted" style={{ margin: 0 }}>
            Use the venue&apos;s own site. Delivery apps like Uber Eats block automated reading.
          </p>
          <button className="btn primary" disabled={busy || !/^https?:\/\/\S+\.\S+/.test(url.trim())} onClick={() => onSubmit({ kind: "link", url: url.trim() })}>
            Read this page
          </button>
        </div>
      )}
    </div>
  );
}
