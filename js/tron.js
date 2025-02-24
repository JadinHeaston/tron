"use strict"
var TRON;

class Tron {
	constructor() {
		this.gameState = null;
		this.config = new TronConfig; //User Configurable Options
		this.globals = new TronGlobal; //Global changing variables

		this.players = [];
		this.startingPoints = [];
		this.lightwalls = [];

		const GAME_SCREEN = document.getElementById('game-screen');
		this.screen = GAME_SCREEN.getContext('2d');

		this.keyManager = new KeyManager;
		this.setupEventListeners();

		for (let index = 0; index < this.config.PLAYER_COUNT; ++index) {
			this.players.push(new Player(index, PLAYER_CONFIGS[index]));
		}

		//Initial setting variables.
		this.adjustScreen();
		this.adjustGlobals();

		if (this.gameState === null)
			this.startingPoints = this.calculatePolygonPoints(this.players.length);

		//Beginning game loop.
		window.requestAnimationFrame(this.loop);
	}

	setupEventListeners() {
		window.addEventListener('keydown', async (event) => {
			if (this.keyManager.isKeyPressed(event.key) !== false)
				return;

			this.keyManager.keyDown(event.key);
		})
		window.addEventListener('keyup', async (event) => {
			this.keyManager.keyUp(event.key);
		});
	}

	adjustGlobals() {
		this.globals.PLAYER_RADIUS = (this.screen.canvas.width / this.config.PLAYER_RADIUS_FACTOR);
		this.globals.PLAYER_SPEED = (this.screen.canvas.width / this.config.PLAYER_SPEED_FACTOR);
		this.globals.LIGHTWALL_RADIUS = this.globals.PLAYER_RADIUS * 0.5;
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
		// Calculate the center point of the window
		const centerX = this.screen.canvas.width / 2;
		const centerY = this.screen.canvas.height / 2;

		// Calculate the general radius of the shape (just for visualization purposes)
		const radius = Math.min(this.screen.canvas.width, this.screen.canvas.height) / 2; // Use smaller dimension

		var points = [];

		// Calculate the angle between each point (360 degrees / number of sides)
		const angleStep = (2 * Math.PI) / sides;

		for (let i = 0; i < sides; ++i) {
			// Calculate the angle for this point
			const angle = angleStep * i;

			// Calculate the x and y coordinates based on the angle and radius
			const x = centerX + radius * Math.cos(angle);
			const y = centerY + radius * Math.sin(angle);

			points.push({ x: x, y: y });
		}

		return points;
	}

	loop = (dt) => {
		this.clearScreen();
		// drawHeader();

		//Handling players
		this.players.forEach(async function (player, playerID) {
			if (this.gameState === null) {
				player.coordinates.x = this.startingPoints[playerID].x;
				player.coordinates.y = this.startingPoints[playerID].y;
			}
			player.loop();
		}.bind(this));

		//Handling lightwalls
		this.lightwalls.forEach(async function (lightwall, lightwallIndex) {
			lightwall.draw();
		}.bind(this));

		//Starting the loop again.
		window.requestAnimationFrame(this.loop);

		this.gameState = 'playing'; //Updating game state.
	}

	/**
	 * 
	 * @param {*} playerID 
	 * @param {Coordinates} coordinates 
	 * @returns 
	 */
	lightwallExistsAtPoint(coordinates) {
		return this.lightwalls.filter(function (lightwall) {
			return coordinates.x === lightwall.coordinates.x
				&& coordinates.y === lightwall.coordinates.y;
		}).length > 0;
	}

	lightwallExistInArea(playerID, coordinates, radius) {
		return this.lightwalls.filter(function (lightwall) {
			if (playerID === lightwall.ownerID)
				return false;

			// Calculate the distance between the coordinates and the lightwall's coordinates
			const dx = coordinates.x - lightwall.coordinates.x;
			const dy = coordinates.y - lightwall.coordinates.y;

			// Calculate the Euclidean distance
			const distance = Math.sqrt(dx * dx + dy * dy);

			// Check if the lightwall is within the radius
			return distance <= radius;
		}).length > 0;
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
	}

	/**
	 * Adjusting size based on screen size. (Responsive)
	 */
	adjustConfiguration() {
	}

	handleCollision() {
		this.wallCollision();
		this.lightWallCollision();
	}

	lightWallCollision() {
		const playerAreaRadius = ((TRON.globals.PLAYER_RADIUS + TRON.globals.LIGHTWALL_RADIUS) * 2);
		const playerCenter = new Coordinates((this.coordinates.x - (TRON.globals.PLAYER_RADIUS + TRON.globals.LIGHTWALL_RADIUS)), (this.coordinates.y - (TRON.globals.PLAYER_RADIUS + TRON.globals.LIGHTWALL_RADIUS)));
		const lightwallCollision = TRON.lightwallExistInArea(this.id, playerCenter, playerAreaRadius);

		if (lightwallCollision === true) {
			TRON.screen.fillStyle = "purple";
			TRON.screen.fillRect(0, 0, TRON.screen.width, TRON.screen.height);
		}
		TRON.screen.rect(playerCenter.x, playerCenter.y, playerAreaRadius, playerAreaRadius);
		TRON.screen.strokeStyle = "green";
		TRON.screen.stroke();
	}

	wallCollision() {
		//X
		if ((this.coordinates.x + TRON.globals.PLAYER_RADIUS) >= TRON.screen.canvas.width)
			this.coordinates.x = (TRON.screen.canvas.width - TRON.globals.PLAYER_RADIUS);
		else if (this.coordinates.x - TRON.globals.PLAYER_RADIUS <= 0)
			this.coordinates.x = TRON.globals.PLAYER_RADIUS;

		//Y
		if ((this.coordinates.y + TRON.globals.PLAYER_RADIUS) >= TRON.screen.canvas.height)
			this.coordinates.y = (TRON.screen.canvas.height - TRON.globals.PLAYER_RADIUS);
		else if (this.coordinates.y - TRON.globals.PLAYER_RADIUS <= 0)
			this.coordinates.y = TRON.globals.PLAYER_RADIUS;

		this.coordinates = new Coordinates(this.coordinates.x, this.coordinates.y);
	}

	loop() {
		// this.adjustConfiguration();
		this.move();
		this.handleCollision();
		this.createLightwallPoint();
		this.draw();
	}

	createLightwallPoint() {
		if (TRON.lightwallExistsAtPoint(this.coordinates) === true)
			return;
		TRON.lightwalls.push(new Lightwall(this.id, this.config, this.coordinates));
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
				this.coordinates.y -= TRON.globals.PLAYER_SPEED;
				this.lastDistanceX = 0;
				this.lastDistanceY = -TRON.globals.PLAYER_SPEED;
			}
			else if (mostRecentControl === 'leftControl') {
				this.coordinates.x -= TRON.globals.PLAYER_SPEED;
				this.lastDistanceX = -TRON.globals.PLAYER_SPEED;
				this.lastDistanceY = 0;
			}
			else if (mostRecentControl === 'downControl') {
				this.coordinates.y += TRON.globals.PLAYER_SPEED;
				this.lastDistanceX = 0;
				this.lastDistanceY = TRON.globals.PLAYER_SPEED;
			}
			else if (mostRecentControl === 'rightControl') {
				this.coordinates.x += TRON.globals.PLAYER_SPEED;
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
document.addEventListener("DOMContentLoaded", async function () {
	TRON = new Tron;
});
