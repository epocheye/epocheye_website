// The page's one ornament: the cusped arch of the palace colonnade, lobes rising to an ogee point.
// Used as a section divider, as list markers and as the frame for portrait images. Nothing else
// decorates the page.

// Arch head on a 100 x 44 box: two lobes each side, then concave sweeps into an upward point.
export const ARCH_HEAD =
	"M0 44 A10 10 0 0 1 9 30 A11 11 0 0 1 22 19 Q36 16 43 8 Q48 3 50 0 Q52 3 57 8 Q64 16 78 19 A11 11 0 0 1 91 30 A10 10 0 0 1 100 44";

export function ArchMark({ width = 18, stroke = "#b48a3c", strokeWidth = 4, className = "" }) {
	return (
		<svg width={width} height={(width * 46) / 104} viewBox="-2 -2 104 48" fill="none" stroke={stroke} strokeWidth={strokeWidth} className={className} aria-hidden="true">
			<path d={ARCH_HEAD} />
		</svg>
	);
}

export function ArchDivider({ className = "", tone = "#b48a3c" }) {
	return (
		<div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden="true">
			<span className="h-px w-16 sm:w-28" style={{ backgroundColor: tone, opacity: 0.45 }} />
			<ArchMark width={48} stroke={tone} strokeWidth={2.6} />
			<span className="h-px w-16 sm:w-28" style={{ backgroundColor: tone, opacity: 0.45 }} />
		</div>
	);
}

// Clip path for an arch-topped frame, in object bounding box units: the same head, scaled to take
// the top 34% of the frame.
const ARCH_FRAME =
	"M0 0.34 A0.10 0.0773 0 0 1 0.09 0.2318 A0.11 0.085 0 0 1 0.22 0.1468 Q0.36 0.1236 0.43 0.0618 Q0.48 0.0232 0.5 0 Q0.52 0.0232 0.57 0.0618 Q0.64 0.1236 0.78 0.1468 A0.11 0.085 0 0 1 0.91 0.2318 A0.10 0.0773 0 0 1 1 0.34 L1 1 L0 1 Z";

export function ArchClipDefs({ id }) {
	return (
		<svg width="0" height="0" className="absolute" aria-hidden="true">
			<defs>
				<clipPath id={id} clipPathUnits="objectBoundingBox">
					<path d={ARCH_FRAME} />
				</clipPath>
			</defs>
		</svg>
	);
}
