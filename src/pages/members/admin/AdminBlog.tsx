import { useState } from "react";
import { PiNotePencilDuotone, PiPencilSimpleBold, PiTrashBold } from "react-icons/pi";
import { useActor, useBlogPosts } from "../../../hooks/useAdminData";
import {
  createPost,
  deletePost,
  updatePost,
  type BlogPostInput,
} from "../../../lib/queries/site";
import Panel from "../../../components/members/Panel";
import ConfirmDialog from "../../../components/members/admin/ConfirmDialog";
import type { BlogPostDoc } from "../../../types/schema";

const inputClass =
  "w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60";

const EMPTY: BlogPostInput = {
  title: "",
  category: "news",
  status: "published",
  body: "",
};

const CATEGORY_LABEL: Record<BlogPostDoc["category"], string> = {
  news: "News",
  journey: "Journey",
};

/** Blog posts on the PUBLIC landing page. */
export default function AdminBlog() {
  const actor = useActor();
  const { posts, loading, reload } = useBlogPosts();
  const [form, setForm] = useState<BlogPostInput>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BlogPostDoc | null>(null);

  function set<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(p: BlogPostDoc) {
    setEditingId(p.postId);
    setForm({
      title: p.title,
      category: p.category,
      status: p.status,
      body: p.body,
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
    if (!form.title.trim() || !form.body.trim()) {
      setError("A post needs both a title and a body.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: BlogPostInput = {
        ...form,
        title: form.title.trim(),
        body: form.body.trim(),
      };
      if (editingId) await updatePost(actor, editingId, payload);
      else await createPost(actor, payload);
      cancelEdit();
      reload();
    } catch {
      setError("Couldn't save that. Check you're still signed in as an admin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: BlogPostDoc) {
    if (!actor) return;
    setBusy(true);
    setPendingDelete(null);
    try {
      await deletePost(actor, p);
      if (editingId === p.postId) cancelEdit();
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title={editingId ? "Edit post" : "Write a post"} icon={PiNotePencilDuotone}>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="p-title" className="mb-1.5 block text-xs text-galaxy-muted">
              Title
            </label>
            <input
              id="p-title"
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
              <label htmlFor="p-cat" className="mb-1.5 block text-xs text-galaxy-muted">
                Category
              </label>
              <select
                id="p-cat"
                value={form.category}
                disabled={busy}
                onChange={(ev) =>
                  set("category", ev.target.value as BlogPostInput["category"])
                }
                className={inputClass}
              >
                <option value="news">News</option>
                <option value="journey">Journey</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-status" className="mb-1.5 block text-xs text-galaxy-muted">
                Status
              </label>
              <select
                id="p-status"
                value={form.status}
                disabled={busy}
                onChange={(ev) => set("status", ev.target.value as BlogPostInput["status"])}
                className={inputClass}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="p-body" className="mb-1.5 block text-xs text-galaxy-muted">
              Body
            </label>
            <textarea
              id="p-body"
              rows={7}
              value={form.body}
              maxLength={20000}
              disabled={busy}
              onChange={(ev) => set("body", ev.target.value)}
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1 text-[0.65rem] text-galaxy-dim">
              The landing page shows the first 140 characters as the excerpt.
            </p>
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
              {busy ? "Saving…" : editingId ? "Save changes" : "Publish post"}
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

      <Panel title={`Posts (${loading ? "…" : posts.length})`}>
        {loading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-galaxy-muted">
            Nothing written yet. The public site shows placeholder cards until you post.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {posts.map((p) => (
              <li
                key={p.postId}
                className="flex items-start gap-3 rounded-xl border border-galaxy-line bg-galaxy-deep p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{p.title}</p>
                    <span className="rounded-full border border-galaxy-line px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wide text-galaxy-dim">
                      {CATEGORY_LABEL[p.category]}
                    </span>
                    {p.status === "draft" && (
                      <span className="rounded-full border border-galaxy-line px-2 py-0.5 font-tech text-[0.6rem] uppercase tracking-wide text-galaxy-dim">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-galaxy-muted">
                    {p.body}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    disabled={busy}
                    aria-label={`Edit ${p.title}`}
                    className="text-galaxy-muted transition hover:text-galaxy-text disabled:opacity-50"
                  >
                    <PiPencilSimpleBold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(p)}
                    disabled={busy}
                    aria-label={`Delete ${p.title}`}
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
          title="Delete this post?"
          message={`"${pendingDelete.title}" and its full text will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete post"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove(pendingDelete)}
        />
      )}
    </div>
  );
}
