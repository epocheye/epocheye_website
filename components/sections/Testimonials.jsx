import React from "react";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "../ui/carousel";
import PixelCard from "../PixelCard";

const Testimonials = () => {
	const testimonials = [
		{
			name: "Sarah Mitchell",
			location: "New York, USA",
			avatar: "👩",
			rating: 5,
			text: "Epocheye completely transformed my visit to the Taj Mahal! Seeing it in different eras through AR was mind-blowing. I felt like I was actually traveling through time.",
			landmark: "Taj Mahal",
		},
		{
			name: "Marco Rossi",
			location: "Rome, Italy",
			avatar: "👨",
			rating: 5,
			text: "As a local Roman, I thought I knew everything about the Colosseum. Epocheye showed me perspectives I never imagined - from gladiator battles to modern restoration. Incredible!",
			landmark: "Colosseum",
		},
		{
			name: "Yuki Tanaka",
			location: "Tokyo, Japan",
			avatar: "👩",
			rating: 5,
			text: "The gamification feature made exploring the Great Wall so much fun! I unlocked all the hidden stories and learned more in 3 hours than I would have in days.",
			landmark: "Great Wall",
		},
		{
			name: "Ahmed Hassan",
			location: "Cairo, Egypt",
			avatar: "👨",
			rating: 5,
			text: "The crowd prediction feature saved my trip! I visited the Pyramids at the perfect time, no long queues. The AI guide was incredibly knowledgeable too.",
			landmark: "Pyramids of Giza",
		},
		{
			name: "Sophie Dubois",
			location: "Paris, France",
			avatar: "👩",
			rating: 5,
			text: "Watching Notre-Dame rebuild in AR while standing at the actual site was an emotional experience. Epocheye bridges past, present, and future beautifully.",
			landmark: "Notre-Dame",
		},
		{
			name: "Carlos Mendez",
			location: "Mexico City, Mexico",
			avatar: "👨",
			rating: 5,
			text: "Chichen Itza came alive with Epocheye! The multi-era comparisons showed me how the Mayans built this wonder. Best travel app ever!",
			landmark: "Chichen Itza",
		},
	];

	return (
		<div className="relative bg-black w-full min-h-screen py-12 sm:py-16 md:py-20 overflow-hidden">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
				<div className="text-center mb-12 sm:mb-16">
					<h2 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white font-montserrat mb-4">
						What Travelers Say
					</h2>
					<p className="text-gray-400 text-base sm:text-lg md:text-xl font-light font-montserrat px-4">
						Real experiences from time travelers around the globe
					</p>
				</div>

				<Carousel
					opts={{
						align: "start",
						loop: true,
					}}
					className="w-full">
					<CarouselContent>
						{testimonials.map((testimonial, index) => (
							<CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
								<div className="p-2 sm:p-4">
									<PixelCard
										variant="blue"
										gap={6}
										speed={30}
										className="w-full h-[400px] sm:h-[450px]">
										<div className="absolute inset-0 flex flex-col h-full justify-between p-4 sm:p-6 md:p-8 z-10">
											{/* Header */}
											<div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
												<div className="text-3xl sm:text-4xl">
													{testimonial.avatar}
												</div>
												<div className="flex-1">
													<h3 className="text-base sm:text-lg font-semibold text-white font-montserrat">
														{testimonial.name}
													</h3>
													<p className="text-gray-400 text-xs">
														{testimonial.location}
													</p>
												</div>
											</div>

											{/* Rating */}
											<div className="flex gap-1 mb-3 sm:mb-4">
												{[...Array(testimonial.rating)].map(
													(_, i) => (
														<span
															key={i}
															className="text-yellow-400 text-base sm:text-lg">
															★
														</span>
													)
												)}
											</div>

											{/* Testimonial Text */}
											<blockquote className="text-gray-200 text-sm sm:text-base font-light leading-relaxed mb-3 sm:mb-4 grow overflow-y-auto">
												"{testimonial.text}"
											</blockquote>

											{/* Footer */}
											<div className="flex flex-col gap-2 pt-3 sm:pt-4 border-t border-gray-700">
												<span className="text-cyan-400 text-xs sm:text-sm font-medium">
													Visited: {testimonial.landmark}
												</span>
												<span className="text-gray-500 text-xs">
													Verified Traveler
												</span>
											</div>
										</div>
									</PixelCard>
								</div>
							</CarouselItem>
						))}
					</CarouselContent>
					<CarouselPrevious className="hidden md:flex" />
					<CarouselNext className="hidden md:flex" />
				</Carousel>
			</div>
		</div>
	);
};

export default Testimonials;
