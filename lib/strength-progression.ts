/**
 * Strength Training path: belt tiers by path level (XP-derived level per path).
 * White 1–2, Blue 3–5, Purple 6–8, Brown 9–12, Black 13+
 *
 * Every pool entry is written as an exact prescription: named exercises, sets × reps,
 * and rest or tempo so users know precisely what to execute.
 *
 * Each task has a `focus` for the weekly split — see `lib/weekly-training.ts`.
 */

import type { TrainingDayFocus } from "./weekly-training";

export type StrengthBeltId = "white" | "blue" | "purple" | "brown" | "black";

export const STRENGTH_BELT_LABELS: Record<StrengthBeltId, string> = {
  white: "White Belt",
  blue: "Blue Belt",
  purple: "Purple Belt",
  brown: "Brown Belt",
  black: "Black Belt",
};

export type StrengthTaskPoolEntry = {
  /** Aligns with the day’s role in the weekly split (lower / upper / full / recovery / rest / optional). */
  focus: TrainingDayFocus;
  /** Advanced prescriptions—hidden until this strength level (pool falls back if none match). */
  minStrengthLevel?: number;
  title: string;
  instruction: string;
  steps: string[];
  why: string;
  examples: string[];
  minimum: string;
  insight: string;
};

export function getStrengthBeltFromPathLevel(level: number): StrengthBeltId {
  if (level <= 2) return "white";
  if (level <= 5) return "blue";
  if (level <= 8) return "purple";
  if (level <= 12) return "brown";
  return "black";
}

/** Beginner: bodyweight and light loads, simple fixed circuits */
const white: StrengthTaskPoolEntry[] = [
  {
    focus: "full",
    title: "Goblet squat + push-up: 3×10 each",
    instruction:
      "Two movements, fixed reps. Use one dumbbell or kettlebell held at the chest for goblets; floor or incline for push-ups.",
    steps: [
      "Goblet squat: 3 sets × 10 reps. Rest 90 seconds between sets.",
      "Push-up: 3 sets × 10 reps (incline or knee push-up if needed). Rest 90 seconds between sets.",
      "Complete all squat sets, then all push-up sets. Track one form cue that stayed consistent.",
    ],
    why: "Fixed sets and reps remove guesswork—you always know when the work is done.",
    examples: ["15–35 lb goblet", "Hands on a bench for incline push-ups"],
    minimum: "Finish 3×10 on both movements with controlled reps.",
    insight: "If the last 2 reps of either move fall apart, use an easier push-up height or a lighter goblet next time.",
  },
  {
    focus: "lower",
    title: "Bodyweight squat: 3×12, tempo 3-1-0",
    instruction: "Slow eccentrics and a pause in the hole. No added load—position first.",
    steps: [
      "Bodyweight squat: 3 sets × 12 reps.",
      "Tempo each rep: 3 seconds down, 1 second pause at the bottom, stand up with control (count 3-1-0).",
      "Rest 90 seconds between sets. Stop the set if knees or back lose a neutral pattern.",
    ],
    why: "Tempo and volume teach depth and consistency before you add weight.",
    examples: ["Hold a 5 lb plate counterweight in front", "Box or chair touch for depth"],
    minimum: "Complete all 36 reps at the prescribed tempo.",
    insight: "When 3×12 at this tempo feels easy, you are ready for goblets or a bar in the next phase.",
  },
  {
    focus: "lower",
    title: "Inverted row + reverse lunge: 3 rounds",
    instruction: "Horizontal pull plus single-leg work. Alternate one pull set with one lunge set until three rounds are done.",
    steps: [
      "Inverted row (bar, rings, or TRX): 3 sets × 8 reps. Rest 60 seconds.",
      "Reverse lunge (bodyweight): 3 sets × 8 reps per leg. Rest 90 seconds between lunge sets.",
      "Order: row set 1 → lunge set 1 → row set 2 → lunge set 2 → row set 3 → lunge set 3.",
    ],
    why: "You train pull, legs, and balance in one session with a clear sequence.",
    examples: ["Bar at hip height for rows", "Static split squat if balance is shaky"],
    minimum: "Complete 3×8 rows and 3×8 per leg for lunges.",
    insight: "If one leg always finishes harder, note it—unilateral work exposes asymmetry early.",
  },
  {
    focus: "lower",
    title: "Kettlebell RDL + forearm plank: 3 supersets",
    instruction: "Light hinge pattern plus anti-extension core. Use two light dumbbells or one kettlebell for RDLs.",
    steps: [
      "Romanian deadlift (KB or two DBs): 3 sets × 10 reps. Hinge only—soft knees, vertical shins. Rest 60 seconds.",
      "Forearm plank: 3 sets × 30–45 seconds. Rest 90 seconds before the next RDL set.",
      "Repeat for 3 full supersets (RDL then plank each round).",
    ],
    why: "A crisp hinge and a stiff plank protect the spine when loads go up later.",
    examples: ["10–25 lb per hand", "Knees down plank to shorten lever if needed"],
    minimum: "3×10 RDLs and 3 plank holds at your chosen duration.",
    insight: "Low-back pull during RDLs means reduce load or range until you feel hamstrings and glutes.",
  },
  {
    focus: "rest_light",
    title: "Recovery: 12 min walk + mobility triplet",
    instruction: "No heavy lifting. Low intensity movement plus two mobility drills with fixed reps.",
    steps: [
      "Brisk walk: 12 minutes continuous, conversational pace.",
      "Ankle rocks (knee over toe, hands on wall): 2 sets × 10 per side.",
      "Cossack squat to a comfortable depth: 2 sets × 6 per side; use a light counterweight if needed.",
    ],
    why: "Recovery sessions make your hard days repeatable without adding joint stress.",
    examples: ["Flat supportive shoes for the walk", "Heel plate for ankle rocks"],
    minimum: "Complete the walk plus both mobility blocks.",
    insight: "Treat this like training—same focus as lifting days, just lighter.",
  },
  {
    focus: "upper",
    title: "Push-up + inverted row: 4×10 + 4×8",
    instruction: "Upper-body push and pull. Keep shoulders down and ribs stacked on rows.",
    steps: [
      "Push-up: 4 sets × 10 reps. Rest 60 seconds.",
      "Inverted row: 4 sets × 8 reps. Rest 90 seconds.",
      "Alternate: push-up set 1, row set 1, repeat until all sets are done.",
    ],
    why: "A simple upper split you can run anywhere with a bar or rings.",
    examples: ["Incline push-up if needed", "Rings at belly button height"],
    minimum: "All push-up and row sets completed.",
    insight: "If rows are easy but push-ups fail, elevate hands or add a light backpack row next time.",
  },
  {
    focus: "rest",
    title: "Rest day: optional easy walk",
    instruction: "No lifting today. Recovery is part of the program.",
    steps: [
      "Skip structured strength work entirely, or take a 10–20 minute easy walk if you want to move.",
      "Sleep, hydration, and protein matter more than extra reps today.",
      "Note that you honored the rest day—consistency beats hero days.",
    ],
    why: "Scheduled rest lets Tuesday and Friday sessions hit harder.",
    examples: ["Flat walk outside", "Light stretching only if it feels good"],
    minimum: "Complete the day without a heavy training session.",
    insight: "Rest days are when adaptation happens—treat them as seriously as squats.",
  },
  {
    focus: "optional",
    title: "Optional: light full-body primer (20 min cap)",
    instruction: "Only if you feel fresh—otherwise skip with zero guilt.",
    steps: [
      "Goblet squat: 2 sets × 10 reps, light load.",
      "Push-up: 2 sets × 8 reps.",
      "Inverted row: 2 sets × 8 reps.",
      "Stop at 20 minutes total including warm-up—no extra sets.",
    ],
    why: "Saturday is optional volume for people who recover fast; everyone else rests.",
    examples: ["Half the weight you’d use on Monday", "Stop if HR stays elevated"],
    minimum: "Either skip entirely or finish the short primer without adding work.",
    insight: "Optional means optional—if you’re tired, the best session is none.",
  },
];

/** Intermediate: added load, compounds, supersets, tempo */
const blue: StrengthTaskPoolEntry[] = [
  {
    focus: "full",
    title: "Back squat 4×6 + barbell row 3×8",
    instruction: "One primary squat and one primary horizontal pull. Percentages are guides—use RPE if you do not know your max.",
    steps: [
      "Back squat: 4 sets × 6 reps @ roughly RPE 7–8 (you could do 2 more good reps if forced). Rest 3 minutes between sets.",
      "Barbell row (Pendlay, bent-over, or chest-supported): 3 sets × 8 reps @ RPE 7–8. Rest 2 minutes between sets.",
      "Complete all squat sets before rows. Log loads for every set.",
    ],
    why: "Written sets × reps turn the session into a checklist you can repeat next week.",
    examples: ["High-bar or low-bar squat", "Chest-supported row if low back is tired"],
    minimum: "All 4 squat sets and 3 row sets completed as prescribed.",
    insight: "If set 4 of squats is a grinder, you overshot RPE 7–8—start lighter next session.",
  },
  {
    focus: "full",
    title: "DB bench 3×10 + goblet squat 3×10 superset",
    instruction: "Pair upper push with legs. Use the same dumbbells for goblets if possible, or one heavier DB held vertically.",
    steps: [
      "Dumbbell bench press: 3 sets × 10 reps. Rest 90 seconds.",
      "Goblet squat: 3 sets × 10 reps with a single dumbbell or kettlebell at the chest.",
      "Run as supersets: bench set 1 → squat set 1 → rest 2 minutes → repeat for 3 rounds.",
    ],
    why: "Supersets build work capacity while keeping each movement’s reps explicit.",
    examples: ["25–40 lb DBs per hand for bench", "35–50 lb goblet"],
    minimum: "3 rounds of 10 bench and 10 goblet squats.",
    insight: "If the squat fails before the bench, use a lighter goblet or split the superset into straight sets once.",
  },
  {
    focus: "lower",
    title: "Back squat tempo 3×6 (3-0-1)",
    instruction: "Controlled lowering, no pause at the bottom, controlled up. One lift, one tempo—full focus.",
    steps: [
      "Back squat: 3 sets × 6 reps with tempo 3-0-1 (3 sec eccentric, no pause, 1 sec concentric).",
      "Use approximately 70–75% of your best crisp 5-rep weight, or a load that lands at RPE 7 for 6 reps.",
      "Rest 3 minutes between sets. Stop if you cannot hold the tempo.",
    ],
    why: "Tempo forces honest positions and shows weak ranges immediately.",
    examples: ["Safety bar if shoulders are tight", "Pause 1 sec in the hole if 3-0-1 is easy"],
    minimum: "3×6 at the prescribed tempo with the same load all sets.",
    insight: "Tempo work is a diagnostic: if rep 4–6 collapse, the weight or depth was too ambitious.",
  },
  {
    focus: "full",
    title: "Tri-set: leg curl 3×12 + face pull 3×15 + plank 3×45s",
    instruction: "Hamstrings, upper back, core in sequence. Minimal rest inside the tri-set; full rest between rounds.",
    steps: [
      "Leg curl (machine or band): 12 reps.",
      "Face pull or band pull-apart: 15 reps.",
      "Front plank: 45 seconds (or 30 if 45 is too long).",
      "Rest 2 minutes. Repeat for 3 total rounds.",
    ],
    why: "Accessories fix weak links with fixed volume—no guessing how much is ‘enough’.",
    examples: ["Nordic curl eccentric lowers if no machine", "Rope to face height on face pulls"],
    minimum: "3 complete rounds at the target reps and plank time.",
    insight: "These should feel like precision work, not failure—leave 1–2 reps in reserve on curls and pulls.",
  },
  {
    focus: "lower",
    title: "Volume squat: 5×5 @ ~70–75%",
    instruction: "Same weight for all five sets. Classic accumulation work—bar speed should stay similar across sets.",
    steps: [
      "Back squat or safety bar squat: 5 sets × 5 reps.",
      "Choose a load around 70–75% of a recent 1RM or a weight that feels like RPE 7 on set 1.",
      "Rest 3–4 minutes between sets. If any set hits RPE 9+, reduce load for the remaining sets.",
    ],
    why: "Repeated perfect fives build the base for heavier phases without maxing out.",
    examples: ["High-bar for quad bias", "Low-bar if that is your competition style"],
    minimum: "Five sets of five at a sustainable load with no missed reps.",
    insight: "Boring identical sets week to week are how intermediates become advanced lifters.",
  },
  {
    focus: "upper",
    title: "Overhead press + chest-supported row: 4×6 + 3×10",
    instruction: "Strict press and horizontal pull—no leg drive on the press.",
    steps: [
      "Standing barbell or dumbbell overhead press: 4 sets × 6 reps @ RPE 7–8. Rest 2–3 minutes.",
      "Chest-supported row: 3 sets × 10 reps @ RPE 7–8. Rest 2 minutes.",
      "Complete all press sets, then all row sets.",
    ],
    why: "Dedicated upper days keep volume high without squatting again.",
    examples: ["Seated DB OHP if shoulders need it", "1-arm DB row if no chest-supported bench"],
    minimum: "All press and row sets completed.",
    insight: "If the press stalls, check glutes and abs—ribs down fixes a lot.",
  },
  {
    focus: "rest",
    title: "Rest day: optional easy walk",
    instruction: "No lifting today. Recovery is part of the program.",
    steps: [
      "Skip structured strength work entirely, or take a 10–20 minute easy walk if you want to move.",
      "Sleep, hydration, and protein matter more than extra reps today.",
      "Note that you honored the rest day—consistency beats hero days.",
    ],
    why: "Scheduled rest lets Tuesday and Friday sessions hit harder.",
    examples: ["Flat walk outside", "Light stretching only if it feels good"],
    minimum: "Complete the day without a heavy training session.",
    insight: "Rest days are when adaptation happens—treat them as seriously as squats.",
  },
  {
    focus: "optional",
    title: "Optional: accessory-only session (25 min cap)",
    instruction: "Extra work only if you feel fresh—otherwise skip.",
    steps: [
      "Face pull or band pull-apart: 3 sets × 15.",
      "Leg curl or Nordic eccentric: 3 sets × 10.",
      "Plank: 3 sets × 45 seconds.",
      "Stop at 25 minutes—no main compound lifts.",
    ],
    why: "Saturday adds small weak-link work without a second heavy day.",
    examples: ["Light loads only", "Stop if you feel systemic fatigue"],
    minimum: "Either skip entirely or finish the cap without adding work.",
    insight: "Optional means optional—if you’re tired, the best session is none.",
  },
];

/** Advanced: heavier work, clusters, weak-point blocks, finishers */
const purple: StrengthTaskPoolEntry[] = [
  {
    focus: "lower",
    minStrengthLevel: 7,
    title: "Squat: heavy double + backoff 3×5",
    instruction: "Brief peak intensity, then volume at a reduced load. Same day, clear numbers.",
    steps: [
      "Back squat: build to 1 heavy double @ RPE 8–9 (not an all-out max).",
      "Reduce the bar 12–15% from your heaviest double; complete 3 sets × 5 reps.",
      "Rest 3–4 minutes before doubles; 2–3 minutes between backoff sets.",
    ],
    why: "Contrasting a heavy double with backoff volume trains both intent and work capacity.",
    examples: ["High-bar or low-bar", "Belt optional but consistent across sets"],
    minimum: "One heavy double plus all 3×5 backoff sets at the planned reduction.",
    insight: "If backoff sets grind, the double was too heavy or the drop was too small.",
  },
  {
    focus: "upper",
    minStrengthLevel: 7,
    title: "Pause bench 4×4 + pin press 3×3",
    instruction: "Off-chest strength plus overload in the hardest range. Set pins just above sticking point.",
    steps: [
      "Bench press: 4 sets × 4 reps with a 1-second pause on the chest each rep @ RPE 8. Rest 3 minutes.",
      "Pin press from just off chest: 3 sets × 3 reps @ RPE 8–9. Rest 3 minutes.",
    ],
    why: "Pauses and pins attack weak ranges with measurable sets and reps.",
    examples: ["Competition grip on pause bench", "Close or wide pin height to match your stall"],
    minimum: "All pause sets and all pin sets completed.",
    insight: "If the pin press beats your competition bench by a huge margin, your weakness is mid-range or lockout—not off the chest.",
  },
  {
    focus: "lower",
    minStrengthLevel: 7,
    title: "Deadlift clusters: 4×(2+2+2) @ ~85–90% of 5RM",
    instruction: "Mini-sets of 2 with short intra-set rest. Stop when bar speed drops clearly.",
    steps: [
      "Warm up to a working weight around 85–90% of your best crisp 5-rep deadlift.",
      "Cluster: perform 2 reps, rack or reset, rest 20 seconds, 2 reps, rest 20 seconds, 2 reps—that is one cluster.",
      "Rest 3–4 minutes between clusters. Complete 4 clusters total. Reduce weight if rep 2 of any mini-set slows badly.",
    ],
    why: "Clusters stack quality reps at loads that usually fail in one straight set.",
    examples: ["Conventional or sumo—stick to one style for the day", "Mixed or hook grip—stay consistent"],
    minimum: "Four full clusters at a load you can move with intent on every rep.",
    insight: "Clusters are a tool—not every session—use when sleep and readiness are solid.",
  },
  {
    focus: "lower",
    title: "Bulgarian split squat: 4×8 per leg",
    instruction: "Rear-foot elevated split squat with dumbbells. Match reps left and right within one rep.",
    steps: [
      "Set rear foot on a bench 12–18 inches high; hold dumbbells at sides.",
      "4 sets × 8 reps per leg. Rest 90 seconds between legs; 2 minutes between rounds.",
      "Complete all sets for the weaker leg first if you know which it is; otherwise alternate lead leg each session.",
    ],
    why: "Heavy unilateral work exposes asymmetry before it becomes a limiter under a barbell.",
    examples: ["Front-foot 12–24 inch stride", "Goblet-only if balance limits load"],
    minimum: "4×8 each leg with matched depth and no collapsing forward.",
    insight: "If one side needs 2 fewer reps, note it and keep loads equal until it catches up.",
  },
  {
    focus: "full",
    title: "Finisher: sled push + farmer carry",
    instruction: "Short conditioning block after main work. Fixed distances and rounds—no AMRAP.",
    steps: [
      "Sled push: 6 × 20 meters, heavy but smooth steps, 60 seconds rest between pushes.",
      "Farmer carry: 4 × 40 meters with the same handles or DBs, 90 seconds rest.",
      "Cap total time at 12 minutes including rest—if you run over, reduce weight next time.",
    ],
    why: "Aerobic capacity and grip support recovery between heavy sets on other days.",
    examples: ["Low handles on sled if available", "Fat grips optional on carries"],
    minimum: "All sled lengths and all carry lengths completed.",
    insight: "This should not leave you wrecked—stop before technique turns into a stumble.",
  },
  {
    focus: "rest",
    title: "Rest day: optional easy walk",
    instruction: "No lifting today. Recovery is part of the program.",
    steps: [
      "Skip structured strength work entirely, or take a 10–20 minute easy walk if you want to move.",
      "Sleep, hydration, and protein matter more than extra reps today.",
      "Note that you honored the rest day—consistency beats hero days.",
    ],
    why: "Scheduled rest lets Tuesday and Friday sessions hit harder.",
    examples: ["Flat walk outside", "Light stretching only if it feels good"],
    minimum: "Complete the day without a heavy training session.",
    insight: "Rest days are when adaptation happens—treat them as seriously as squats.",
  },
  {
    focus: "optional",
    title: "Optional: arms + core finisher (20 min cap)",
    instruction: "Extra work only if you feel fresh—otherwise skip.",
    steps: [
      "Triceps pushdown or skull crusher: 3 sets × 12 @ RPE 7.",
      "Hammer curl: 3 sets × 12.",
      "Dead bug or Pallof press: 3 sets × 10 per side.",
      "Cap at 20 minutes—no squat or deadlift.",
    ],
    why: "Saturday adds small volume without a second leg day.",
    examples: ["Cable or band", "Stop if elbows ache"],
    minimum: "Either skip entirely or finish within the cap.",
    insight: "Optional means optional—if you’re tired, the best session is none.",
  },
];

/** High intermediate: waves, variations, heavy singles, volume PRs, deloads */
const brown: StrengthTaskPoolEntry[] = [
  {
    focus: "lower",
    minStrengthLevel: 10,
    title: "Squat waves: 3 / 1 / 3 @ RPE 8–8.5",
    instruction: "Two waves of triple–single–triple. Add a small amount of weight on wave 2 only if bar speed held.",
    steps: [
      "Wave 1: 3 reps @ RPE 8 → rest 3 min → 1 rep @ RPE 8.5 → rest 3 min → 3 reps @ RPE 8.",
      "Rest 4 minutes after the wave. Wave 2: add 2.5–5 lb total and repeat the same 3/1/3 structure.",
      "Stop after two waves if any rep slows dramatically compared to the first rep of that set.",
    ],
    why: "Wave loading varies intensity within one session to break plateaus without random maxing.",
    examples: ["High-bar or low-bar", "Belt and sleeves same as in competition prep"],
    minimum: "At least one full wave completed with technical standards held.",
    insight: "Fresh waves feel fast; tired waves feel slow—use speed as your governor.",
  },
  {
    focus: "lower",
    minStrengthLevel: 10,
    title: "Block pull 3×3 + deadlift from floor 2×2",
    instruction: "Overload the lockout and mid-range, then pull from the floor at a slightly lower intensity.",
    steps: [
      "Block or rack pull (bar just below knee): 3 sets × 3 reps @ RPE 8–9. Rest 3–4 minutes.",
      "Deadlift from floor (same stance): 2 sets × 2 reps @ RPE 8. Rest 3–4 minutes.",
    ],
    why: "Variations build strength at weak ranges without maxing the competition lift every week.",
    examples: ["Conventional or sumo to match your competition pull", "Straps on block pulls if grip is the limiter"],
    minimum: "All block sets and both floor doubles completed.",
    insight: "If floor doubles feel harder than block triples, you may need more speed or leg drive off the floor.",
  },
  {
    focus: "lower",
    title: "Squat: 1 heavy single @ RPE 8–8.5 (technical)",
    instruction: "One top single—not a meet attempt. Film from the side; bar must stay over mid-foot.",
    steps: [
      "Build in small jumps to one heavy single @ RPE 8–8.5 (could maybe do one more rep at that load with perfect form—don’t test it).",
      "Review video: knees track over toes, depth consistent with training standard.",
      "Optional back-off: 2 sets × 3 reps @ 80–85% of the single, 3 min rest.",
    ],
    why: "Heavy singles teach setup and tension under max load without grinding ugly reps.",
    examples: ["Walk-out and breathing identical to competition", "Safety bar if shoulder limits low-bar"],
    minimum: "One heavy single with acceptable form by your own standard.",
    insight: "A slow, ugly single is data—lower the target next time instead of repeating it.",
  },
  {
    focus: "upper",
    minStrengthLevel: 10,
    title: "Bench volume PR: 6×4 @ ~78–82%",
    instruction: "Beat last week’s total tonnage (weight × reps) or add the smallest jump in load with all reps clean.",
    steps: [
      "Bench press: 6 sets × 4 reps at approximately 78–82% of recent 1RM or RPE 8 on set 1.",
      "Rest 3 minutes between sets. Same weight all sets unless you miss reps—then reduce and note it.",
      "Log total pounds lifted (load × 24 reps) and compare to last exposure.",
    ],
    why: "Volume PRs build capacity without the injury risk of daily max singles.",
    examples: ["Competition pause or touch-and-go—pick one and keep it for all 6 sets", "Spotter for last 2 sets if needed"],
    minimum: "All 24 reps completed at one working weight.",
    insight: "Brown belt progress is trend lines on volume and load, not one good day.",
  },
  {
    focus: "lower",
    title: "Deload squat: 6×2 @ 50–60% speed reps",
    instruction: "Light load, explosive intent. No grinding—practice the positions you use heavy.",
    steps: [
      "Back squat: 6 sets × 2 reps at 50–60% of your recent best heavy single or 5-rep session top set.",
      "Move the concentric as fast as possible with control; 2 minutes rest.",
      "No additional heavy work this session.",
    ],
    why: "Deloads consolidate gains and keep patterns fresh while fatigue drops.",
    examples: ["Same stance and bar position as heavy days", "No belt if you want more raw feel"],
    minimum: "All 12 reps fast and identical in depth.",
    insight: "Treat deload sessions as seriously as peak days—sloppy light reps teach sloppy heavy reps.",
  },
  {
    focus: "rest",
    title: "Rest day: optional easy walk",
    instruction: "No lifting today. Recovery is part of the program.",
    steps: [
      "Skip structured strength work entirely, or take a 10–20 minute easy walk if you want to move.",
      "Sleep, hydration, and protein matter more than extra reps today.",
      "Note that you honored the rest day—consistency beats hero days.",
    ],
    why: "Scheduled rest lets Tuesday and Friday sessions hit harder.",
    examples: ["Flat walk outside", "Light stretching only if it feels good"],
    minimum: "Complete the day without a heavy training session.",
    insight: "Rest days are when adaptation happens—treat them as seriously as squats.",
  },
  {
    focus: "optional",
    title: "Optional: pump + carry (25 min cap)",
    instruction: "Extra work only if you feel fresh—otherwise skip.",
    steps: [
      "Lateral raise or upright row: 3 sets × 12 light.",
      "Farmer carry: 4 × 30 m moderate.",
      "Face pull: 3 sets × 15.",
      "Stop at 25 minutes—no heavy compounds.",
    ],
    why: "Saturday adds density without a second heavy lower or upper day.",
    examples: ["Leave 2 reps in reserve", "Drop load if grip fails"],
    minimum: "Either skip entirely or finish within the cap.",
    insight: "Optional means optional—if you’re tired, the best session is none.",
  },
];

/** Elite: meet-style exposure, peaking, specialty work, RPE, audit */
const black: StrengthTaskPoolEntry[] = [
  {
    focus: "full",
    minStrengthLevel: 10,
    title: "Mock meet: squat / bench / dead singles @ RPE 8–9",
    instruction: "Three competition lifts in meet order. Fixed attempts per lift—no fourth tries.",
    steps: [
      "Squat: warm up as at a meet; take 1 single @ RPE 8–9. Rest at least 4 minutes before bench setup.",
      "Bench: warm up; take 1 single @ RPE 8–9. Rest at least 4 minutes before deadlifts.",
      "Deadlift: warm up; take 1 single @ RPE 8–9. Log all loads and rest between attempts.",
    ],
    why: "Fatigue across three lifts is a skill—rehearse it before it matters on the platform.",
    examples: ["Commands optional for squat and bench", "Same attempts you would select in a real meet"],
    minimum: "One heavy single per lift with planned loads hit or adjusted down for technical failure.",
    insight: "If deadlift is far weaker after squat and bench, your peaking plan needs more SBD exposure.",
  },
  {
    focus: "lower",
    minStrengthLevel: 10,
    title: "Peaking squat: 5×3 @ RPE 8–8.5",
    instruction: "Heavy triples with full rest. Add load only if every rep of every set moves with the same character.",
    steps: [
      "Back squat: 5 sets × 3 reps. Target RPE 8–8.5 on each set—adjust load up or down set to set to stay in range.",
      "Rest 4–5 minutes between sets.",
      "If set 4 or 5 slows versus set 1, hold or reduce load for the remaining sets and log it.",
    ],
    why: "Peaking is timing—heavy triples with honest RPE build strength without daily maxes.",
    examples: ["Belt and wraps same as meet", "Walk-out identical every set"],
    minimum: "Five triples completed in the RPE band with no ugly grinders.",
    insight: "Missing rest between sets is missing the peak—treat rest as part of the program.",
  },
  {
    focus: "lower",
    title: "Safety squat bar: 4×5 @ RPE 8",
    instruction: "Specialty bar for variation while keeping competition squat fresh. Same depth standard as your main squat.",
    steps: [
      "Safety squat bar (SSB): 4 sets × 5 reps @ RPE 8.",
      "Rest 3–4 minutes. Match stance and depth intent to your competition squat.",
      "Compare to your competition squat monthly—not every session.",
    ],
    why: "Specialty bars overload weak links without replacing the main lift.",
    examples: ["Hatfield squat hold if hands-free", "High or low pad—stay consistent"],
    minimum: "4×5 at one working load with consistent bar path.",
    insight: "SSB should answer a question (quad strength, torso position)—rotate it with intent, not randomly.",
  },
  {
    focus: "upper",
    minStrengthLevel: 10,
    title: "Competition bench: 5×3 @ RPE 8–8.5",
    instruction: "Bench-only session—treat setup and leg drive identical to meet day.",
    steps: [
      "Bench press: 5 sets × 3 reps, each set @ RPE 8–8.5.",
      "Rest 3–4 minutes between sets. Same grip and arch every set.",
      "Adjust load set to set to stay in the RPE band.",
    ],
    why: "Dedicated upper intensity without squatting or deadlifting the same day.",
    examples: ["Competition pause", "Touch-and-go if that is your training style—stay consistent"],
    minimum: "Five triples in the target RPE range.",
    insight: "If the third rep of every set slows, you’re treating triples like maxes—reduce load.",
  },
  {
    focus: "full",
    title: "Autoregulated triples @ RPE 8 (4 working sets)",
    instruction: "Pick one competition lift for the day. Adjust load every set to stay at RPE 8—log everything.",
    steps: [
      "Choose squat, bench press, or deadlift.",
      "After warm-ups, perform 4 working sets of 3 reps. Each set should be @ RPE 8 (2 reps left if you had to).",
      "Change load set to set as needed. Record weight and RPE for every set.",
    ],
    why: "Advanced lifters train readiness, not only fixed percentages.",
    examples: ["First working set conservative if sleep was poor", "Smallest plates for fine adjustments"],
    minimum: "Four triples all in the RPE 8 neighborhood.",
    insight: "RPE honesty is the difference between progress and burnout—lying about RPE lies to your recovery too.",
  },
  {
    focus: "optional",
    title: "Block review: numbers + one video fix per lift",
    instruction: "No main lift PR today—programming literacy. Concrete outputs only.",
    steps: [
      "Write your best triple and best single in the last 4 weeks for squat, bench, and deadlift.",
      "Watch one heavy set from each lift on video; write one technique change for the next block.",
      "Set next mesocycle: primary lift emphasis, rep range, and one progression rule (e.g. add 5 lb when all top sets ≤RPE 8).",
    ],
    why: "Long-term strength is analysis plus execution—this session trains the analysis side.",
    examples: ["Spreadsheet or notebook", "Compare to a coach or trusted lifter if available"],
    minimum: "Written numbers for six metrics (best triple/single per lift) plus one fix per lift and one progression rule.",
    insight: "Black belt is as much clear decisions as heavy bars—review days prevent blind repetition.",
  },
  {
    focus: "rest",
    title: "Rest day: optional easy walk",
    instruction: "No lifting today. Recovery is part of the program.",
    steps: [
      "Skip structured strength work entirely, or take a 10–20 minute easy walk if you want to move.",
      "Sleep, hydration, and protein matter more than extra reps today.",
      "Note that you honored the rest day—consistency beats hero days.",
    ],
    why: "Scheduled rest lets Tuesday and Friday sessions hit harder.",
    examples: ["Flat walk outside", "Light stretching only if it feels good"],
    minimum: "Complete the day without a heavy training session.",
    insight: "Rest days are when adaptation happens—treat them as seriously as squats.",
  },
  {
    focus: "optional",
    title: "Optional: extra weak-point work (30 min cap)",
    instruction: "Extra work only if you feel fresh—otherwise skip.",
    steps: [
      "Pick one lift from the week that felt off; do 4 sets × 4 @ RPE 7 with a variation (pause, tempo, or pin).",
      "Or skip lifting and do 20 minutes easy bike or walk.",
      "Log either the weak-point sets or that you rested.",
    ],
    why: "Saturday is for extras or recovery—your choice without breaking the week.",
    examples: ["Pause squat light", "Spoto bench light"],
    minimum: "Either skip entirely or stay within the cap.",
    insight: "Optional means optional—if you’re tired, the best session is none.",
  },
];

const POOLS: Record<StrengthBeltId, StrengthTaskPoolEntry[]> = {
  white,
  blue,
  purple,
  brown,
  black,
};

function eligibleForStrengthLevel(
  pool: StrengthTaskPoolEntry[],
  pathLevel: number,
  isPaidUser = false
): StrengthTaskPoolEntry[] {
  let gated = pool.filter((e) => e.minStrengthLevel == null || pathLevel >= e.minStrengthLevel);
  if (!isPaidUser) {
    gated = gated.filter((e) => e.minStrengthLevel == null);
  }
  if (gated.length > 0) return gated;
  return pool.filter((e) => e.minStrengthLevel == null);
}

export function getStrengthTrainingPoolForPathLevel(
  pathLevel: number,
  opts?: { isPaidUser?: boolean }
): StrengthTaskPoolEntry[] {
  const raw = POOLS[getStrengthBeltFromPathLevel(pathLevel)];
  return eligibleForStrengthLevel(raw, pathLevel, opts?.isPaidUser ?? false);
}

/**
 * Tasks for the daily protocol for this calendar day’s focus (weekly split).
 * Falls back to `full`-focus tasks, then the whole belt pool, if a focus has no entries.
 */
export function getStrengthTrainingPoolForPathLevelAndFocus(
  pathLevel: number,
  focus: TrainingDayFocus,
  opts?: { isPaidUser?: boolean }
): StrengthTaskPoolEntry[] {
  const belt = getStrengthBeltFromPathLevel(pathLevel);
  const pool = POOLS[belt];
  const matched = pool.filter((e) => e.focus === focus);
  let base: StrengthTaskPoolEntry[];
  if (matched.length > 0) base = matched;
  else {
    const fullFallback = pool.filter((e) => e.focus === "full");
    base = fullFallback.length > 0 ? fullFallback : pool;
  }
  return eligibleForStrengthLevel(base, pathLevel, opts?.isPaidUser ?? false);
}

/** All strength tasks for hydration / title lookup */
export function findStrengthTaskByTitle(title: string): StrengthTaskPoolEntry | null {
  for (const belt of Object.keys(POOLS) as StrengthBeltId[]) {
    const hit = POOLS[belt].find((e) => e.title === title);
    if (hit) return hit;
  }
  return null;
}

/** Pro-only pool entries carry `minStrengthLevel`; free tier must not use them. */
export function strengthTaskTitleIsProOnly(title: string): boolean {
  const e = findStrengthTaskByTitle(title);
  return e != null && e.minStrengthLevel != null;
}
