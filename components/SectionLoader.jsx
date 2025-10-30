import React from "react";

/**
 * Optimized loading component for section placeholders
 * Prevents layout shift and provides smooth transitions
 */
export default function SectionLoader({
	minHeight = "100vh",
	bgColor = "bg-black",
	showSpinner = false,
}) {
	return (
		<div
			className={`w-full ${bgColor} flex items-center justify-center`}
			style={{ minHeight }}>
			{showSpinner && (
				<div className="relative w-12 h-12">
					<div className="absolute inset-0 rounded-full border-2 border-gray-700"></div>
					<div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin"></div>
				</div>
			)}
		</div>
	);
}
