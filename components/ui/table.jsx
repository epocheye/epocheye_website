import React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef(({ className, ...props }, ref) => (
	<div className="relative w-full overflow-x-auto rounded-xl border border-white/5 bg-black/30">
		<table
			ref={ref}
			className={cn("w-full caption-bottom text-sm text-zinc-100", className)}
			{...props}
		/>
	</div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
	<thead
		ref={ref}
		className={cn("bg-white/5 text-xs uppercase tracking-wide text-zinc-400", className)}
		{...props}
	/>
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
	<tbody ref={ref} className={cn("divide-y divide-white/5", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
	<tr
		ref={ref}
		className={cn(
			"transition-colors hover:bg-white/5 data-[state=selected]:bg-white/10",
			className
		)}
		{...props}
	/>
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
	<th
		ref={ref}
		className={cn("px-4 py-3 text-left font-medium text-zinc-300", className)}
		{...props}
	/>
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
	<td ref={ref} className={cn("px-4 py-3 align-middle text-zinc-100", className)} {...props} />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
	<caption ref={ref} className={cn("mt-4 text-sm text-zinc-400", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption };
