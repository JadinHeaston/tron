'use strict'

class TronConfig {
	VERSION = 0;

	PLAYER_COUNT = 2;
	PLAYER_LIVES = 3;
	PLAYER_RADIUS_FACTOR = 120; //40
	PLAYER_SPEED_FACTOR = 150; //120

	SPAWN_MARGIN = 50; //Minimum pixels from the edge.

	#optionAttributes = {
		VERSION: {
			type: 'number',
			disabled: true,
		},
		PLAYER_COUNT: {
			type: 'range',
			disabled: true,
			displayValue: true,
			min: 2,
			max: 2,
			step: 1,
		},
		PLAYER_LIVES: {
			type: 'range',
			disabled: false,
			displayValue: true,
			min: 1,
			max: 25,
			step: 1,
		},
		PLAYER_RADIUS_FACTOR: {
			type: 'range',
			disabled: false,
			displayValue: true,
			min: 1,
			max: 500,
			step: 1,
		},
		PLAYER_SPEED_FACTOR: {
			type: 'range',
			disabled: false,
			displayValue: true,
			min: 1,
			max: 500,
			step: 1,
		},
		SPAWN_MARGIN: {
			type: 'range',
			disabled: false,
			displayValue: true,
			min: 1,
			max: 500,
			step: 1,
		},
	};

	generateOptionInputs() {
		var outputElements = [];

		// Loop over the class properties and create input fields
		Object.keys(this).forEach((key) => {
			const label = document.createElement('label');
			label.innerText = key;
			label.setAttribute('for', key);

			const input = document.createElement('input');
			input.id = key;
			input.name = key;
			input.value = this[key];

			const inputWrapper = document.createElement('div');
			inputWrapper.appendChild(label);
			inputWrapper.appendChild(input);
			const visualInputValue = document.createElement('div');
			inputWrapper.appendChild(visualInputValue);

			//Custom input options.
			if (key in this.#optionAttributes) {
				Object.keys(this.#optionAttributes[key]).forEach((attributeName) => {
					input[attributeName] = this.#optionAttributes[key][attributeName];
				});
				if (this.#optionAttributes[key].displayValue !== undefined && this.#optionAttributes[key].displayValue === true) {
					//Updating visual input value
					input.nextElementSibling.innerText = input.value;
					input.oninput = async function () {
						input.nextElementSibling.innerText = input.value;
					};
				}
			}

			outputElements.push(inputWrapper);
		});
		return outputElements;
	}
}