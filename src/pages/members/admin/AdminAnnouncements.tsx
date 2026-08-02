import { useState } from "react";
import { PiBellDuotone, PiTrashBold } from "react-icons/pi";
import { useActor, useAnnouncements } from "../../../hooks/useAdminData";
import { createAnnouncement, deleteAnnouncement } from "../../../lib/queries/announcements";
import Panel from "../../../components/members/Panel";
import ConfirmDialog from "../../../components/members/admin/ConfirmDialog";
import type { AnnouncementDoc } from "../../../types/schema";

const inputClass =
  "w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60";

function formatPosted(a: AnnouncementDoc): string {
  // postedAt is a serverTimestamp sentinel until the write round-trips, so
  // it can legitimately be missing on a just-created doc.
  const ms = a.postedAt?.toMillis?.();
  return ms ? new Date(ms).toLocaleString() : "just now";
}

export default function AdminAnnouncements() {
  const actor = useActor();
  const { announcements, loading, reload } = useAnnouncements();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AnnouncementDoc | null>(null);

  async function post() {
    if (!actor) return;
    if (!title.trim() || !body.trim()) {
      setError("Both a title and a body are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createAnnouncement(actor, { title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      reload();
    } catch {
      setError("Couldn't post that. Check you're still signed in as an admin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: AnnouncementDoc) {
    if (!actor) return;
    setBusy(true);
    setPendingDelete(null);
    try {
      await deleteAnnouncement(actor, a);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Post an announcement" icon={PiBellDuotone}>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="a-title" className="mb-1.5 block text-xs text-galaxy-muted">
              Title
            </label>
            <input
              id="a-title"
              type="text"
              value={title}
              maxLength={200}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="a-body" className="mb-1.5 block text-xs text-galaxy-muted">
              Body
            </label>
            <textarea
              id="a-body"
              rows={4}
              value={body}
              maxLength={5000}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={post}
            disabled={busy}
            className="w-fit rounded-full bg-galaxy-cta px-4 py-2 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Posting…" : "Post announcement"}
          </button>
        </div>
      </Panel>

      <Panel title={`Posted (${loading ? "…" : announcements.length})`}>
        {loading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-galaxy-muted">Nothing posted yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {announcements.map((a) => (
              <li
                key={a.announcementId}
                className="rounded-xl border border-galaxy-line bg-galaxy-deep p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-galaxy-muted">
                      {a.body}
                    </p>
                    <p className="mt-2 font-mono text-[0.65rem] text-galaxy-muted">
                      {formatPosted(a)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(a)}
                    disabled={busy}
                    aria-label={`Delete ${a.title}`}
                    className="shrink-0 text-galaxy-muted transition hover:text-red-400 disabled:opacity-50"
                  >
                    <PiTrashBold className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this announcement?"
          message={`"${pendingDelete.title}" will be removed from every member's dashboard. This can't be undone.`}
          confirmLabel="Delete announcement"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove(pendingDelete)}
        />
      )}
    </div>
  );
}
