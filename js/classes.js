"use strict"

class Game {
	constructor() {
		const GAME_SCREEN = document.getElementById('game-screen');
		this.screen = GAME_SCREEN.getContext('2d');
	}
	static async startGame() {
		new Tron;
	}
}

class Tron extends Game {
	constructor() {
		super();
		this.players = [];

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

	loop = async (dt) => {
		this.adjustScreen();
		this.clearScreen();
		// drawHeader();

		//Drawing players
		this.players.forEach(async function (player) {
			player.loop();
		});

		//Starting the loop again.
		window.requestAnimationFrame(this.loop);
	}
}

class Player extends Game {
	constructor(PlayerConfig) {
		super();
		this.x = 0;
		this.y = 0;
		this.key = null;
		this.config = PlayerConfig;

		//Binding listeners.
		window.addEventListener('keydown', async function (event) {
			if (this.key === event.key && this.key !== null)
				return;
			this.key = event.key;
		}.bind(this))
		window.addEventListener('keyup', async function (event) {
			if (this.key === event.key)
				this.key = null;
		}.bind(this));
	}

	/**
	 * Adjusting size based on screen size. (Responsive)
	 */
	async adjustConfiguration() {
		this.config.radius = (this.screen.canvas.width / 96);
		this.config.speed = (this.screen.canvas.width / 120);
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
		this.wallCollision();
		this.draw();
	}

	async move() {
		switch (this.key) {
			case this.config.upControl:
				this.y -= this.config.speed;
				break;
			case this.config.leftControl:
				this.x -= this.config.speed;
				break;
			case this.config.downControl:
				this.y += this.config.speed;
				break;
			case this.config.rightControl:
				this.x += this.config.speed;
				break;
		}
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
