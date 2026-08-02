import { useEffect, useState } from "react";
import { PiPlusBold, PiShieldDuotone, PiTrashBold } from "react-icons/pi";
import { useAuth } from "../../../lib/AuthContext";
import { useWeeklyChallenges } from "../../../hooks/useWeeklyChallenges";
import {
  createWeeklyChallenge,
  deleteWeeklyChallenge,
  upsertWeeklyGoal,
} from "../../../lib/queries/challenges";
import { isoWeekKey } from "../../../lib/week";
import { DEFAULT_WEEKLY_GOAL } from "../../../lib/gamification";
import Panel from "../../../components/members/Panel";
import ConfirmDialog from "../../../components/members/admin/ConfirmDialog";
import type { ChallengeTier, ProblemDifficulty } from "../../../types/schema";

const TIERS: ChallengeTier[] = ["easy", "medium", "hard", "surprise"];
const TIER_DIFFICULTY: Record<ChallengeTier, ProblemDifficulty | null> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
  surprise: null,
};

const inputClass =
  "w-full rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2 text-sm text-galaxy-text placeholder:text-galaxy-muted/70 focus:border-galaxy-accent focus:outline-none disabled:opacity-60";
const labelClass = "mb-1.5 block text-xs font-medium text-galaxy-muted";

/**
 * Mirrors firestore.rules' validChallenge()/validWeeklyGoal() bounds so
 * rejections surface as field errors here rather than a bare
 * permission-denied after a round-trip.
 */
function validateChallengeForm(form: ChallengeForm): string | null {
  if (!form.title.trim()) return "Title is required.";
  if (form.title.length > 200) return "Title is too long.";
  if (form.problemUrl && form.problemUrl.length > 500) return "Problem URL is too long.";
  if (form.requiredCount < 1 || form.requiredCount > 50) {
    return "Required count must be between 1 and 50.";
  }
  if (form.points < 0 || form.points > 500) return "Points must be between 0 and 500.";
  if (form.xp < 0 || form.xp > 1000) return "XP must be between 0 and 1000.";
  return null;
}

interface ChallengeForm {
  tier: ChallengeTier;
  title: string;
  problemUrl: string;
  requiredCount: number;
  points: number;
  xp: number;
}

const emptyForm: ChallengeForm = {
  tier: "easy",
  title: "",
  problemUrl: "",
  requiredCount: 1,
  points: 10,
  xp: 20,
};

export default function AdminChallenges() {
  const { user } = useAuth();
  const week = isoWeekKey();
  const { challenges, goal, loading, reload } = useWeeklyChallenges();
  const currentWeekChallenges = challenges.filter((c) => c.week === week);

  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [goalLabel, setGoalLabel] = useState<string>(DEFAULT_WEEKLY_GOAL.label);
  const [goalTarget, setGoalTarget] = useState<number>(DEFAULT_WEEKLY_GOAL.target);
  const [savingGoal, setSavingGoal] = useState(false);

  // `goal` arrives asynchronously (it's a Firestore read behind the
  // useWeeklyChallenges hook) — seed the editable fields once it lands,
  // rather than trying to read it synchronously into useState's initial
  // value, which would only ever see the hook's initial placeholder.
  useEffect(() => {
    if (!loading) {
      setGoalLabel(goal.label);
      setGoalTarget(goal.target);
    }
  }, [loading, goal.label, goal.target]);

  async function handleCreateChallenge() {
    if (!user) return;
    const error = validateChallengeForm(form);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await createWeeklyChallenge(
        {
          week,
          tier: form.tier,
          difficulty: TIER_DIFFICULTY[form.tier],
          title: form.title.trim(),
          problemUrl: form.problemUrl.trim() || null,
          requiredCount: form.requiredCount,
          points: form.points,
          xp: form.xp,
          order: currentWeekChallenges.length,
        },
        user.uid,
      );
      setForm(emptyForm);
      reload();
    } catch {
      setFormError("Couldn't save that challenge — check you're still signed in as an admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(challengeId: string) {
    setPendingDelete(null);
    await deleteWeeklyChallenge(challengeId);
    reload();
  }

  async function handleSaveGoal() {
    if (!user) return;
    setSavingGoal(true);
    try {
      await upsertWeeklyGoal({ week, label: goalLabel.trim(), target: goalTarget }, user.uid);
      reload();
    } finally {
      setSavingGoal(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title={`Weekly goal — ${week}`} icon={PiShieldDuotone}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <label htmlFor="goal-label" className={labelClass}>
              Label
            </label>
            <input
              id="goal-label"
              type="text"
              value={goalLabel}
              onChange={(e) => setGoalLabel(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="goal-target" className={labelClass}>
              Target
            </label>
            <input
              id="goal-target"
              type="number"
              min={1}
              max={100}
              value={goalTarget}
              onChange={(e) => setGoalTarget(Number(e.target.value))}
              className={`${inputClass} w-24`}
            />
          </div>
          <button
            type="button"
            onClick={handleSaveGoal}
            disabled={savingGoal}
            className="h-fit rounded-full bg-galaxy-cta px-4 py-2 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
          >
            {savingGoal ? "Saving…" : "Save goal"}
          </button>
        </div>
      </Panel>

      <Panel title="Add a challenge" icon={PiPlusBold}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-tier" className={labelClass}>
              Tier
            </label>
            <select
              id="c-tier"
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value as ChallengeTier })}
              className={inputClass}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-title" className={labelClass}>
              Title
            </label>
            <input
              id="c-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="c-url" className={labelClass}>
              Problem URL (optional)
            </label>
            <input
              id="c-url"
              type="text"
              value={form.problemUrl}
              onChange={(e) => setForm({ ...form, problemUrl: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-required" className={labelClass}>
              Required count
            </label>
            <input
              id="c-required"
              type="number"
              min={1}
              max={50}
              value={form.requiredCount}
              onChange={(e) => setForm({ ...form, requiredCount: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-points" className={labelClass}>
              Points
            </label>
            <input
              id="c-points"
              type="number"
              min={0}
              max={500}
              value={form.points}
              onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-xp" className={labelClass}>
              XP
            </label>
            <input
              id="c-xp"
              type="number"
              min={0}
              max={1000}
              value={form.xp}
              onChange={(e) => setForm({ ...form, xp: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        {formError && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {formError}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreateChallenge}
          disabled={saving}
          className="mt-4 rounded-full bg-galaxy-cta px-4 py-2 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add challenge"}
        </button>
      </Panel>

      <Panel title={`This week's set (${currentWeekChallenges.length})`}>
        {loading ? (
          <p className="text-sm text-galaxy-muted">Loading…</p>
        ) : currentWeekChallenges.length === 0 ? (
          <p className="text-sm text-galaxy-muted">Nothing posted for {week} yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {currentWeekChallenges.map((c) => (
              <li
                key={c.challengeId}
                className="flex items-center justify-between gap-4 rounded-lg border border-galaxy-line bg-galaxy-deep px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[0.65rem] uppercase tracking-wider text-galaxy-muted">
                    {c.tier}
                  </span>
                  <p className="truncate text-sm">{c.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ id: c.challengeId, title: c.title })}
                  aria-label={`Delete ${c.title}`}
                  className="shrink-0 text-galaxy-muted transition hover:text-red-400"
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
          title="Delete this challenge?"
          message={`"${pendingDelete.title}" will be removed from this week's set. XP already awarded for it stays with the members who earned it.`}
          confirmLabel="Delete challenge"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete.id)}
        />
      )}
    </div>
  );
}
