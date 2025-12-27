import React from "react";
import { cn } from "@/lib/utils";

const Skeleton = React.forwardRef(({ className, pulse = true, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"rounded-lg bg-white/10",
			pulse && "animate-pulse bg-linear-to-r from-white/5 via-white/10 to-white/5",
			className
		)}
		{...props}
	/>
));
Skeleton.displayName = "Skeleton";

export { Skeleton };
