// One sourced paragraph, cited inline the way Lens cards do:
// the text, then a meta line "TIER · Source name" linking to the source.

export const TIER_LABEL = {
	confirmed: "Confirmed",
	source: "Single source",
	estimate: "Estimate",
	disputed: "Disputed",
	unrecorded: "Not recorded",
};

export function SourceName({ source }) {
	if (source.url) {
		return (
			<a
				href={source.url}
				target="_blank"
				rel="noopener"
				className="underline decoration-white/20 underline-offset-4 hover:text-white/80 hover:decoration-white/60">
				{source.name}
			</a>
		);
	}
	return <span>{source.name}</span>;
}

export default function Claim({ paragraph, sources, numbers, size = "base" }) {
	const cited = (paragraph.cite ?? []).map((id) => ({ id, ...sources[id] }));
	return (
		<div className="space-y-2">
			<p
				className={
					size === "lead"
						? "text-lg sm:text-xl leading-relaxed text-white/85"
						: "text-base sm:text-[17px] leading-relaxed text-white/70"
				}>
				{paragraph.text}
			</p>
			{cited.length > 0 && (
				<p className="text-[11px] uppercase tracking-[0.14em] text-white/40 leading-relaxed">
					<span className="text-white/55">{TIER_LABEL[paragraph.tier] ?? paragraph.tier}</span>
					{cited.map((s) => (
						<span key={s.id} className="normal-case tracking-normal">
							<span className="mx-2 text-white/25">·</span>
							<SourceName source={s} />
							<a
								href={`#source-${numbers[s.id]}`}
								className="ml-1 text-white/30 hover:text-white/60"
								aria-label={`Source ${numbers[s.id]}`}>
								[{numbers[s.id]}]
							</a>
						</span>
					))}
				</p>
			)}
		</div>
	);
}
