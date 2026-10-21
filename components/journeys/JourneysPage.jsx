"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import {
	FOOTER,
	FRAMES,
	HERO,
	MONUMENTS,
	PRICING_NOTE,
	TIERS,
	VOTE_CARD,
	frameOrder,
	tierOrder,
} from "@/lib/journeys/config";
import { FRAME_ALIGN } from "@/lib/journeys/keyframes";
import Button from "./Button";
import Header from "./Header";
import MonumentCard from "./MonumentCard";
import NotifyForm from "./NotifyForm";
import ReserveModal from "./ReserveModal";
import SplitReveal from "./SplitReveal";
import Stage from "./Stage";
import { stage } from "./store";
import { trackJourneys } from "./track";

gsap.registerPlugin(ScrollTrigger);

// ------------------------------------------------------------------------------------ frames

function Frame({ index, children, className = "", id }) {
	const align = FRAME_ALIGN[index] || "left";
	return (
		<section id={id} data-frame={index} className={`jr-frame jr-frame--${align} ${className}`.trim()}>
			<div className="jr-frame__inner">
				<div className="jr-frame__col">{children}</div>
			</div>
		</section>
	);
}

function Statement({ index, eyebrow, hot, title, sub, cta }) {
	return (
		<Frame index={index}>
			{eyebrow ? <p className={`jr-eyebrow ${hot ? "jr-eyebrow--hot" : ""}`.trim()}>{eyebrow}</p> : null}
			<SplitReveal className="jr-h2">{title}</SplitReveal>
			{sub ? <p className="jr-body jr-frame__sub">{sub}</p> : null}
			{cta ? <div className="jr-frame__cta">{cta}</div> : null}
		</Frame>
	);
}

function HeroFrame({ variant, onReserve }) {
	return (
		<Frame index={0} id="top" className="jr-hero">
			<p className="jr-eyebrow">{HERO.eyebrow}</p>
			<h1 className="jr-h1">{HERO.title}</h1>
			<p className="jr-body">{HERO.line[variant] || HERO.line.default}</p>
			<div className="jr-frame__cta">
				<Button onClick={() => onReserve("hero")}>{HERO.button}</Button>
			</div>
		</Frame>
	);
}

function StepsFrame({ index }) {
	const s = FRAMES.steps;
	return (
		<Frame index={index}>
			<p className="jr-steps__small">{s.small}</p>
			<SplitReveal className="jr-h2">{s.title}</SplitReveal>
			<ol className="jr-steps__list">
				{s.items.map((it) => (
					<li key={it.n} className="jr-steps__item">
						<span className="jr-steps__n">{it.n}</span>
						<span>
							<span className="jr-steps__a">{it.a}</span>
							<span className="jr-steps__b">{it.b}</span>
						</span>
					</li>
				))}
			</ol>
		</Frame>
	);
}

function FactFrame({ index, fact }) {
	return (
		<Frame index={index}>
			<p className="jr-fact__title">{fact.title}</p>
			<SplitReveal className="jr-fact__sub">{fact.sub}</SplitReveal>
		</Frame>
	);
}

// ---------------------------------------------------------------------------------- sections

function Collection({ onReserve, onVote }) {
	const c = FRAMES.collection;
	return (
		<section className="jr-section" data-section="collection" id="collection">
			<div className="jr-section__inner">
				<p className="jr-eyebrow">{c.eyebrow}</p>
				<SplitReveal className="jr-h2">{c.title}</SplitReveal>
				<ul className="jr-cards">
					{MONUMENTS.map((m) => (
						<MonumentCard key={m.slug} monument={m} onReserve={onReserve} />
					))}
					<li className="jr-card jr-card--vote">
						<h3 className="jr-card__name">{VOTE_CARD.name}</h3>
						<p className="jr-card__meta">{VOTE_CARD.line}</p>
						<div>
							<Button small onClick={onVote}>
								Vote
							</Button>
						</div>
					</li>
				</ul>
			</div>
		</section>
	);
}

function Pricing({ variant, onReserve }) {
	const p = FRAMES.pricing;
	return (
		<section className="jr-section" data-section="pricing" id="pricing">
			<div className="jr-section__inner">
				<p className="jr-eyebrow">{p.eyebrow}</p>
				<SplitReveal className="jr-h2">{p.title}</SplitReveal>
				<ul className="jr-tiers">
					{tierOrder(variant).map((id) => {
						const t = TIERS[id];
						return (
							<li key={id} className="jr-tier">
								<h3 className="jr-tier__name">{t.name}</h3>
								<div className="jr-tier__price">
									<span className="jr-tier__founding">{t.founding}</span>
									<span className="jr-tier__full">{t.price}</span>
								</div>
								<p className="jr-tier__label">
									Founding price <span className="jr-gold">{t.founding}</span>, then {t.price}
								</p>
								<ul className="jr-tier__list">
									{t.includes.map((line) => (
										<li key={line}>{line}</li>
									))}
								</ul>
								<div style={{ marginTop: "auto" }}>
									<Button onClick={() => onReserve("pricing", null, id)}>Reserve the {t.name.toLowerCase()}</Button>
								</div>
							</li>
						);
					})}
				</ul>
				<p className="jr-pricing__note jr-body">{PRICING_NOTE}</p>
			</div>
		</section>
	);
}

function Refund() {
	return (
		<section className="jr-section" data-section="refund">
			<div className="jr-section__inner">
				<ul className="jr-promise">
					{FRAMES.refund.lines.map((line) => (
						<SplitReveal key={line} as="li">
							{line}
						</SplitReveal>
					))}
				</ul>
			</div>
		</section>
	);
}

function Founder() {
	const f = FRAMES.founder;
	return (
		<section className="jr-section" data-section="founder">
			<div className="jr-section__inner">
				<div className="jr-founder">
					<p className="jr-eyebrow">{f.eyebrow}</p>
					<p className="jr-founder__text">{f.text}</p>
					<p className="jr-founder__sig">{f.signature}</p>
				</div>
			</div>
		</section>
	);
}

function Final({ variant, onReserve }) {
	const f = FRAMES.final;
	return (
		<section className="jr-section jr-final" data-section="final" id="reserve">
			<div className="jr-section__inner">
				<SplitReveal className="jr-h2">{f.title}</SplitReveal>
				<div className="jr-frame__cta">
					<Button onClick={() => onReserve("final")}>{f.button}</Button>
				</div>
				<NotifyForm variant={variant} />
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="jr-footer">
			<p>{FOOTER.company}</p>
			<nav aria-label="Legal">
				{FOOTER.links.map((l) =>
					l.href.startsWith("/") ? (
						<Link key={l.label} href={l.href}>
							{l.label}
						</Link>
					) : (
						<a key={l.label} href={l.href}>
							{l.label}
						</a>
					),
				)}
			</nav>
		</footer>
	);
}

// ------------------------------------------------------------------------------------- page

const STATEMENTS = {
	gone: { eyebrow: FRAMES.gone.eyebrow, hot: true, title: FRAMES.gone.title },
	rebuilt: { eyebrow: FRAMES.rebuilt.eyebrow, title: FRAMES.rebuilt.title },
	reserve: { eyebrow: FRAMES.reserve.eyebrow, title: FRAMES.reserve.title },
	stops: { eyebrow: FRAMES.stops.eyebrow, title: FRAMES.stops.title },
	narration: { eyebrow: FRAMES.narration.eyebrow, title: FRAMES.narration.title },
	rockets: { eyebrow: FRAMES.rockets.eyebrow, title: FRAMES.rockets.title },
	walkin: { eyebrow: FRAMES.walkin.eyebrow, title: FRAMES.walkin.title },
};

export default function JourneysPage({ variant, checkoutEnabled }) {
	const [modal, setModal] = useState(null);
	const [modalKey, setModalKey] = useState(0);
	const [off, setOff] = useState(false);
	const root = useRef(null);

	const order = frameOrder(variant);
	const frameCount = order.length + FRAMES.facts.length;

	useEffect(() => {
		trackJourneys("journeys_page_view", { variant });
	}, [variant]);

	// Smooth scroll + one ScrollTrigger per frame feeding the shared stage state.
	useGSAP(
		() => {
			stage.frames = frameCount;
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			const coarse = window.matchMedia("(pointer: coarse)").matches;

			let lenis = null;
			let tick = null;
			if (!reduce && !coarse) {
				lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
				lenis.on("scroll", ScrollTrigger.update);
				tick = (time) => lenis.raf(time * 1000);
				gsap.ticker.add(tick);
				gsap.ticker.lagSmoothing(0);
				window.__lenis = lenis;
			}

			const frames = gsap.utils.toArray("[data-frame]", root.current);
			frames.forEach((el, i) => {
				ScrollTrigger.create({
					trigger: el,
					start: "top bottom",
					end: "bottom top",
					onUpdate: (self) => {
						stage.t = i + self.progress;
					},
				});
			});

			const grid = root.current.querySelector("[data-section='collection']");
			ScrollTrigger.create({
				trigger: grid,
				start: "top 60%",
				onEnter: () => {
					stage.t = frameCount + 0.5;
					startTransition(() => setOff(true));
				},
				onLeaveBack: () => startTransition(() => setOff(false)),
			});

			const onPointer = (e) => {
				stage.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
				stage.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
			};
			window.addEventListener("pointermove", onPointer, { passive: true });

			return () => {
				window.removeEventListener("pointermove", onPointer);
				if (tick) gsap.ticker.remove(tick);
				lenis?.destroy();
				if (window.__lenis === lenis) window.__lenis = null;
			};
		},
		{ scope: root, dependencies: [frameCount] },
	);

	function openReserve(source, monument = null, tier = null) {
		trackJourneys("journeys_reserve_click", { variant, source, monument: monument || "" });
		setModalKey((k) => k + 1);
		setModal({ mode: "reserve", monument: monument || MONUMENTS[0].slug, tier, source });
	}

	function openVote() {
		trackJourneys("journeys_vote_click", { variant });
		setModalKey((k) => k + 1);
		setModal({ mode: "vote" });
	}

	let index = 0;
	const frames = order.map((key) => {
		const i = index++;
		if (key === "hero") return <HeroFrame key={key} variant={variant} onReserve={openReserve} />;
		if (key === "steps") return <StepsFrame key={key} index={i} />;
		return <Statement key={key} index={i} {...STATEMENTS[key]} />;
	});
	const facts = FRAMES.facts.map((fact) => <FactFrame key={fact.sub} index={index++} fact={fact} />);

	return (
		<div ref={root}>
			<Header onReserve={openReserve} />
			<Stage off={off} />
			<main className="jr-content">
				{frames}
				{facts}
				<Collection onReserve={openReserve} onVote={openVote} />
				<Pricing variant={variant} onReserve={openReserve} />
				<Refund />
				<Founder />
				<Final variant={variant} onReserve={openReserve} />
				<Footer />
			</main>
			{modal ? (
				<ReserveModal key={modalKey} open={modal} onClose={() => setModal(null)} variant={variant} checkoutEnabled={checkoutEnabled} />
			) : null}
		</div>
	);
}
