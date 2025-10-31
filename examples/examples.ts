/* eslint-disable require-jsdoc */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { EXAMPLES } from "../examples.js";

const div = document.createElement("div");

const h1 = document.createElement("h1");
h1.textContent = "three-shape-3d Examples";
div.appendChild(h1);

const examples: { [key: string]: string[] } = {};
const uncategorized: string[] = [];

EXAMPLES.sort().forEach((example: string) => {
	// Find first slash
	const slashIndex = example.indexOf("/");
	// If found, grab the first part of the string
	const category = slashIndex !== -1 ? example.substring(0, slashIndex) : null;

	if (category) {
		// Check if key exists
		if (examples[category]) {
			// If it does, push example to array
			examples[category].push(example);
		} else {
			// If it doesn't, create new array with example
			examples[category] = [example];
		}
	} else {
		uncategorized.push(example);
	}
});

const capitalizeFirstLetter = (string: string) =>
	string.charAt(0).toUpperCase() + string.slice(1);

const buildList = (list: string[], category: string) => {
	const ul = document.createElement("ul");
	ul.id = "ul";

	const h3 = document.createElement("h3");
	h3.textContent = `${capitalizeFirstLetter(category)}`;
	div.appendChild(h3);

	list.forEach((example: string) => {
		const li = document.createElement("li");
		const a = document.createElement("a");
		a.textContent = `${example}`;
		a.href = `./examples/${example}/`;
		li.appendChild(a);
		ul.appendChild(li);
	});

	div.appendChild(ul);
};

buildList(uncategorized, "Uncategorized");

Object.keys(examples).forEach((category: string) => {
	buildList(examples[category], category);
});

document.body.appendChild(div);
