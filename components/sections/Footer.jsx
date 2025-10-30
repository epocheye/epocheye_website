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
			<div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20">
				{/* Main Footer Content */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
					{/* Brand Column */}
					<div className="lg:col-span-2">
						<div className="flex items-center gap-3 mb-6">
							<img
								src="/logo-white.png"
								alt="Epocheye Logo"
								className="h-10 w-auto"
							/>
							<h3 className="text-2xl font-bold font-montserrat">Epocheye</h3>
						</div>
						<p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm font-light">
							Turn your smartphone into a time machine. Experience the future
							of visual memory and rediscover your past moments like never
							before.
						</p>
						{/* Social Links */}
						<div className="flex gap-4">
							{socialLinks.map((social) => (
								<a
									key={social.label}
									href={social.href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={social.label}
									className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
									<social.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
								</a>
							))}
						</div>
					</div>

					{/* Links Columns */}
					{Object.entries(footerLinks).map(([category, links]) => (
						<div key={category}>
							<h4 className="text-white font-semibold font-montserrat mb-4 text-sm tracking-wider uppercase">
								{category}
							</h4>
							<ul className="space-y-3">
								{links.map((link) => (
									<li key={link.name}>
										<a
											href={link.href}
											className="text-gray-400 text-sm hover:text-white transition-colors duration-300 font-light">
											{link.name}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Divider */}
				<div className="border-t border-white/10 mb-8"></div>

				{/* Bottom Section */}
				<div className="flex flex-col sm:flex-row justify-between items-center gap-6">
					<div className="text-gray-400 text-sm font-light text-center sm:text-left">
						© {currentYear} Epocheye. All rights reserved.
					</div>

					{/* Back to Top Button */}
					<button
						onClick={scrollToTop}
						className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 text-sm font-light"
						aria-label="Back to top">
						<span>Back to top</span>
						<div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
							<ArrowUp className="w-4 h-4" />
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
