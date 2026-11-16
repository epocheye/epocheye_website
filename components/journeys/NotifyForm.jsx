"use client";

import { useState } from "react";

import { FRAMES } from "@/lib/journeys/config";
import { landingParams, trackJourneys } from "./track";
import Button from "./Button";

// "Just notify me": saves an email only.
export default function NotifyForm({ variant }) {
	const [email, setEmail] = useState("");
	const [state, setState] = useState({ status: "idle", error: null });
	const copy = FRAMES.final;

	async function submit(e) {
		e.preventDefault();
		if (state.status === "submitting") return;
		setState({ status: "submitting", error: null });
		try {
			const res = await fetch("/api/journeys/intent", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ kind: "notify", email, variant, website: e.currentTarget?.website?.value || "", ...landingParams() }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong. Please try again.");
			trackJourneys("journeys_notify", { variant });
			setState({ status: "done", error: null });
		} catch (err) {
			setState({ status: "idle", error: err.message });
		}
	}

	if (state.status === "done") {
		return (
			<p className="jr-success" role="status">
				{copy.notifyDone}
			</p>
		);
	}

	return (
		<form className="jr-notify" onSubmit={submit}>
			<label htmlFor="jr-notify-email" className="jr-notify__label">
				{copy.notify}
			</label>
			<div className="jr-notify__row">
				<input
					id="jr-notify-email"
					className="jr-input"
					type="email"
					inputMode="email"
					autoComplete="email"
					placeholder={copy.notifyPlaceholder}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<div className="jr-honeypot" aria-hidden="true">
					<label htmlFor="jr-notify-website">Website</label>
					<input id="jr-notify-website" name="website" tabIndex={-1} autoComplete="off" />
				</div>
				<Button type="submit" small disabled={state.status === "submitting"}>
					{copy.notifyButton}
				</Button>
			</div>
			{state.error ? (
				<p className="jr-error" role="alert">
					{state.error}
				</p>
			) : null}
		</form>
	);
}
