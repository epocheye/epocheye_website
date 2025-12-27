import React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"rounded-2xl border border-white/10 bg-linear-to-b from-neutral-900/80 via-neutral-900/60 to-black/80 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl",
			className
		)}
		{...props}
	/>
));
Card.displayName = "Card";

const CardHeader = ({ className, ...props }) => (
	<div className={cn("flex flex-col gap-2 p-5 pb-3", className)} {...props} />
);
const CardContent = ({ className, ...props }) => (
	<div className={cn("p-5 pt-0", className)} {...props} />
);
const CardFooter = ({ className, ...props }) => (
	<div className={cn("flex items-center p-5 pt-0", className)} {...props} />
);
const CardTitle = ({ className, ...props }) => (
	<h3 className={cn("text-lg font-semibold text-white", className)} {...props} />
);
const CardDescription = ({ className, ...props }) => (
	<p className={cn("text-sm text-zinc-400", className)} {...props} />
);

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };
