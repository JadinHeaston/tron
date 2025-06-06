"use strict"
var TRON;

const DEBUG = false;
const DEBUG_SHOW_HITBOXES = true;

const GAME_STATES = Object.freeze({
	START: true,
	PLAY: true,
	ROUND_START: true,
	ROUND_END: true,
	GAME_END: true
});

class Tron {
	#roundDelay = 5000; //ms

	constructor() {
		this.gameState = null;
		this.config = new TronConfig; //User Configurable Options
		this.globals = new TronGlobal; //Global changing variables


		// this.peer = new Peer();
		this.players = [];
		this.startingPoints = [];

		const GAME_SCREEN = document.getElementById('game-screen');
		this.screen = GAME_SCREEN.getContext('2d');

		this.keyManager = new KeyManager;
		this.setupEventListeners();

		//Initial setting variables.
		this.adjustScreen();

		// this.changeGameState(GAME_STATES.START); //Starting game on the start screen.

		//Beginning game loop.
		window.requestAnimationFrame(this.loop);
	}

	startGame() {
		document.getElementById('game-start-screen').classList.add('hidden');
		this.initializePlayers();
		this.initializeRound(); //Starting first round.
	}

	endGame() {
		this.changeGameState(GAME_STATES.GAME_END);
		document.getElementById('game-start-screen').classList.remove('hidden');
	}

	changeGameState(newGameState) {
		this.gameState = newGameState;

		this.updateScoreboard();
	}

	updateScoreboard() {
		var scoreBoard = document.getElementById('score-board');
		scoreBoard.innerHTML = ''; // Clearing existing content.


		const playerLivesList = document.createElement('ul');
		this.players.forEach(function (player) {
			const playerLives = document.createElement('li');
			playerLives.setAttribute("player-color", player.config.color);
			playerLives.textContent = player.lives;
			playerLivesList.appendChild(playerLives);
		});

		scoreBoard.appendChild(playerLivesList);
	}

	initializePlayers() {
		this.players = [];
		for (let index = 0; index < this.config.PLAYER_COUNT; ++index) {
			this.players.push(new Player(index, PLAYER_CONFIGS[index]));
		}
	}

	initializeStartingPositions() {
		if (this.startingPoints.length === 0)
			this.startingPoints = this.calculatePolygonPoints(this.players.length);
		this.players.forEach(async function (player, playerID) {
			player.coordinates = new Coordinates(this.startingPoints[playerID].x, this.startingPoints[playerID].y);
		}.bind(this));
	}

	initializeRound() {
		this.changeGameState(GAME_STATES.ROUND_START);

		this.keyManager.reset();

		//Resetting player info.
		this.initializeStartingPositions();
		this.players.forEach(async function (player) {
			player.roundReset();
		});

		//Starting timer for round start.
		setTimeout(() => {
			this.changeGameState(GAME_STATES.PLAYING);
		}, this.#roundDelay);

		//Handling visual countdown.
		const roundCountdown = document.getElementById('round-countdown');
		roundCountdown.classList.remove('hidden');
		var currentCountdownTime = this.#roundDelay / 1000;

		//Showing initial countdown.
		roundCountdown.innerText = currentCountdownTime;

		var countdown = setInterval(function () {
			--currentCountdownTime;
			if (currentCountdownTime <= 0) {
				roundCountdown.classList.add('hidden');
				clearInterval(countdown);
			}
			else
				roundCountdown.innerText = currentCountdownTime; //Converting delay to seconds.
		}, 1000);
	}


	setupEventListeners() {
		window.addEventListener('keydown', async (event) => {
			if (this.gameState !== GAME_STATES.PLAYING)
				return;
			else if (this.keyManager.isKeyPressed(event.key) !== false)
				return;

			this.keyManager.keyDown(event.key);
		})
		window.addEventListener('keyup', async (event) => {
			if (this.gameState !== GAME_STATES.PLAYING)
				return;

			this.keyManager.keyUp(event.key);
		});

		//Listening to menu buttons
		document.getElementById('start-game').addEventListener('click', async () => {
			this.startGame();
		});

		document.getElementById('options').addEventListener('click', async () => {
			const optionsContainer = document.getElementById('game-options-options');
			const optionsInputs = this.config.generateOptionInputs();
			optionsContainer.innerHTML = '';
			optionsInputs.forEach(function (optionInput) {
				optionsContainer.appendChild(optionInput);
				optionInput.addEventListener('change', async function (event) {
					const input = event.target;
					TRON.config[input.name] = parseInt(input.value);
				});
			});
		});
	}

	adjustGlobals() {
		this.globals.PLAYER_RADIUS = Math.trunc((this.screen.canvas.width / this.config.PLAYER_RADIUS_FACTOR));
		this.globals.PLAYER_SPEED = this.globals.PLAYER_RADIUS;
		this.globals.LIGHTWALL_RADIUS = Math.trunc(this.globals.PLAYER_SPEED * 1.1); //Adding slight padding to "connect" the points for a smooth wall.
	}

	adjustScreen() {
		//Setting width and height, in case of resizing.
		if (this.screen.canvas.width !== window.innerWidth)
			this.screen.canvas.width = window.innerWidth;
		if (this.screen.canvas.height !== window.innerHeight)
			this.screen.canvas.height = window.innerHeight;
	}

	clearScreen() {
		// Store the current transformation matrix
		this.screen.save();

		// Use the identity matrix while clearing the canvas
		this.screen.setTransform(1, 0, 0, 1, 0, 0);
		this.screen.clearRect(0, 0, this.screen.canvas.width, this.screen.canvas.height);

		// Restore the transform
		this.screen.restore();
	}

	calculatePolygonPoints(sides) {
		const centerX = this.screen.canvas.width / 2;
		const centerY = this.screen.canvas.height / 2;

		// Calculate available space for the polygon, accounting for the margin
		const availableWidth = this.screen.canvas.width - 2 * this.config.SPAWN_MARGIN;
		const availableHeight = this.screen.canvas.height - 2 * this.config.SPAWN_MARGIN;

		// Calculate the radius based on the *available* space
		const radius = Math.min(availableWidth, availableHeight) / 2;

		// If the available width or height is negative (screen too small), prevent radius from being negative
		const safeRadius = Math.max(0, radius); // radius should never be negative

		var points = [];
		const angleStep = (2 * Math.PI) / sides;

		for (let i = 0; i < sides; ++i) {
			const angle = angleStep * i;

			// Center the polygon within the available space
			const x = centerX + safeRadius * Math.cos(angle);
			const y = centerY + safeRadius * Math.sin(angle);

			points.push({ x: x, y: y });
		}

		return points;
	}

	loop = () => {
		this.adjustGlobals();
		this.clearScreen();

		this.playing();

		if (this.gameState === 'round-end') {
			this.initializeRound();
		}
		else if (this.gameState === 'game-end') {
			this.endGame();
		}

		//Starting the loop again.
		window.requestAnimationFrame(this.loop);
	}

	playing() {
		// drawHeader();

		//Handling players
		this.players.forEach(function (player) {
			player.loop();
			if (this.gameState !== null && player.state === 'collided') {
				if (player.lives > 0)
					this.gameState = 'round-end';
				else
					this.gameState = 'game-end';
			}

			//Handling lightwalls
			player.lightwalls.forEach(function (lightwall) {
				lightwall.draw();
			}.bind(this));
		}.bind(this));
	}

	/**
	 * 
	 * @param {*} playerID 
	 * @param {Coordinates} coordinates 
	 * @returns 
	 */
	lightwallExistsAtPoint(coordinates) {
		var lightwallState = false;

		this.players.forEach(function (player) {
			if (lightwallState === true)
				return;
			lightwallState = player.lightwalls.filter(function (lightwall) {
				return coordinates.x === lightwall.coordinates.x
					&& coordinates.y === lightwall.coordinates.y;
			}).length > 0;
		});

		return lightwallState;
	}

	/**
	 * 
	 * @param {Coordinates}} playerCoordinates 
	 * @param {*} radius 
	 * @returns 
	 */
	lightwallExistInArea(playerCoordinates, radius) {
		var lightwallState = false;
		this.players.forEach(function (player) {
			if (lightwallState === true)
				return;

			lightwallState = player.lightwalls.filter(function (lightwall, arrayIndex) {
				if (arrayIndex >= player.lightwalls.length - 3)
					return false;
				// Optimization: Quick bounding box check
				const dxQuick = Math.abs(playerCoordinates.x - lightwall.coordinates.x);
				const dyQuick = Math.abs(playerCoordinates.y - lightwall.coordinates.y);

				if (dxQuick > radius + TRON.globals.LIGHTWALL_RADIUS || dyQuick > radius + TRON.globals.LIGHTWALL_RADIUS)
					return false; // Definitely no collision

				const dx = playerCoordinates.x - lightwall.coordinates.x;
				const dy = playerCoordinates.y - lightwall.coordinates.y;

				const distance = Math.sqrt((dx * dx) + (dy * dy));

				const collisionThreshold = radius; // + Math.sqrt((TRON.globals.LIGHTWALL_RADIUS * TRON.globals.LIGHTWALL_RADIUS) + (TRON.globals.LIGHTWALL_RADIUS * TRON.globals.LIGHTWALL_RADIUS));

				return distance <= collisionThreshold;
			}).length > 0;
		});

		return lightwallState;
	}
}

class Player {
	constructor(id, PlayerConfig) {
		this.id = id;
		this.coordinates = new Coordinates(0, 0);
		this.config = PlayerConfig;
		//Stores how far was moved in the last loop.
		this.lastDistanceX;
		this.lastDistanceY;
		this.state = null;
		this.lives = TRON.config.PLAYER_LIVES;
		this.lightwalls = [];
	}

	roundReset() {
		this.state = null;
		this.lightwalls = [];

		// Setting initial movement
		const movementDistance = Math.trunc(TRON.globals.PLAYER_SPEED);
		const relativeX = Math.abs(((this.coordinates.x / TRON.screen.canvas.width) * 100) - 50);
		const relativeY = Math.abs(((this.coordinates.y / TRON.screen.canvas.height) * 100) - 50);
		if (relativeX >= relativeY) {
			const directionPositive = (this.coordinates.x <= (TRON.screen.canvas.width / 2));
			const distance = (directionPositive === true ? movementDistance : movementDistance * -1);
			this.lastDistanceX = distance;
		}
		else {
			const directionPositive = (this.coordinates.y <= (TRON.screen.canvas.height / 2));
			const distance = (directionPositive === true ? movementDistance : movementDistance * -1);
			this.lastDistanceY = distance;
		}
	}

	/**
	* Adjusting size based on screen size. (Responsive)
	*/
	adjustConfiguration() {
	}

	handleCollision() {
		if (this.wallCollision() === true
			|| this.lightWallCollision() === true)
			return true;
		else
			return false;
	}

	lightWallCollision() {
		const playerAreaRadius = (TRON.globals.PLAYER_RADIUS + TRON.globals.LIGHTWALL_RADIUS);
		const lightwallCollision = TRON.lightwallExistInArea(this.coordinates, playerAreaRadius);


		if (DEBUG === true && DEBUG_SHOW_HITBOXES === true) {
			if (lightwallCollision === true) {
				TRON.screen.strokeStyle = "red";
			}
			else {
				TRON.screen.strokeStyle = "green";
			}
			TRON.screen.rect((this.coordinates.x - (playerAreaRadius / 2)), (this.coordinates.y - (playerAreaRadius / 2)), playerAreaRadius, playerAreaRadius);
			TRON.screen.stroke();
		}
		return lightwallCollision;
	}

	wallCollision() {
		//X
		if ((this.coordinates.x + TRON.globals.PLAYER_RADIUS) >= TRON.screen.canvas.width) {
			this.coordinates.x = (TRON.screen.canvas.width - TRON.globals.PLAYER_RADIUS);
			return true;
		}
		else if (this.coordinates.x - TRON.globals.PLAYER_RADIUS <= 0) {
			this.coordinates.x = TRON.globals.PLAYER_RADIUS;
			return true;
		}

		//Y
		if ((this.coordinates.y + TRON.globals.PLAYER_RADIUS) >= TRON.screen.canvas.height) {
			this.coordinates.y = (TRON.screen.canvas.height - TRON.globals.PLAYER_RADIUS);
			return true;
		}
		else if (this.coordinates.y - TRON.globals.PLAYER_RADIUS <= 0) {
			this.coordinates.y = TRON.globals.PLAYER_RADIUS;
			return true;
		};

		return false; //No collision
	}

	loop() {
		// this.adjustConfiguration();
		this.move();
		if (this.state !== 'collided' && this.handleCollision() === true) {
			this.state = 'collided';
			--this.lives;
		}
		this.createLightwallPoint();
		this.draw();
	}

	createLightwallPoint() {
		if (TRON.lightwallExistsAtPoint(this.coordinates) === true)
			return;
		this.lightwalls.push(new Lightwall(this.id, this.config, this.coordinates));
	}

	move() {
		if (TRON.gameState === GAME_STATES.PLAY)
			return;

		const upControl = TRON.keyManager.isKeyPressed(this.config.upControl);
		const leftControl = TRON.keyManager.isKeyPressed(this.config.leftControl);
		const downControl = TRON.keyManager.isKeyPressed(this.config.downControl);
		const rightControl = TRON.keyManager.isKeyPressed(this.config.rightControl);

		const timestamps = {
			upControl: upControl ? upControl : -1,
			leftControl: leftControl ? leftControl : -1,
			downControl: downControl ? downControl : -1,
			rightControl: rightControl ? rightControl : -1
		};

		// Get the key with the most recent timestamp
		const mostRecentControl = Object.keys(timestamps).reduce((a, b) =>
			timestamps[a] > timestamps[b] ? a : b
		);

		if (timestamps[mostRecentControl] > -1) {
			const directionPositive = (mostRecentControl === 'downControl') || (mostRecentControl === 'rightControl');
			const movementDistance = Math.trunc(TRON.globals.PLAYER_SPEED);
			const distance = (directionPositive === true ? movementDistance : movementDistance * -1);

			const directionX = (mostRecentControl === 'leftControl') || (mostRecentControl === 'rightControl');

			if (directionX === true) {
				this.coordinates.x = this.coordinates.x + distance;
				this.lastDistanceY = 0;
				this.lastDistanceX = distance;
			}
			else {
				this.coordinates.y = this.coordinates.y + distance;
				this.lastDistanceX = 0;
				this.lastDistanceY = distance;
			}
		}
		else if (this.lastDistanceX !== undefined || this.lastDistanceY !== undefined) {
			//Continue moving in the same direction as before.
			if (this.lastDistanceX !== 0)
				this.coordinates.x = this.coordinates.x + this.lastDistanceX;
			else if (this.lastDistanceY !== 0)
				this.coordinates.y = this.coordinates.y + this.lastDistanceY;
		}
	}

	draw() {
		TRON.screen.beginPath();
		TRON.screen.arc(this.coordinates.x, this.coordinates.y, TRON.globals.PLAYER_RADIUS, 0, 2 * Math.PI);
		TRON.screen.fillStyle = this.config.color
		TRON.screen.fill();
	}
}

class PlayerConfig {
	constructor(color, upControl, leftControl, downControl, rightControl) {
		this.color = color;
		this.score;
		this.upControl = upControl;
		this.leftControl = leftControl;
		this.downControl = downControl;
		this.rightControl = rightControl;
	}
}

class Lightwall {
	constructor(ownerID, playerConfig, coordinates) {
		this.ownerID = ownerID;
		this.playerConfig = playerConfig;
		this.coordinates = new Coordinates(coordinates.x, coordinates.y);
	}

	/**
	 * Adjusting size based on screen size. (Responsive)
	 */
	adjustConfiguration() {

	}

	draw() {
		// this.adjustConfiguration();
		TRON.screen.beginPath();
		TRON.screen.rect(this.coordinates.x - (TRON.globals.LIGHTWALL_RADIUS / 2), this.coordinates.y - (TRON.globals.LIGHTWALL_RADIUS / 2), TRON.globals.LIGHTWALL_RADIUS, TRON.globals.LIGHTWALL_RADIUS);
		TRON.screen.fillStyle = this.playerConfig.color
		TRON.screen.fill();
	}
}

class KeyManager {
	constructor() {
		this.keys = new Map(); // A Set to store pressed keys
	}

	keyDown(key) {
		const timestamp = Date.now();
		this.keys.set(key, { time: timestamp });
	}

	keyUp(key) {
		this.keys.delete(key);
	}

	// Method to check if a specific key is pressed. Returns the time the key was pressed if true.
	isKeyPressed(key) {
		if (this.keys.has(key) === false)
			return false;

		return this.keys.get(key).time;
	}

	reset() {
		this.keys = new Map();
	}
}

class Coordinates {
	constructor(x, y) {
		this.x = Math.trunc(x);
		this.y = Math.trunc(y);
	}
}

class TronGlobal {
	PLAYER_RADIUS;
	PLAYER_SPEED;
	LIGHTWALL_RADIUS;
}

//Runtime!

const PLAYER_CONFIGS = [
	new PlayerConfig('red', 'w', 'a', 's', 'd'),
	// new PlayerConfig(1, 'blue', 'w', 'a', 's', 'd'),
	new PlayerConfig('coral', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight')
];

//Game
document.addEventListener("DOMContentLoaded", function () {
	TRON = new Tron;

	// console.log(TRON.peer);
	// // TRON.peer = ;

	// updatePeerCurrentID();
});

// async function updatePeerCurrentID() {
// 	const container = document.getElementById('game-peer-current-id');
// 	container.innerText = TRON.peer._id;
// }







