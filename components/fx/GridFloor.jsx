"use client";

/**
 * Animated 3D perspective grid floor — a receding acid-lime grid that scrolls
 * toward the viewer. Pure CSS (cheap), auto-stilled under reduced-motion.
 * Drop it as an absolutely-positioned background layer.
 */
export default function GridFloor({ className = "", opacity = 0.5 }) {
	return (
		<div className={`gridfloor ${className}`} style={{ opacity }} aria-hidden="true" />
	);
}
