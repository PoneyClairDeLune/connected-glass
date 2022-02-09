"use strict";

import {
	fileOpen,
	directoryOpen,
	fileSave,
	supported,
} from "../libs/browser_fs_access.min.js";

// Quick paths
self.$e = function (selector, origin = document) {
	return origin.querySelector && origin.querySelector(selector);
};
self.$a = function (selector, origin = document) {
	return Array.from(origin.querySelectorAll && origin.querySelectorAll(selector));
};
HTMLElement.prototype.$e = function (selector) {
	return this.querySelector && this.querySelector(selector);
};
HTMLElement.prototype.$a = function (selector) {
	return this.querySelector && Array.from(this.querySelector(selector));
};

let canvas, context;
let fileReader = [new FileReader(), new FileReader()];
let imageFile, imagePNG, imagePNG8, imageData;
let tst, ctmFile, mediumWidth, mediumHeight, slicingMap = "", slicingParams = [], slices = [];
let blobPool = [];

// Generate the correct slicing data
self.genArea = function (width, height, sw, sh) {
	let sx = [0, sw, width - sw];
	let sy = [0, sh, height - sh];
	mediumWidth = width - 2 * sw, mediumHeight = height - 2 * sh;
	for (let count = 0; count < 9; count ++) {
		slicingParams[count] = {
			x: sx[count % 3],
			y: sy[Math.floor(count / 3)],
			w: (count % 3 == 1) ? mediumWidth : sw,
			h: (Math.floor(count / 3) == 1) ? mediumHeight : sh
		};
	};
	console.debug(slicingParams);
	slicingParams.forEach(function (e, i) {
		slices[i] = context.getImageData(e.x, e.y, e.w, e.h);
	});
	console.debug(slices);
};
self.drawState = function (instructions) {
	context.clearRect(0, 0, canvas.width, canvas.height);
	Array.from(instructions).forEach(function (e, i) {
		let sIdx = tst.map.indexOf(e);
		if (sIdx >= 0) {
			let source = slices[sIdx], target = slicingParams[i];
			console.debug(`${target.w == source.width ? (target.x) : (mediumWidth * (i % 3) - (mediumWidth - tst.slice.width))}, ${target.h == source.height ? (target.y) : (mediumHeight * Math.floor(i / 3) - (mediumHeight - tst.slice.height))}`);
			context.putImageData(source, (target.w == source.width ? (target.x) : (mediumWidth * (i % 3) - (mediumWidth - tst.slice.width))), (target.h == source.height ? (target.y) : (mediumHeight * Math.floor(i / 3) - (mediumHeight - tst.slice.height))));
		};
	});
};

// Load the original texture
fileReader[0].onloadend = function () {
	imagePNG = UPNG.decode(this.result);
	canvas.width = imagePNG.width;
	canvas.height = imagePNG.height;
	imagePNG8 = new Uint8ClampedArray(UPNG.toRGBA8(imagePNG)[0]);
	imageData = new ImageData(imagePNG8, imagePNG.width, imagePNG.height);
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.putImageData(imageData, 0, 0);
};
fileReader[1].onloadend = function () {
	tst = JSON.parse(this.result);
	console.debug(tst);
	ctmFile = `method=ctm\nmatchBlocks=${tst.ctm.id}\ntiles=${tst.ctm.start}-${tst.features.length + tst.ctm.start}\nconnect=${tst.ctm.connect}\nresourceCondition=${tst.ctm.condition}`;
	console.debug(ctmFile);
	genArea(imagePNG.width, imagePNG.height, tst.slice.width, tst.slice.height);
};

canvas = $e("canvas"), context = canvas.getContext("2d");
$e("button#imgsrc").addEventListener("click", async function () {
	imageFile = await fileOpen({
		extensions: [".png", ".PNG"],
		description: "Original texture",
		startIn: "pictures",
		id: "originalTexture"
	});
	fileReader[0].readAsArrayBuffer(imageFile);
});
$e("button#tsconf").addEventListener("click", async function () {
	fileReader[1].readAsText(await fileOpen({
		extensions: [".json", ".JSON"],
		description: "Slicing instructions",
		startIn: "pictures",
		id: "slicingConfig"
	}));
});
$e("input").addEventListener("input", async function () {
	let instructions = tst.features[parseInt(this.value) - tst.slice.start] || tst.map;
	drawState(instructions);
	console.debug(instructions);
});
