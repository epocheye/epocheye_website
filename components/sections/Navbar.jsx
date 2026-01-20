import React from "react";
import StaggeredMenu from "../StaggeredMenu";

const Navbar = () => {
	const menuItems = [
		{ label: "Home", ariaLabel: "Go to home page", link: "/" },
		{ label: "About", ariaLabel: "Learn about us", link: "/about" },
		// { label: "Services", ariaLabel: "View our services", link: "/services" },
		{ label: "Contact", ariaLabel: "Get in touch", link: "/contact" },
	];

	const socialItems = [
		{ label: "Twitter", link: "https://x.com/sambitsingha01" },
		{ label: "GitHub", link: "https://github.com/epocheye" },
		{ label: "LinkedIn", link: "https://www.linkedin.com/company/epocheye" },
	];

	return (
		<>
			<div className="w-full h-full">
				<StaggeredMenu
					position="right"
					items={menuItems}
					socialItems={socialItems}
					displaySocials={true}
					displayItemNumbering={true}
					menuButtonColor="#fff"
					openMenuButtonColor="#fff"
					changeMenuColorOnOpen={true}
					colors={["#B19EEF", "#5227FF"]}
					logoUrl="/logo-white.png"
					accentColor="#ff6b6b"
				/>
			</div>
		</>
	);
};

export default Navbar;
