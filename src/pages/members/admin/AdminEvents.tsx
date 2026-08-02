import { useState } from "react";
import { PiCalendarStarDuotone, PiPencilSimpleBold, PiTrashBold } from "react-icons/pi";
import { useActor, useSiteEvents } from "../../../hooks/useAdminData";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  isPastEvent,
  type SiteEventInput,
} from "../../../lib/queries/site";
import Panel from "../../../components/members/Panel";
import ImageField from "../../../components/members/admin/ImageField";
import { EVENT_ASPECT } from "../../../components/members/admin/cropAspects";
import ConfirmDialog from "../../../components/members/admin/ConfirmDialog";
import type { SiteEventDoc } from "../../../types/schema";

const inputClass =
  "w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60";

const EMPTY: SiteEventInput = {
  title: "",
  description: "",
  dateLabel: "",
  startDate: null,
  location: null,
  imageUrl: null,
  order: 0,
  published: true,
};

/**
 * Events shown on the PUBLIC landing page.
 *
 * Not to be confused with Challenges, which are the members-only weekly
 * problems. The landing page used to render the challenge collection, which
 * is why a challenge posted here showed up publicly as an "event" — these are
 * now separate collections and separate screens on purpose.
 */
export default function AdminEvents() {
  const actor = useActor();
  const { events, loading, reload } = useSiteEvents();
  const [form, setForm] = useState<SiteEventInput>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SiteEventDoc | null>(null);

  function set<K extends keyof SiteEventInput>(key: K, value: SiteEventInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(e: SiteEventDoc) {
    setEditingId(e.eventId);
    setForm({
      title: e.title,
      description: e.description,
      dateLabel: e.dateLabel,
      startDate: e.startDate ?? null,
      location: e.location,
      imageUrl: e.imageUrl,
      order: e.order,
      published: e.published,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function save() {
    if (!actor) return;
    if (!form.title.trim()) {
      setError("An event needs a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: SiteEventInput = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        dateLabel: form.dateLabel.trim(),
        location: form.location?.trim() ? form.location.trim() : null,
      };
      if (editingId) await updateEvent(actor, editingId, payload);
      else await createEvent(actor, payload);
      cancelEdit();
      reload();
    } catch (err) {
      // The query layer throws a readable message for the oversized-image
      // case; anything else is almost always a permissions problem.
      setError(
        err instanceof Error && err.message.includes("limit")
          ? err.message
          : "Couldn't save that. Check you're still signed in as an admin.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: SiteEventDoc) {
    if (!actor) return;
    setBusy(true);
    setPendingDelete(null);
    try {
      await deleteEvent(actor, e);
      if (editingId === e.eventId) cancelEdit();
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={editingId ? "Edit event" : "Add an event"}
        icon={PiCalendarStarDuotone}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="e-title" className="mb-1.5 block text-xs text-galaxy-muted">
              Title
            </label>
            <input
              id="e-title"
              type="text"
              value={form.title}
              maxLength={200}
              disabled={busy}
              onChange={(ev) => set("title", ev.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="e-date" className="mb-1.5 block text-xs text-galaxy-muted">
                When <span className="text-galaxy-dim">(shown on the site)</span>
              </label>
              <input
                id="e-date"
                type="text"
                value={form.dateLabel}
                maxLength={100}
                placeholder="12 March 2026, or Every Friday"
                disabled={busy}
                onChange={(ev) => set("dateLabel", ev.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="e-startdate"
                className="mb-1.5 block text-xs text-galaxy-muted"
              >
                Actual date <span className="text-galaxy-dim">(optional)</span>
              </label>
              <input
                id="e-startdate"
                type="date"
                value={form.startDate ?? ""}
                disabled={busy}
                onChange={(ev) => set("startDate", ev.target.value || null)}
                className={inputClass}
              />
              <p className="mt-1 text-[0.65rem] text-galaxy-dim">
                Used to hide the event once it's over. Leave blank for recurring or
                undated events — those stay up until you unpublish them.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="e-loc" className="mb-1.5 block text-xs text-galaxy-muted">
                Where <span className="text-galaxy-dim">(optional)</span>
              </label>
              <input
                id="e-loc"
                type="text"
                value={form.location ?? ""}
                maxLength={200}
                placeholder="Seminar Hall / Online"
                disabled={busy}
                onChange={(ev) => set("location", ev.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="e-desc" className="mb-1.5 block text-xs text-galaxy-muted">
              Description
            </label>
            <textarea
              id="e-desc"
              rows={3}
              value={form.description}
              maxLength={2000}
              disabled={busy}
              onChange={(ev) => set("description", ev.target.value)}
              className={`${inputClass} resize-y`}
            />
          </div>

          <ImageField
            label="Event photo"
            value={form.imageUrl}
            aspect={EVENT_ASPECT}
            onChange={(url) => set("imageUrl", url)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="e-order" className="mb-1.5 block text-xs text-galaxy-muted">
                Sort order <span className="text-galaxy-dim">(lower shows first)</span>
              </label>
              <input
                id="e-order"
                type="number"
                min={0}
                max={9999}
                value={form.order}
                disabled={busy}
                // Select on focus: the field can never be empty (clearing it
                // coerces straight back to 0), so without this you have to
                // manually select the old value before every edit.
                onFocus={(ev) => ev.target.select()}
                onChange={(ev) => set("order", Number(ev.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-xs text-galaxy-muted">
              <input
                type="checkbox"
                checked={form.published}
                disabled={busy}
                onChange={(ev) => set("published", ev.target.checked)}
                className="h-4 w-4 accent-galaxy-accent"
              />
              Visible on the public site
            </label>
          </div>

          {error && (
            <p role="alert" className="text-xs text-[var(--chart-bad)]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="w-fit rounded-full bg-galaxy-cta px-4 py-2 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Add event"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="w-fit rounded-full bg-galaxy-control px-4 py-2 text-xs font-semibold text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title={`Events (${loading ? "…" : events.length})`}>
        {loading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-galaxy-muted">
            No events yet. The public site shows placeholder cards until you add one.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {events.map((e) => (
              <li
                key={e.eventId}
                className="flex items-start gap-3 rounded-xl border border-galaxy-line bg-galaxy-deep p-3"
              >
                <div className="h-14 w-[74px] shrink-0 overflow-hidden rounded-lg bg-galaxy-surface">
                  {e.imageUrl && (
                    <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{e.title}</p>
                    {!e.published && (
                      <span className="rounded-full border border-galaxy-line px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wide text-galaxy-dim">
                        Hidden
                      </span>
                    )}
                    {/* An event that vanished from the site because its date
                        passed looks identical to one that broke, unless we say
                        so here. */}
                    {isPastEvent(e) && (
                      <span className="rounded-full border border-galaxy-line px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wide text-galaxy-dim">
                        Past — off the site
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-galaxy-muted">
                    {[e.dateLabel, e.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-galaxy-muted">
                    {e.description}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    disabled={busy}
                    aria-label={`Edit ${e.title}`}
                    className="text-galaxy-muted transition hover:text-galaxy-text disabled:opacity-50"
                  >
                    <PiPencilSimpleBold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(e)}
                    disabled={busy}
                    aria-label={`Delete ${e.title}`}
                    className="text-galaxy-muted transition hover:text-[var(--chart-bad)] disabled:opacity-50"
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
          title="Delete this event?"
          message={`"${pendingDelete.title}" will be removed from the public site immediately. This can't be undone.`}
          confirmLabel="Delete event"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove(pendingDelete)}
        />
      )}
    </div>
  );
}
