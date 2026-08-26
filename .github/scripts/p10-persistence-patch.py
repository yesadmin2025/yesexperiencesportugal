from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one marker, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


# 1) Pure delegation helpers.
replace_once(
    "src/components/studio-v3/studioDelegation.ts",
    "export function delegationAcknowledgement(\n\n  delegated: ReadonlyArray<DelegatableDimension>,",
    '''/**\n * Recompute ONLY the taste dimensions YES still owns after the traveller\n * changes an explicit anchor such as Feeling or Who. Delegation remains\n * active: trust is persistent, while the delegated outputs stay fresh.\n *\n * Explicit taste dimensions are preserved verbatim. Operational facts are\n * copied untouched because the patch is deliberately limited to the two\n * explicit taste anchors that are allowed to reshape delegated defaults.\n */\nexport function recomputeActiveDelegationAfterExplicitChange(\n  state: StudioV3State,\n  patch: Partial<Pick<StudioV3State, "feeling" | "companions">>,\n): StudioV3State {\n  const patched: StudioV3State = { ...state, ...patch };\n  if (!isDelegationActive(state)) return patched;\n\n  const decided = new Set(state.decidedForMe ?? []);\n  const ownsInterests = decided.has("interests");\n  const ownsRhythm = decided.has("rhythm");\n  if (!ownsInterests && !ownsRhythm) {\n    return { ...patched, delegationMode: null };\n  }\n\n  let forward: StudioV3State = {\n    ...patched,\n    interests: ownsInterests ? [] : patched.interests,\n    rhythm: ownsRhythm ? null : patched.rhythm,\n    delegationMode: DELEGATION_MODE,\n  };\n  if (ownsInterests) {\n    forward = { ...forward, interests: decideInterests(forward) };\n  }\n  if (ownsRhythm) {\n    forward = { ...forward, rhythm: decideRhythm(forward) };\n  }\n  return forward;\n}\n\n/**\n * Manual Interests edit transfers ownership of the VISIBLE interest set to\n * the traveller. The supplied set is already the current UI set with the\n * user's toggle applied, so we never erase the rest or immediately re-infer\n * the item they just removed. If Rhythm is still delegated, recompute only\n * Rhythm from these newly explicit interests.\n */\nexport function takeBackDelegatedInterests(\n  state: StudioV3State,\n  explicitInterests: StudioV3State["interests"],\n): StudioV3State {\n  const decided = state.decidedForMe ?? [];\n  if (!decided.includes("interests")) {\n    return { ...state, interests: [...explicitInterests] };\n  }\n\n  const remaining = decided.filter((k) => k !== "interests");\n  const rhythmRemains = remaining.includes("rhythm");\n  let forward: StudioV3State = {\n    ...state,\n    interests: [...explicitInterests],\n    decidedForMe: remaining,\n    delegationMode: rhythmRemains ? state.delegationMode : null,\n  };\n  if (rhythmRemains) {\n    forward = { ...forward, rhythm: decideRhythm(forward) };\n  }\n  return forward;\n}\n\nexport function delegationAcknowledgement(\n  delegated: ReadonlyArray<DelegatableDimension>,''',
)

# 2) Import the new helpers in StudioV3.
replace_once(
    "src/components/studio-v3/StudioV3.tsx",
    '''  isDelegationOffered,\n  releaseDelegatedTaste,\n  takeBackDelegatedDimension,\n} from "./studioDelegation";''',
    '''  isDelegationOffered,\n  recomputeActiveDelegationAfterExplicitChange,\n  releaseDelegatedTaste,\n  takeBackDelegatedDimension,\n  takeBackDelegatedInterests,\n} from "./studioDelegation";''',
)

# 3) Feeling back-edit: persistent active delegation, legacy fallback release.
replace_once(
    "src/components/studio-v3/StudioV3.tsx",
    '''    // P10 — changing an explicit answer must never leave a stale delegated\n    // taste behind. Release what YES decided FIRST, then build ONE forward\n    // state from that released base, so the phase we advance to is resolved\n    // from the same truth we commit (a cleared interests/rhythm must be asked\n    // again, never skipped because the pre-release snapshot still had them).\n    const changed = state.feeling !== id;\n    const base = changed ? releaseDelegatedTaste(state) : state;\n    const forward: StudioV3State = { ...base, feeling: id };\n    if (changed) {\n      setDelegationNote(null);\n      setState(() => base);\n    }\n    const next = getNextPhase(forward, "feeling");''',
    '''    // P10 — trust persists. If YES still owns taste dimensions, a changed\n    // Feeling recomputes only those dimensions from the new explicit anchor.\n    // Pre-P10/legacy decidedForMe marks without active mode still use the\n    // release fallback so stale historical defaults cannot survive.\n    const changed = state.feeling !== id;\n    const forward: StudioV3State = changed\n      ? isDelegationActive(state)\n        ? recomputeActiveDelegationAfterExplicitChange(state, { feeling: id })\n        : { ...releaseDelegatedTaste(state), feeling: id }\n      : { ...state, feeling: id };\n    if (changed) {\n      setDelegationNote(null);\n      setState(() => forward);\n    }\n    const next = getNextPhase(forward, "feeling");''',
)

# 4) Companions back-edit: same persistent delegation semantics, then guest inference.
replace_once(
    "src/components/studio-v3/StudioV3.tsx",
    '''    // P10 — companions feeds deterministic rhythm inference, so a CHANGED\n    // explicit answer releases delegated taste first; guest inference then\n    // runs on that released base. Operational facts (date, pickup, guests,\n    // considerations, language) are untouched by the release.\n    const changed = state.companions !== id;\n    const base = changed ? releaseDelegatedTaste(state) : state;\n    if (changed) setDelegationNote(null);\n    const inferred = inferGuests(id, base.occasion, base.feeling);\n    let forward: StudioV3State;\n    if (inferred != null && (base.guestsInferred || base.guests == null)) {\n      forward = {\n        ...base,''',
    '''    // P10 — changing Who keeps active delegation, but recomputes only the\n    // taste dimensions YES owns before the existing operational guest\n    // inference runs. Legacy delegated marks without active mode are released.\n    const changed = state.companions !== id;\n    const tasteBase: StudioV3State = changed\n      ? isDelegationActive(state)\n        ? recomputeActiveDelegationAfterExplicitChange(state, { companions: id })\n        : { ...releaseDelegatedTaste(state), companions: id }\n      : { ...state, companions: id };\n    if (changed) setDelegationNote(null);\n    const inferred = inferGuests(id, tasteBase.occasion, tasteBase.feeling);\n    let forward: StudioV3State;\n    if (inferred != null && (tasteBase.guestsInferred || tasteBase.guests == null)) {\n      forward = {\n        ...tasteBase,''',
)
replace_once(
    "src/components/studio-v3/StudioV3.tsx",
    '''    } else if (inferred == null && base.guestsInferred) {\n      forward = {\n        ...base,\n        companions: id,\n        guests: null,\n        guestsInferred: false,\n        guestsPrivateEvent: false,\n      };\n    } else {\n      forward = { ...base, companions: id };\n    }''',
    '''    } else if (inferred == null && tasteBase.guestsInferred) {\n      forward = {\n        ...tasteBase,\n        companions: id,\n        guests: null,\n        guestsInferred: false,\n        guestsPrivateEvent: false,\n      };\n    } else {\n      forward = tasteBase;\n    }''',
)

# 5) Manual interest takeover: preserve visible set, then recompute delegated Rhythm only.
replace_once(
    "src/components/studio-v3/StudioV3.tsx",
    '''  const toggleInterest = (id: Interest) => {\n    setState((s) => {\n      // P10 — an explicit taste choice always beats delegated defaults: taking\n      // one back releases YES's decided taste values (never the operational\n      // facts) so nothing downstream stays stale.\n      const base = (s.decidedForMe ?? []).includes("interests")\n        ? releaseDelegatedTaste(s)\n        : s;\n      const has = base.interests.includes(id);\n      if (has) {\n        return { ...base, interests: base.interests.filter((x) => x !== id) };\n      }\n      // P5: inherited themes (already stated in Feeling) never consume a slot.\n      const countable = countableInterests(base.interests, deriveInheritedIntent(base));\n      if (countable.length >= MAX_INTERESTS) return base;\n      return { ...base, interests: [...base.interests, id] };\n    });\n  };''',
    '''  const toggleInterest = (id: Interest) => {\n    setState((s) => {\n      const has = s.interests.includes(id);\n      let explicitInterests: StudioV3State["interests"];\n      if (has) {\n        explicitInterests = s.interests.filter((x) => x !== id);\n      } else {\n        // P5: inherited themes (already stated in Feeling) never consume a slot.\n        const countable = countableInterests(s.interests, deriveInheritedIntent(s));\n        if (countable.length >= MAX_INTERESTS) return s;\n        explicitInterests = [...s.interests, id];\n      }\n\n      // If Interests were delegated, the visible set now becomes explicit as\n      // edited by the traveller. Keep delegation only for any remaining YES-\n      // owned dimension, and recompute delegated Rhythm from this explicit set.\n      return (s.decidedForMe ?? []).includes("interests")\n        ? takeBackDelegatedInterests(s, explicitInterests)\n        : { ...s, interests: explicitInterests };\n    });\n  };''',
)

# 6) Test imports.
replace_once(
    "src/components/studio-v3/__tests__/studio-p10-delegation.test.ts",
    '''  isDelegationOffered,\n  releaseDelegatedTaste,\n  takeBackDelegatedDimension,\n} from "../studioDelegation";''',
    '''  isDelegationOffered,\n  recomputeActiveDelegationAfterExplicitChange,\n  releaseDelegatedTaste,\n  takeBackDelegatedDimension,\n  takeBackDelegatedInterests,\n} from "../studioDelegation";''',
)

# 7) Update source-contract expectations that belonged to the interim cancel-on-back behavior.
replace_once(
    "src/components/studio-v3/__tests__/studio-p10-delegation.test.ts",
    '''  it("the handler computes next from the released forward state, not a stale snapshot", () => {\n    expect(STUDIO).toContain("const base = changed ? releaseDelegatedTaste(state) : state;");\n    expect(STUDIO).toContain('const next = getNextPhase(forward, "feeling");');\n    expect(STUDIO).not.toContain('getNextPhase({ ...state, feeling: id }, "feeling")');\n  });''',
    '''  it("the handler recomputes active delegation and routes from the same forward state", () => {\n    expect(STUDIO).toContain("recomputeActiveDelegationAfterExplicitChange(state, { feeling: id })");\n    expect(STUDIO).toContain('const next = getNextPhase(forward, "feeling");');\n    expect(STUDIO).not.toContain('getNextPhase({ ...state, feeling: id }, "feeling")');\n  });''',
)
replace_once(
    "src/components/studio-v3/__tests__/studio-p10-delegation.test.ts",
    '''  it("releases delegated taste before downstream guest inference", () => {\n    expect(STUDIO).toContain("const changed = state.companions !== id;");\n    expect(STUDIO).toContain("const inferred = inferGuests(id, base.occasion, base.feeling);");\n    expect(STUDIO).not.toContain("inferGuests(id, state.occasion, state.feeling)");\n  });''',
    '''  it("recomputes delegated taste before downstream guest inference", () => {\n    expect(STUDIO).toContain("const changed = state.companions !== id;");\n    expect(STUDIO).toContain("recomputeActiveDelegationAfterExplicitChange(state, { companions: id })");\n    expect(STUDIO).toContain("const inferred = inferGuests(id, tasteBase.occasion, tasteBase.feeling);");\n    expect(STUDIO).not.toContain("inferGuests(id, state.occasion, state.feeling)");\n  });''',
)

# 8) Persistence regressions.
test_path = Path("src/components/studio-v3/__tests__/studio-p10-delegation.test.ts")
test_text = test_path.read_text()
append = r'''

/* ---------------------------------------------------------------------------
 * P10 persistence — trust persists across Back-edits of explicit anchors.
 * ------------------------------------------------------------------------ */

describe("P10 persistence · active delegation recomputes, it does not disappear", () => {
  it("keeps mode and ownership while recomputing after Feeling changes", () => {
    const delegated = applyDelegation(ready).state;
    const recomputed = recomputeActiveDelegationAfterExplicitChange(delegated, {
      feeling: "wine-food",
    });
    expect(recomputed.delegationMode).toBe("yes-designs");
    expect(recomputed.decidedForMe).toEqual(delegated.decidedForMe);
    expect(recomputed.interests).toContain("wine");
    expect(recomputed.interests).not.toEqual(delegated.interests);
    expect(recomputed.rhythm).not.toBeNull();
    expect(isDelegationOffered(recomputed, "interests")).toBe(false);
    expect(isDelegationOffered(recomputed, "rhythm")).toBe(false);
  });

  it("is deterministic for the same changed explicit anchor", () => {
    const delegated = applyDelegation(ready).state;
    const a = recomputeActiveDelegationAfterExplicitChange(delegated, { feeling: "wine-food" });
    const b = recomputeActiveDelegationAfterExplicitChange(delegated, { feeling: "wine-food" });
    expect(a.interests).toEqual(b.interests);
    expect(a.rhythm).toBe(b.rhythm);
    expect(a.decidedForMe).toEqual(b.decidedForMe);
  });

  it("keeps operational fields untouched when Who changes", () => {
    const delegated = applyDelegation(
      state({
        ...ready,
        dateMode: "exact",
        dateExact: "2026-06-15",
        pickup: "lisbon",
        guests: 4,
        adults: 2,
        minorAges: [7, 9],
        considerations: ["reduced-mobility"],
        language: "en",
      }),
    ).state;
    const recomputed = recomputeActiveDelegationAfterExplicitChange(delegated, {
      companions: "family",
    });
    expect(recomputed.delegationMode).toBe("yes-designs");
    expect(recomputed.decidedForMe).toEqual(delegated.decidedForMe);
    expect(recomputed.dateMode).toBe("exact");
    expect(recomputed.dateExact).toBe("2026-06-15");
    expect(recomputed.pickup).toBe("lisbon");
    expect(recomputed.guests).toBe(4);
    expect(recomputed.adults).toBe(2);
    expect(recomputed.minorAges).toEqual([7, 9]);
    expect(recomputed.considerations).toEqual(["reduced-mobility"]);
    expect(recomputed.language).toBe("en");
  });

  it("manual Interest edit takes only Interests back and recomputes delegated Rhythm", () => {
    const delegated = applyDelegation(ready).state;
    const visible = delegated.interests;
    expect(visible.length).toBeGreaterThan(0);
    const explicit = visible.slice(1);
    const taken = takeBackDelegatedInterests(delegated, explicit);
    expect(taken.interests).toEqual(explicit);
    expect(taken.decidedForMe).not.toContain("interests");
    expect(taken.decidedForMe).toContain("rhythm");
    expect(taken.delegationMode).toBe("yes-designs");

    const expected = applyDelegation(
      state({
        ...taken,
        interests: explicit,
        rhythm: null,
        delegationMode: null,
        decidedForMe: [],
      }),
    ).state.rhythm;
    expect(taken.rhythm).toBe(expected);
  });

  it("manual takeover of the last remaining delegated dimension ends delegation", () => {
    const delegated = applyDelegation(ready).state;
    const interestsExplicit = takeBackDelegatedInterests(delegated, delegated.interests);
    expect(interestsExplicit.decidedForMe).toEqual(["rhythm"]);
    expect(interestsExplicit.delegationMode).toBe("yes-designs");
    const fullyExplicit = takeBackDelegatedDimension(interestsExplicit, "rhythm");
    expect(fullyExplicit.decidedForMe).toEqual([]);
    expect(fullyExplicit.delegationMode).toBeNull();
  });

  it("Studio handlers use persistent recomputation and visible-set takeover", () => {
    expect(STUDIO).toContain("recomputeActiveDelegationAfterExplicitChange(state, { feeling: id })");
    expect(STUDIO).toContain("recomputeActiveDelegationAfterExplicitChange(state, { companions: id })");
    expect(STUDIO).toContain("takeBackDelegatedInterests(s, explicitInterests)");
  });
});
'''
if "P10 persistence · active delegation recomputes" in test_text:
    raise SystemExit("persistence tests already present")
test_path.write_text(test_text + append)

print("P10 persistence patch applied successfully")
