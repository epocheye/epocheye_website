"use client";

import Link from "next/link";

function Arrow() {
	return (
		<svg className="jr-btn__arrow" viewBox="0 0 18 18" fill="none" aria-hidden="true">
			<rect x="0.5" y="0.5" width="17" height="17" rx="2" stroke="currentColor" opacity="0.45" />
			<path d="M6 12L12 6M12 6H7.5M12 6V10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

// Outlined pill with a small square arrow. Border turns white and the arrow nudges 4px
// up-right on hover (see .jr-btn in app/journeys/journeys.css).
export default function Button({ href, children, small, className = "", type = "button", ...rest }) {
	const cls = `jr-btn ${small ? "jr-btn--small" : ""} ${className}`.trim();
	if (href) {
		return (
			<Link href={href} className={cls} {...rest}>
				<span>{children}</span>
				<Arrow />
			</Link>
		);
	}
	return (
		<button type={type} className={cls} {...rest}>
			<span>{children}</span>
			<Arrow />
		</button>
	);
}
