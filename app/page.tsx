"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, getOrCreateProfile } from "@/lib/ascend-data";
import { getActivePathUnlocks, getNewlyUnlockedForLevel, type PathUnlock } from "@/lib/path-unlocks";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "./loading-screen";

const MORNING_ANCHOR_UNLOCK_LEVEL = 3;
const CUSTOM_QUEST_UNLOCK_LEVEL = 5;
const DEFAULT_CUSTOM_QUEST_TEXT = "Complete your custom quest";
const PATH_STORAGE_KEY = "ascend.path-selections.v1";
const PATH_XP_STORAGE_KEY = "ascend.path-xp.v1";
const ONBOARDING_STORAGE_KEY = "ascend.onboarding.completed.v1";
const FIRST_EXECUTION_STORAGE_KEY = "ascend.first-execution-shown.v1";
const PRO_ACCESS_STORAGE_KEY = "ascend.pro-access.v1";
const ONBOARDING_STEPS = [
  "You don’t lack motivation. You lack a system.",
  "Ascend turns your life into a system. You execute daily protocols.",
  "Every action earns XP. Every level unlocks a better system.",
  "You are not building habits. You are becoming someone who executes.",
] as const;
const CATEGORY_ORDER = ["physical", "mental", "social"] as const;
const CATEGORY_LABELS = {
  physical: "Physical Health",
  mental: "Mental Health",
  social: "Social Health",
} as const;
const PATH_OPTIONS = {
  physical: [
    { id: "strength_training", label: "Strength Training" },
    { id: "cardio_conditioning", label: "Cardio / Conditioning" },
    { id: "martial_arts", label: "Martial Arts" },
    { id: "nutrition", label: "Nutrition" },
    { id: "sleep_recovery", label: "Sleep / Recovery" },
  ],
  mental: [
    { id: "learning_skill_acquisition", label: "Learning / Skill Acquisition" },
    { id: "focus_deep_work", label: "Focus / Deep Work" },
    { id: "reflection_awareness", label: "Reflection / Awareness" },
    { id: "financial_mastery", label: "Financial Mastery" },
  ],
  social: [
    { id: "relationships", label: "Relationships" },
    { id: "communication", label: "Communication" },
    { id: "confidence_exposure", label: "Confidence / Exposure" },
  ],
} as const;
const DEFAULT_PATH_SELECTIONS = {
  physical: "strength_training",
  mental: "learning_skill_acquisition",
  social: "relationships",
} as const;
const LEGACY_PATH_ID_MIGRATION: Record<string, string> = {
  strength: "strength_training",
  cardio: "cardio_conditioning",
  learning: "learning_skill_acquisition",
  focus: "focus_deep_work",
  reflection: "reflection_awareness",
  confidence: "confidence_exposure",
};
const LEGACY_PATH_LABEL_MIGRATION: Record<string, string> = {
  Cardio: "Cardio / Conditioning",
  Learning: "Learning / Skill Acquisition",
  Focus: "Focus / Deep Work",
  Reflection: "Reflection / Awareness",
  Confidence: "Confidence / Exposure",
};
const PRO_ONLY_PATH_IDS: Record<CategoryKey, string[]> = {
  physical: ["nutrition", "sleep_recovery"],
  mental: ["financial_mastery"],
  social: [],
};

type DailyQuest = {
  id: number;
  category: string;
  path: string;
  title: string;
  instruction: string;
  steps: string[];
  why: string;
  examples: string[];
  minimum: string;
  insight: string;
  task?: string;
};
type TaskDetail = { instruction: string; steps: string[]; whyItMatters: string; insight: string; examples: string[]; minimumViable: string };
type CategoryKey = (typeof CATEGORY_ORDER)[number];
type PathId = (typeof PATH_OPTIONS)[CategoryKey][number]["id"];
type PathSelections = Record<CategoryKey, PathId>;
type TaskPoolEntry = { title: string; instruction: string; steps: string[]; why: string; insight: string; examples: string[]; minimum: string };
type PathProgress = { xp: number; level: number };
type PathXpState = Record<CategoryKey, Record<string, PathProgress>>;
type QuestEffectInputState = Record<number, Record<string, string>>;

const hasStructuredQuestShape = (value: unknown): value is DailyQuest => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.category === "string" &&
    typeof item.title === "string" &&
    typeof item.path === "string" &&
    typeof item.instruction === "string" &&
    Array.isArray(item.steps) &&
    typeof item.why === "string" &&
    Array.isArray(item.examples) &&
    typeof item.minimum === "string" &&
    typeof item.insight === "string"
  );
};

const DEFAULT_PATH_SELECTIONS_BY_CATEGORY: PathSelections = {
  physical: DEFAULT_PATH_SELECTIONS.physical,
  mental: DEFAULT_PATH_SELECTIONS.mental,
  social: DEFAULT_PATH_SELECTIONS.social,
};

const createEmptyPathXpState = (): PathXpState => ({
  physical: {},
  mental: {},
  social: {},
});

const ensurePathProgress = (state: PathXpState, category: CategoryKey, pathId: string): PathXpState => {
  if (state[category][pathId]) return state;
  return {
    ...state,
    [category]: {
      ...state[category],
      [pathId]: { xp: 0, level: 1 },
    },
  };
};

const getPathLevel = (xp: number) => Math.floor(xp / 100) + 1;

const getSystemMetricsFromPathXp = (state: PathXpState) => {
  const total = CATEGORY_ORDER.reduce(
    (sum, category) =>
      sum +
      Object.values(state[category]).reduce((categorySum, entry) => categorySum + entry.xp, 0),
    0
  );
  return { totalXP: total, level: getPathLevel(total) };
};

const migratePathXpState = (state: PathXpState): PathXpState => {
  const next = createEmptyPathXpState();
  for (const category of CATEGORY_ORDER) {
    for (const [rawPathId, progress] of Object.entries(state?.[category] ?? {})) {
      const migratedPathId = LEGACY_PATH_ID_MIGRATION[rawPathId] ?? rawPathId;
      next[category][migratedPathId] = {
        xp: Number(progress?.xp ?? 0),
        level: getPathLevel(Number(progress?.xp ?? 0)),
      };
    }
  }
  return next;
};

const taskPools: Record<CategoryKey, Record<string, TaskPoolEntry[]>> = {
  physical: {
    strength_training: [
      { title: "Complete a strength session", instruction: "Run a focused resistance session with planned sets.", steps: ["Select 2-3 key lifts for today.", "Complete all planned work sets with strict form.", "Log load, reps, and one execution note."], why: "Structured resistance work builds reliable strength output.", examples: ["Gym session", "Bodyweight workout", "Dumbbell session"], minimum: "Execute one full set on one lift.", insight: "Tracking each session converts training into measurable progression." },
      { title: "Practice one compound movement", instruction: "Refine one major movement pattern under control.", steps: ["Choose one movement to sharpen.", "Run a light warmup set for mechanics.", "Execute 3 clean sets with full control."], why: "Compound movement quality drives long-term strength gains.", examples: ["Squat", "Deadlift", "Overhead press"], minimum: "Complete 5 controlled reps.", insight: "Technical precision prevents wasted effort and injury risk." },
      { title: "Do a short bodyweight circuit", instruction: "Execute a compact full-body circuit without long rests.", steps: ["Select 3 bodyweight movements.", "Run 3 rounds with controlled tempo.", "Record round quality and pacing."], why: "Bodyweight circuits maintain strength consistency anywhere.", examples: ["Push-ups, squats, plank", "Lunges, dips, hollow hold"], minimum: "Complete 1 full round.", insight: "Short circuits preserve execution standards on busy days." },
      { title: "Log your lifts", instruction: "Record training outputs immediately after the session.", steps: ["Capture exercises and set volume.", "Note top set load/reps.", "Write one correction for next session."], why: "Logged data enables objective progression decisions.", examples: ["Training notebook", "Phone note", "Spreadsheet"], minimum: "Log one lift with load and reps.", insight: "No log means no progression signal." },
      { title: "Improve one movement pattern", instruction: "Isolate one movement weakness and run correction work.", steps: ["Identify the weak phase of the lift.", "Select one corrective drill.", "Execute 2 focused correction sets."], why: "Pattern corrections increase force output and control.", examples: ["Hip hinge drill", "Bracing reset", "Tempo reps"], minimum: "Run one correction set.", insight: "One corrected pattern can improve every future session." },
    ],
    cardio_conditioning: [
      { title: "Move continuously for 20 minutes", instruction: "Sustain uninterrupted movement at moderate effort.", steps: ["Choose one movement modality before starting.", "Maintain continuous movement for 20 minutes.", "Log breathing and recovery quality."], why: "Continuous output improves baseline work capacity.", examples: ["Walking", "Cycling", "Mobility flow", "Jogging"], minimum: "Execute 10 minutes continuously.", insight: "Consistency of output matters more than occasional intensity spikes." },
      { title: "Do a zone 2 session", instruction: "Stay in steady aerobic range for a fixed block.", steps: ["Set target effort where speech stays possible.", "Hold pace for 20-30 minutes.", "Finish with a short cooldown walk."], why: "Zone 2 work builds durable conditioning foundation.", examples: ["Easy run", "Bike session", "Rower"], minimum: "Complete 12 minutes in zone 2 effort.", insight: "Aerobic base quality raises recovery and repeatability." },
      { title: "Take a brisk walk", instruction: "Walk with intent at a pace above casual movement.", steps: ["Set a route or timer.", "Keep pace elevated for full duration.", "Finish with nasal breathing reset."], why: "Brisk walking keeps conditioning active with low friction.", examples: ["Neighborhood walk", "Incline treadmill", "Trail walk"], minimum: "Walk briskly for 12 minutes.", insight: "Low-friction conditioning prevents system breaks on heavy days." },
      { title: "Complete an interval session", instruction: "Run repeated effort/recovery intervals with quality.", steps: ["Set timer for effort and recovery rounds.", "Execute each effort at consistent output.", "Recover fully before next rep."], why: "Intervals build speed, tolerance, and control under load.", examples: ["Run intervals", "Bike sprints", "Stair repeats"], minimum: "Complete 3 quality intervals.", insight: "Interval quality is preserved by disciplined recovery windows." },
      { title: "Improve recovery pace", instruction: "Train faster return to baseline after exertion.", steps: ["Run one short hard effort.", "Track recovery breathing for 2 minutes.", "Repeat and compare recovery quality."], why: "Recovery speed determines repeatable performance.", examples: ["1-minute effort + walk", "Assault bike recovery"], minimum: "Perform one effort + one recovery cycle.", insight: "Faster recovery expands total daily capacity." },
    ],
    martial_arts: [
      { title: "Drill one technique", instruction: "Repeat a single technical sequence with precision.", steps: ["Select one technique focus.", "Drill slowly for mechanics first.", "Increase speed while preserving form."], why: "Focused repetition builds automatic execution under pressure.", examples: ["Guard pass entry", "Jab-cross-slip", "Takedown setup"], minimum: "Drill for 5 focused minutes.", insight: "Single-technique sessions outperform scattered drilling." },
      { title: "Study one technique", instruction: "Analyze one technique and extract execution cues.", steps: ["Review one technical breakdown.", "Capture 2 key mechanics.", "Visualize one clean rep sequence."], why: "Technical understanding improves training quality immediately.", examples: ["Match study", "Instructional clip", "Coach notes"], minimum: "Study for 5 minutes and capture one note.", insight: "Good study shortens trial-and-error in live practice." },
      { title: "Shadowbox or solo drill", instruction: "Run uninterrupted solo movement with intention.", steps: ["Set one timed round.", "Move continuously with technical intent.", "Identify one breakdown for correction."], why: "Solo rounds sharpen rhythm, transitions, and composure.", examples: ["Shadowboxing", "Solo grappling movement", "Footwork round"], minimum: "Complete one 3-minute round.", insight: "Continuous solo work exposes technical leaks quickly." },
      { title: "Visualize one sequence", instruction: "Mentally rehearse one full technical sequence.", steps: ["Pick one sequence start to finish.", "Visualize timing, angle, and finish.", "Run one physical rep immediately after."], why: "Visualization improves execution quality and reaction speed.", examples: ["Entry to finish chain", "Counter sequence"], minimum: "Visualize one complete sequence once.", insight: "Mental rehearsal strengthens technical recall before live reps." },
      { title: "Review one round or roll", instruction: "Audit one sparring round for correction targets.", steps: ["Select one round/roll to review.", "Identify one successful action and one failure.", "Write one adjustment for next session."], why: "Structured review accelerates tactical improvement.", examples: ["Sparring clip", "Competition round", "Roll notes"], minimum: "Capture one adjustment note.", insight: "Feedback loops turn experience into skill progression." },
    ],
    nutrition: [
      { title: "Hit your protein target", instruction: "Set and execute a daily protein minimum.", steps: ["Define your target grams for today.", "Plan protein across main meals.", "Confirm total intake by end of day."], why: "Protein consistency supports recovery and body composition.", examples: ["Meal prep portions", "High-protein snacks", "Post-workout meal"], minimum: "Hit at least one protein-anchored meal.", insight: "Protein distribution across the day improves consistency." },
      { title: "Build one balanced plate", instruction: "Assemble one high-quality plate with structure.", steps: ["Add a clear protein source.", "Add fiber-rich vegetables or fruit.", "Add a smart carb or fat source."], why: "Meal structure improves nutrition quality without complexity.", examples: ["Protein + greens + rice", "Eggs + fruit + oats"], minimum: "Build one balanced plate today.", insight: "Structured plates reduce decision fatigue and poor defaults." },
      { title: "Track hydration quality", instruction: "Run a simple hydration protocol through the day.", steps: ["Set a minimum water target.", "Distribute intake across morning, afternoon, evening.", "Check hydration status by evening."], why: "Hydration drives cognitive and physical output quality.", examples: ["Bottle refill targets", "Electrolyte add-in", "Hydration reminders"], minimum: "Drink two intentional hydration blocks.", insight: "Consistent hydration has compounding performance effects." },
      { title: "Reduce one inflammatory input", instruction: "Remove one high-friction food trigger for the day.", steps: ["Identify one low-quality input to remove.", "Replace it with a clean alternative.", "Note energy or focus impact."], why: "Reducing inflammatory inputs supports recovery and clarity.", examples: ["Swap processed snack", "Reduce sugary drinks"], minimum: "Replace one low-quality food choice.", insight: "Small swaps repeated daily outperform aggressive short-term diets." },
      { title: "Plan tomorrow’s nutrition", instruction: "Pre-decide tomorrow’s key meals.", steps: ["Define your first meal.", "Define one high-protein anchor meal.", "Prepare or schedule food access in advance."], why: "Pre-planning lowers impulsive nutrition decisions.", examples: ["Meal prep container", "Grocery list", "Restaurant pre-selection"], minimum: "Pre-plan one meal for tomorrow.", insight: "Pre-commitment is the simplest nutrition leverage tool." },
    ],
    sleep_recovery: [
      { title: "Set a fixed sleep window", instruction: "Commit to a consistent sleep and wake window.", steps: ["Choose sleep start and wake targets.", "Set alarm and cutoff reminders.", "Execute both times within tolerance."], why: "Consistency in timing improves sleep quality and recovery.", examples: ["11:00 PM to 7:00 AM", "Digital sunset reminder"], minimum: "Keep one consistent sleep/wake pair tonight.", insight: "Regular timing often matters more than occasional long sleep." },
      { title: "Run a pre-sleep protocol", instruction: "Execute a low-stimulation wind-down routine.", steps: ["Reduce screen and bright light exposure.", "Do one calming activity for 10 minutes.", "Enter bed with no active stimulation."], why: "Pre-sleep routines reduce friction into high-quality sleep.", examples: ["Light stretching", "Reading", "Breathwork"], minimum: "Complete one 5-minute wind-down block.", insight: "Your last 30 minutes define sleep onset quality." },
      { title: "Protect evening stimulation", instruction: "Lower late-day inputs that disrupt recovery.", steps: ["Set a caffeine and stimulation cutoff.", "Avoid high-friction content before bed.", "Create a calm final-hour environment."], why: "Reducing stimulation improves deep sleep opportunity.", examples: ["No late caffeine", "Quiet lighting", "Low arousal media"], minimum: "Apply one stimulation cutoff tonight.", insight: "Recovery quality is often lost in late-evening habits." },
      { title: "Track recovery signal", instruction: "Capture one objective recovery marker daily.", steps: ["Select one marker (energy, soreness, mood).", "Rate it quickly after waking.", "Adjust day intensity if marker is low."], why: "Recovery tracking supports better training decisions.", examples: ["1-5 readiness scale", "Morning note"], minimum: "Record one recovery score.", insight: "Measured recovery prevents blind overtraining patterns." },
      { title: "Create a deep recovery block", instruction: "Schedule one intentional restoration block this week.", steps: ["Pick a restoration activity.", "Time-box the block on calendar.", "Execute fully without multitasking."], why: "Planned restoration sustains long-term output.", examples: ["Mobility session", "Walk + breathwork", "Non-screen reset"], minimum: "Schedule one 20-minute recovery block.", insight: "Recovery should be programmed, not improvised." },
    ],
  },
  mental: {
    learning_skill_acquisition: [
      { title: "Spend 10 minutes learning", instruction: "Study one high-value topic with full focus.", steps: ["Select one topic before starting.", "Study for 10 uninterrupted minutes.", "Capture one actionable takeaway."], why: "Daily learning compounds into technical depth.", examples: ["Course lesson", "Chapter reading", "Technical article"], minimum: "Learn for 5 focused minutes.", insight: "Short daily study beats occasional long sessions." },
      { title: "Read 10 pages", instruction: "Read a defined quantity with retention focus.", steps: ["Choose one source aligned to your target.", "Read 10 pages without context switching.", "Note one key principle."], why: "Volume with retention builds transferable knowledge.", examples: ["Book chapter", "Manual section", "Longform paper"], minimum: "Read 3 pages and log one note.", insight: "Fixed reading volume creates objective momentum." },
      { title: "Review notes", instruction: "Reinforce prior learning through note consolidation.", steps: ["Open last study notes.", "Highlight 3 critical ideas.", "Summarize one idea in plain language."], why: "Review prevents knowledge decay and boosts recall.", examples: ["Notebook review", "Flashcard pass", "Margin notes"], minimum: "Review one note and write one summary line.", insight: "Unreviewed notes have near-zero execution value." },
      { title: "Practice one skill deliberately", instruction: "Run targeted reps on one specific skill.", steps: ["Define one skill micro-target.", "Execute timed deliberate reps.", "Record one correction for next rep cycle."], why: "Deliberate practice converts theory into capability.", examples: ["Code katas", "Language drills", "Memory exercises"], minimum: "Run one deliberate rep block.", insight: "Specific targets separate practice from repetition." },
      { title: "Summarize one key lesson", instruction: "Compress learning into a reusable lesson statement.", steps: ["Choose one concept from today.", "Write a 3-line summary.", "Define one real-world application."], why: "Summarization sharpens understanding and retrieval.", examples: ["Written recap", "Voice note", "Teach-back"], minimum: "Write one clear lesson sentence.", insight: "If you cannot summarize it, you cannot deploy it." },
    ],
    focus_deep_work: [
      { title: "Complete one focused work block", instruction: "Deliver one uninterrupted execution block.", steps: ["Define one output before starting.", "Run a 25-45 minute deep block.", "Record output shipped."], why: "Deep blocks maximize high-value output.", examples: ["Feature build", "Writing sprint", "Research block"], minimum: "Execute 15 uninterrupted minutes.", insight: "Output-first blocks outperform time-only tracking." },
      { title: "Remove one distraction", instruction: "Eliminate one recurring interruption source.", steps: ["Identify highest-friction distraction.", "Block or remove it before work.", "Verify focus quality improved."], why: "Distraction removal protects cognitive throughput.", examples: ["Disable notifications", "Close tabs", "Phone out of room"], minimum: "Remove one distraction for next block.", insight: "Focus is engineered, not hoped for." },
      { title: "Do 25 minutes of uninterrupted work", instruction: "Run a strict no-switch execution interval.", steps: ["Set a 25-minute timer.", "Work on one target only.", "Capture completion state at end."], why: "Time-boxed focus builds execution reliability.", examples: ["Pomodoro", "Single-task sprint"], minimum: "Complete one 10-minute no-switch sprint.", insight: "Uninterrupted intervals rebuild attention control fast." },
      { title: "Finish one meaningful task", instruction: "Close one task to done state before switching.", steps: ["Pick one task with clear done criteria.", "Execute until done criteria is met.", "Mark done and archive context."], why: "Task closure compounds system credibility.", examples: ["Ship PR", "Submit report", "Finalize deliverable"], minimum: "Advance one task to a clear checkpoint.", insight: "Completion bias creates momentum and trust in your system." },
      { title: "Work on your hardest task first", instruction: "Execute highest-friction work at session start.", steps: ["Identify hardest high-impact task.", "Start it in first work block.", "Complete one concrete milestone."], why: "Early hardest-task execution raises daily quality ceiling.", examples: ["Critical analysis", "Complex coding", "Difficult outreach"], minimum: "Start hardest task for 10 minutes.", insight: "Front-loading difficulty prevents strategic avoidance." },
    ],
    reflection_awareness: [
      { title: "Journal for 5 minutes", instruction: "Write a concise operational review of your day.", steps: ["Log one win.", "Log one friction point.", "Log one correction for tomorrow."], why: "Short reflection improves execution quality day to day.", examples: ["Notebook log", "Digital journal"], minimum: "Write 3 lines total.", insight: "Daily micro-review prevents repeated errors." },
      { title: "Review your day", instruction: "Audit today against planned standards.", steps: ["Compare planned vs executed actions.", "Identify largest deviation.", "Define one adjustment."], why: "Daily audits align behavior with intent.", examples: ["End-of-day checklist", "Scorecard review"], minimum: "Identify one deviation and one adjustment.", insight: "Unreviewed days repeat uncorrected patterns." },
      { title: "Write one lesson learned", instruction: "Extract one transferable lesson from today.", steps: ["Pick one event worth learning from.", "Write the lesson in one sentence.", "Define where to apply it next."], why: "Explicit lessons convert experience into better decisions.", examples: ["Decision postmortem", "Mistake note"], minimum: "Write one concrete lesson sentence.", insight: "One clear lesson can shift tomorrow’s outcomes." },
      { title: "Name one thing to improve", instruction: "Select one execution behavior to tighten tomorrow.", steps: ["Pick one behavior gap.", "Define exact improved behavior.", "Attach it to a time cue."], why: "Specific improvements drive compounding gains.", examples: ["Start-time discipline", "Notification control"], minimum: "Name one behavior change.", insight: "Precision beats broad self-criticism." },
      { title: "Sit quietly and think for 10 minutes", instruction: "Run a deliberate no-input thinking block.", steps: ["Set timer for 10 minutes.", "Remove all external inputs.", "End with one written conclusion."], why: "Quiet thinking sharpens judgment and direction.", examples: ["No-device reflection", "Strategy thinking"], minimum: "Think quietly for 4 minutes.", insight: "Decision quality improves when processing is not outsourced to noise." },
    ],
    financial_mastery: [
      { title: "Track today’s spending", instruction: "Capture every non-essential spend for one day.", steps: ["Log each discretionary purchase.", "Tag each purchase by category.", "Review total before day end."], why: "Visibility into spending is the base layer of control.", examples: ["Coffee", "Subscriptions", "Impulse buys"], minimum: "Log at least one discretionary expense.", insight: "What gets measured is what gets managed." },
      { title: "Run a budget check", instruction: "Compare this week’s spending against your plan.", steps: ["Open your budget categories.", "Check current totals vs limits.", "Adjust one category for control."], why: "Frequent budget checks prevent drift and stress.", examples: ["Weekly review", "Envelope category check"], minimum: "Review one budget category.", insight: "Small corrections early beat large corrections late." },
      { title: "Identify one income lever", instruction: "Find one concrete way to increase earning potential.", steps: ["List one skill or offer to improve.", "Define one action to advance it.", "Schedule execution this week."], why: "Income expansion compounds freedom over time.", examples: ["New service", "Rate increase prep", "Upskilling"], minimum: "Write one income lever and next action.", insight: "Wealth grows faster when income strategy is deliberate." },
      { title: "Reduce one recurring cost", instruction: "Cut or optimize one recurring expense.", steps: ["Identify one recurring charge.", "Decide cancel, downgrade, or negotiate.", "Execute the reduction action."], why: "Recurring savings improve monthly cash flow immediately.", examples: ["Subscription audit", "Phone plan review"], minimum: "Cancel or reduce one recurring cost.", insight: "Recurring savings have permanent compounding effect." },
      { title: "Plan your next financial move", instruction: "Set one next-step financial decision with intent.", steps: ["Choose one priority (save, pay debt, invest).", "Define amount and timeline.", "Create one automatic or scheduled action."], why: "Planned financial decisions reduce emotional spending patterns.", examples: ["Auto-transfer", "Debt payment plan", "Emergency fund step"], minimum: "Schedule one financial action.", insight: "Automation turns intentions into reliable outcomes." },
    ],
  },
  social: {
    communication: [
      { title: "Start one intentional conversation", instruction: "Initiate one purposeful conversation today.", steps: ["Choose one person and objective.", "Open directly and clearly.", "Close with one actionable next step."], why: "Intentional conversation builds social execution muscle.", examples: ["Work check-in", "Clarification chat"], minimum: "Initiate one short purposeful exchange.", insight: "Initiation frequency drives social confidence and influence." },
      { title: "Practice active listening", instruction: "Run one conversation with deliberate listening discipline.", steps: ["Listen without interrupting.", "Ask one clarifying question.", "Reflect one key point back."], why: "Listening quality improves communication outcomes.", examples: ["1:1 conversation", "Team sync"], minimum: "Ask one clarifying question.", insight: "Reflections reduce misunderstanding faster than longer explanations." },
      { title: "Ask one thoughtful question", instruction: "Use one high-quality question to deepen dialogue.", steps: ["Prepare one non-obvious question.", "Ask with full attention.", "Capture one useful response insight."], why: "Good questions unlock signal and trust.", examples: ["Mentor question", "Partner question"], minimum: "Ask one meaningful question.", insight: "Question quality determines answer quality." },
      { title: "Express one clear opinion", instruction: "State your position directly and calmly.", steps: ["Define your position in one line.", "State reasoning briefly.", "Invite response without retreating."], why: "Clear expression builds credibility and decisiveness.", examples: ["Meeting input", "Boundary statement"], minimum: "State one clear position sentence.", insight: "Unstated opinions create hidden friction and drift." },
      { title: "Speak with full attention", instruction: "Deliver one conversation with full presence.", steps: ["Remove devices before speaking.", "Maintain eye contact and steady pace.", "End with confirmed understanding."], why: "Presence improves communication precision.", examples: ["Difficult discussion", "Relationship check-in"], minimum: "One minute of fully present speech.", insight: "Attention is felt; it changes conversation quality immediately." },
    ],
    relationships: [
      { title: "Send one meaningful message", instruction: "Deliver one high-quality personal message.", steps: ["Choose one person intentionally.", "Write specific, personal content.", "End with a clear follow-up cue."], why: "Meaningful outreach strengthens real relationships.", examples: ["Friend check-in", "Family note"], minimum: "Send one specific message.", insight: "Specificity signals care; generic messages do not." },
      { title: "Check in on someone", instruction: "Run a direct check-in with intent.", steps: ["Identify one person to support.", "Ask how they are with attention.", "Respond thoughtfully to what you hear."], why: "Consistent check-ins keep relationships active.", examples: ["Call", "Voice note", "Message"], minimum: "Ask one sincere check-in question.", insight: "Regular check-ins prevent relationship decay." },
      { title: "Show appreciation", instruction: "Express appreciation with concrete detail.", steps: ["Identify one contribution.", "State appreciation directly.", "Name the specific impact."], why: "Recognition builds trust and relational strength.", examples: ["Thank-you note", "Verbal appreciation"], minimum: "Express one concrete thank-you.", insight: "Concrete appreciation is remembered; vague praise is not." },
      { title: "Strengthen one connection", instruction: "Move one relationship one step deeper.", steps: ["Select one relationship to invest in.", "Start a meaningful exchange.", "Confirm one next interaction."], why: "Deliberate investment builds durable social capital.", examples: ["Follow-up lunch", "Deeper conversation"], minimum: "Set one follow-up action.", insight: "Relationships improve through scheduled intention, not chance." },
      { title: "Plan one quality interaction", instruction: "Schedule one high-value social interaction.", steps: ["Pick person and context.", "Propose specific time and format.", "Confirm on calendar."], why: "Planned interaction converts intent into reality.", examples: ["Coffee", "Walk", "Dinner"], minimum: "Send one scheduling message.", insight: "Calendar commitment is the difference between intent and action." },
    ],
    confidence_exposure: [
      { title: "Do one uncomfortable social rep", instruction: "Take one socially uncomfortable but constructive action.", steps: ["Select one discomfort-based action.", "Execute without overthinking.", "Log result and response quality."], why: "Confidence grows through repeated exposure.", examples: ["Introduce yourself", "Ask for feedback"], minimum: "Complete one small discomfort rep.", insight: "Confidence is built by exposure count, not mood." },
      { title: "Make one bold ask", instruction: "Request something with clear value framing.", steps: ["Define one specific ask.", "State the ask directly.", "Accept the response without retreating."], why: "Bold asks expand opportunity and social resilience.", examples: ["Mentorship ask", "Opportunity request"], minimum: "Make one direct ask.", insight: "Asking clearly trains agency and rejection tolerance." },
      { title: "Put yourself in one growth situation", instruction: "Enter one context that stretches social capacity.", steps: ["Choose one growth environment.", "Participate actively for a defined duration.", "Capture one lesson after."], why: "Growth contexts accelerate adaptation and confidence.", examples: ["Networking event", "Group training"], minimum: "Enter one growth environment for 10 minutes.", insight: "Environmental exposure changes identity faster than theory." },
      { title: "Speak first", instruction: "Initiate first in a social or group context.", steps: ["Identify one upcoming interaction.", "Deliver first contribution.", "Maintain composure through response."], why: "Going first builds leadership and confidence.", examples: ["Open a meeting", "Start group conversation"], minimum: "Initiate one interaction first.", insight: "Initiation behavior is a direct confidence signal." },
      { title: "Take one action despite discomfort", instruction: "Execute one mission-critical action while uncomfortable.", steps: ["Name one avoided action.", "Execute immediately in small form.", "Record completion and emotional outcome."], why: "Acting despite discomfort rewires self-trust.", examples: ["Hard message", "Difficult call"], minimum: "Execute the first 2 minutes of the avoided action.", insight: "Action under discomfort is the core confidence training stimulus." },
    ],
  },
};

const FALLBACK_PROTOCOL_DETAIL: TaskDetail = {
  instruction: "Run a focused 5-minute protocol on the selected objective.",
  steps: [
    "Define one clear output.",
    "Execute one focused block.",
    "Record one improvement for next run.",
  ],
  whyItMatters: "Maintains execution continuity when protocol metadata is missing.",
  insight: "Missing protocol metadata should be patched; execution still continues.",
  examples: ["Write for 5 minutes", "Run one drill", "Ship one micro-output"],
  minimumViable: "Do one focused 5-minute block.",
};

const warnedMissingProtocolTitles = new Set<string>();

const customQuestProtocol = (customQuestText: string): DailyQuest => ({
  id: 5,
  category: "Custom Quest",
  path: "custom",
  title: customQuestText || DEFAULT_CUSTOM_QUEST_TEXT,
  instruction: "Run your self-defined protocol with a clear outcome.",
  steps: [
    "Define one clear outcome for this protocol.",
    "Execute the first focused block (5-10 minutes).",
    "Remove one friction point and continue.",
    "Log execution and next adjustment.",
  ],
  why: "Personal targets keep momentum meaningful.",
  examples: ["Write 10 min", "Practice skill", "Ship one task"],
  minimum: "Do 5 focused minutes.",
  insight: "Define one measurable output before you start. Clear standards increase execution quality.",
});

const getProtocolDetailFromQuest = (quest: DailyQuest): TaskDetail => {
  if (hasStructuredQuestShape(quest)) {
    return {
      instruction: quest.instruction,
      steps: quest.steps,
      whyItMatters: quest.why,
      insight: quest.insight,
      examples: quest.examples,
      minimumViable: quest.minimum,
    };
  }
  const title = (quest as { title?: string; task?: string }).title ?? (quest as { task?: string }).task ?? "Unknown task";
  if (!warnedMissingProtocolTitles.has(title)) {
    warnedMissingProtocolTitles.add(title);
    console.warn(`[Ascend] Missing structured protocol metadata for "${title}". Reason: legacy or incomplete task object.`);
  }
  return FALLBACK_PROTOCOL_DETAIL;
};

const findTaskPoolEntryByTitle = (title: string): { category: CategoryKey; path: string; entry: TaskPoolEntry } | null => {
  for (const category of CATEGORY_ORDER) {
    for (const [path, entries] of Object.entries(taskPools[category])) {
      const match = entries.find((entry) => entry.title === title);
      if (match) return { category, path, entry: match };
    }
  }
  return null;
};

const LEGACY_TITLE_ALIAS: Record<string, string> = {
  "Spend 10 minutes learning": "Spend 15 minutes learning",
  "Make one positive social connection": "Reach out to someone you value",
};

const hydrateQuest = (quest: unknown, index: number): DailyQuest => {
  if (hasStructuredQuestShape(quest)) {
    return { ...quest, id: Number(quest.id ?? index + 1), task: quest.title };
  }

  const raw = (quest ?? {}) as Record<string, unknown>;
  const titleCandidate = typeof raw.title === "string" ? raw.title : typeof raw.task === "string" ? raw.task : "";
  const normalizedTitle = LEGACY_TITLE_ALIAS[titleCandidate] ?? titleCandidate;
  const found = findTaskPoolEntryByTitle(normalizedTitle);

  if (found) {
    return {
      id: Number(raw.id ?? index + 1),
      category: typeof raw.category === "string" ? raw.category : CATEGORY_LABELS[found.category],
      path: found.path,
      title: found.entry.title,
      instruction: found.entry.instruction,
      steps: found.entry.steps,
      why: found.entry.why,
      examples: found.entry.examples,
      minimum: found.entry.minimum,
      insight: found.entry.insight,
      task: found.entry.title,
    };
  }

  const fallbackTitle = titleCandidate || `Legacy protocol ${index + 1}`;
  console.warn(`[Ascend] Hydration fallback for "${fallbackTitle}". Reason: missing pool metadata.`);
  return {
    id: Number(raw.id ?? index + 1),
    category: typeof raw.category === "string" ? raw.category : "Unknown",
    path: "fallback",
    title: fallbackTitle,
    instruction: FALLBACK_PROTOCOL_DETAIL.instruction,
    steps: FALLBACK_PROTOCOL_DETAIL.steps,
    why: FALLBACK_PROTOCOL_DETAIL.whyItMatters,
    examples: FALLBACK_PROTOCOL_DETAIL.examples,
    minimum: FALLBACK_PROTOCOL_DETAIL.minimumViable,
    insight: FALLBACK_PROTOCOL_DETAIL.insight,
    task: fallbackTitle,
  };
};

const hydrateDailyQuests = (tasks: unknown): DailyQuest[] => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((quest, idx) => hydrateQuest(quest, idx));
};

const getLocalDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const dayDiff = (a: string, b: string) =>
  Math.floor((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

const getCurrentRank = (level: number) => {
  if (level >= 20) return "Black Belt";
  if (level >= 15) return "Brown Belt";
  if (level >= 10) return "Purple Belt";
  if (level >= 5) return "Blue Belt";
  return "White Belt";
};

const normalizeStoredPathSelections = (value: unknown): PathSelections | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const normalized: Partial<PathSelections> = {};

  for (const category of CATEGORY_ORDER) {
    const raw = record[category];
    if (raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).primary === "string") {
      const primary = (raw as Record<string, unknown>).primary as string;
      const migratedPrimary = LEGACY_PATH_ID_MIGRATION[primary] ?? primary;
      if (PATH_OPTIONS[category].some((option) => option.id === migratedPrimary)) {
        normalized[category] = migratedPrimary as PathId;
        continue;
      }
    }

    if (typeof raw === "string") {
      const migratedRaw = LEGACY_PATH_ID_MIGRATION[raw] ?? raw;
      if (PATH_OPTIONS[category].some((option) => option.id === migratedRaw)) {
        normalized[category] = migratedRaw as PathId;
        continue;
      }
    }
    
    if (typeof raw === "string" && PATH_OPTIONS[category].some((option) => option.id === raw)) {
      normalized[category] = raw as PathId;
      continue;
    }

    const legacyRaw = record[CATEGORY_LABELS[category]];
    if (typeof legacyRaw === "string") {
      const migratedLegacyLabel = LEGACY_PATH_LABEL_MIGRATION[legacyRaw] ?? legacyRaw;
      const match = PATH_OPTIONS[category].find((option) => option.label === migratedLegacyLabel);
      if (match) normalized[category] = match.id;
    }
  }

  if (CATEGORY_ORDER.every((category) => normalized[category])) {
    return normalized as PathSelections;
  }
  return null;
};

const coerceSelectionsForPlan = (selections: PathSelections, isProUser: boolean): PathSelections => {
  if (isProUser) return selections;
  return {
    physical: PRO_ONLY_PATH_IDS.physical.includes(selections.physical)
      ? DEFAULT_PATH_SELECTIONS.physical
      : selections.physical,
    mental: PRO_ONLY_PATH_IDS.mental.includes(selections.mental)
      ? DEFAULT_PATH_SELECTIONS.mental
      : selections.mental,
    social: PRO_ONLY_PATH_IDS.social.includes(selections.social)
      ? DEFAULT_PATH_SELECTIONS.social
      : selections.social,
  };
};

const createDailyQuests = (
  level: number,
  customQuestText: string,
  paths: PathSelections,
  dateKey: string,
  previous: DailyQuest[] = []
) => {
  const previousByCategory = new Map(
    previous.map((q) => [q.category, q.title ?? q.task ?? ""])
  );
  const base = CATEGORY_ORDER.map((category, idx) => {
    const selectedPath = paths[category];
    const pool = taskPools[category][selectedPath];
    const categoryLabel = CATEGORY_LABELS[category];
    const filtered = pool.filter((item) => item.title !== previousByCategory.get(categoryLabel));
    const candidates = filtered.length > 0 ? filtered : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      id: idx + 1,
      category: categoryLabel,
      path: selectedPath,
      title: chosen.title,
      instruction: chosen.instruction,
      steps: chosen.steps,
      why: chosen.why,
      examples: chosen.examples,
      minimum: chosen.minimum,
      insight: chosen.insight,
      task: chosen.title,
    };
  });
  const withMorning = level >= MORNING_ANCHOR_UNLOCK_LEVEL
    ? [
        ...base,
        {
          id: 4,
          category: "Morning Anchor",
          path: "system",
          title: "Complete your morning routine",
          instruction: "Execute your fixed morning sequence without skipping core steps.",
          steps: [
            "Run your first anchor action within 10 minutes of start.",
            "Complete your core morning sequence end-to-end.",
            "Confirm readiness and set first work target.",
          ],
          why: "A fixed morning routine stabilizes execution quality for the day.",
          examples: ["Hydration + mobility", "Planning + training prep", "Breathwork + planning"],
          minimum: "Execute one non-negotiable morning anchor step.",
          insight: "Morning structure reduces decision drag and improves first-hour output.",
          task: "Complete your morning routine",
        },
      ]
    : base;
  return level >= CUSTOM_QUEST_UNLOCK_LEVEL
    ? [...withMorning, customQuestProtocol(customQuestText)]
    : withMorning;
};

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyTaskId, setDailyTaskId] = useState<string | null>(null);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [customQuestText, setCustomQuestText] = useState(DEFAULT_CUSTOM_QUEST_TEXT);
  const [expandedQuestIds, setExpandedQuestIds] = useState<Record<number, boolean>>({});
  const [protocolStepChecks, setProtocolStepChecks] = useState<Record<number, boolean[]>>({});
  const [isReady, setIsReady] = useState(false);
  const [pathsVersion, setPathsVersion] = useState(0);
  const [pathSelections, setPathSelections] = useState<PathSelections | null>(null);
  const [pathXpState, setPathXpState] = useState<PathXpState>(createEmptyPathXpState());
  const [draftPathSelections, setDraftPathSelections] = useState<PathSelections>({
    ...DEFAULT_PATH_SELECTIONS_BY_CATEGORY,
  });
  const [isEditingPaths, setIsEditingPaths] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [needsPathSelection, setNeedsPathSelection] = useState(false);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Record<number, boolean>>({});
  const [recentlyCompletedPathGain, setRecentlyCompletedPathGain] = useState<Record<number, string>>({});
  const [hasShownFirstExecutionModal, setHasShownFirstExecutionModal] = useState(false);
  const [showFirstExecutionModal, setShowFirstExecutionModal] = useState(false);
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const [pendingPrePromptQuestId, setPendingPrePromptQuestId] = useState<number | null>(null);
  const [prePromptSatisfiedByQuest, setPrePromptSatisfiedByQuest] = useState<Record<number, boolean>>({});
  const [effectInputsByQuest, setEffectInputsByQuest] = useState<QuestEffectInputState>({});
  const [focusTimerSecondsByQuest, setFocusTimerSecondsByQuest] = useState<Record<number, number>>({});
  const [focusTimerRunningByQuest, setFocusTimerRunningByQuest] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const load = async () => {
      let selectedPaths: PathSelections | null = null;
      try {
        const hasCompletedOnboarding = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
        const hasShownFirstExecution = window.localStorage.getItem(FIRST_EXECUTION_STORAGE_KEY) === "true";
        const hasProAccess = window.localStorage.getItem(PRO_ACCESS_STORAGE_KEY) === "true";
        setIsProUser(hasProAccess);
        setHasShownFirstExecutionModal(hasShownFirstExecution);
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
          return;
        }
        setShowOnboarding(false);

        const stored = window.localStorage.getItem(PATH_STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          const normalizedSelections = normalizeStoredPathSelections(parsed);
          if (normalizedSelections) {
            const planSafeSelections = coerceSelectionsForPlan(normalizedSelections, hasProAccess);
            selectedPaths = planSafeSelections;
            setPathSelections(planSafeSelections);
            setDraftPathSelections(planSafeSelections);
            setNeedsPathSelection(false);
            const rawPathXp = window.localStorage.getItem(PATH_XP_STORAGE_KEY);
            const parsedPathXp = rawPathXp ? (JSON.parse(rawPathXp) as PathXpState) : createEmptyPathXpState();
            let normalizedPathXp: PathXpState = migratePathXpState(parsedPathXp);
            for (const category of CATEGORY_ORDER) {
              normalizedPathXp = ensurePathProgress(normalizedPathXp, category, normalizedSelections[category]);
            }
            setPathXpState(normalizedPathXp);
            window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(normalizedPathXp));
            const metrics = getSystemMetricsFromPathXp(normalizedPathXp);
            setTotalXP(metrics.totalXP);
            setLevel(metrics.level);
          } else {
            setNeedsPathSelection(true);
            setPathSelections(null);
            return;
          }
        } else {
          setNeedsPathSelection(true);
          setPathSelections(null);
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          return;
        }
        setUserId(user.id);
        const profile = await getOrCreateProfile(user.id);
        const today = getLocalDateKey();

        const { data: todayRow } = await supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        const { data: previousRows } = await supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .lt("date", today)
          .order("date", { ascending: false })
          .limit(1);
        const previous = previousRows?.[0];
        const previousTasks = hydrateDailyQuests(previous?.tasks);

        let nextStreak = profile.current_streak;
        if (previous) {
          const allDone = Array.isArray(previous.completed) && previous.completed.every(Boolean);
          const gap = dayDiff(previous.date as string, today);
          if (gap > 1 || !allDone) {
            nextStreak = 0;
          }
          await supabase.from("history").upsert({
            user_id: user.id,
            date: previous.date,
            xp_earned: (previous.completed as boolean[]).filter(Boolean).length * 10,
            completed_all: allDone,
            streak: allDone ? profile.current_streak : 0,
          });
        }

        if (todayRow) {
          const hydratedTodayTasks = hydrateDailyQuests(todayRow.tasks);
          setDailyTaskId(String(todayRow.id));
          setDailyQuests(hydratedTodayTasks);
          setCompleted((todayRow.completed as boolean[]) ?? []);
          if (JSON.stringify(hydratedTodayTasks) !== JSON.stringify(todayRow.tasks)) {
            await supabase.from("daily_tasks").update({ tasks: hydratedTodayTasks }).eq("id", todayRow.id);
          }
        } else {
          const generated = createDailyQuests(
            profile.level,
            customQuestText,
            selectedPaths ?? { ...DEFAULT_PATH_SELECTIONS_BY_CATEGORY },
            today,
            previousTasks
          );
          const initialCompleted = Array.from({ length: generated.length }, () => false);
          const { data: inserted } = await supabase
            .from("daily_tasks")
            .insert({ user_id: user.id, date: today, tasks: generated, completed: initialCompleted })
            .select("id")
            .single();
          setDailyTaskId(inserted?.id ? String(inserted.id) : null);
          setDailyQuests(generated);
          setCompleted(initialCompleted);
        }

        if (nextStreak !== profile.current_streak) {
          await supabase.from("profiles").update({ current_streak: nextStreak }).eq("id", user.id);
        }
        setCurrentStreak(nextStreak);
        setBestStreak(profile.best_streak);
      } finally {
        setIsReady(true);
      }
    };
    load();
  }, [pathsVersion]);

  useEffect(() => {
    if (!userId || !dailyTaskId || level < CUSTOM_QUEST_UNLOCK_LEVEL) {
      return;
    }
    setDailyQuests((prev) => {
      const next = prev.map((quest) =>
        quest.category === "Custom Quest"
          ? {
              ...quest,
              title: customQuestText || DEFAULT_CUSTOM_QUEST_TEXT,
              task: customQuestText || DEFAULT_CUSTOM_QUEST_TEXT,
            }
          : quest
      );
      supabase.from("daily_tasks").update({ tasks: next }).eq("id", dailyTaskId);
      return next;
    });
  }, [customQuestText, dailyTaskId, level, userId]);

  const xpInCurrentLevel = totalXP % 100;
  const levelProgressPercent = xpInCurrentLevel;
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };
  const getQuestCategoryKey = (quest: DailyQuest): CategoryKey | null =>
    CATEGORY_ORDER.find((category) => CATEGORY_LABELS[category] === quest.category) ?? null;
  const getQuestPathLevel = (quest: DailyQuest): number => {
    const categoryKey = getQuestCategoryKey(quest);
    if (!categoryKey) return 1;
    return pathXpState[categoryKey]?.[quest.path]?.level ?? 1;
  };
  const getActiveEffectsForQuest = (quest: DailyQuest): PathUnlock[] =>
    getActivePathUnlocks(quest.path, getQuestPathLevel(quest));
  const getEffectsByType = (quest: DailyQuest, effectType: PathUnlock["effectType"]) =>
    getActiveEffectsForQuest(quest).filter((unlock) => unlock.effectType === effectType);
  const getEffectInput = (questId: number, key: string) => effectInputsByQuest[questId]?.[key] ?? "";
  const setEffectInput = (questId: number, key: string, value: string) => {
    setEffectInputsByQuest((prev) => ({
      ...prev,
      [questId]: {
        ...(prev[questId] ?? {}),
        [key]: value,
      },
    }));
  };
  const getPromptFromConfig = (unlock: PathUnlock, fallback: string) =>
    typeof unlock.effectConfig.prompt === "string" ? unlock.effectConfig.prompt : fallback;
  const getTrackerFields = (unlock: PathUnlock): string[] => {
    const fields = unlock.effectConfig.fields;
    if (Array.isArray(fields)) {
      return fields.filter((value): value is string => typeof value === "string");
    }
    return ["Value"];
  };
  const getEnhancerSteps = (quest: DailyQuest): string[] =>
    getEffectsByType(quest, "protocol_enhancer")
      .map((unlock) => unlock.effectConfig.additionalStep)
      .filter((value): value is string => typeof value === "string");
  const hasAllRequiredPrePrompts = (quest: DailyQuest) => {
    const prompts = getEffectsByType(quest, "pre_protocol_prompt");
    return prompts.every((unlock) => {
      const key = `pre:${unlock.pathId}:${unlock.title}`;
      return Boolean(getEffectInput(quest.id, key).trim());
    });
  };
  const startFocusTimer = (questId: number) => {
    setFocusTimerSecondsByQuest((prev) => ({
      ...prev,
      [questId]: prev[questId] ?? 25 * 60,
    }));
    setFocusTimerRunningByQuest((prev) => ({ ...prev, [questId]: true }));
  };
  const pauseFocusTimer = (questId: number) => {
    setFocusTimerRunningByQuest((prev) => ({ ...prev, [questId]: false }));
  };
  const resetFocusTimer = (questId: number) => {
    setFocusTimerRunningByQuest((prev) => ({ ...prev, [questId]: false }));
    setFocusTimerSecondsByQuest((prev) => ({ ...prev, [questId]: 25 * 60 }));
  };

  useEffect(() => {
    const runningQuestIds = Object.keys(focusTimerRunningByQuest).filter(
      (questId) => focusTimerRunningByQuest[Number(questId)]
    );
    if (runningQuestIds.length === 0) return;
    const timer = window.setInterval(() => {
      setFocusTimerSecondsByQuest((prev) => {
        const next = { ...prev };
        for (const questId of runningQuestIds) {
          const key = Number(questId);
          const current = next[key] ?? 25 * 60;
          if (current <= 1) {
            next[key] = 0;
            setFocusTimerRunningByQuest((running) => ({ ...running, [key]: false }));
          } else {
            next[key] = current - 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusTimerRunningByQuest]);

  const handleComplete = async (idx: number) => {
    if (!userId || dailyTaskId === null || completed[idx]) return;
    const nextCompleted = [...completed];
    nextCompleted[idx] = true;
    setCompleted(nextCompleted);
    if (!hasShownFirstExecutionModal) {
      setHasShownFirstExecutionModal(true);
      setShowFirstExecutionModal(true);
      window.localStorage.setItem(FIRST_EXECUTION_STORAGE_KEY, "true");
    }
    const quest = dailyQuests[idx];
    const categoryKey = CATEGORY_ORDER.find((category) => CATEGORY_LABELS[category] === quest.category);
    const pathKey = quest.path;
    const questId = dailyQuests[idx]?.id;
    if (typeof questId === "number") {
      const pathLabel = categoryKey
        ? PATH_OPTIONS[categoryKey].find((option) => option.id === pathKey)?.label ?? pathKey
        : quest.path;
      setRecentlyCompletedIds((prev) => ({ ...prev, [questId]: true }));
      setRecentlyCompletedPathGain((prev) => ({ ...prev, [questId]: `+10 XP (${pathLabel})` }));
      window.setTimeout(() => {
        setRecentlyCompletedIds((prev) => ({ ...prev, [questId]: false }));
        setRecentlyCompletedPathGain((prev) => {
          const next = { ...prev };
          delete next[questId];
          return next;
        });
      }, 1200);
    }

    const nextTotalXP = totalXP + 10;
    const nextLevel = Math.floor(nextTotalXP / 100) + 1;
    if (categoryKey && pathKey) {
      setPathXpState((prev) => {
        const withPath = ensurePathProgress(prev, categoryKey, pathKey);
        const current = withPath[categoryKey][pathKey];
        const previousPathLevel = current.level;
        const updatedXp = current.xp + 10;
        const updatedLevel = getPathLevel(updatedXp);
        const nextState: PathXpState = {
          ...withPath,
          [categoryKey]: {
            ...withPath[categoryKey],
            [pathKey]: {
              xp: updatedXp,
              level: updatedLevel,
            },
          },
        };
        const newlyUnlocked = getNewlyUnlockedForLevel(pathKey, previousPathLevel, updatedLevel);
        if (newlyUnlocked.length > 0) {
          setUnlockNotification("New capability unlocked");
          window.setTimeout(() => setUnlockNotification(null), 2400);
        }
        window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(nextState));
        const metrics = getSystemMetricsFromPathXp(nextState);
        setTotalXP(metrics.totalXP);
        setLevel(metrics.level);
        return nextState;
      });
    } else {
      setTotalXP(nextTotalXP);
      setLevel(nextLevel);
    }

    await supabase.from("daily_tasks").update({ completed: nextCompleted }).eq("id", dailyTaskId);

    const allDone = nextCompleted.every(Boolean);
    if (allDone) {
      const nextStreak = currentStreak + 1;
      const nextBest = Math.max(bestStreak, nextStreak);
      setCurrentStreak(nextStreak);
      setBestStreak(nextBest);
      await supabase
        .from("profiles")
        .update({ current_streak: nextStreak, best_streak: nextBest })
        .eq("id", userId);
      await supabase.from("history").upsert({
        user_id: userId,
        date: getLocalDateKey(),
        xp_earned: nextCompleted.filter(Boolean).length * 10,
        completed_all: true,
        streak: nextStreak,
      });
    }
  };

  const toggleProtocol = (questId: number, stepCount: number) => {
    setExpandedQuestIds((prev) => {
      const nextOpen = !prev[questId];
      if (nextOpen) {
        setProtocolStepChecks((current) => {
          if (current[questId]) return current;
          return { ...current, [questId]: Array.from({ length: stepCount }, () => false) };
        });
      }
      return { ...prev, [questId]: nextOpen };
    });
  };
  const handleStartProtocol = (quest: DailyQuest, stepCount: number) => {
    const hasPrePromptEffects = getEffectsByType(quest, "pre_protocol_prompt").length > 0;
    if (hasPrePromptEffects && !prePromptSatisfiedByQuest[quest.id] && !expandedQuestIds[quest.id]) {
      setPendingPrePromptQuestId(quest.id);
      return;
    }
    toggleProtocol(quest.id, stepCount);
  };

  const toggleProtocolStep = (questId: number, stepIdx: number) => {
    setProtocolStepChecks((prev) => {
      const current = prev[questId] ?? [];
      const next = [...current];
      next[stepIdx] = !next[stepIdx];
      return { ...prev, [questId]: next };
    });
  };

  if (!isReady) return <LoadingScreen label="Loading daily protocol..." />;

  if (showOnboarding) {
    const isFinalStep = onboardingStep === ONBOARDING_STEPS.length - 1;
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
          <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/95 px-8 py-12 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              {ONBOARDING_STEPS[onboardingStep]}
            </h1>
            <button
              className="mx-auto mt-10 w-full max-w-sm rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white"
              onClick={() => {
                if (!isFinalStep) {
                  setOnboardingStep((step) => Math.min(step + 1, ONBOARDING_STEPS.length - 1));
                  return;
                }
                window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
                setShowOnboarding(false);
                setNeedsPathSelection(true);
              }}
            >
              {isFinalStep ? "Begin Ascending" : "Continue"}
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (needsPathSelection || isEditingPaths) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
          <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-50">
              {needsPathSelection ? "Select your system paths" : "Edit system paths"}
            </h1>
            <p className="mb-6 text-sm text-zinc-400">
              Select one active path per category.
            </p>
            {!isProUser && (
              <div className="mb-4 rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Ascend Pro</p>
                <p className="mt-1 text-xs text-zinc-400">Additional path layers and advanced system depth are locked.</p>
                <Link href="/pro" className="mt-2 inline-block text-xs text-zinc-200 hover:text-zinc-100">
                  Upgrade your system with Ascend Pro
                </Link>
              </div>
            )}
            <div className="space-y-4">
              {CATEGORY_ORDER.map((category) => (
                <div key={category}>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{CATEGORY_LABELS[category]}</label>
                  <div className="mt-2 space-y-2">
                    <select
                      value={draftPathSelections[category]}
                      onChange={(event) => {
                        const nextPrimary = event.target.value as PathId;
                        setDraftPathSelections((prev) => ({
                          ...prev,
                          [category]: nextPrimary,
                        }));
                      }}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                    >
                      {PATH_OPTIONS[category].map((option) => {
                        const isLocked = !isProUser && PRO_ONLY_PATH_IDS[category].includes(option.id);
                        return (
                          <option key={option.id} value={option.id} disabled={isLocked}>
                            {isLocked ? `${option.label} (Ascend Pro required)` : option.label}
                          </option>
                        );
                      })}
                    </select>
                    <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Locked Paths</p>
                      {PATH_OPTIONS[category]
                        .filter((path) => PRO_ONLY_PATH_IDS[category].includes(path.id))
                        .map((path) => (
                        <button
                          key={path.id}
                          type="button"
                          disabled
                          className="mt-1 w-full cursor-not-allowed rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-left text-xs text-zinc-500 opacity-75"
                        >
                          {path.label}
                        </button>
                      ))}
                      <p className="mt-2 text-[11px] text-zinc-500">Ascend Pro required</p>
                      <p className="text-[11px] text-zinc-500">Optimise your system</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              {!needsPathSelection && (
                <button
                  className="w-full rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-zinc-500"
                  onClick={() => {
                    setIsEditingPaths(false);
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                className="w-full rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white"
                onClick={() => {
                  const nextSelections = draftPathSelections;
                  const planSafeSelections = coerceSelectionsForPlan(nextSelections, isProUser);
                  window.localStorage.setItem(PATH_STORAGE_KEY, JSON.stringify(planSafeSelections));
                  setPathXpState((prev) => {
                    let next = { ...prev };
                    for (const category of CATEGORY_ORDER) {
                      next = ensurePathProgress(next, category, planSafeSelections[category]);
                    }
                    window.localStorage.setItem(PATH_XP_STORAGE_KEY, JSON.stringify(next));
                    const metrics = getSystemMetricsFromPathXp(next);
                    setTotalXP(metrics.totalXP);
                    setLevel(metrics.level);
                    return next;
                  });
                  setPathSelections(planSafeSelections);
                  setNeedsPathSelection(false);
                  setIsEditingPaths(false);
                  setIsReady(false);
                  setPathsVersion((v) => v + 1);
                }}
              >
                Save paths
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {showFirstExecutionModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700/90 bg-zinc-900/95 px-6 py-7 text-center shadow-[0_24px_80px_-40px_rgba(255,255,255,0.28)] transition-all duration-300">
            <p className="text-2xl font-semibold tracking-tight text-zinc-50">You executed your protocol.</p>
            <p className="mt-2 text-sm text-zinc-300">Most people wouldn’t.</p>
            <button
              className="mt-6 rounded-full border border-zinc-500 bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white"
              onClick={() => setShowFirstExecutionModal(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {unlockNotification && (
        <div className="fixed right-4 top-20 z-[65] rounded-full border border-zinc-700 bg-zinc-900/95 px-4 py-2 text-xs text-zinc-200 shadow-[0_12px_40px_-25px_rgba(255,255,255,0.35)]">
          {unlockNotification}
        </div>
      )}
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-50">Daily Protocol</h1>
          <p className="mb-4 text-sm text-zinc-400">Discipline through daily execution</p>
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-4">
            <p className="text-lg font-semibold tracking-tight text-zinc-100">You are building your system.</p>
            <p className="mt-1 text-sm text-zinc-400">Execute today. Refine tomorrow.</p>
            <div className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-300">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">System Status</p>
              <p className="mt-2">System Status: Active</p>
              <p>System Level: {level}</p>
              <p className="mt-1">Current Rank: {getCurrentRank(level)}</p>
            </div>
          </div>
          {pathSelections && (
            <div className="mb-5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Selected Paths</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                    {isProUser ? "Ascend Pro" : "Ascend Free"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300"
                    onClick={() => {
                      setDraftPathSelections(pathSelections);
                      setIsEditingPaths(true);
                    }}
                  >
                    Edit Paths
                  </button>
                  {!isProUser && (
                    <Link
                      href="/pro"
                      className="rounded-full border border-zinc-500 bg-zinc-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-900"
                    >
                      Ascend Pro
                    </Link>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-zinc-300">
                Physical: {PATH_OPTIONS.physical.find((option) => option.id === pathSelections.physical)?.label ?? "Strength Training"}
              </p>
              <p className="text-sm text-zinc-300">
                Mental: {PATH_OPTIONS.mental.find((option) => option.id === pathSelections.mental)?.label ?? "Learning"}
              </p>
              <p className="text-sm text-zinc-300">
                Social: {PATH_OPTIONS.social.find((option) => option.id === pathSelections.social)?.label ?? "Relationships"}
              </p>
              {!isProUser && (
                <p className="mt-2 text-xs text-zinc-500">Upgrade your system with Ascend Pro to unlock expanded path layers.</p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {CATEGORY_ORDER.map((category) => (
                  <button
                    key={`change-path-${category}`}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
                    onClick={() => setIsEditingPaths(true)}
                  >
                    Change Path: {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {pathSelections && (
            <div className="mb-5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Path Progression</p>
              <div className="mt-2 space-y-2">
                {CATEGORY_ORDER.map((category) => {
                  const pathId = pathSelections[category];
                  const progress = pathXpState[category]?.[pathId] ?? { xp: 0, level: 1 };
                  const label = PATH_OPTIONS[category].find((option) => option.id === pathId)?.label ?? pathId;
                  const xpInLevel = progress.xp % 100;
                  const xpToNextLevel = 100 - xpInLevel;
                  return (
                    <div key={`${category}-${pathId}`}>
                      <div className="flex items-center justify-between text-xs text-zinc-300">
                        <span>{CATEGORY_LABELS[category]} / {label}</span>
                        <span>Level {progress.level}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
                        <div className="h-full rounded-full bg-zinc-300" style={{ width: `${xpInLevel}%` }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Current XP: {progress.xp}</span>
                        <span>{xpToNextLevel} XP to Level {progress.level + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <ul className="flex flex-col gap-4">
            {dailyQuests.map((quest, idx) => {
              const details = getProtocolDetailFromQuest(quest);
              const isRecentlyCompleted = Boolean(recentlyCompletedIds[quest.id]);
              const stepChecks = protocolStepChecks[quest.id] ?? [];
              const stepsCompleted = stepChecks.filter(Boolean).length;
              const totalSteps = details.steps.length;
              const protocolProgressPercent =
                totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0;
              const isProtocolOpen = Boolean(expandedQuestIds[quest.id]);
              const prePromptEffects = getEffectsByType(quest, "pre_protocol_prompt");
              const postReflectionEffects = getEffectsByType(quest, "post_protocol_reflection");
              const inputTrackerEffects = getEffectsByType(quest, "input_tracker");
              const uiModifierEffects = getEffectsByType(quest, "ui_modifier");
              const enhancerSteps = getEnhancerSteps(quest);
              const renderedSteps = [...details.steps, ...enhancerSteps];
              const focusSeconds = focusTimerSecondsByQuest[quest.id] ?? 25 * 60;
              const focusRunning = Boolean(focusTimerRunningByQuest[quest.id]);
              return (
                <li
                  key={quest.id}
                  className={`rounded-xl border bg-zinc-800/75 px-4 py-4 transition-all duration-300 ${
                    isRecentlyCompleted
                      ? "border-zinc-500/90 shadow-[0_0_0_1px_rgba(212,212,216,0.25),0_12px_24px_-20px_rgba(255,255,255,0.35)]"
                      : "border-zinc-700/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{quest.category}</p>
                      <p className={`mt-1 text-sm ${completed[idx] ? "text-zinc-400 line-through" : "text-zinc-100"}`}>{quest.title}</p>
                      {isProtocolOpen && !completed[idx] && (
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Protocol in progress - {stepsCompleted}/{renderedSteps.length} steps executed
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-lg border border-emerald-300/25 bg-emerald-400/5 px-2.5 py-1.5 text-right transition-all duration-300 ${
                          isRecentlyCompleted
                            ? "translate-y-0 opacity-100"
                            : "pointer-events-none translate-y-1 opacity-0"
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                          Protocol executed
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-emerald-300">
                          {recentlyCompletedPathGain[quest.id] ?? "+10 XP"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-emerald-200/80">System integrity increasing</p>
                      </div>
                      <button
                        className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
                        onClick={() => handleStartProtocol(quest, renderedSteps.length)}
                      >
                        {expandedQuestIds[quest.id] ? "Hide protocol" : "Start Protocol"}
                      </button>
                      <button className="rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400" disabled={completed[idx]} onClick={() => handleComplete(idx)}>
                        {completed[idx] ? "Executed" : "Execute"}
                      </button>
                    </div>
                  </div>
                  {pendingPrePromptQuestId === quest.id && prePromptEffects.length > 0 && !expandedQuestIds[quest.id] && (
                    <div className="mt-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
                      <p className="text-xs text-zinc-300">Protocol setup</p>
                      <div className="mt-2 space-y-2">
                        {prePromptEffects.map((unlock) => {
                          const key = `pre:${unlock.pathId}:${unlock.title}`;
                          return (
                            <div key={key}>
                              <p className="text-[11px] text-zinc-400">{getPromptFromConfig(unlock, "Provide input")}</p>
                              <input
                                value={getEffectInput(quest.id, key)}
                                onChange={(event) => setEffectInput(quest.id, key, event.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="rounded-full border border-zinc-500 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400"
                          disabled={!hasAllRequiredPrePrompts(quest)}
                          onClick={() => {
                            setPendingPrePromptQuestId(null);
                            setPrePromptSatisfiedByQuest((prev) => ({ ...prev, [quest.id]: true }));
                            toggleProtocol(quest.id, renderedSteps.length);
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}
                  {expandedQuestIds[quest.id] && (
                    <div className="mt-4 border-t border-zinc-700/70 pt-4 text-sm text-zinc-300">
                      {prePromptEffects.map((unlock) => {
                        const key = `pre:${unlock.pathId}:${unlock.title}`;
                        const value = getEffectInput(quest.id, key);
                        if (!value) return null;
                        return (
                          <p key={key} className="mb-2 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                            {unlock.title}: {value}
                          </p>
                        );
                      })}
                      {uiModifierEffects.some(
                        (unlock) => typeof unlock.effectConfig.uiKind === "string" && unlock.effectConfig.uiKind === "focus_timer_25m"
                      ) && (
                        <div className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
                          <p className="text-xs text-zinc-300">Focus block timer (25 min)</p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-100">{formatDuration(focusSeconds)}</p>
                            <div className="flex items-center gap-2">
                              {focusRunning ? (
                                <button
                                  type="button"
                                  className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                                  onClick={() => pauseFocusTimer(quest.id)}
                                >
                                  Pause
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                                  onClick={() => startFocusTimer(quest.id)}
                                >
                                  Start
                                </button>
                              )}
                              <button
                                type="button"
                                className="rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                                onClick={() => resetFocusTimer(quest.id)}
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {uiModifierEffects
                        .map((unlock) => unlock.effectConfig.hint)
                        .filter((hint): hint is string => typeof hint === "string")
                        .map((hint) => (
                          <p key={hint} className="mb-2 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
                            {hint}
                          </p>
                        ))}
                      {inputTrackerEffects.map((unlock) => {
                        const fields = getTrackerFields(unlock);
                        const prefix = `tracker:${unlock.pathId}:${unlock.title}`;
                        return (
                          <div key={prefix} className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2">
                            <p className="text-xs text-zinc-300">
                              {getPromptFromConfig(unlock, `${unlock.title} tracker`)}
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {fields.map((field) => {
                                const fieldKey = `${prefix}:${field}`;
                                return (
                                  <input
                                    key={fieldKey}
                                    value={getEffectInput(quest.id, fieldKey)}
                                    onChange={(event) => setEffectInput(quest.id, fieldKey, event.target.value)}
                                    placeholder={field}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div className="mb-3 rounded-lg border border-zinc-700/80 bg-zinc-900/70 px-3 py-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Protocol progress</span>
                          <span>
                            {stepsCompleted}/{renderedSteps.length}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-300 transition-all duration-300"
                            style={{ width: `${protocolProgressPercent}%` }}
                          />
                        </div>
                      </div>
                      <p><span className="text-zinc-500">Execution:</span> {details.instruction}</p>
                      <div className="mt-3">
                        <p className="text-zinc-500">Step-by-step</p>
                        <ul className="mt-2 space-y-2">
                          {renderedSteps.map((step, stepIdx) => {
                            const checked = protocolStepChecks[quest.id]?.[stepIdx] ?? false;
                            return (
                              <li key={`${quest.id}-${stepIdx}`} className="flex items-start gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleProtocolStep(quest.id, stepIdx)}
                                  className={`mt-0.5 h-4 w-4 rounded border transition-colors ${
                                    checked
                                      ? "border-zinc-300 bg-zinc-200"
                                      : "border-zinc-600 bg-zinc-900"
                                  }`}
                                  aria-label={`Toggle step ${stepIdx + 1}`}
                                />
                                <span className={checked ? "text-zinc-500 line-through" : "text-zinc-300"}>
                                  {stepIdx + 1}. {step}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <p className="mt-3"><span className="text-zinc-500">Why it matters:</span> {details.whyItMatters}</p>
                      <p className="mt-2"><span className="text-zinc-500">Insight:</span> {details.insight}</p>
                      <p className="mt-2"><span className="text-zinc-500">Examples:</span> {details.examples.join(", ")}</p>
                      <p className="mt-2"><span className="text-zinc-500">Minimum viable:</span> {details.minimumViable}</p>
                    </div>
                  )}
                  {completed[idx] &&
                    postReflectionEffects.map((unlock) => {
                      const key = `reflect:${unlock.pathId}:${unlock.title}`;
                      return (
                        <div key={key} className="mt-3 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
                          <p className="text-xs text-zinc-300">{getPromptFromConfig(unlock, "Reflect on this protocol")}</p>
                          <textarea
                            value={getEffectInput(quest.id, key)}
                            onChange={(event) => setEffectInput(quest.id, key, event.target.value)}
                            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                            rows={3}
                          />
                        </div>
                      );
                    })}
                </li>
              );
            })}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Total XP</p><p className="mt-1 text-2xl font-semibold">{totalXP}</p></div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Level</p><p className="mt-1 text-2xl font-semibold">{level}</p></div>
          </div>
          <div className="mt-5 w-full rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400"><span>System progress to Level {level + 1}</span><span>{xpInCurrentLevel}/100 XP</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700"><div className="h-full rounded-full bg-zinc-300" style={{ width: `${levelProgressPercent}%` }} /></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Current Streak</p><p className="mt-1 text-2xl font-semibold">{currentStreak}</p></div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-3"><p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Best Streak</p><p className="mt-1 text-2xl font-semibold">{bestStreak}</p></div>
          </div>
          {level >= CUSTOM_QUEST_UNLOCK_LEVEL && (
            <div className="mt-3 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-4 py-4">
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Custom protocol text</label>
              <input value={customQuestText} onChange={(e) => setCustomQuestText(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500" />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}