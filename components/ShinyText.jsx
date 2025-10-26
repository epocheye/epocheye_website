const ShinyText = ({ text, disabled = false, speed = 5, className = "" }) => {
	const animationDuration = `${speed}s`;

	return (
		<div
			className={`bg-clip-text inline-block ${
				disabled ? "" : "animate-shine"
			} ${className}`}
			style={{
				backgroundImage:
					"linear-gradient(120deg, rgba(255, 255, 255, 0.7) 40%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 0.7) 60%)",
				backgroundSize: "200% 100%",
				WebkitBackgroundClip: "text",
				WebkitTextFillColor: "transparent",
				backgroundClip: "text",
				color: "rgba(255, 255, 255, 0.9)",
				animationDuration: animationDuration,
			}}>
			{text}
		</div>
	);
};

export default ShinyText;

// tailwind.config.js
// module.exports = {
//   theme: {
//     extend: {
//       keyframes: {
//         shine: {
//           '0%': { 'background-position': '100%' },
//           '100%': { 'background-position': '-100%' },
//         },
//       },
//       animation: {
//         shine: 'shine 5s linear infinite',
//       },
//     },
//   },
//   plugins: [],
// };
