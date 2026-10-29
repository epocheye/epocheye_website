"use client";

import dynamic from "next/dynamic";

// The whole page is one WebGL scene, so it renders on the client only. The
// server-rendered copy lives in app/preorder/page.js for crawlers and screen readers.
const PreorderExperience = dynamic(() => import("./PreorderExperience"), {
	ssr: false,
	loading: () => <div className="fixed inset-0 bg-black" />,
});

export default function PreorderClient() {
	return <PreorderExperience />;
}
