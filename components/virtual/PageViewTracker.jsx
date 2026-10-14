"use client";

import { useEffect } from "react";
import { trackVirtual } from "./track";

export default function PageViewTracker() {
	useEffect(() => {
		trackVirtual("virtual_page_view");
	}, []);
	return null;
}
