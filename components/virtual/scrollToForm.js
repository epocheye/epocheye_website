"use client";

// Scrolls to the early-access form in the hero and focuses its email field.
export function scrollToForm() {
	const form = document.getElementById("early-access");
	if (!form) return;
	form.scrollIntoView({ behavior: "smooth", block: "center" });
	window.setTimeout(() => form.querySelector("input[type=email]")?.focus({ preventScroll: true }), 700);
}
