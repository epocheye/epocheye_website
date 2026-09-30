import Link from "next/link";

// Plain server-rendered frame for editorial pages: no preloader, no intro, text visible at
// first paint (the visitor is on a phone at the monument).
export default function PageShell({ crumbs = [], children }) {
	return (
		<div className="min-h-screen bg-ink text-white font-sans">
			<header className="border-b border-white/5">
				<nav
					aria-label="Breadcrumb"
					className="mx-auto flex max-w-3xl items-baseline gap-2 px-4 py-5 text-[11px] uppercase tracking-[0.18em] text-white/40 sm:px-8">
					<Link href="/" className="font-montserrat font-semibold normal-case tracking-normal text-sm text-white/80 hover:text-white">
						Epocheye
					</Link>
					{crumbs.map((c) => (
						// The current page's name is already the h1, so on phones it is dropped here.
						<span
							key={c.path}
							className={`min-w-0 items-baseline gap-2 whitespace-nowrap ${c.current && crumbs.length > 1 ? "hidden sm:flex" : "flex"}`}>
							<span className="text-white/20">/</span>
							{c.current ? (
								<span aria-current="page" className="truncate text-white/60">
									{c.name}
								</span>
							) : (
								<Link href={c.path} className="hover:text-white/70">
									{c.name}
								</Link>
							)}
						</span>
					))}
				</nav>
			</header>
			<main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">{children}</main>
			<footer className="border-t border-white/5">
				<div className="mx-auto max-w-3xl px-4 py-8 text-xs text-white/35 sm:px-8">
					© Epocheye Private Limited
				</div>
			</footer>
		</div>
	);
}
