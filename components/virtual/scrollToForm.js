"use client";

// Scrolls to the nearest early-access form at or below the current position (the last one if all
// are above) and focuses its email field.
export function scrollToForm() {
	const forms = Array.from(document.querySelectorAll("[data-early-access]"));
	if (!forms.length) return;
	const form = forms.find((f) => f.getBoundingClientRect().bottom > 0) || forms[forms.length - 1];
	if (window.__lenis) window.__lenis.scrollTo(form, { offset: -window.innerHeight / 3, duration: 1.8 });
	else form.scrollIntoView({ behavior: "smooth", block: "center" });
	window.setTimeout(() => form.querySelector("input[type=email]")?.focus({ preventScroll: true }), 1900);
}
