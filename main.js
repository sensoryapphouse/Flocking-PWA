var player;

window.onload = () => {
	'use strict';

	player = document.getElementById('audio');
	player.loop = false;
	player.load();

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('./sw.js');
	}
	camStart();
}

// Override the function with all the posibilities
navigator.getUserMedia ||
	(navigator.getUserMedia = navigator.mozGetUserMedia ||
		navigator.webkitGetUserMedia || navigator.msGetUserMedia);

var gl;
var canvas;
var Param1 = 1.0;
var Param2 = 1.0;
var Param3 = 1.0;
var Param4 = 1.0;
var mouseX = 100;
var mouseY = 100;
var keyState1 = 0;
var keyState2 = 0;
var keyState3 = 0;
var keyState4 = 0;
var keyStatel = 0;
var keyStater = 0;
var crosshairs;

var sk;
var currentSet = 1;
var currentColourSet = 0;
var menuItem = 0;

function initGL() {
	try {
		gl = canvas.getContext("experimental-webgl", {
			antialias: true
		});
		//            gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
	} catch (e) { }
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "f") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "v") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

var programsArray = new Array();
var current_program;
var index = 0;

function initShaders() {
	programsArray.push(createProgram("shader-vs", "shader-1-fs"));
	programsArray.push(createProgram("shader-vs", "shader-2-fs"));
	programsArray.push(createProgram("shader-vs", "shader-3-fs"));
	programsArray.push(createProgram("shader-vs", "shader-4-fs"));
	programsArray.push(createProgram("shader-vs", "shader-5-fs"));
	programsArray.push(createProgram("shader-vs", "shader-6-fs"));
	programsArray.push(createProgram("shader-vs", "shader-7-fs"));
	programsArray.push(createProgram("shader-vs", "shader-8-fs"));
	current_program = programsArray[0];
}

function createProgram(vertexShaderId, fragmentShaderId) {
	var shaderProgram;
	var fragmentShader = getShader(gl, fragmentShaderId);
	var vertexShader = getShader(gl, vertexShaderId);

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	//       gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, "resolution");
	shaderProgram.mouse = gl.getUniformLocation(shaderProgram, "mouse");
	shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");
	shaderProgram.Param1 = gl.getUniformLocation(shaderProgram, "Param1");
	shaderProgram.Param2 = gl.getUniformLocation(shaderProgram, "Param2");
	shaderProgram.Param3 = gl.getUniformLocation(shaderProgram, "Param3");
	shaderProgram.Param4 = gl.getUniformLocation(shaderProgram, "Param4");
	return shaderProgram;
}

var webcam;
var texture;

function initTexture() {
	texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}

function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}

var ix = 0.0;
var end;
var st = new Date().getTime();

function setUniforms() {
	end = new Date().getTime();
	gl.uniformMatrix4fv(current_program.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(current_program.mvMatrixUniform, false, mvMatrix);
	gl.uniform2f(current_program.resolutionUniform, canvas.width, canvas.height);
	gl.uniform2f(current_program.mouse, mouseX, mouseY);
	gl.uniform1f(current_program.time, ((end - st) % 1000000) / 1000.0);
	gl.uniform1f(current_program.Param1, Param1);
	gl.uniform1f(current_program.Param2, Param2);
	gl.uniform1f(current_program.Param3, Param3);
	gl.uniform1f(current_program.Param4, Param4);
}

var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
	cubeVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	cubeVertexPositionBuffer.itemSize = 2;
	cubeVertexPositionBuffer.numItems = 4;

	cubeVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	var textureCoords = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	cubeVertexTextureCoordBuffer.itemSize = 2;
	cubeVertexTextureCoordBuffer.numItems = 4;

	cubeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	var cubeVertexIndices = [0, 1, 2, 0, 2, 3];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
	cubeVertexIndexBuffer.itemSize = 1;
	cubeVertexIndexBuffer.numItems = 6;
}

function drawScene() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.BLEND);

	mat4.ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, pMatrix);

	gl.useProgram(current_program);
	mat4.identity(mvMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(current_program.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	//        gl.vertexAttribPointer(current_program.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcam);
	gl.uniform1i(current_program.samplerUniform, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	setUniforms();
	gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

function tick() {
	requestAnimFrame(tick);
	drawScene();
}

function webGLStart() {
	canvas = document.getElementById("webgl-canvas");
	if (screen.width > 1500 || screen.height > 1500) {
		canvas.width = 1024;
		canvas.height = 1024;
	} else {
		canvas.width = 512;
		canvas.height = 512;
	}
	//canvas.width = 2096;  for screen capture or use 4k resolution with old firefox, i.e. 3840x2160
	//canvas.height =2096;
	initGL();
	initShaders();
	initBuffers();
	initTexture();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	tick();
}

function PlaySound(i) {
	player.play();
}

function Action(i) {
	PlaySound();
	switch (i) {
		case 4: // elongated
			elongated = !elongated;
			break;
		case 2: // change colours
			currentColourSet++;
			if (currentColourSet > 2)
				currentColourSet = 0;
			switch (currentSet) {
				case 0: // fish with tail
					switch (currentColourSet) {
						case 0:
							colors = ["#F33", "#F33", "#F84", "rgba(80,80,255,.2)"];
							break
						case 1:
							colors = ["#FFC000", "#9AFF0A", "#9A0A9A", "rgba(80,80,255,.2)"];
							break;
						case 2:
							colors = ["#FFD700", "#FFDF33", "#FFD700", "rgba(80,80,255,.2)"];
							break;
					}
					break;
				case 1: // bee shaped (no wings)
					switch (currentColourSet) {
						case 0:
							colors = ["#F33", "#F33", "#F84", "rgba(80,80,255,.2)"];
							break
						case 1:
							colors = ["#FFC000", "#9AFF0A", "#9A0A9A", "rgba(80,80,255,.2)"];
							break;
						case 2:
							colors = ["#FFD700", "#FFDF33", "#FFD700", "rgba(80,80,255,.2)"];
							break;
					}
					break;
				case 2: // bee with wings
					switch (currentColourSet) {
						case 0:
							colors = ["#FFFF00", "#000000", "#00", "rgba(80,80,255,.2)"];
							colorStep = 1.1;
							justOriginalColours = true;
							break
						case 1:
							justOriginalColours = false;
							sameColours = true;
							colorStep = .3;
							break;
						case 2:
							colors = ["#FFFFFF", "#406000", "#FF0F84", "rgba(80,80,255,.2)"];
							justOriginalColours = false;
							sameColours = false;
							colorStep = -.3;
							break;
					}
					break;
				case 3: // tadpole
					switch (currentColourSet) {
						case 0:
							justOriginalColours = true;
							sameColours = true;
							colors = ["#400000", "#820", "#F84", "rgba(80,80,255,.2)"];
							alphaStyle = 0;
							break
						case 1:
							justOriginalColours = false;
							sameColours = false;
							colorStep = -1.1;
							alphaStyle = 0;
							break;
						case 2:
							justOriginalColours = false;
							sameColours = false;
							colorStep = .3;
							colors = ["#C04040", "#420", "#F84", "rgba(80,80,255,.2)"];
							alphaStyle = 1;
							break;
					}
					break;
				case 4: // flying saucers
					switch (currentColourSet) {
						case 0:
							colors = ["#FFD700", "#FFDF33", "#FFD700", "rgba(80,80,255,.2)"];
							break
						case 1:
							colors = ["#C0C0C0", "#9A9A9A", "#C0C0C0", "rgba(80,80,255,.2)"];
							break;
						case 2:
							colors = ["#C0C0C0", "#CD7232", "#CD7F32", "rgba(80,80,255,.2)"];
							break;
					}
					break;
				case 5: // tiny spacecraft
					switch (currentColourSet) {
						case 0:
							justOriginalColours = false;
							colors = ["#F33", "#420", "#F84", "rgba(80,80,255,.2)"];
							break
						case 1:
							justOriginalColours = false;
							colors = ["#FFFF00", "#0084FF", "#FF0FFF", "rgba(80,80,255,.2)"];
							break;
						case 2:
							justOriginalColours = true;
							colors = ["#00FF33", "#FF0403", "#F84", "rgba(80,80,255,.2)"];
							break;
					}
					break;
					break;
				case 6: // flat(ish) worm
					switch (currentColourSet) {
						case 0:
							justOriginalColours = false;
							colors = ["#FF3300", "#070403", "#F84", "rgba(80,80,255,.2)"];
							break
						case 1:
							justOriginalColours = true;
							colors = ["#00FF00", "#FF0403", "#F84", "rgba(80,80,255,.2)"];
							break;
						case 2:
							justOriginalColours = false;
							colors = ["#00FF33", "#FF0403", "#F84", "rgba(80,80,255,.2)"];
							break;
					}
					break;
				case 7: // tissues
					switch (currentColourSet) {
						case 0:
							sameColours = true;
							colors = ["#F33", "#820", "#F84", "rgba(80,80,255,.2)"];
							break
						case 1:
							sameColours = false;
							colorStep = -.1;
							colors = ["#00FF00", "#FF0403", "#F84", "rgba(80,80,255,.2)"];
							break;
						case 2:
							sameColours = false;
							colorStep = .2;
							colors = ["#00FFFF", "#FF8403", "#FFFF84", "rgba(255,255,255,.2)"];
							break;
					}
					break;
			}
			break;
		case 1:
			noTrails = !noTrails;
			doXOR = !noTrails;
			break;
			break;
		case 5: // left
			Param1 = Param1 - 1;
			if (Param1 < 0) Param1 = 3;
			break;
		case 6: // right
			Param1 = Param1 + 1;
			if (Param1 > 3) Param1 = 0;
			break;
	}
}

function toggleButtons() {
	var button = document.querySelector('button');
	var button1 = document.querySelector('button1');
	var button2 = document.querySelector('button2');
	var buttonl = document.querySelector('buttonl');
	var buttonr = document.querySelector('buttonr');
	button.hidden = !button.hidden;
	button1.hidden = !button1.hidden;
	button2.hidden = !button2.hidden;
	buttonl.hidden = !buttonl.hidden;
	buttonr.hidden = !buttonr.hidden;
}

function MonitorKeyDown(e) { // stop autorepeat of keys with KeyState1-4 flags
	if (!e) e = window.event;
	if (e.keyCode == 32 || e.keyCode == 49) {
		if (keyState1 == 0)
			Action(4);
	} else if (e.keyCode == 51 || e.keyCode == 13) {
		if (keyState3 == 0)
			Action(1);
		keyState3 = 1;
	} else if (e.keyCode == 52) {
		if (keyState4 == 0)
			Action(2);
		keyState4 = 1;
	} else if (e.keyCode == 53) {
		toggleButtons();
	} else if (e.keyCode == 189) { // +
		if (keyStatel == 0)
			Action(5);
		buttonl
	} else if (e.keyCode == 187) { // -
		if (keyStater == 0)
			Action(6);
	}
	return false;
}

function MonitorKeyUp(e) {
	if (!e) e = window.event;
	if (e.keyCode == 32 || e.keyCode == 49) {
		keyState1 = 0;
	} else if (e.keyCode == 50) {
		keyState2 = 0;
	} else if (e.keyCode == 51 || e.keyCode == 13) {
		keyState3 = 0;
	} else if (e.keyCode == 52) {
		keyStatel = 0;
	} else if (e.keyCode == 189) {
		keyState4 = 0;
	} else if (e.keyCode == 187) {
		keyStater = 0;
	}
	return false;
}

var mouseState = 0;

function MonitorMouseDown(e) {
	if (!e) e = window.event;
	if (e.button == 0) {
		mouseState = 1;
		//        mouseX = e.clientX / canvas.scrollWidth;
		//        mouseY = 1.0 - e.clientY / canvas.scrollHeight;
	}
	//   var c = document.getElementById("container");
	//    c.style.filter = "sepia(1) hue-rotate(230deg) saturate(2)";
	//    toggleButtons();
	return false;
}

function MonitorMouseUp(e) {
	if (!e) e = window.event;
	if (e.button == 0) {
		mouseState = 0;
	}
	//    var c = document.getElementById("container");
	//    c.style.filter = "grayscale(0)";
	return false;
}

var splash;
var mbutton;
var mbutton1;
var mbutton2;
var mbutton3;
var mbutton4;
var mbutton5;
var mbutton6;
var mbutton7;
var ibuttonl;
var ibuttonr;
var inmenu = true;

var mode;
var bee;
var bees = [];
var M = Math;
var pow = M.pow;
var random = M.random;
var mouseX;
var mouseY;
var count = 0;
var firstTime = true;

var turnRateChangeOccurence = 0.5;
var tempMaxTurnRate;
var maxTurnRate = 0.10;
var maxTurnRateChange = 0.9;
var beeTarget;
var isTargetRepulsing = 0;

var beeWidth = 30; // 34 normal 100, 10
var speed = 3; // Distance run on each step
var beeLength = 22; // 22, normal 8, outer space, 
var beeCount = 6; //18 normal
var i = beeCount; // First iteration will be on BeeCount
var repulseCycles = 300;
var repulseStrengh = 2;
var rectangular = false;
var perspective = false;
var tail = false;
var wings = false;
var roundHead = true;
var randomSize = false;
var elongated = false;
var elongatedV = false;
var vMult = 1.1;
var wiggle = false; // when turning in circle
var forceRound = true;
var forceSquare = false;
var forceButt = false;
var movingState = 0; // 0 circle, 1 circle but stay vertical longer, 2 vertical line, 3 horizontal line
var doXOR = false;
var tadpole = false;
var largeMiddle = true;
var curtains = false;
var sameColours = true;
var justOriginalColours = true;
var colorStep = 1.1;
var alphaStyle = 0; // 0 no opactity, 1 reduce from head to tail, 2 last 1/4 used opacity value
var opacity = .2;
var colChangeMult1 = 5;
var colChangeMult2 = 20;
var noTrails = true;
//var colors = ["#F33", "#820", "#F84", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", "rgba(80,80,255,.1)"];
var colors = ["#F33", "#F33", "#F33", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", 

function hideMenu() {
	splash.hidden = true;
	mbutton.hidden = true;
	mbutton1.hidden = true;
	mbutton2.hidden = true;
	mbutton3.hidden = true;
	mbutton4.hidden = true;
	mbutton5.hidden = true;
	mbutton6.hidden = true;
	mbutton6.hidden = true;
	mbutton7.hidden = true;
	button.hidden = false;
	button1.hidden = false;
	button2.hidden = false;
	buttonl.hidden = false;
	buttonr.hidden = false;
	inMenu = false;
}

function showMenu() {
	splash.hidden = false;
	mbutton.hidden = false;
	mbutton1.hidden = false;
	mbutton2.hidden = false;
	mbutton3.hidden = false;
	mbutton4.hidden = false;
	mbutton5.hidden = false;
	mbutton6.hidden = false;
	mbutton6.hidden = false;
	mbutton7.hidden = false;
	button.hidden = false;
	button1.hidden = false;
	button2.hidden = false;
	buttonl.hidden = true;
	buttonr.hidden = true;
	crosshairs.hidden = true;
	inMenu = true;
}


function camStart() {
	splash = document.querySelector('splash');
	var prticles = document.querySelector('particles');
	crosshairs = document.querySelector('crosshairs');
	crosshairs.hidden = true;
	mbutton = document.querySelector('mbutton');
	mbutton1 = document.querySelector('mbutton1');
	mbutton2 = document.querySelector('mbutton2');
	mbutton3 = document.querySelector('mbutton3');
	mbutton4 = document.querySelector('mbutton4');
	mbutton5 = document.querySelector('mbutton5');
	mbutton6 = document.querySelector('mbutton6');
	mbutton7 = document.querySelector('mbutton7');
	button = document.querySelector('button');
	button1 = document.querySelector('button1');
	button2 = document.querySelector('button2');
	buttonl = document.querySelector('buttonl');
	buttonr = document.querySelector('buttonr');
	webcam = document.createElement('canvas'); //getElementById('webcam');
	keyState1 = 0;
	keyState2 = 0;
	keyState3 = 0;
	keyState4 = 0;

	//Param1 = Math.random(); // for Electra
	//Param2 = Math.random();
	//prticles.hidden = true;
	//splash.hidden = true;
	splash.onclick = function (e) {
		if (document.body.requestFullscreen) {
			document.body.requestFullscreen();
		} else if (document.body.msRequestFullscreen) {
			document.body.msRequestFullscreen();
		} else if (document.body.mozRequestFullScreen) {
			document.body.mozRequestFullScreen();
		} else if (document.body.webkitRequestFullscreen) {
			document.body.webkitRequestFullscreen();
		}
		//       hideMenu();
	}
	/*   window.setTimeout(function () {
		   if (document.body.requestFullscreen) {
			   document.body.requestFullscreen();
		   } else if (document.body.msRequestFullscreen) {
			   document.body.msRequestFullscreen();
		   } else if (document.body.mozRequestFullScreen) {
			   document.body.mozRequestFullScreen();
		   } else if (document.body.webkitRequestFullscreen) {
			   document.body.webkitRequestFullscreen();
		   }

		   splash.hidden = true;
	   }, 5000); // hide Splash screen after 2.5 seconds
	   */
	webGLStart();

	function StartBees() {
		//      omousedown = mousedown;
		//       onmouseup = clickfn;

		var color = tinycolor(colors[3]);
		//        color.setAlpha(opacity);
		colors[3] = color.toRgbString();
		bees.splice(0, bees.length);
		for (i = beeCount; i--;) {
			bees[i] = initBee();
			if (!randomSize)
				bees[i].h = 1;
		}
		loop();
	}

	function Go(i) {
		currentSet = i;
		currentColourSet = 0;
		hideMenu();
		sk.clear();
		Param1 = 0;
		current_program = programsArray[i];
		vMult = 1.1;
		switch (i) {
			case 0: // fish with tail
				beeWidth = 25;
				speed = 3;
				beeLength = 18;
				beeCount = 14;
				repulseCycles = 800;
				repulseStrengh = 2;
				rectangular = false;
				perspective = false;
				tail = true;
				wings = false;
				roundHead = true;
				randomSize = true;
				elongated = false;
				elongatedV = true;
				wiggle = true; // when turning in circle
				forceRound = false;
				forceSquare = false;
				forceButt = false;
				movingState = 1;
				doXOR = false;
				tadpole = false;
				largeMiddle = false;
				curtains = false;
				sameColours = false;
				colorStep = -.1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = false;
				colors = ["#F33", "#F33", "#F84", "rgba(80,80,255,.2)"]; //["#F33", "#F33", "#F33", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", 
				break;
			case 1: // bee shaped (no wings)
				beeWidth = 35;
				speed = 4;
				beeLength = 25;
				beeCount = 12;
				repulseCycles = 800;
				repulseStrengh = 2;
				rectangular = false;
				perspective = false;
				tail = false;
				wings = false;
				roundHead = true;
				randomSize = false;
				elongated = false;
				elongatedV = false;
				wiggle = false; // when turning in circle
				forceRound = false;
				forceSquare = false;
				forceButt = false;
				movingState = 0;
				doXOR = false;
				tadpole = false;
				largeMiddle = false;
				curtains = false;
				sameColours = true;
				colorStep = 1.1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = false;
				colors = ["#F33", "#820", "#F84", "rgba(80,80,255,.2)"]; //["#F33", "#F33", "#F33", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", 
				break;
			case 2: // bee with wings
				beeWidth = 30;
				speed = 3;
				beeLength = 22;
				beeCount = 10;
				repulseCycles = 800;
				repulseStrengh = 2;
				rectangular = false;
				perspective = false;
				tail = false;
				wings = true;
				roundHead = true;
				randomSize = true;
				elongated = false;
				elongatedV = false;
				wiggle = true;
				forceRound = false;
				forceSquare = false;
				forceButt = false;
				movingState = 0;
				doXOR = false;
				tadpole = false;
				largeMiddle = false;
				curtains = false;
				sameColours = true;
				colorStep = 1.1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = true;
				colors = ["#FFFF00", "#000000", "#00", "rgba(80,80,255,.2)"];
				break;
			case 3: // tadpole
				beeWidth = 20;
				speed = 3;
				beeLength = 40;
				beeCount = 10;
				repulseCycles = 800;
				repulseStrengh = 2;
				rectangular = false;
				perspective = true;
				tail = false;
				wings = false;
				roundHead = true;
				randomSize = false;
				elongated = false;
				elongatedV = true;
				wiggle = false;
				forceRound = true;
				forceSquare = false;
				forceButt = false;
				movingState = 0;
				doXOR = false;
				tadpole = true;
				largeMiddle = false;
				curtains = false;
				sameColours = false;
				colorStep = 1.1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = true;
				colors = ["#400000", "#820", "#F84", "rgba(80,80,255,.2)"];
				break;
			case 4: // flying saucers
				beeWidth = 25;
				speed = 2.5;
				beeLength = 3;
				beeCount = 6;
				repulseCycles = 1000;
				repulseStrengh = 3;
				rectangular = false;
				perspective = true;
				tail = false;
				wings = true;
				roundHead = true;
				randomSize = false;
				elongated = true;
				elongatedV = true;
				vMult = 1.02;
				wiggle = false;
				forceRound = false;
				forceSquare = false;
				forceButt = false;
				movingState = 3;
				doXOR = false;
				tadpole = false;
				largeMiddle = false;
				curtains = false;
				sameColours = true;
				colorStep = 1.1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = true;
				colors = ["#FFD700", "#FFDF33", "#FFD700", "rgba(80,80,255,.2)"];
				break;
			case 5: // tiny spacecraft
				beeWidth = 30;
				speed = 2.5;
				beeLength = 12;
				beeCount = 25;
				repulseCycles = 800;
				repulseStrengh = 1.5;
				rectangular = false;
				perspective = false;
				tail = false;
				wings = true;
				roundHead = false;
				randomSize = true;
				elongated = false;
				elongatedV = true;
				wiggle = false;
				forceRound = false;
				forceSquare = false;
				forceButt = false;
				movingState = 2;
				doXOR = false;
				tadpole = false;
				largeMiddle = false;
				curtains = false;
				sameColours = false;
				colorStep = .1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 1;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = false;
				colors = ["#F33", "#420", "#F84", "rgba(80,80,255,.2)"]; //["#F33", "#F33", "#F33", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", 
				break;
			case 6: // flat(ish) worm
				beeWidth = 12;
				speed = 3;
				beeLength = 80;
				beeCount = 5;
				repulseCycles = 800;
				repulseStrengh = 2;
				rectangular = false;
				perspective = false;
				tail = false;
				wings = false;
				roundHead = true;
				randomSize = false;
				elongated = false;
				elongatedV = true;
				wiggle = false;
				forceRound = true;
				forceSquare = false;
				forceButt = false;
				movingState = 0;
				doXOR = false;
				tadpole = false;
				largeMiddle = true;
				curtains = false;
				sameColours = false;
				colorStep = -1.1;
				alphaStyle = 1;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = false;
				colors = ["#FF3300", "#070403", "#F84", "rgba(80,80,255,.2)"]; // ["#F33", "#F33", "#F33", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", 
				//colors = ["#00FF33", "#FF0403", "#F84", "rgba(80,80,255,.2)"];
				//colors = ["#00FF33", "#FF0403", "#F84", "rgba(80,80,255,.2)"];// original colours = false
				break;
			case 7: // tissues
				beeWidth = 5;
				speed = 2.5;
				beeLength = 30;
				beeCount = 8;
				repulseCycles = 500;
				repulseStrengh = 2;
				rectangular = false;
				perspective = true;
				tail = false;
				wings = false;
				roundHead = false;
				randomSize = false;
				elongated = true;
				elongatedV = false;
				wiggle = true;
				forceRound = false;
				forceSquare = true;
				forceButt = false;
				movingState = 3;
				doXOR = false;
				tadpole = false;
				largeMiddle = true;
				curtains = false;
				sameColours = true;
				colorStep = 1.1;
				alphaStyle = 0;
				opacity = .2;
				colChangeMult1 = 5;
				colChangeMult2 = 20;
				noTrails = true;
				justOriginalColours = false;
				colors = ["#F33", "#820", "#F84", "rgba(80,80,255,.2)"]; // ["#F33", "#F33", "#F33", "rgba(80,80,255,.2)"]; //   colors = ["#004000", "#FFFF33", "#FFFF84", 
				break;
		}
		StartBees();
	}

	mbutton.onmousedown = function (e) {
		Go(0);
	}
	mbutton1.onmousedown = function (e) {
		Go(1);
	}
	mbutton2.onmousedown = function (e) {
		Go(2);
	}
	mbutton3.onmousedown = function (e) {
		Go(3);
	}
	mbutton4.onmousedown = function (e) {
		Go(4);
	}
	mbutton5.onmousedown = function (e) {
		Go(5);
	}
	mbutton6.onmousedown = function (e) {
		Go(6);
	}
	mbutton7.onmousedown = function (e) {
		Go(7);
	}

	document.onkeydown = MonitorKeyDown;
	document.onkeyup = MonitorKeyUp;
	/*
		canvas.onmousedown = MonitorMouseDown;
		canvas.onmouseup = MonitorMouseUp;
		canvas.onmousemove = function (e) {
			e = e || window.event;
			if (mouseState == 1) {
				//            mouseX = (mouseX + 7.0 * e.clientX / canvas.scrollWidth) / 8.0;
				//            mouseY = (mouseY + 7.0 * (1.0 - e.clientY / canvas.scrollHeight)) / 8.0;
			}
		}
		canvas.ontouchstart = function (e) {
			e.preventDefault();
			//       toggleButtons();
			var touchs = e.changedTouches;
			//        mouseX = touchs[0].clientX / canvas.scrollWidth;
			//        mouseY = 1.0 - touchs[0].clientY / canvas.scrollHeight;
			c.style.filter = "sepia(1) hue-rotate(230deg) saturate(2)";
		};
		canvas.ontouchend = function (e) {

			e.preventDefault();
			c.style.filter = "grayscale(0)";
		};
		canvas.ontouchmove = function (e) {
			e.preventDefault();
			var touches = e.changedTouches;
			//       mouseX = touches[0].clientX / canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
			//        mouseY = 1.0 - touches[0].clientY / canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
		};
		*/
	button.onclick = function (e) {
		Action(4);
	}
	button1.onclick = function (e) {
		Action(1);
	}
	button2.onclick = function (e) {
		Action(2);
	}

	buttonl.onclick = function (e) {
		showMenu();
	}

	buttonr.onclick = function (e) {
		Action(6);
	}

	button.ontouchstart = function (e) {
		e.preventDefault();
		Action(4);
	}
	button1.ontouchstart = function (e) {
		e.preventDefault();
		Action(1);
	}
	button2.ontouchstart = function (e) {
		e.preventDefault();
		Action(2);
	}

	buttonl.ontouchstart = function (e) {
		showMenu();
	}
	buttonr.ontouchstart = function (e) {
		e.preventDefault();
		Action(6);
	}

	sk = Sketch.create({

		container: prticles,
		autoclear: false,
		retina: false,
		fullscreen: false,
		width: 800,
		height: 800,
		setup: function () { },

		update: function () { },

		// Event handlers

		keydown: function () {
			if (this.keys.C) this.clear();
		}

		// Mouse & touch events are merged, so handling touch events by default
		// and powering sketches using the touches array is recommended for easy
		// scalability. If you only need to handle the mouse / desktop browsers,
		// use the 0th touch element and you get wider device support for free.
	});

	function moveJoystick(values, isLeft) {
		if (splash.hidden)
			JoystickMoveTo(values[1], values[0]);
	}

	var gpad;

	function getAxes() {
		//        console.log('Axis', gpad.getAxis(0), gpad.getAxis(1), gpad.getButton(14).value);

		if (splash.hidden) {
			JoystickMoveTo(gpad.getAxis(1), gpad.getAxis(0));
			JoystickMoveTo(gpad.getAxis(3), gpad.getAxis(2));
		}
		setTimeout(function () {
			getAxes();
		}, 50);
	}

	gamepads.addEventListener('connect', e => {
		//crosshairs.hidden = false;
		console.log('Gamepad connected:');
		console.log(e.gamepad);
		Highlight()
		gpad = e.gamepad;
		e.gamepad.addEventListener('buttonpress', e => showPressedButton(e.index));
		e.gamepad.addEventListener('buttonrelease', e => removePressedButton(e.index));
		//       e.gamepad.addEventListener('joystickmove', e => moveJoystick(e.values, true),
		//            StandardMapping.Axis.JOYSTICK_LEFT);
		//        e.gamepad.addEventListener('joystickmove', e => moveJoystick(e.values, false),
		//            StandardMapping.Axis.JOYSTICK_RIGHT);
		setTimeout(function () {
			getAxes();
		}, 50);
	});


	gamepads.addEventListener('disconnect', e => {
		console.log('Gamepad disconnected:');
		console.log(e.gamepad);
	});

	gamepads.start();

	function MouseClick() {
		if (splash.hidden) {
			var s;
			var elements = document.elementsFromPoint(crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2, crosshairs.offsetTop + (crosshairs.offsetHeight) / 2);
			try {
				if (elements[0].className != "btn") {
					Clicked();
				} else {
					elements[0].click();
				}
			} catch { }
		}
	}

	function MoveMouse(xm, ym) {
		crosshairs.hidden = false;
		try {
			mouseX = crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2;
			mouseY = crosshairs.offsetTop + (crosshairs.offsetHeight) / 2;
			mouseX += xm;
			mouseY += ym;
			if (mouseX < 10)
				mouseX = 10;
			if (mouseY < 10)
				mouseY = 10;
			if (mouseX >= window.innerWidth - 10)
				mouseX = window.innerWidth - 10;
			if (mouseY >= window.innerHeight - 10)
				mouseY = window.innerHeight - 10;
			//          console.log('MoveTo: ', mouseX, mouseY);
			//            mouse.x = mouseX;
			//            mouse.y = mouseY
			crosshairs.style.left = mouseX - crosshairs.offsetWidth / 2 + "px";
			crosshairs.style.top = mouseY - crosshairs.offsetHeight / 2 + "px";
			mouseX = sk.width * mouseX / window.innerWidth;
			mouseY = sk.height * mouseY / window.innerHeight;
			//            mouseX /= canvas.width;
			//            mouseY /= canvas.height;
			beeTarget = getpos(mouseX, mouseY);
			console.log("Xtarget: ", mouseX, mouseY);
		} catch { }
	}

	function JoystickMoveTo(jy, jx) {
		if (splash.hidden) {
			crosshairs.hidden = false;
			if (Math.abs(jx) < .1 && Math.abs(jy) < .1) {
				try {
					if (gpad.getButton(14).value > 0) // dpad left
						MoveMouse(-7, 0);
					if (gpad.getButton(12).value > 0) // dup
						MoveMouse(0, -5);
					if (gpad.getButton(13).value > 0) // ddown
						MoveMouse(0, 5);
					if (gpad.getButton(15).value > 0) // dright
						MoveMouse(7, 0);
				} catch { }
				return;
			}
			if (Math.abs(jx) < .1)
				jx = 0;
			if (Math.abs(jy) < .1)
				jy = 0;
			if (jx == 0 && jy == 0)
				return;
			MoveMouse(jx * 30, jy * 30);
		}
	}

	function Highlight() {
		mbutton.style.opacity = .7;
		mbutton1.style.opacity = .7;
		mbutton2.style.opacity = .7;
		mbutton3.style.opacity = .7;
		mbutton4.style.opacity = .7;
		mbutton5.style.opacity = .7;
		mbutton6.style.opacity = .7;
		mbutton7.style.opacity = .7;
		switch (menuItem) {
			case 0:
				mbutton.style.opacity = 1.;
				break;
			case 1:
				mbutton1.style.opacity = 1.;
				break;
			case 2:
				mbutton2.style.opacity = 1.;
				break;
			case 3:
				mbutton3.style.opacity = 1.;
				break;
			case 4:
				mbutton4.style.opacity = 1.;
				break;
			case 5:
				mbutton5.style.opacity = 1.;
				break;
			case 6:
				mbutton6.style.opacity = 1.;
				break;
			case 7:
				mbutton7.style.opacity = 1.;
				break;
		}
	}

	function showPressedButton(index) {
		console.log("Press: ", index);
		if (!splash.hidden) {
			switch (index) {
				case 0: // A
				case 1: // B
				case 2: // X
				case 3: // Y
					Go(menuItem);
					break;
				case 12: // dup
					if (menuItem > 3)
						menuItem -= 4;
					Highlight();
					break;
				case 13: // ddown
					if (menuItem < 4)
						menuItem += 4;
					Highlight();
					break;
				case 14: // dleft
					if (menuItem > 0)
						menuItem--;
					Highlight();
					break;
				case 15: // dright
					if (menuItem < 7)
						menuItem++;
					Highlight();
					break;
			}
			console.log("Menu: ", menuItem);
		} else switch (index) {
			case 0: // A click
			case 8:
			case 9:
				MouseClick();
				break;
			case 6:
			case 7:
			case 11:
			case 16:
			case 3:
				Action(4);
				break;
			case 2: // B
				Action(2);
				break;
			case 4: // LT
				Action(5);
				break;
			case 1: // Y
				Action(1);
				break;
			case 5: // RT
				Action(6);
				break;
			case 10: // XBox
				showMenu();
				break;
			default:
		}
	}

	function removePressedButton(index) {
		console.log("Releasd: ", index);
	}

	function moveJoystick(values, isLeft) {
		//      console.log("Joystick: ", values[0], values[1]);
		if (values[1] >= 0 || values[1] >= 0) {
			XBoxVolume = Math.max(values[1], values[0]);
		}
	}


	/*
	Copyright (c) 2020 by Mathieu Sylvain (https://codepen.io/masyl/pen/Gpxdz)

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	*/

	function getpos(a, b) {
		value = {
			x: a,
			y: b
		}
		if (value.x < 0)
			value.x = 0;
		if (value.y < 0)
			value.y = 0;
		if (value.x > sk.width)
			value.x = sk.width;
		if (value.y > sk.height)
			value.y = sk.height;
		return value;
	}

	function mousedown(e) {
		mouseX = e.x;
		mouseY = e.y;
		//isTargetRepulsing = repulseCycles;
		beeTarget = getpos(e.x, e.y);
	}

	function clickfn(e) {
		if (firstTime)
			firstTime = false;
		else {
			mouseX = e.x;
			mouseY = e.y;
			isTargetRepulsing = repulseCycles;
			beeTarget = null; //getpos(e.x, e.y);
		}
	}

	sk.touchdown = function (e) {
		for (var i = sk.touches.length - 1, touch; i >= 0; i--) {
			touch = sk.touches[i];
			mouseX = sk.width * touch.x / window.innerWidth;
			mouseY = sk.height * touch.y / window.innerHeight;
			//           console.log(sk.width, window.innerWidth, mouseX, touch.x);
			beeTarget = getpos(mouseX, mouseY);
		}
	}

	sk.touchmove = function (e) {
		for (var i = sk.touches.length - 1, touch; i >= 0; i--) {
			touch = sk.touches[i];
			mouseX = sk.width * touch.x / window.innerWidth;
			mouseY = sk.height * touch.y / window.innerHeight;
			//           console.log(sk.width, window.innerWidth, mouseX, touch.x);
			beeTarget = getpos(mouseX, mouseY);
			console.log("sktarget: ", mouseX, mouseY);


		}
	}

	function Clicked() {
		if (isTargetRepulsing == 0)
			isTargetRepulsing = repulseCycles;
		sk.clear();
	}

	sk.click = function (e) {
		/*      if (firstTime)
				  firstTime = false;
			  else */
		{
			mouseX = sk.width * e.x / window.innerWidth;
			mouseY = sk.height * e.y / window.innerHeight;
			Clicked();
			beeTarget = getpos(mouseX, mouseY);
		}
	}

	function getturnpos(dir, b, c) {
		value = getpos(
			c.x + M.cos(dir) * b, // divide by 2
			c.y + M.sin(dir) * b // divide by 2
		);
		return value;
	}

	function distn(a, b) {
		if (movingState == 0)
			value = M.sqrt(pow(beeTarget.x - a, 2) + pow(beeTarget.y - b, 2));
		else if (movingState == 1)
			value = M.abs(beeTarget.x - a) + M.abs(beeTarget.y - b) / 4;
		else if (movingState == 2)
			value = M.abs(beeTarget.x - a) + M.abs(beeTarget.y - b) / 8;
		else
			value = M.abs(beeTarget.x - a) / 4 + M.abs(beeTarget.y - b);
		return value;
	}

	function initBee() {
		value = {
			c: [getpos(sk.width * random(), sk.height * random())],
			d: 0.5,
			t: 0,
			h: 0.8 + random() / 2, // do version with fixed h
			col: colors[3]
		}
		return value;
	};

	var positions;

	var img = new Image();

	function doLoop() {
		var size;
		var turnRate;
		var direction;
		var posIndex;

		sk.fillStyle = colors[3];
		if (noTrails) {
			sk.clear();
		}

		for (i = beeCount; i--;) {
			if (sameColours)
				count = 0;
			count = count + colorStep; // rotate colours
			bee = bees[i];
			turnRate = bee.t;
			direction = bee.d;
			size = bee.h;
			positions = bee.c;

			//           if (positions != null)
			//                console.log(positions.length);
			//        var t = (beeLength * size) && posIndex < positions.length - 1;
			positions.splice(beeLength + 1, positions.length); // clean memory a bit
			for (posIndex = 0; posIndex < beeLength * size && posIndex < positions.length - 1; posIndex++) {
				sk.beginPath();
				if (doXOR) {
					if (posIndex == 0)
						sk.globalCompositeOperation = "source-over";
					else
						sk.globalCompositeOperation = "xor";
				}

				if (posIndex == 0)
					sk.lineWidth = beeWidth * 1.5;
				else if (posIndex == beeLength - 1)
					sk.lineWidth = beeWidth / 2;
				else
					sk.lineWidth /= 1.2;

				if (tail) {
					if (posIndex < beeLength * .75)
						sk.lineWidth = beeWidth * size * (1 - (posIndex / beeLength));
					else // Fish tail
						sk.lineWidth = beeWidth * size * (beeLength / 3 - beeLength + posIndex) / 5;
				} else
					sk.lineWidth = beeWidth * size * (1 - (posIndex / beeLength));
				if (largeMiddle)
					sk.lineWidth = beeWidth * size * (1 - Math.abs((posIndex - beeLength / 4) / beeLength));

				if (tadpole) {
					if (posIndex > 0) // tadpole
						sk.lineWidth /= 3;
				}
				if (roundHead)
					sk.lineCap = (posIndex == 0) ? "round" : "butt";

				if (wings) {
					if (posIndex > beeLength / 6 && posIndex < beeLength / 2) { // wings
						sk.lineCap = "butt";
						sk.lineWidth *= 2.5;
						if (sk.lineWidth > 250)
							sk.lineWidth = 250;
					}
				}

				if (forceRound)
					sk.lineCap = "round";
				if (forceButt)
					sk.lineCap = "butt";
				if (forceSquare)
					sk.lineCap = "square";
				//     if (positions[posIndex].y > 200)

				if (perspective)
					sk.lineWidth *= .3 + 2 * ((positions[posIndex].y) / window.innerHeight);

				if (rectangular) {
					sk.lineCap = "butt";
					sk.moveTo(M.floor(positions[posIndex].x / 40) * 40,
						M.floor(positions[posIndex].y / 40) * 40);
					sk.lineTo(M.floor(positions[posIndex + 1].x / 40) * 40,
						M.floor(positions[posIndex + 1].y / 40) * 40);
				} else {
					if (elongated) {
						sk.moveTo(positions[posIndex].x,
							positions[posIndex].y);
						if (elongatedV)
							sk.lineTo(positions[posIndex].x,
								positions[posIndex].y * vMult);
						else {
							if (perspective)
								sk.lineTo(positions[posIndex].x * 1.3 * (.3 + 2 * ((positions[posIndex].y) / window.innerHeight)),
									positions[posIndex].y);
							else
								sk.lineTo(positions[posIndex].x * 1.3,
									positions[posIndex].y);
						}

					} else {
						if (curtains)
							sk.moveTo(positions[posIndex].x,
								sk.height + 1 - positions[posIndex].y / positions[posIndex].x);
						else
							sk.moveTo(positions[posIndex].x, positions[posIndex].y);
						sk.lineTo(positions[posIndex + 1].x,
							positions[posIndex + 1].y);
					}

				}

				if (justOriginalColours)
					sk.strokeStyle = colors[posIndex % 3];
				else {
					if (sameColours)
						sk.strokeStyle = tinycolor(colors[posIndex % 3]).spin(count + posIndex * colChangeMult1).toString();
					else
						sk.strokeStyle = tinycolor(colors[posIndex % 3]).spin(count + posIndex * colChangeMult1 + i * colChangeMult2).toString();
				}

				switch (alphaStyle) {
					case 0:
						sk.globalAlpha = 1;
						break;
					case 1:
						sk.globalAlpha = 1 - posIndex / beeLength;
						break;
					case 2:
						if (posIndex > beeLength / 4)
							sk.globalAlpha = opacity;
						else
							sk.globalAlpha = 1;
						break;
				}
				sk.stroke();
				sk.globalCompositeOperation = "source-over";
				//            t = (beeLength * size) && (posIndex < positions.length - 1);

			}
			var pos2;
			var distA;
			var distB;
			var change
			var pos = getturnpos(direction, (isTargetRepulsing ? speed * repulseStrengh : speed) * size, positions[0]);
			positions.unshift(pos);
			direction += turnRate;
			if (random() < turnRateChangeOccurence || isTargetRepulsing || !beeTarget % 80) {

				change = 1;
				change = (random() - 0.5) * 2 * maxTurnRateChange * (isTargetRepulsing ? repulseStrengh : 1);
				turnRate += change;
				if (beeTarget) {
					if (wiggle)
						pos2 = getturnpos(direction + change, (1.4 + random()) * speed * size, pos);
					else
						pos2 = getturnpos(direction + change, speed * size, pos);
					distA = distn(pos2.x, pos2.y);
					pos2 = getturnpos(direction - change, speed * size, pos);
					distB = distn(pos2.x, pos2.y);
				} else // clicked
					turnRate += .2;
				if (distA > distB && beeTarget) {
					turnRate += (isTargetRepulsing ? change : -change) * 2;
				}
				tempMaxTurnRate = maxTurnRate * (isTargetRepulsing ? repulseStrengh : 1);
				if (turnRate > tempMaxTurnRate) turnRate = tempMaxTurnRate;
				if (turnRate < -tempMaxTurnRate) turnRate = -tempMaxTurnRate;
				if (isTargetRepulsing)
					isTargetRepulsing--;
				bee.t = turnRate;
				bee.d = direction;
			}
		}

	}

	function loop() {
		if (splash.hidden) {
			requestAnimationFrame(loop);
			doLoop();
		}
	}

}
