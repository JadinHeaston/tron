"use strict"

const PLAYER_CONFIGS = [
	new PlayerConfig(0, 'red', 'w', 'a', 's', 'd'),
	new PlayerConfig(1, 'blue')
];


//Game
document.addEventListener("DOMContentLoaded", async function () {
	const GAME = Game.startGame();
});
