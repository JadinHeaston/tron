"use strict"

class Game {
	constructor() {
		const GAME_SCREEN = document.getElementById('game-screen');
		this.screen = GAME_SCREEN.getContext('2d');
		this.keyManager = new KeyManager;

		this.setupEventListeners();
	}

	static async startGame() {
		new Tron;
	}

	async setupEventListeners() {
		window.addEventListener('keydown', (event) => {
			if (this.keyManager.isKeyPressed(event.key) !== false)
				return;

			this.keyManager.keyDown(event.key);
		})
		window.addEventListener('keyup', (event) => {
			this.keyManager.keyUp(event.key);
		});
	}
}

class Tron extends Game {
	constructor() {
		super();
		this.gameState = null;
		this.players = [];
		this.startingPoints = [];

		for (let index = 0; index < PLAYER_COUNT; ++index) {
			this.players.push(new Player(PLAYER_CONFIGS[index]));
		}

		//Beginning game loop.
		window.requestAnimationFrame(this.loop);
	}

	async adjustScreen() {
		//Setting width and height, in case of resizing.
		if (this.screen.canvas.width !== window.innerWidth)
			this.screen.canvas.width = window.innerWidth;
		if (this.screen.canvas.height !== window.innerHeight)
			this.screen.canvas.height = window.innerHeight;
	}

	async clearScreen() {
		// Store the current transformation matrix
		this.screen.save();

		// Use the identity matrix while clearing the canvas
		this.screen.setTransform(1, 0, 0, 1, 0, 0);
		this.screen.clearRect(0, 0, this.screen.canvas.width, this.screen.canvas.height);

		// Restore the transform
		this.screen.restore();
	}

	async calculatePolygonPoints(sides) {
		// Calculate the center point of the window
		const centerX = this.screen.canvas.width / 2;
		const centerY = this.screen.canvas.height / 2;

		// Calculate the general radius of the shape (just for visualization purposes)
		const radius = Math.min(this.screen.canvas.width, this.screen.canvas.height) / 2; // Use smaller dimension

		let points = [];

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

	loop = async (dt) => {
		this.adjustScreen();
		if (this.gameState === null)
			this.startingPoints = await this.calculatePolygonPoints(this.players.length);
		this.clearScreen();
		// drawHeader();

		//Handling players
		this.players.forEach(async function (player, playerIndex) {
			if (this.gameState === null) {
				player.x = this.startingPoints[playerIndex].x;
				player.y = this.startingPoints[playerIndex].y;
			}
			player.loop();
		}.bind(this));

		//Starting the loop again.
		window.requestAnimationFrame(this.loop);

		this.gameState = 'playing'; //Updating game state.
	}
}

class Player extends Game {
	constructor(PlayerConfig) {
		super();
		this.x = 0;
		this.y = 0;
		this.config = PlayerConfig;
	}

	/**
	 * Adjusting size based on screen size. (Responsive)
	 */
	async adjustConfiguration() {
		this.config.radius = (this.screen.canvas.width / 96);
		this.config.speed = (this.screen.canvas.width / 120);
	}

	async handleCollision() {
		this.wallCollision();
	}

	async wallCollision() {
		//X
		if ((this.x + this.config.radius) >= this.screen.canvas.width)
			this.x = (this.screen.canvas.width - this.config.radius);
		else if (this.x - this.config.radius <= 0)
			this.x = this.config.radius;

		//Y
		if ((this.y + this.config.radius) >= this.screen.canvas.height)
			this.y = (this.screen.canvas.height - this.config.radius);
		else if (this.y - this.config.radius <= 0)
			this.y = this.config.radius;
	}

	async loop() {
		this.adjustConfiguration();
		this.move();
		this.draw();
	}

	async move() {
		const upControl = this.keyManager.isKeyPressed(this.config.upControl);
		const leftControl = this.keyManager.isKeyPressed(this.config.leftControl);
		const downControl = this.keyManager.isKeyPressed(this.config.downControl);
		const rightControl = this.keyManager.isKeyPressed(this.config.rightControl);

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
			if (mostRecentControl === 'upControl')
				this.y -= this.config.speed;
			else if (mostRecentControl === 'leftControl')
				this.x -= this.config.speed;
			else if (mostRecentControl === 'downControl')
				this.y += this.config.speed;
			else if (mostRecentControl === 'rightControl')
				this.x += this.config.speed;
		}

		this.handleCollision();
	}

	async draw() {
		this.screen.beginPath();
		this.screen.arc(this.x, this.y, this.config.radius, 0, 2 * Math.PI);
		this.screen.fillStyle = this.config.color
		this.screen.fill();
	}
}

class PlayerConfig {
	constructor(id, color, upControl, leftControl, downControl, rightControl) {
		this.id = id;
		this.color = color;
		this.radius; //Dynamic based on screen size.
		this.speed; //Dynamic based on screen size.
		this.score;
		this.upControl = upControl;
		this.leftControl = leftControl;
		this.downControl = downControl;
		this.rightControl = rightControl;

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