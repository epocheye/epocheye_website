import Image from "next/image";
import Link from "next/link";
import logoWhite from "@/public/logo-white.png";

const SIZE_CLASS = {
	sm: "w-8 h-8",
	md: "w-10 h-10",
	lg: "w-12 h-12",
};

export default function CreatorBrandLink({
	href = "/creators",
	className = "",
	size = "md",
	showBadge = true,
	priority = false,
}) {
	const logoSize = SIZE_CLASS[size] || SIZE_CLASS.md;

	return (
		<Link href={href} className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
			<Image
				src={logoWhite}
				alt="Epocheye logo"
				width={48}
				height={48}
				className={logoSize}
				priority={priority}
			/>
			{showBadge ? (
				<span className="text-[10px] font-semibold tracking-wider uppercase bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
					Creators
				</span>
			) : null}
		</Link>
	);
}
