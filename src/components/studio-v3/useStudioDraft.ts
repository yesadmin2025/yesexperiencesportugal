import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { StudioV3State } from "./types";
import {
  claimStudioDraftRestoreNotice,
  clearStudioDraftStorage,
  createStudioDraftEnvelope,
  hasMeaningfulStudioProgress,
  hydrateSavedStudioState,
  readStudioDraft,
  validAddOnIdsForState,
  writeStudioDraft,
} from "./studioDraftStorage";

const DEBOUNCE_MS = 500;

type HydrationStatus = "checking" | "loading-saved" | "ready" | "error";
type HydrationError = "not-found" | "failed" | null;

interface SavedSignatureResult {
  found: boolean;
  state?: unknown;
}

interface Options {
  state: StudioV3State;
  setState: Dispatch<SetStateAction<StudioV3State>>;
  selectedAddOnIds: string[];
  restoreAddOnIds: (ids: string[]) => void;
  savedToken?: string;
  loadSavedSignature: (token: string) => Promise<SavedSignatureResult>;
}

export function useStudioDraft({
  state,
  setState,
  selectedAddOnIds,
  restoreAddOnIds,
  savedToken,
  loadSavedSignature,
}: Options) {
  const [status, setStatus] = useState<HydrationStatus>(savedToken ? "loading-saved" : "checking");
  const [error, setError] = useState<HydrationError>(null);
  const [restoreNoticeId, setRestoreNoticeId] = useState<string | null>(null);
  const committedRef = useRef(false);
  const runRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const finalizedRef = useRef(false);
  const loaderRef = useRef(loadSavedSignature);
  const restoreAddOnsRef = useRef(restoreAddOnIds);
  const savedRequestRef = useRef<Promise<SavedSignatureResult> | null>(null);

  useEffect(() => {
    loaderRef.current = loadSavedSignature;
  }, [loadSavedSignature]);

  useEffect(() => {
    restoreAddOnsRef.current = restoreAddOnIds;
  }, [restoreAddOnIds]);

  useEffect(() => {
    if (committedRef.current) return;
    const run = ++runRef.current;

    const commitLocal = () => {
      const draft = readStudioDraft();
      if (run !== runRef.current || committedRef.current) return;
      committedRef.current = true;
      if (draft) {
        draftIdRef.current = draft.draftId;
        setState(draft.state);
        const ids =
          draft.tourId && draft.tourId === draft.state.tourId
            ? validAddOnIdsForState(draft.state, draft.addOnIds)
            : [];
        restoreAddOnsRef.current(ids);
        if (claimStudioDraftRestoreNotice(draft.draftId)) setRestoreNoticeId(draft.draftId);
      }
      setStatus("ready");
    };

    if (!savedToken) {
      commitLocal();
      return () => {
        if (runRef.current === run) runRef.current += 1;
      };
    }

    setStatus("loading-saved");
    const request = savedRequestRef.current ?? loaderRef.current(savedToken);
    savedRequestRef.current = request;
    void request.then(
      (result) => {
        if (run !== runRef.current || committedRef.current) return;
        if (!result.found) {
          committedRef.current = true;
          savedRequestRef.current = null;
          setError("not-found");
          setStatus("error");
          return;
        }
        const restored = hydrateSavedStudioState(result.state);
        if (!restored) {
          committedRef.current = true;
          savedRequestRef.current = null;
          setError("failed");
          setStatus("error");
          return;
        }
        committedRef.current = true;
        savedRequestRef.current = null;
        draftIdRef.current = null;
        restoreAddOnsRef.current([]);
        setState(restored);
        setError(null);
        setStatus("ready");
      },
      () => {
        if (run !== runRef.current || committedRef.current) return;
        committedRef.current = true;
        savedRequestRef.current = null;
        setError("failed");
        setStatus("error");
      },
    );

    return () => {
      if (runRef.current === run) runRef.current += 1;
    };
  }, [savedToken, setState]);

  useEffect(() => {
    if (status !== "ready" || finalizedRef.current || !hasMeaningfulStudioProgress(state)) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (finalizedRef.current) return;
      const envelope = createStudioDraftEnvelope({
        draftId: draftIdRef.current,
        state,
        addOnIds: selectedAddOnIds,
      });
      draftIdRef.current = envelope.draftId;
      writeStudioDraft(envelope);
      timerRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, state, selectedAddOnIds]);

  const clearDraft = useCallback(() => {
    finalizedRef.current = true;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearStudioDraftStorage();
  }, []);

  return {
    status,
    error,
    restoreNoticeId,
    clearDraft,
  };
}
