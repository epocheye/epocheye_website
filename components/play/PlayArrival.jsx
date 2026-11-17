"use client";

// Mounted once by the /play layout: keeps a ?c=<code> creator code and where the player came
// from for this tab (lib/play/player.js). Renders nothing and shows the player nothing.

import { useEffect } from "react";
import { captureArrival } from "@/lib/play/player";

export default function PlayArrival() {
	useEffect(() => {
		captureArrival();
	}, []);
	return null;
}
