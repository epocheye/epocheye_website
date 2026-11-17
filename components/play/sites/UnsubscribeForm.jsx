"use client";

// One tap stops every Play email. A second, unticked box also deletes the address.
// The token comes from the address (#t=..., or an older ?t= link) and is taken out of the address
// bar on arrival.

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { unsubscribeLink } from "@/lib/play/community";
import { Pill } from "@/components/play/ui";

function takeToken() {
	try {
		const t = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("t") || new URLSearchParams(window.location.search).get("t") || "";
		if (window.location.hash || window.location.search) window.history.replaceState(null, "", window.location.pathname);
		return t.length <= 600 ? t : "";
	} catch {
		return "";
	}
}

export default function UnsubscribeForm() {
	const [t, setT] = useState("");
	const [forget, setForget] = useState(false);
	useEffect(() => {
		const token = takeToken();
		startTransition(() => setT(token));
	}, []);
	const [state, setState] = useState({ step: "ask", forgot: false });

	const submit = async (e) => {
		e.preventDefault();
		if (state.step === "busy") return;
		setState({ step: "busy", forgot: false });
		const r = await unsubscribeLink(t, forget);
		if (r.ok) setState({ step: "done", forgot: !!r.forgot });
		else setState({ step: r.status === 429 ? "busy-error" : "failed", forgot: false });
	};

	if (state.step === "done") {
		return (
			<>
				<p className="play-msg" role="status">
					{state.forgot ? "Done. We will not email you about Play again, and your address is deleted." : "Done. We will not email you about Play again."}
				</p>
				<div className="play-vote-actions">
					<Link href="/play" className="play-pill">
						Go to Play
					</Link>
				</div>
			</>
		);
	}

	return (
		<form className="play-email-form" onSubmit={submit}>
			<p className="play-msg">Stop every email about Epocheye Play. Your game stays as it is.</p>
			<label className="play-consent">
				<input type="checkbox" checked={forget} onChange={(e) => setForget(e.target.checked)} />
				<span>Also delete my email address. My vote then stops counting.</span>
			</label>
			{state.step === "failed" ? (
				<p className="play-msg is-error" role="alert">
					This link does not work. Use the link from the latest email we sent.
				</p>
			) : state.step === "busy-error" ? (
				<p className="play-msg is-error" role="alert">
					Too many tries. Wait a minute and try again.
				</p>
			) : null}
			<div>
				<Pill strong type="submit" disabled={!t || state.step === "busy"}>
					{state.step === "busy" ? "Stopping" : "Stop Play emails"}
				</Pill>
			</div>
		</form>
	);
}
