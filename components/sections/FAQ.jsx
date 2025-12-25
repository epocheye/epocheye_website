"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
	{
		question: "When can I use Epocheye?",
		answer: "Our private beta launches March 2026 for early access members. Join the waitlist now to get 1 month free and be among the first to experience AR time travel.",
	},
	{
		question: "Which phones are compatible?",
		answer: "Epocheye works on iPhone 6S and newer (iOS 13+) and Android phones with ARCore support (Android 10+). Most smartphones from 2017 onwards are compatible.",
	},
	{
		question: "Do I need internet at the heritage site?",
		answer: "No! Download the AR experience pack for your destination before you visit. Everything works offline once downloaded. Each site is 100-300 MB.",
	},
	{
		question: "How much does it cost?",
		answer: "Early access members get 1 month free. After that, Epocheye will be available via monthly subscription or pay-per-destination. Pricing details coming soon.",
	},
	{
		question: "Is this just for Indian heritage sites?",
		answer: "We're launching with 10 UNESCO sites in India in March 2026. Global expansion to 50+ destinations (Egypt, Peru, Cambodia, Italy, Greece) starts by end of 2026. Vote for your favorite site in the app!",
	},
	{
		question: "How accurate are the historical reconstructions?",
		answer: "All AR reconstructions are based on archaeological research, historical records, and expert consultation. We work with historians and heritage conservation experts to ensure authenticity.",
	},
	{
		question: "Can I use this if I'm not at the physical site?",
		answer: "Yes! Epocheye has a 'Remote Explorer' mode that lets you experience AR tours from anywhere. It's not quite the same as being there, but perfect for planning your trip or exploring from home.",
	},
	{
		question: "Is my data safe?",
		answer: "We take privacy seriously. Epocheye only uses your camera for AR - we don't store images. Location data is used only to enhance your experience and is never sold to third parties.",
	},
];

const FAQ = () => {
	const [openIndex, setOpenIndex] = useState(0);
	const toggleIndex = (index) => {
		setOpenIndex((prev) => (prev === index ? -1 : index));
	};

	return (
		<section
			id="faq"
			className="relative w-full bg-black text-white py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-10">
			<div className="max-w-5xl mx-auto">
				<div className="text-center mb-10 sm:mb-14">
					<h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold font-montserrat mb-4">
						Frequently Asked Questions
					</h2>
					<p className="text-gray-300 text-base sm:text-lg max-w-3xl mx-auto font-light">
						Answers to the most common questions about Epocheye, AR heritage
						tourism, and our March 2026 launch.
					</p>
				</div>

				<div className="space-y-4">
					{faqs.map((item, index) => {
						const isOpen = openIndex === index;
						return (
							<div
								key={item.question}
								className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden">
								<button
									className="w-full flex items-center justify-between text-left px-5 sm:px-6 py-4 sm:py-5 focus:outline-none"
									onClick={() => toggleIndex(index)}
									aria-expanded={isOpen}>
									<div className="flex-1">
										<p className="text-base sm:text-lg font-semibold text-white font-montserrat">
											{item.question}
										</p>
									</div>
									<ChevronDown
										className={`w-5 h-5 text-gray-300 transition-transform ${
											isOpen ? "rotate-180" : ""
										}`}
									/>
								</button>
								{isOpen && (
									<div className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-300 text-sm sm:text-base leading-relaxed border-t border-white/10">
										{item.answer}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default FAQ;
