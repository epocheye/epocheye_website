import React from "react";

const ITEMS = [
	"10,000+ SIGNUPS",
	"50+ BETA USERS",
	"3 OTA PARTNERS",
	"BACKED BY STPI & AWS ACTIVATE",
];

const Row = () => (
	<div className="flex items-center shrink-0 font-instrument-sans text-sm sm:text-base text-white/70 tracking-[0.18em] uppercase">
		{ITEMS.map((item) => (
			<span key={item} className="flex items-center">
				<span className="px-8 sm:px-12">{item}</span>
				<span className="text-accent" aria-hidden="true">
					◆
				</span>
			</span>
		))}
	</div>
);

const TractionMarquee = () => {
	return (
		<div
			className="w-full overflow-hidden border-y border-white/10 py-5"
			style={{ backgroundColor: "#0A0A0A" }}
			aria-label="Epocheye traction stats">
			<div className="flex w-max animate-marquee">
				<Row />
				<Row />
			</div>
		</div>
	);
};

export default TractionMarquee;
