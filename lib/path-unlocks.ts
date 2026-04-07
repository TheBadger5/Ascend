export type UnlockEffectType =
  | "pre_protocol_prompt"
  | "post_protocol_reflection"
  | "input_tracker"
  | "ui_modifier"
  | "protocol_enhancer";

export type PathUnlock = {
  title: string;
  levelRequirement: 3 | 5 | 7 | 10;
  pathId: string;
  effectType: UnlockEffectType;
  effectConfig: Record<string, unknown>;
};

const unlocks = (pathId: string, entries: Array<Omit<PathUnlock, "pathId">>): PathUnlock[] =>
  entries.map((entry) => ({ ...entry, pathId }));

export const PATH_UNLOCKS_BY_PATH: Record<string, PathUnlock[]> = {
  strength_training: unlocks("strength_training", [
    { levelRequirement: 3, title: "Movement Focus", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What lift are you focusing on today?" } },
    {
      levelRequirement: 5,
      title: "Progressive Overload Tracker",
      effectType: "input_tracker",
      effectConfig: { prompt: "Log sets", fields: ["Weight", "Reps"] },
    },
    { levelRequirement: 7, title: "Structured Sessions", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Select one template structure before executing sets." } },
    { levelRequirement: 10, title: "Deload Protocol", effectType: "ui_modifier", effectConfig: { hint: "If fatigue is high, reduce load by 10-20% and prioritize quality reps." } },
  ]),
  cardio_conditioning: unlocks("cardio_conditioning", [
    { levelRequirement: 3, title: "Zone 2 Awareness", effectType: "ui_modifier", effectConfig: { hint: "Work at an effort where you can still speak in short sentences." } },
    { levelRequirement: 5, title: "Interval Protocol", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Add one structured interval block after your base effort." } },
    { levelRequirement: 7, title: "Recovery Tracking", effectType: "post_protocol_reflection", effectConfig: { prompt: "How quickly did you recover after exertion?" } },
    { levelRequirement: 10, title: "Endurance Builder", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Extend total session time by a controlled 5-10 minutes." } },
  ]),
  martial_arts: unlocks("martial_arts", [
    { levelRequirement: 3, title: "Technique Focus", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What technique are you focusing on?" } },
    { levelRequirement: 5, title: "Flow Drilling", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Chain two movements into one continuous drill." } },
    { levelRequirement: 7, title: "Sparring Reflection", effectType: "post_protocol_reflection", effectConfig: { prompt: "What sequence worked best under pressure?" } },
    { levelRequirement: 10, title: "Game Planning", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What is your strategy focus for this session?" } },
  ]),
  learning_skill_acquisition: unlocks("learning_skill_acquisition", [
    { levelRequirement: 3, title: "Note System", effectType: "post_protocol_reflection", effectConfig: { prompt: "What did you learn?" } },
    { levelRequirement: 5, title: "Retention Protocol", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Recall and write one key point from memory." } },
    { levelRequirement: 7, title: "Teaching Method", effectType: "post_protocol_reflection", effectConfig: { prompt: "How would you explain this to someone else?" } },
    { levelRequirement: 10, title: "Skill Integration", effectType: "pre_protocol_prompt", effectConfig: { prompt: "Where will you apply this learning today?" } },
  ]),
  focus_deep_work: unlocks("focus_deep_work", [
    { levelRequirement: 3, title: "25-min Focus Blocks", effectType: "ui_modifier", effectConfig: { uiKind: "focus_timer_25m" } },
    { levelRequirement: 5, title: "Distraction Elimination", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What distraction will you remove before starting?" } },
    { levelRequirement: 7, title: "Deep Work Sessions", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Add one second deep-work block after this protocol." } },
    { levelRequirement: 10, title: "Flow State Training", effectType: "ui_modifier", effectConfig: { hint: "Protect your first 5 minutes: no switching, no notifications." } },
  ]),
  reflection_awareness: unlocks("reflection_awareness", [
    { levelRequirement: 3, title: "Daily Review", effectType: "post_protocol_reflection", effectConfig: { prompt: "What changed in your mindset today?" } },
    { levelRequirement: 5, title: "Pattern Recognition", effectType: "post_protocol_reflection", effectConfig: { prompt: "What pattern did you notice?" } },
    { levelRequirement: 7, title: "Behaviour Correction", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Define one behavior correction before ending protocol." } },
    { levelRequirement: 10, title: "Strategic Thinking", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What long-term outcome does this protocol support?" } },
  ]),
  communication: unlocks("communication", [
    { levelRequirement: 3, title: "Active Listening", effectType: "pre_protocol_prompt", effectConfig: { prompt: "Who will you focus on listening to?" } },
    { levelRequirement: 5, title: "Clear Expression", effectType: "protocol_enhancer", effectConfig: { additionalStep: "State your core message in one sentence first." } },
    { levelRequirement: 7, title: "Influence Skills", effectType: "post_protocol_reflection", effectConfig: { prompt: "What response did your communication create?" } },
    { levelRequirement: 10, title: "Persuasion Frameworks", effectType: "ui_modifier", effectConfig: { hint: "Frame message: context -> value -> clear ask." } },
  ]),
  relationships: unlocks("relationships", [
    { levelRequirement: 3, title: "Consistency Check-ins", effectType: "ui_modifier", effectConfig: { hint: "Schedule the next check-in immediately after a quality interaction." } },
    { levelRequirement: 5, title: "Quality Time Planning", effectType: "pre_protocol_prompt", effectConfig: { prompt: "Who will you prioritize for quality time this week?" } },
    { levelRequirement: 7, title: "Conflict Resolution", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Define one boundary or repair action." } },
    { levelRequirement: 10, title: "Relationship Strategy", effectType: "post_protocol_reflection", effectConfig: { prompt: "What relationship move matters most next?" } },
  ]),
  confidence_exposure: unlocks("confidence_exposure", [
    { levelRequirement: 3, title: "Small Exposure", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What uncomfortable action will you take?" } },
    { levelRequirement: 5, title: "Social Reps", effectType: "input_tracker", effectConfig: { prompt: "Log social reps", fields: ["Attempts", "Completions"] } },
    { levelRequirement: 7, title: "Discomfort Training", effectType: "post_protocol_reflection", effectConfig: { prompt: "How did you respond under discomfort?" } },
    { levelRequirement: 10, title: "Bold Action Protocol", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Execute one bold action immediately after this protocol." } },
  ]),
  nutrition: unlocks("nutrition", [
    { levelRequirement: 3, title: "Protein Target Awareness", effectType: "input_tracker", effectConfig: { prompt: "Log intake", fields: ["Protein grams", "Meals completed"] } },
    { levelRequirement: 5, title: "Meal Structuring", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What is your meal structure for today?" } },
    { levelRequirement: 7, title: "Anti-Inflammatory Protocol", effectType: "ui_modifier", effectConfig: { hint: "Prioritize minimally processed foods and hydration." } },
    { levelRequirement: 10, title: "Performance Nutrition", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Align meal timing with your highest output block." } },
  ]),
  sleep_recovery: unlocks("sleep_recovery", [
    { levelRequirement: 3, title: "Sleep Window", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What time will you sleep tonight?" } },
    { levelRequirement: 5, title: "Pre-Sleep Protocol", effectType: "protocol_enhancer", effectConfig: { additionalStep: "Run a 10-minute wind-down before lights out." } },
    { levelRequirement: 7, title: "Recovery Awareness", effectType: "post_protocol_reflection", effectConfig: { prompt: "How recovered do you feel this morning?" } },
    { levelRequirement: 10, title: "Deep Recovery System", effectType: "ui_modifier", effectConfig: { hint: "Protect sleep consistency for at least 5 nights this week." } },
  ]),
  financial_mastery: unlocks("financial_mastery", [
    { levelRequirement: 3, title: "Spending Awareness", effectType: "input_tracker", effectConfig: { prompt: "Log spending", fields: ["Amount", "Category"] } },
    { levelRequirement: 5, title: "Budget System", effectType: "post_protocol_reflection", effectConfig: { prompt: "Where did your spending drift from plan?" } },
    { levelRequirement: 7, title: "Income Expansion", effectType: "pre_protocol_prompt", effectConfig: { prompt: "What income lever will you advance today?" } },
    { levelRequirement: 10, title: "Financial Strategy", effectType: "ui_modifier", effectConfig: { hint: "Review weekly: cash flow, reserves, and next strategic move." } },
  ]),
};

export const getPathUnlocks = (pathId: string): PathUnlock[] => PATH_UNLOCKS_BY_PATH[pathId] ?? [];

export const getNewlyUnlockedForLevel = (pathId: string, previousLevel: number, nextLevel: number): PathUnlock[] =>
  getPathUnlocks(pathId).filter(
    (unlock) => unlock.levelRequirement > previousLevel && unlock.levelRequirement <= nextLevel
  );

export const getActivePathUnlocks = (pathId: string, level: number): PathUnlock[] =>
  getPathUnlocks(pathId).filter((unlock) => level >= unlock.levelRequirement);
