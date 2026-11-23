"use client";

// The panorama the open world steps into for rooms a player cannot walk: the stair, the upper
// hall, the reveal. It is the same viewer and the same pack as Story view. Loaded on demand, so it
// costs the first playable nothing.

import { useEffect, useMemo, useRef } from "react";
import { directionFrom, nodeById } from "@/lib/play/pack";
import PanoViewer from "@/components/play/engine/PanoViewer";

// How close to the middle of the view a look target must be, as a share of the shorter side.
const LOOK_SHARE = 0.26;
const LOOK_POLL_MS = 100;

export default function WorldPano({ site, urls, nodeId, target, restored, animateId, onRevealDone, revealAll, animateAll, onAllDone, proof, lookGoal, onLook, onLooked, onCore }) {
	const node = nodeById(site, nodeId) || site.nodes[0];
	const core = useRef(null);
	const aim = target ? target.join(",") : "";
	const view = useMemo(() => {
		const to = aim ? aim.split(",").map(Number) : null;
		return { node: node.id, look: to ? directionFrom(node, to) : null, n: 1 };
	}, [node, aim]);

	// Holding the view on a target. Polled, because the picture only redraws when it moves.
	const goalId = lookGoal?.id ?? null;
	const goalTarget = lookGoal?.target;
	const goalHold = lookGoal?.hold_ms ?? 2000;
	useEffect(() => {
		if (!goalId || !goalTarget) return undefined;
		const dir = directionFrom(node, goalTarget);
		if (!dir) return undefined;
		let held = 0, last = performance.now();
		const t = setInterval(() => {
			const c = core.current;
			if (!c) return;
			const now = performance.now();
			const dt = now - last;
			last = now;
			const p = c.project(dir);
			const on = !!p && Math.hypot(p.x - c.width / 2, p.y - c.height / 2) <= Math.min(c.width, c.height) * LOOK_SHARE;
			held = Math.max(0, Math.min(goalHold, held + (on ? dt : -2 * dt)));
			onLook?.(held / goalHold);
			if (held >= goalHold) {
				clearInterval(t);
				onLooked?.(goalId);
			}
		}, LOOK_POLL_MS);
		return () => clearInterval(t);
	}, [goalId, goalTarget, goalHold, node, onLook, onLooked]);

	return (
		<div className="w-pano">
			<PanoViewer
				site={site.site}
				urls={urls}
				node={node}
				state="now"
				view={view}
				restored={restored}
				animateId={animateId}
				onRevealDone={onRevealDone}
				revealAll={revealAll}
				animateAll={animateAll}
				onAllDone={onAllDone}
				proof={proof}
				preloadThen
				onFrame={(c) => {
					core.current = c;
					onCore?.(c);
				}}
			/>
		</div>
	);
}
