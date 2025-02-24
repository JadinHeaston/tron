"use strict"
var TRON;

class Tron {
	constructor() {
		this.gameState = null;
		this.config = new TronConfig; //User Configurable Options
		this.globals = new TronGlobal; //Global changing variables

		this.players = [];
		this.startingPoints = [];

		const GAME_SCREEN = document.getElementById('game-screen');
		this.screen = GAME_SCREEN.getContext('2d');

		this.keyManager = new KeyManager;
		this.setupEventListeners();

		//Initial setting variables.
		this.adjustScreen();
		this.adjustGlobals();

		this.gameState = 'start-screen'; //Starting game on the start screen.

		//Beginning game loop.
		window.requestAnimationFrame(this.loop);
	}

	initializeGameState() {
		this.initializePlayers();

		this.initializeRound(); //Starting first round.
	}

	initializePlayers() {
		for (let index = 0; index < this.config.PLAYER_COUNT; ++index) {
			this.players.push(new Player(index, PLAYER_CONFIGS[index]));
		}
	}

	initializeStartingPositions() {
		this.startingPoints = this.calculatePolygonPoints(this.players.length);
		this.players.forEach(async function (player, playerID) {
			player.coordinates = new Coordinates(this.startingPoints[playerID].x, this.startingPoints[playerID].y);
		}.bind(this));
	}

	initializeRound() {
		this.initializeStartingPositions();
		this.gameState = 'playing';
	}

	setupEventListeners() {
		window.addEventListener('keydown', async function (event) {
			if (TRON.gameState !== 'playing')
				return;

			else if (TRON.keyManager.isKeyPressed(event.key) !== false)
				return;

			TRON.keyManager.keyDown(event.key);
		})
		window.addEventListener('keyup', async function (event) {
			if (TRON.gameState !== 'playing')
				return;
			TRON.keyManager.keyUp(event.key);
		});

		//Listening to menu buttons
		document.getElementById('start-game').addEventListener('click', async function () {
			document.getElementById('game-start-screen').style.display = 'none';
			TRON.initializeGameState();
		});
	}

	adjustGlobals() {
		this.globals.PLAYER_RADIUS = Math.trunc((this.screen.canvas.width / this.config.PLAYER_RADIUS_FACTOR));
		this.globals.PLAYER_SPEED = Math.trunc((this.screen.canvas.width / this.config.PLAYER_SPEED_FACTOR));
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

	loop = (dt) => {
		this.clearScreen();

		if (this.gameState === 'playing') {
			this.playing();
		}

		//Starting the loop again.
		window.requestAnimationFrame(this.loop);
	}

	playing() {
		// drawHeader();

		//Handling players
		this.players.forEach(function (player, playerID) {
			player.loop();
			if (player.state === 'collided') {
				if (player.lives > 0)
					TRON.gameState = 'round-end';
				else
					TRON.gameState = 'game-end';
			}

			//Handling lightwalls
			player.lightwalls.forEach(function (lightwall, lightwallIndex) {
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

		this.players.forEach(function (player, playerID) {
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
	 * @param {*} playerID 
	 * @param {Coordinates}} playerCoordinates 
	 * @param {*} radius 
	 * @returns 
	 */
	lightwallExistInArea(playerID, playerCoordinates, radius) {
		var lightwallState = false;
		this.players.forEach(function (player, playerID2) {
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
		this.state;
		this.lives = TRON.config.PLAYER_LIVES;
		this.lightwalls = [];
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
		const lightwallCollision = TRON.lightwallExistInArea(this.id, this.coordinates, playerAreaRadius);

		if (lightwallCollision === true) {
			TRON.screen.strokeStyle = "red";
		}
		else {
			TRON.screen.strokeStyle = "green";
		}
		TRON.screen.rect((this.coordinates.x - (playerAreaRadius / 2)), (this.coordinates.y - (playerAreaRadius / 2)), playerAreaRadius, playerAreaRadius);
		TRON.screen.stroke();

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
		if (this.handleCollision() === true) {
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
			if (mostRecentControl === 'upControl') {
				this.coordinates.y -= Math.trunc(TRON.globals.PLAYER_SPEED);
				this.lastDistanceX = 0;
				this.lastDistanceY = -TRON.globals.PLAYER_SPEED;
			}
			else if (mostRecentControl === 'leftControl') {
				this.coordinates.x -= Math.trunc(TRON.globals.PLAYER_SPEED);
				this.lastDistanceX = -TRON.globals.PLAYER_SPEED;
				this.lastDistanceY = 0;
			}
			else if (mostRecentControl === 'downControl') {
				this.coordinates.y += Math.trunc(TRON.globals.PLAYER_SPEED);
				this.lastDistanceX = 0;
				this.lastDistanceY = TRON.globals.PLAYER_SPEED;
			}
			else if (mostRecentControl === 'rightControl') {
				this.coordinates.x += Math.trunc(TRON.globals.PLAYER_SPEED);
				this.lastDistanceX = TRON.globals.PLAYER_SPEED;
				this.lastDistanceY = 0;
			}
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
});
