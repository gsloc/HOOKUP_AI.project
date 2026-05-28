import { FishingCategory, FishingContext } from '@/types';

export interface ResponseTemplate {
  category: FishingCategory;
  keywords: string[];
  responses: string[];
}

export const RESPONSE_TEMPLATES: ResponseTemplate[] = [
  {
    category: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'start', 'help', 'what can you', 'capabilities'],
    responses: [
      `**Welcome to your AI Fishing Assistant.** I'm built to give you tournament-level intel, right from your phone.\n\nHere's what I can help you with:\n\n🎣 **Bass Fishing** — Pre-spawn staging, bed fishing tactics, deep summer ledges, fall migrations, winter survival patterns\n🌊 **Tidal Analysis** — Real-time tide windows, current seams, optimal feeding phases\n🌤️ **Weather Integration** — Barometric pressure fronts, wind patterns, cloud cover strategies\n📍 **Location Scouting** — Water body breakdowns, structure identification, seasonal movement mapping\n🪝 **Gear & Technique** — Rigging, presentation angles, retrieve cadences, line selection\n\nJust ask me anything — *"Best technique for post-spawn largemouth?"* or *"How does a cold front affect bass behavior?"* — and I'll give you the same advice a professional guide would charge $500/day for.`,
    ],
  },
  {
    category: 'bass',
    keywords: [
      'bass', 'largemouth', 'smallmouth', 'spotted bass', 'kentucky bass',
      'lmb', 'smb', 'bed fishing', 'spawning bass', 'post spawn', 'pre spawn',
      'pre-spawn', 'post-spawn',
    ],
    responses: [
      `**Largemouth Bass — Comprehensive Seasonal Breakdown**\n\nBass behavior is almost entirely dictated by water temperature, which drives their four-phase annual cycle:\n\n**Pre-Spawn (48–62°F)**\nThis is the single most productive period of the year. Bass stack on the first major structural break outside spawning flats — secondary points, creek channel bends, and transitions from hard to soft bottom. Target staging fish with **suspending jerkbaits** worked with a "jerk-jerk-long pause" cadence. The pause triggers reaction strikes from fish that are feeding aggressively to build energy reserves.\n\n**Spawn (62–75°F)**\nFemales move shallow to beds in protected pockets — coves with hard sand or gravel bottom, 1–6ft, out of direct current. Males guard the nest aggressively. The most effective approach is sight fishing with a **white finesse jig or Ned rig**, casting past the bed and dragging through. Let the fish commit fully before setting.\n\n**Post-Spawn (75°F+, summer)**\nLargest females drop to deep structure immediately after spawn — main lake points, submerged humps, ledges in 15–30ft. **Football jig** along the bottom with a slow drag-and-pause, or **10-inch straight worm on a shaky head** on the edge of the thermocline. Electronics are non-negotiable here — look for bait balls on the graph with bass stacked beneath.\n\n**Fall Transition**\nBass follow shad migrations onto flats and into creek arms as surface temps drop from 75° to 55°F. This is reaction bait season — **square-bill crankbaits, bladed jigs (chatterbaits), and topwater walking baits** like the Zara Spook at first light. Cover water fast until you locate the bait, then fish it hard.\n\n**Winter (<50°F)**\nBass are metabolically slow. **Blade baits, suspending jerkbaits, and dead-sticking senkos** near deep structure. The retrieve must slow to near-motionless. Fish are catchable but require absolute precision in depth and presentation speed.`,

      `**Smallmouth Bass — High-Pressure, Technical Fishing**\n\nSmallmouth are arguably the most challenging of the bass species to pattern consistently. A few critical distinctions from largemouth:\n\n**Habitat Preference**\nSmallmouth are creatures of current and rock. In rivers: eddy lines behind boulders, tailouts of pools, and the seam between fast and slow water. In lakes: rocky points, gravel bars, and main-lake structure down to 30+ feet.\n\n**Feeding Triggers**\nSmallmouth key heavily on **crawfish** in spring and early summer (match with brown/orange tubes, football jigs, or hair jigs worked slowly along rock), then transition to **baitfish** in summer and fall (drop shots, ned rigs, small swimbaits).\n\n**Pressure Response**\nSmallmouth spook dramatically under high pressure or in clear water. Downsize to **6–8lb fluorocarbon**, use spinning gear, and make long casts with finesse presentations. The **drop shot** with a 4" Roboworm or Aaron's Magic worm at 18–24" above the hook is the definitive technique when fish are pressured.\n\n**Prime Window**\nSmallmouth in rivers feed most aggressively in the hour before and after prime solunar periods. Track the Major and Minor feeding times — you'll find fish stacking in predictable locations during a 45-minute window with almost mechanical reliability.`,
    ],
  },
  {
    category: 'tides',
    keywords: [
      'tide', 'tidal', 'incoming', 'outgoing', 'slack', 'current', 'flood tide',
      'ebb tide', 'moon', 'lunar', 'solunar', 'tidal current', 'tidal window',
    ],
    responses: [
      `**Tidal Analysis — Maximizing Your Fishing Windows**\n\nTide movement is the single most predictive variable in saltwater fishing. Here's how to read it like a professional guide:\n\n**The Four Tidal Phases**\n\n**Incoming (Flood) Tide** ✅ *Usually Best*\nRising water pushes baitfish, shrimp, and crabs up onto flats, into marsh grass, and around structure. Predators stack at the points and edges where this current funnels bait. Fish points, channel edges, and any hard structure that intercepts the flow. Topwater and shallow-running plugs excel in the first 90 minutes of the flood.\n\n**High Slack** 🎣 *Productive but Short*\nThe water "breathes" — there's a 20–40 minute window at high slack before current reverses. Fish are often actively feeding in the shallows. The window is short; be in position before the tide peaks.\n\n**Outgoing (Ebb) Tide** 🎣 *Conditionally Excellent*\nDraining water concentrates bait in cuts, channels, and the mouths of drains exiting marsh systems. Ambush predators — redfish, snook, stripers — stack at drain exits and channel mouths. Position yourself at the "exit" structure and let the current deliver the bait to you. **This is one of the best setups in all of saltwater fishing.**\n\n**Low Slack** ⚠️ *Generally Slow*\nMinimal current equals minimal feeding activity. Best used for scouting — read the exposed structure, note where cuts and drains funnel water, and pre-position for the incoming.\n\n**Pro Tip — The 2-Hour Rule**\nThe two most productive windows are typically **2 hours before and 2 hours after both high and low tide**. In a 24-hour period, you have roughly 8 hours of prime tidal fishing. Structure your day around these windows.`,

      `**Moon Phase & Solunar Periods — The Invisible Edge**\n\nBeyond basic tides, moon position drives feeding activity in both fresh and saltwater:\n\n**Full and New Moon** = Strongest tidal differentials = Most dramatic feeding windows. These two-week peaks produce the best results for ambush species.\n\n**Solunar Periods** — John Alden Knight's 1926 observation still holds: fish feed most actively when the moon is overhead or underfoot (Major periods, ~2 hrs) and at 90° angles (Minor periods, ~1 hr). Combine a Major period with moving tide = elite fishing window.\n\n**Practical Application**\nI can pull the current solunar table for your location when location services are enabled. The key is aligning: **moving tide + solunar major + dawn or dusk light** — when you hit that three-way overlap, be fishing your best structure.`,
    ],
  },
  {
    category: 'weather',
    keywords: [
      'weather', 'barometric', 'pressure', 'front', 'cold front', 'warm front',
      'wind', 'rain', 'cloud', 'overcast', 'storm', 'temperature', 'hot', 'cold',
      'humidity', 'fog', 'clear sky', 'sunny',
    ],
    responses: [
      `**Barometric Pressure — The Most Underutilized Fishing Variable**\n\nEvery serious tournament angler tracks barometric pressure. Here's the complete breakdown:\n\n**Falling Pressure (Before a front)** 🎣🎣🎣 *BEST FISHING*\nThis is your window. As pressure drops, fish sense the change and feed aggressively — biologically preparing for the disruption ahead. The 12–24 hours before a significant weather system often produce the single best fishing of any given week. Fish all depths, cover water fast, use reaction baits.\n\n**Stable High Pressure (Clear, sunny post-front)** ⚠️ *Difficult*\nHigh pressure + clear water = spooky, lethargic fish. They push to deepest available structure. Finesse tactics are mandatory. Downsize line, slow presentations, fish the shaded or deepest zones. Pre-sunrise and post-sunset windows are your best bets.\n\n**Rising Pressure (Recovery, 24–48 hrs post-front)** 🎣 *Improving*\nFish gradually become more active as pressure stabilizes. Start at mid-depths and work toward the edges where fish begin to roam.\n\n**Low, Stable Pressure (Overcast, warm)** 🎣🎣 *Very Good*\nThis is the "comfortable" condition for fish. Overcast skies eliminate harsh shadows, fish roam more freely, and topwater/shallow presentations excel. If you could design a perfect day, it's 68°F, 10mph wind, full overcast, and stable low pressure.\n\n**Wind Strategy**\nNever ignore wind. Wind-blown banks accumulate bait and oxygenate water. In bass fishing, the windward bank of a point typically holds more active fish than the calm side. In saltwater, wind creates rip lines and current seams that concentrate bait — fish those edges.`,
    ],
  },
  {
    category: 'lures',
    keywords: [
      'lure', 'bait', 'jig', 'crankbait', 'worm', 'swimbait', 'topwater',
      'spinnerbait', 'chatterbait', 'ned rig', 'drop shot', 'texas rig',
      'carolina rig', 'finesse', 'soft plastic', 'hard bait', 'plug', 'popper',
      'frog', 'buzzbait', 'jerkbait', 'suspending', 'senko',
    ],
    responses: [
      `**Complete Lure Selection Guide — Condition-Based**\n\nLure selection should be a systematic decision based on four variables: **depth, clarity, temperature, and activity level**.\n\n**By Depth**\n- 0–3ft: Topwater (frogs, walkers, poppers), shallow crankbaits, spinnerbaits\n- 3–10ft: Jerkbaits, medium-diving crankbaits, chatterbaits, swimbaits\n- 10–20ft: Deep-diving crankbaits, Carolina rigs, Alabama rigs, big swimbaits\n- 20ft+: Football jigs, drop shots, blade baits, heavy Texas rigs\n\n**By Water Clarity**\n- Stained/dirty: Larger profiles, louder colors (chartreuse, white, black/blue), vibration-based lures (spinnerbaits, chatterbaits, lipless crankbaits)\n- Clear: Natural colors (green pumpkin, watermelon, shad patterns), smaller profiles, slower presentations\n\n**By Temperature**\n- <50°F: Blade baits, jerkbaits (long pauses), ned rigs — slow everything down\n- 50–65°F: Jerkbaits, jigs, finesse worms — moderate pace\n- 65–80°F: Full arsenal — match whatever the fish are eating\n- >80°F: Topwater early/late, deep diving crankbaits midday, night fishing with dark/loud lures\n\n**The "Confidence Bait" Factor**\nEvery elite angler has 2–3 lures they fish with absolute conviction. Conviction in a presentation translates directly to better technique. Fish your confidence baits when patterns are unclear — they'll outperform the "right" lure fished tentatively.`,

      `**Tournament-Tested Rig Guide**\n\n**Texas Rig** — The most versatile setup in bass fishing. Use a bullet sinker (3/16oz for shallow, 1/2oz+ for deep/windy), offset EWG hook, and your preferred soft plastic. Works in cover where other rigs hang. Key: the sinker must contact bottom before the hook set is made — feel the weight "clunk" before swinging.\n\n**Drop Shot** — Elevated hook presentation ideal for clear water and finesse situations. Hook 12–18" above the weight, nose-hook the plastic lightly for action. Work it with subtle shakes and long pauses. Most effective technique for inactive fish in 10–30ft.\n\n**Ned Rig** — ElaZtech plastic on a light mushroom jig head (1/10–1/4oz). The buoyant tail stands up on bottom. Deadly for clear-water smallmouth and finicky largemouth. Light spinning gear, 6–8lb fluoro mandatory.\n\n**Football Jig** — The ledge-fishing weapon. Wide-gap football head, heavy trailer. Hop-and-drag along hard bottom transitions (rock to mud, sand to gravel). The jig mimics a crawfish perfectly. Colors: green pumpkin/brown in clear water, black/blue in stained.\n\n**Bladed Jig (Chatterbait)** — Unmatched search bait in 2–8ft of water. Burn it, slow-roll it, or yo-yo it. Pairs best with a swimbait or flapping trailer. Most productive when bass are relating to sparse grass or wood in the 58–72°F range.`,
    ],
  },
  {
    category: 'technique',
    keywords: [
      'technique', 'how to', 'cast', 'retrieve', 'flip', 'pitch', 'skip',
      'finesse', 'power fishing', 'hook set', 'fight', 'land', 'trophy',
      'big fish', 'pattern', 'locate fish', 'find fish', 'reading water',
    ],
    responses: [
      `**Advanced Technique: Flipping & Pitching Heavy Cover**\n\nFlipping and pitching are the precision techniques for extracting bass from dense cover — docks, laydowns, hydrilla mats, cattails, and flooded brush.\n\n**Pitching Setup**\n- Rod: 7'3"–7'6" heavy or extra-heavy power, fast tip\n- Line: 50–65lb braided main line\n- Leader: Optional 20–25lb fluorocarbon for clearer water\n- Hook: 4/0–5/0 heavy-gauge EWG\n- Weight: 1/2oz–1oz bullet sinker (heavier in thicker cover)\n\n**The Pitch**\nHold the lure in your non-dominant hand, lower the rod tip, and using a pendulum swing, release the bait as the rod loads and sweeps forward. The goal is a near-silent, horizontal entry — "splashdown" spooks fish in tight quarters.\n\n**Reading the Cover**\nNot all docks or laydowns hold fish. Target: shaded sections with deep adjacent water, docks over 10ft+ with cross-members that fish can suspend under, and the "sweet spot" where a laydown's root ball meets a depth change. Skip past the edges and put the bait in the darkest, most inaccessible zone.\n\n**The Hook Set**\nFlipping demands a violent, low-angle hookset — drive the rod sideways (parallel to the water) rather than straight up. This ensures the hook penetrates through a thick plastic and the fish's mouth simultaneously, then allows you to horse the fish directly out of the cover before it can wrap around structure.`,

      `**Reading Water: Finding Fish Without Electronics**\n\nBefore you make a single cast, elite anglers "read" a water body and narrow 90% of it down to the 10% that holds fish.\n\n**Structural Elements**\n- **Points** — Underwater points (especially those that extend toward deep water) are classic staging areas. Fish move up and down the point seasonally.\n- **Transitions** — Any change in bottom composition (rock to mud, sand to gravel, grass edge) concentrates fish. The "edge" is always more productive than open water.\n- **Depth Breaks** — The first significant depth change off a flat. In most lakes, 8–12ft is the "magic shelf" where bass suspend in summer.\n- **Current** — In rivers and tidal systems, current creates "seams" — boundaries between fast and slow water where fish hold facing upstream, waiting for the current to deliver food.\n\n**Visual Cues**\n- Baitfish activity (dimpling surface, nervous water, flashing in shallow areas)\n- Diving birds — indicating baitfish schools being pushed up\n- Irregular structure: a single dock on an otherwise bare bank, one laydown on a clean shoreline\n- Shade lines in clear water — bass will hold precisely on the shadow edge\n\n**The 80/20 Principle**\n80% of the fish live in 20% of the water. Identify that 20% through structure, temperature, bait presence, and depth — then fish it with confidence rather than covering the entire water body randomly.`,
    ],
  },
  {
    category: 'location',
    keywords: [
      'where', 'location', 'spot', 'lake', 'river', 'pond', 'reservoir',
      'creek', 'canal', 'flats', 'near me', 'local', 'structure', 'depth',
      'shallow', 'deep', 'bank',
    ],
    responses: [
      `**Location Strategy — Finding Fishable Water**\n\nWith location services enabled (Phase 2), I'll pull your nearest fishable water bodies, current conditions, and structure data. In the meantime, here's the framework for evaluating any new water:\n\n**Reservoir Assessment (5-Step Process)**\n1. **Find the old river/creek channels** — Submerged creek channels are the interstate highways of reservoir bass. Follow the channel bends — fish stage at the inside and outside bends, especially where a secondary creek intersects the main channel.\n2. **Identify the thermocline** — In summer, oxygen stratification creates an invisible "floor." Bass won't go below it. Most reservoirs stratify at 18–25ft. Focus above that depth.\n3. **Map the spawning flats** — Protected coves with hard bottom 2–8ft deep will hold fish in pre-spawn (nearby staging structure) and post-spawn (scattered over the flat).\n4. **Locate main lake points** — Points that extend from the main bank into the deepest adjacent water are year-round fish magnets, transitional zones between shallow and deep.\n5. **Find bait** — This is the shortcut. Mark bait schools on your graph or visually on the surface. Predators are never far behind.\n\n**Seasonal Location Summary**\n- Spring: Shallow (<10ft), warming coves, hard bottom\n- Summer: Deep structure (15–30ft), thermocline edge, shade\n- Fall: Mid-depth to shallow, following shad onto flats\n- Winter: Deep (20–35ft), slowest moving water, hard bottom`,
    ],
  },
  {
    category: 'seasonal',
    keywords: [
      'spring', 'summer', 'fall', 'winter', 'season', 'spawn', 'prespawn',
      'postspawn', 'turnover', 'fall turnover', 'shad spawn', 'late fall',
      'early spring', 'water temperature', 'temp',
    ],
    responses: [
      `**Seasonal Fishing Playbook — Full Year Breakdown**\n\n**SPRING** — Peak Opportunity\nThe pre-spawn transition (water 45°F → 65°F) is the most predictable and productive period. Bass are deep in early spring, staging on secondary points and channel bends within reach of spawning flats. As temps climb, they push shallower daily. Targets: suspending jerkbaits, swimbaits, large profile crankbaits. Bigger females move first — target the warmest, shallowest water in the back of protected coves.\n\n**SUMMER** — Location-Dependent\nOnce temps exceed 75°F, fish establish summer patterns that hold for months. Most bass go deep — main lake structure, ledges, humps with bait presence. A small percentage stay ultra-shallow, living under heavy cover (docks, mats) or in grass. Find which pattern dominates your water body and commit. Deep fishing requires electronics; shallow mat fishing requires braided line and heavy tackle.\n\n**FALL** — Dynamic & Fast-Moving\nFall is the most dynamic season. Dropping temps trigger a feeding binge as bass (and bait) prepare for winter. The key is tracking bait movement — shad migrate from main lake into creeks as surface temps drop from 72° to 55°F. Follow the shad. Reaction baits (crankbaits, chatterbaits, bladed jigs) excel. Patterns can shift daily.\n\n**FALL TURNOVER** — Brief but Brutal\nWhen surface temperature drops to match deep water temps (usually 55–60°F), the lake "turns over" — oxygen-depleted deep water mixes with the surface. Fishing dies for 3–7 days. Fish become lethargic and scattered. Once the water clears and stabilizes, an excellent late-fall bite follows.\n\n**WINTER** — Precision Required\nCold-water bass metabolism slows dramatically. Fish stack on the deepest available structure with the most stable temperature. Presentations must be painfully slow: blade baits dropped vertically, dead-sticked senkos, suspending jerkbaits fished with 15–30 second pauses. Find 15+ fish on your graph before making a cast — if they're not shown on electronics, they're not there.`,
    ],
  },
  {
    category: 'saltwater',
    keywords: [
      'saltwater', 'salt water', 'redfish', 'red drum', 'snook', 'tarpon',
      'flounder', 'striper', 'striped bass', 'bluefish', 'mahi', 'tuna',
      'grouper', 'snapper', 'offshore', 'inshore', 'flats', 'mangrove',
      'marsh', 'estuary',
    ],
    responses: [
      `**Inshore Saltwater — Redfish & Snook Tactics**\n\nInshore saltwater fishing is one of the most technical and rewarding disciplines. The intersection of tide, structure, and predator behavior creates predictable windows that reward preparation.\n\n**Redfish (Red Drum)**\nRedfish are largely structure-dependent ambush predators. Their feeding behavior is almost entirely tied to tide movement:\n\n- **Shallow flat feeding** occurs on flooding tides as reds move onto grass flats and oyster bars chasing crabs and shrimp. Sight fishing with **gold spoons, DOA shrimp, or weedless soft plastics** in 6–24 inches of water.\n- **Channel edges** hold redfish during outgoing tides — they stage at the mouth of drains waiting for bait to flush out.\n- **Dock pilings in current** concentrate reds under dock structure, especially during moving tide periods.\n\n**Snook**\nSnook are ambush predators that orient to current. Key locations: bridge pilings (light/shadow lines at night), mangrove edges with current, inlet jetties, and beach passes. Live bait (pilchards, mullet) on a free-line is the gold standard; artificials work best when fish are actively feeding. **Suspending plugs** worked along mangrove edges at dawn are devastatingly effective when water temperature is in the 72–82°F sweet spot.\n\n**The 45-Minute Window Rule**\nInshore saltwater guides live by this: the 45 minutes centered on a tide change (high or low) is often the single best window of a 6-hour period. Be on your best structure, set up, and ready to cast when that window opens.`,
    ],
  },
  {
    category: 'fly-fishing',
    keywords: [
      'fly fishing', 'fly fish', 'fly rod', 'fly line', 'nymph', 'dry fly',
      'streamer', 'midge', 'hatch', 'trout', 'rainbow', 'brown trout',
      'brook trout', 'cutthroat', 'leader', 'tippet',
    ],
    responses: [
      `**Fly Fishing — Trout Strategy & Hatch Matching**\n\nFly fishing demands a different level of observation. You're not just locating fish — you're reading what they're eating and matching that exactly.\n\n**Reading a Trout Stream**\nTrout prioritize three things: oxygenation, current speed, and food delivery. The perfect trout lie sits in a position where the fish expends minimal energy but has first-shot access to drifting food:\n- **Seams** — The boundary between fast and slow current is where drifting insects collect. Cast into the fast water and let your fly drift across the seam into the slow lane.\n- **Head of pools** — Where fast riffles drop into slow pools. Oxygenated water, constant food delivery. Morning and evening prime times.\n- **Undercut banks** — Trophy trout hold in undercut banks, almost entirely out of sight. Presentation must be precise.\n\n**Hatch Matching**\nWhen fish are rising, observe the naturals for 5 minutes before casting. Capture a few insects and identify: size, silhouette, and color. Size is most critical — being one hook size off is often enough to get refusals on pressured fish.\n\n**Nymphing (Sub-Surface)**\n90% of a trout's diet is eaten sub-surface. A properly weighted nymph rig (double nymph, indicator, weight) drifted through a run will outproduce dry flies on most days. The "perfect drift" is drag-free — your fly moving at exactly the same speed as the current it's in.`,
    ],
  },
  {
    category: 'general',
    keywords: [],
    responses: [
      `**General Fishing Strategy Framework**\n\nEvery successful fishing trip begins with the same sequence of questions:\n\n1. **What species am I targeting, and what is their behavior this time of year?**\nSeasonality drives everything. Bass in January behave nothing like bass in May. Identify the seasonal pattern first.\n\n2. **What are the current conditions — temperature, pressure, wind?**\nBarometric pressure falling = feed aggressively. Cold front just passed = go deep, slow down. Overcast and stable = cover water with reaction baits.\n\n3. **What depth range are fish using right now?**\nMatch your presentation to the depth. The most technically perfect retrieve at the wrong depth catches nothing.\n\n4. **What are fish eating?**\nMatch the hatch — look at what baitfish species are present, what size, what color. Hungry fish key on specific forage.\n\n5. **Where is the nearest structure/transition in that depth range?**\nFish don't suspend randomly in open water. Find the structural element at the right depth, in the right temperature, with bait nearby — that's where they'll be.\n\nAsk me anything specific and I'll dial in the advice for your exact situation.`,
    ],
  },
];

export function selectResponse(
  query: string,
  context?: FishingContext,
): { response: string; category: FishingCategory } {
  const lower = query.toLowerCase();

  for (const template of RESPONSE_TEMPLATES) {
    if (template.keywords.some((kw) => lower.includes(kw))) {
      const responses = template.responses;
      const response = responses[Math.floor(Math.random() * responses.length)];
      return {
        response: appendContextualTip(response, context),
        category: template.category,
      };
    }
  }

  const fallback = RESPONSE_TEMPLATES.find((t) => t.category === 'general')!;
  return {
    response: fallback.responses[0],
    category: 'general',
  };
}

function appendContextualTip(response: string, context?: FishingContext): string {
  if (!context) return response;

  const tips: string[] = [];

  if (context.weather) {
    const { pressureTrend, temperatureF, conditions } = context.weather;
    if (pressureTrend === 'falling') {
      tips.push(`📊 **Live Condition:** Barometric pressure is currently *falling* — activate your best reaction baits, fish are actively feeding right now.`);
    } else if (pressureTrend === 'rising') {
      tips.push(`📊 **Live Condition:** Pressure is rising post-front — expect tough fishing, transition to finesse and deep presentations.`);
    }
    if (temperatureF < 50) {
      tips.push(`🌡️ Cold water detected (${temperatureF}°F) — slow all presentations by 50%.`);
    }
    if (conditions.includes('overcast') || conditions.includes('cloudy')) {
      tips.push(`☁️ Overcast conditions: fish are roaming more freely. Cover water and use louder, more visible presentations.`);
    }
  }

  if (context.tides) {
    const { currentTrend, moonPhase } = context.tides;
    if (currentTrend === 'incoming') {
      tips.push(`🌊 **Tide:** Currently flooding — position on the up-current side of structure and let the tide bring fish to you.`);
    } else if (currentTrend === 'outgoing') {
      tips.push(`🌊 **Tide:** Currently ebbing — move to drain exits and channel mouths, ambush predators are stacking there now.`);
    }
    if (moonPhase === 'full' || moonPhase === 'new') {
      tips.push(`🌕 ${moonPhase === 'full' ? 'Full' : 'New'} moon phase — maximum tidal range this week, solunar feeding periods will be strongest.`);
    }
  }

  if (context.timeOfDay === 'dawn' || context.timeOfDay === 'dusk') {
    tips.push(`⏰ **Prime Window:** You're in the ${context.timeOfDay} feeding window — this is the highest-probability period of the day.`);
  }

  if (tips.length === 0) return response;

  return `${response}\n\n---\n\n${tips.join('\n')}`;
}
