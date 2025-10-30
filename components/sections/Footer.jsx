import React from "react";
import { Github, Twitter, Linkedin, Mail, ArrowUp } from "lucide-react";

const Footer = () => {
	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	};

	const currentYear = new Date().getFullYear();

	const footerLinks = {
		Product: [
			{ name: "Features", href: "#features" },
			{ name: "How it Works", href: "#solution" },
			{ name: "Testimonials", href: "#testimonials" },
			{ name: "Waitlist", href: "#waitlist-section" },
		],
		Company: [
			{ name: "About", href: "/about" },
			{ name: "Contact", href: "/contact" },
			{ name: "Privacy Policy", href: "/privacy" },
			{ name: "Terms of Service", href: "/terms" },
		],
		Resources: [
			{ name: "Blog", href: "/blog" },
			{ name: "Documentation", href: "/docs" },
			{ name: "Support", href: "/support" },
			{ name: "FAQ", href: "/faq" },
		],
	};

	const socialLinks = [
		{ icon: Twitter, href: "https://twitter.com", label: "Twitter" },
		{ icon: Github, href: "https://github.com/epocheye", label: "GitHub" },
		{ icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
		{ icon: Mail, href: "mailto:hello@epocheye.com", label: "Email" },
	];

	return (
		<footer className="relative bg-black text-white border-t border-white/10">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-20">
				{/* Brand Section - Full Width on Mobile */}
				<div className="mb-8 sm:mb-12 text-center sm:text-left">
					<div className="flex items-center justify-center sm:justify-start gap-3 mb-4 sm:mb-6">
						<h3 className="text-xl sm:text-2xl font-bold font-montserrat italic">
							Epocheye
						</h3>
					</div>
					<p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6 max-w-sm mx-auto sm:mx-0 font-light px-4 sm:px-0">
						Turn your smartphone into a time machine. Experience the future of
						visual memory and rediscover your past moments like never before.
					</p>
					{/* Social Links */}
					<div className="flex gap-3 sm:gap-4 justify-center sm:justify-start">
						{socialLinks.map((social) => (
							<a
								key={social.label}
								href={social.href}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={social.label}
								className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
								<social.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
							</a>
						))}
					</div>
				</div>

				{/* Links Columns - 2 columns on mobile, 3 columns on tablet, 3 columns on desktop */}
				<div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
					{Object.entries(footerLinks).map(([category, links]) => (
						<div key={category} className="text-left">
							<h4 className="text-white font-semibold font-montserrat mb-3 sm:mb-4 text-xs sm:text-sm tracking-wider uppercase">
								{category}
							</h4>
							<ul className="space-y-2 sm:space-y-3">
								{links.map((link) => (
									<li key={link.name}>
										<a
											href={link.href}
											className="text-gray-400 text-xs sm:text-sm hover:text-white transition-colors duration-300 font-light inline-block">
											{link.name}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Divider */}
				<div className="border-t border-white/10 mb-6 sm:mb-8"></div>

				{/* Bottom Section */}
				<div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
					<div className="text-gray-400 text-xs sm:text-sm font-light text-center sm:text-left order-2 sm:order-1">
						© {currentYear} Epocheye. All rights reserved.
					</div>

					{/* Back to Top Button */}
					<button
						onClick={scrollToTop}
						className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 text-xs sm:text-sm font-light order-1 sm:order-2"
						aria-label="Back to top">
						<span>Back to top</span>
						<div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
							<ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
						</div>
					</button>
				</div>

				{/* Decorative Gradient Line */}
				<div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-purple-500/50 to-transparent"></div>
			</div>
		</footer>
	);
};

export default Footer;
