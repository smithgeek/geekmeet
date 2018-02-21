class Colors{
	static get names() {
		return {
			aqua: "#00ffff",
			azure: "#f0ffff",
			beige: "#f5f5dc",
			black: "#000000",
			blue: "#0000ff",
			brown: "#a52a2a",
			cyan: "#00ffff",
			fuchsia: "#ff00ff",
			gold: "#ffd700",
			green: "#008000",
			indigo: "#4b0082",
			khaki: "#f0e68c",
			lime: "#00ff00",
			magenta: "#ff00ff",
			maroon: "#800000",
			navy: "#000080",
			olive: "#808000",
			orange: "#ffa500",
			pink: "#ffc0cb",
			purple: "#800080",
			violet: "#800080",
			red: "#ff0000",
			silver: "#c0c0c0",
			white: "#ffffff",
			yellow: "#ffff00"
		};
	}

	static random() {
		let result;
		let count = 0;
		for (let prop in Colors.names){
			if (Math.random() < 1/++count){
				result = prop;
			}
		}
		return result;
	};
};
