import { useState } from "react";
import { PiPencilSimpleBold, PiTrashBold, PiUsersFourDuotone } from "react-icons/pi";
import { useActor, useBoardMembers } from "../../../hooks/useAdminData";
import {
  createBoardMember,
  deleteBoardMember,
  updateBoardMember,
  type BoardMemberInput,
} from "../../../lib/queries/site";
import Panel from "../../../components/members/Panel";
import ImageField from "../../../components/members/admin/ImageField";
import { PORTRAIT_ASPECT } from "../../../components/members/admin/cropAspects";
import ConfirmDialog from "../../../components/members/admin/ConfirmDialog";
import type { BoardMemberDoc } from "../../../types/schema";

const inputClass =
  "w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60";

const EMPTY: BoardMemberInput = {
  name: "",
  title: "",
  imageUrl: null,
  linkUrl: null,
  order: 0,
  published: true,
};

/**
 * The board listing on the PUBLIC landing page.
 *
 * This used to be derived from `users where role in (admin, super_admin)`,
 * which meant granting someone admin access also published their name on the
 * homepage, and removing them from the homepage meant revoking their access.
 * Those are two unrelated decisions and they now have two unrelated screens:
 * access lives on Members, the public listing lives here. A board member does
 * not need an account at all.
 */
export default function AdminBoard() {
  const actor = useActor();
  const { members, loading, reload } = useBoardMembers();
  const [form, setForm] = useState<BoardMemberInput>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BoardMemberDoc | null>(null);

  function set<K extends keyof BoardMemberInput>(key: K, value: BoardMemberInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(m: BoardMemberDoc) {
    setEditingId(m.memberId);
    setForm({
      name: m.name,
      title: m.title,
      imageUrl: m.imageUrl,
      linkUrl: m.linkUrl,
      order: m.order,
      published: m.published,
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
    if (!form.name.trim() || !form.title.trim()) {
      setError("A board member needs both a name and a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: BoardMemberInput = {
        ...form,
        name: form.name.trim(),
        title: form.title.trim(),
        linkUrl: form.linkUrl?.trim() ? form.linkUrl.trim() : null,
      };
      if (editingId) await updateBoardMember(actor, editingId, payload);
      else await createBoardMember(actor, payload);
      cancelEdit();
      reload();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("limit")
          ? err.message
          : "Couldn't save that. Check you're still signed in as an admin.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: BoardMemberDoc) {
    if (!actor) return;
    setBusy(true);
    setPendingDelete(null);
    try {
      await deleteBoardMember(actor, m);
      if (editingId === m.memberId) cancelEdit();
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={editingId ? "Edit board member" : "Add a board member"}
        icon={PiUsersFourDuotone}
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="b-name" className="mb-1.5 block text-xs text-galaxy-muted">
                Name
              </label>
              <input
                id="b-name"
                type="text"
                value={form.name}
                maxLength={120}
                disabled={busy}
                onChange={(ev) => set("name", ev.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="b-title" className="mb-1.5 block text-xs text-galaxy-muted">
                Title
              </label>
              <input
                id="b-title"
                type="text"
                value={form.title}
                maxLength={120}
                placeholder="Chairperson, Technical Lead…"
                disabled={busy}
                onChange={(ev) => set("title", ev.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="b-link" className="mb-1.5 block text-xs text-galaxy-muted">
              Profile link <span className="text-galaxy-dim">(optional)</span>
            </label>
            <input
              id="b-link"
              type="url"
              value={form.linkUrl ?? ""}
              maxLength={500}
              placeholder="https://linkedin.com/in/…"
              disabled={busy}
              onChange={(ev) => set("linkUrl", ev.target.value)}
              className={inputClass}
            />
          </div>

          <ImageField
            label="Photo"
            value={form.imageUrl}
            aspect={PORTRAIT_ASPECT}
            onChange={(url) => set("imageUrl", url)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="b-order" className="mb-1.5 block text-xs text-galaxy-muted">
                Sort order <span className="text-galaxy-dim">(lower shows first)</span>
              </label>
              <input
                id="b-order"
                type="number"
                min={0}
                max={9999}
                value={form.order}
                disabled={busy}
                // See AdminEvents — the field can never be empty, so focus
                // has to select it for editing to feel normal.
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
              {busy ? "Saving…" : editingId ? "Save changes" : "Add member"}
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

      <Panel title={`Board (${loading ? "…" : members.length})`}>
        {loading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-galaxy-muted">
            Nobody listed yet. The public site shows placeholder cards until you add
            someone.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {members.map((m) => (
              <li
                key={m.memberId}
                className="flex items-center gap-3 rounded-xl border border-galaxy-line bg-galaxy-deep p-3"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-galaxy-surface">
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    {!m.published && (
                      <span className="rounded-full border border-galaxy-line px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wide text-galaxy-dim">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-galaxy-muted">{m.title}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    disabled={busy}
                    aria-label={`Edit ${m.name}`}
                    className="text-galaxy-muted transition hover:text-galaxy-text disabled:opacity-50"
                  >
                    <PiPencilSimpleBold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(m)}
                    disabled={busy}
                    aria-label={`Remove ${m.name}`}
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
          title="Remove this board member?"
          message={`${pendingDelete.name} will disappear from the public site immediately. This can't be undone — and note it does not touch their account or admin access, which live on the Members tab.`}
          confirmLabel="Remove member"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove(pendingDelete)}
        />
      )}
    </div>
  );
}
