"use client";

// The feature switches (lib/play/features.js), handed down from the /play layout so client
// components can hide what is switched off. The server decides; this only carries its answer.

import { createContext, useContext } from "react";

const ALL_ON = { enabled: true, daily: true, vote: true, leaderboards: true, email: true, narration: true, analytics: true };

const FeaturesContext = createContext(ALL_ON);

export function PlayFeaturesProvider({ value, children }) {
	return <FeaturesContext value={value || ALL_ON}>{children}</FeaturesContext>;
}

export function usePlayFeatures() {
	return useContext(FeaturesContext);
}
