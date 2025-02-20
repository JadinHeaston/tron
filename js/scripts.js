"use strict"

const PLAYER_CONFIGS = [
	new PlayerConfig(0, 'red', 'w', 'a', 's', 'd'),
	new PlayerConfig(1, 'blue', 'w', 'a', 's', 'd'),
	new PlayerConfig(2, 'coral', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight')
];


//Game
document.addEventListener("DOMContentLoaded", async function () {
	const GAME = Game.startGame();
});
