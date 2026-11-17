"use client";

// The cards of an "order" step. The player puts dated cards in their places: by dragging a card
// onto a place, or by tapping a card and then tapping its place. A card stays only in its own
// place. Every card and place is a button, so the keyboard and a screen reader work the same way.
// All card copy comes from site.json. The text written here is generic interface text.

import { useRef, useState } from "react";
import { orderDeck, orderRows, orderSlots, textFor } from "@/lib/play/story/engine";

const DRAG_START_PX = 8;

export default function OrderBoard({ beat, lens, fallbackLens, placed, telling, miss, onPlace, onSources }) {
	const board = useRef(null);
	const drag = useRef(null); // { id, pointerId, x0, y0, moved, el, over }
	const dragged = useRef(false); // the tap that ends a drag is not a tap on the card
	const [selected, setSelected] = useState(null);
	const [dragging, setDragging] = useState(null);
	const [hint, setHint] = useState("");
	const [seenMiss, setSeenMiss] = useState(0); // the last "does not go there" the player has moved on from

	const total = orderSlots(beat).length;
	const deck = orderDeck(beat).filter((c) => !placed.includes(c.id));
	const rows = orderRows(beat, placed);
	const solved = deck.length === 0;
	const chosen = selected && deck.some((c) => c.id === selected) ? selected : null;
	const chosenCard = chosen ? deck.find((c) => c.id === chosen) : null;
	const say = (value) => textFor(value, lens, fallbackLens);

	const place = (id, slot) => {
		setSelected(null);
		setHint("");
		onPlace(id, slot);
	};

	const slotAt = (x, y) => {
		const slots = board.current ? [...board.current.querySelectorAll("[data-slot]")] : [];
		let best = null;
		for (const el of slots) {
			const r = el.getBoundingClientRect();
			// A little forgiveness above and below: the places are close together.
			if (x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 3 && y <= r.bottom + 3) best = el;
		}
		return best;
	};

	const over = (el) => {
		const d = drag.current;
		if (!d || d.over === el) return;
		d.over?.classList.remove("is-over");
		el?.classList.add("is-over");
		d.over = el;
	};

	const onPointerDown = (e, card) => {
		if (e.pointerType === "mouse" && e.button !== 0) return;
		drag.current = { id: card.id, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, el: e.currentTarget, over: null };
		e.currentTarget.setPointerCapture?.(e.pointerId);
	};
	const onPointerMove = (e) => {
		const d = drag.current;
		if (!d || d.pointerId !== e.pointerId) return;
		const dx = e.clientX - d.x0;
		const dy = e.clientY - d.y0;
		if (!d.moved) {
			if (Math.hypot(dx, dy) < DRAG_START_PX) return;
			d.moved = true;
			setDragging(d.id);
			setSelected(null);
			setHint("");
			setSeenMiss(miss?.n || 0);
		}
		d.el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
		over(slotAt(e.clientX, e.clientY));
	};
	const endDrag = (e, cancelled) => {
		const d = drag.current;
		if (!d || d.pointerId !== e.pointerId) return;
		const target = d.moved && !cancelled ? slotAt(e.clientX, e.clientY) : null;
		over(null);
		d.el.style.transform = "";
		drag.current = null;
		if (!d.moved) return;
		// A mouse drag ends with a click on the card. Swallow that one click, and only that one.
		dragged.current = true;
		setTimeout(() => {
			dragged.current = false;
		}, 60);
		setDragging(null);
		if (target) place(d.id, Number(target.dataset.slot));
	};

	const onCardClick = (card) => {
		if (dragged.current) {
			dragged.current = false;
			return;
		}
		setHint("");
		setSeenMiss(miss?.n || 0);
		setSelected(chosen === card.id ? null : card.id);
	};
	const onSlotClick = (slot) => {
		if (!chosen) {
			setHint("Pick a card first, then its place.");
			return;
		}
		place(chosen, slot);
	};

	let status = hint;
	if (!status && miss && miss.n !== seenMiss) {
		const label = (beat.cards || []).find((c) => c.id === miss.id)?.label;
		status = label ? `${label} does not go there. Try another place.` : "That card does not go there. Try another place.";
	}
	if (!status) {
		if (solved) status = "All in order.";
		else if (chosenCard) status = `${chosenCard.label}. Now tap its place.`;
		else status = "Tap a card, then tap its place. Or drag it there.";
	}

	return (
		<div ref={board} className={`play-order${dragging ? " is-dragging" : ""}`}>
			{deck.length ? (
				<div className="play-order-tray" role="group" aria-label="Cards to place">
					{deck.map((card) => (
						<button
							key={card.id}
							type="button"
							className={`play-order-card${chosen === card.id ? " is-selected" : ""}${dragging === card.id ? " is-held" : ""}`}
							aria-pressed={chosen === card.id}
							aria-label={`${card.label}. Card to place`}
							onClick={() => onCardClick(card)}
							onPointerDown={(e) => onPointerDown(e, card)}
							onPointerMove={onPointerMove}
							onPointerUp={(e) => endDrag(e, false)}
							onPointerCancel={(e) => endDrag(e, true)}
						>
							{card.label}
						</button>
					))}
				</div>
			) : null}
			<ol className="play-order-list" aria-label="The order">
				{rows.map((row) => {
					const { card } = row;
					if (row.gap) {
						return (
							<li key={card.id} className={`play-order-row is-gap${telling === card.id ? " is-telling" : ""}`}>
								<span className="play-order-n" aria-hidden="true" />
								<span className="play-order-label">{card.label}</span>
								{card.facts?.length ? (
									<button type="button" className="play-link-btn play-order-source" onClick={() => onSources?.(card)}>
										Source
									</button>
								) : null}
								<span className="play-order-text">{say(card.text)}</span>
							</li>
						);
					}
					if (row.placed) {
						return (
							<li key={card.id} className="play-order-row is-placed">
								<span className="play-order-n" aria-hidden="true">{row.slot + 1}</span>
								<span className="play-order-label">{card.label}</span>
								<span className="play-order-text">{say(card.text)}</span>
							</li>
						);
					}
					const missed = miss && miss.slot === row.slot && miss.n !== seenMiss;
					return (
						<li key={`slot:${row.slot}`} className="play-order-row is-open">
							<button
								// A new key on a miss replays the "not here" shake.
								key={missed ? `miss:${miss.n}` : "open"}
								type="button"
								className={`play-order-slot${missed ? " is-missed" : ""}`}
								data-slot={row.slot}
								aria-label={chosenCard ? `Place ${row.slot + 1} of ${total}. Empty. Put ${chosenCard.label} here` : `Place ${row.slot + 1} of ${total}. Empty`}
								onClick={() => onSlotClick(row.slot)}
							>
								<span className="play-order-n" aria-hidden="true">{row.slot + 1}</span>
							</button>
						</li>
					);
				})}
			</ol>
			<p className="play-order-status" role="status" aria-live="polite">
				{status}
			</p>
		</div>
	);
}
