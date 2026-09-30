import { createContext, useContext } from "react";

/** Bumps when the Guide App should quietly refetch (focus, realtime). Screens refetch in place — never remount. */
export const GuideRefreshContext = createContext(0);
export const useGuideRefresh = () => useContext(GuideRefreshContext);
