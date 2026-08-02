import { useState } from "react";
import { PiMedalDuotone, PiTrashBold } from "react-icons/pi";
import { useActor, useBadgeDefinitions } from "../../../hooks/useAdminData";
import { deleteBadgeDefinition, upsertBadgeDefinition } from "../../../lib/queries/admin";
import Panel from "../../../components/members/Panel";
import ConfirmDialog from "../../../components/members/admin/ConfirmDialog";
import type { BadgeCriteriaType, BadgeDoc } from "../../../types/schema";

const CRITERIA: { value: BadgeCriteriaType; label: string; needsValue: boolean }[] = [
  { value: "first_solve", label: "First solve", needsValue: false },
  { value: "total_solved", label: "Total problems solved", needsValue: true },
  { value: "hard_solved", label: "Hard problems solved", needsValue: true },
  { value: "streak_days", label: "Streak length (days)", needsValue: true },
  { value: "xp_total", label: "Total XP", needsValue: true },
  { value: "weekly_sweep", label: "Weekly sweep (awarded by hand)", needsValue: false },
  { value: "manual", label: "Manual only", needsValue: false },
];

const inputClass =
  "w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60";

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminBadges() {
  const actor = useActor();
  const { badges, loading, reload } = useBadgeDefinitions();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaType, setCriteriaType] = useState<BadgeCriteriaType>("total_solved");
  const [criteriaValue, setCriteriaValue] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BadgeDoc | null>(null);

  const needsValue = CRITERIA.find((c) => c.value === criteriaType)?.needsValue ?? false;

  async function save() {
    if (!actor) return;
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const badge: BadgeDoc = {
        badgeId: slugify(name),
        name: name.trim(),
        description: description.trim(),
        iconUrl: null,
        criteriaType,
        criteriaValue: needsValue ? criteriaValue : 1,
        order: badges.length,
      };
      await upsertBadgeDefinition(actor, badge);
      setName("");
      setDescription("");
      reload();
    } catch {
      setError("Couldn't save that badge.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(badge: BadgeDoc) {
    if (!actor) return;
    setBusy(true);
    setPendingDelete(null);
    try {
      await deleteBadgeDefinition(actor, badge);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Define a badge" icon={PiMedalDuotone}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="b-name" className="mb-1.5 block text-xs text-galaxy-muted">
              Name
            </label>
            <input
              id="b-name"
              type="text"
              value={name}
              maxLength={60}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            {name.trim() && (
              <p className="mt-1 font-mono text-[0.65rem] text-galaxy-muted">
                id: {slugify(name)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="b-criteria" className="mb-1.5 block text-xs text-galaxy-muted">
              Awarded for
            </label>
            <select
              id="b-criteria"
              value={criteriaType}
              disabled={busy}
              onChange={(e) => setCriteriaType(e.target.value as BadgeCriteriaType)}
              className={inputClass}
            >
              {CRITERIA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="b-desc" className="mb-1.5 block text-xs text-galaxy-muted">
              Description
            </label>
            <input
              id="b-desc"
              type="text"
              value={description}
              maxLength={300}
              disabled={busy}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
          {needsValue && (
            <div>
              <label htmlFor="b-value" className="mb-1.5 block text-xs text-galaxy-muted">
                Threshold
              </label>
              <input
                id="b-value"
                type="number"
                min={0}
                value={criteriaValue}
                disabled={busy}
                onChange={(e) => setCriteriaValue(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-4 rounded-full bg-galaxy-cta px-4 py-2 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save badge"}
        </button>
        <p className="mt-2 text-xs text-galaxy-muted">
          Saving an existing name updates that badge rather than creating a
          duplicate. Threshold badges are awarded automatically by the sync
          engine; manual ones are granted per-member from the Members tab.
        </p>
      </Panel>

      <Panel title={`Defined badges (${loading ? "…" : badges.length})`}>
        {loading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : badges.length === 0 ? (
          <p className="text-sm text-galaxy-muted">
            None yet. Run <code className="font-mono">npm run seed</code> for the
            starter set, or define one above.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {badges.map((b) => (
              <li
                key={b.badgeId}
                className="flex items-start justify-between gap-3 rounded-xl border border-galaxy-line bg-galaxy-deep p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="mt-0.5 text-xs text-galaxy-muted">{b.description}</p>
                  <p className="mt-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-galaxy-muted">
                    {b.criteriaType}
                    {b.criteriaValue > 1 ? ` · ${b.criteriaValue}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(b)}
                  disabled={busy}
                  aria-label={`Delete ${b.name}`}
                  className="shrink-0 text-galaxy-muted transition hover:text-red-400 disabled:opacity-50"
                >
                  <PiTrashBold className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this badge?"
          message={`"${pendingDelete.name}" will be removed from the badge list. Members who already hold it keep the id on their profile, so it will show as an unknown badge until you re-create it.`}
          confirmLabel="Delete badge"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove(pendingDelete)}
        />
      )}
    </div>
  );
}
