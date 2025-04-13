// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }
}

function connectVariablestoGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.log("Failed to get the storage location of u_FragColor");
    return;
  }

  //Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, "u_Size");
  if (!u_Size) {
    console.log("Failed to get the storage location of u_Size");
    return;
  }
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

//Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;

function addActionsForHtmlUI() {
  //Button Events
  document.getElementById("clearButton").onclick = function () {
    // Stop the animation if it's running.
    animationRunning = false;
    cancelAnimationFrame(animationRequestId);
    
    // Reset animated objects (optional).
    animStars = [];
    animAsteroids = [];
    
    // Clear all drawn shapes.
    g_shapesList = [];
    renderAllShapes();
  };

  document.getElementById("pointButton").onclick = function () {
    g_selectedType = POINT;
  };
  document.getElementById("triButton").onclick = function () {
    g_selectedType = TRIANGLE;
  };
  document.getElementById("circleButton").onclick = function () {
    g_selectedType = CIRCLE;
  };

  document.getElementById("drawRocketButton").onclick = function () {
    drawRocket();
  };

  document.getElementById("animateRocketButton").onclick = function () {
    startRocketAnimation();
  };

  //Color Slider Events
  document.getElementById("redSlide").addEventListener("mouseup", function () {
    g_selectedColor[0] = this.value / 100;
  });
  document
    .getElementById("greenSlide")
    .addEventListener("mouseup", function () {
      g_selectedColor[1] = this.value / 100;
    });
  document.getElementById("blueSlide").addEventListener("mouseup", function () {
    g_selectedColor[2] = this.value / 100;
  });

  //Size Slider Events
  document.getElementById("sizeSlide").addEventListener("mouseup", function () {
    g_selectedSize = this.value;
  });

  //Segment Slider Events
  document
    .getElementById("segmentsSlide")
    .addEventListener("mouseup", function () {
      g_selectedSegments = this.value;
    });
}

function main() {
  //Set up canvas and gl variables
  setupWebGL();
  //Set up actions for the HTML UI elements
  connectVariablestoGLSL();
  //Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function (ev) {
    if (ev.buttons == 1) {
      click(ev);
    }
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shapesList = [];
/*
var g_points = []; // The array for the position of a mouse press
var g_colors = []; // The array to store the color of a point
var g_sizes = []; */

function click(ev) {
  //Extract the event click and return it in WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev);

  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
    point.segments = g_selectedSegments;
  }
  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);

  //Draw every shape that is supposed to be in the canvas
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  // Store the coordinates to g_points array
  return [x, y];
}

function renderAllShapes() {
  var startTime = performance.now();
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  var duration = performance.now() - startTime;
  sendTextToHTML(
    "numdot: " +
      len +
      " ms: " +
      Math.floor(duration) +
      " fps: " +
      Math.floor(10000 / duration) / 10,
    "numdot",
  );
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

// --- Helper function (similar to addCarTriangle) ---
function addRocketTriangle(vertices, color) {
  let tri = new Triangle();
  // Set the vertices of the triangle, e.g., [x1, y1, x2, y2, x3, y3]
  tri.vertices = vertices;
  // Use the provided color for the triangle.
  tri.color = color.slice();
  g_shapesList.push(tri);
}

// --- Helper function to add a star as a Point ---
function addStar(x, y, size, color) {
  let star = new Point();
  star.position = [x, y];
  star.color = color.slice();
  star.size = size;
  g_shapesList.push(star);
}

// --- Helper function to add a planet (a circle approximated with triangles) ---
function addPlanet(cx, cy, r, segments, color) {
  let angleStep = (2 * Math.PI) / segments;
  for (let i = 0; i < segments; i++) {
    let angle1 = i * angleStep;
    let angle2 = (i + 1) * angleStep;
    let x1 = cx + r * Math.cos(angle1);
    let y1 = cy + r * Math.sin(angle1);
    let x2 = cx + r * Math.cos(angle2);
    let y2 = cy + r * Math.sin(angle2);
    // Reuse our triangle helper to add one triangle of the circle
    addRocketTriangle([cx, cy, x1, y1, x2, y2], color);
  }
}

// --- Function to add the space background ---
function addSpaceBackground() {
  // Add many stars at random positions.
  // The canvas coordinates for WebGL go from -1 to 1.
  for (let i = 0; i < 30; i++) {
    let x = Math.random() * 2 - 1;  // Random x in [-1, 1]
    let y = Math.random() * 2 - 1;  // Random y in [-1, 1]
    let starSize = Math.random() * 3 + 1; // Star size between 1 and 4
    addStar(x, y, starSize, [1.0, 1.0, 1.0, 1.0]);  // White stars
  }
  
  // Add a planet toward the upper left of the scene.
  // The planet is drawn as a circle (built from triangles).
  addPlanet(-0.7, 0.7, 0.15, 12, [0.5, 0.2, 0.7, 1.0]); // Purple planet
}

// --- New Drawing Function: drawRocket ---
// This function now first adds the space background and then builds a rocket using triangles.
function drawRocket() {
  // Clear any existing shapes first.
  g_shapesList = [];

  // --- Background: Stars and a Distant Planet ---
  addSpaceBackground();

  // --- Rocket Colors ---
  let bodyColor   = [0.9, 0.9, 0.9, 1.0];   // Light gray for main body.
  let noseColor   = [1.0, 0.0, 0.0, 1.0];     // Red for the pointed nose.
  let stripeColor = [0.0, 0.0, 1.0, 1.0];     // Blue stripe on the body.
  let finColor    = [0.8, 0.2, 0.2, 1.0];     // Dark red for the fins.
  let windowColor = [0.0, 0.7, 1.0, 1.0];     // Light blue for the circular window.
  let flameColor1 = [1.0, 0.5, 0.0, 1.0];     // Orange for some flame parts.
  let flameColor2 = [1.0, 1.0, 0.0, 1.0];     // Yellow for a central flame.
  
  // --- Rocket Nose Cone (1 triangle) ---
  // The triangle forms the pointed tip.
  addRocketTriangle(
    [ -0.1,  0.5,   0.1,  0.5,    0.0,  0.7 ],
    noseColor
  );
  
  // --- Rocket Body (2 triangles) ---
  // A rectangle spanning from y = -0.5 to y = 0.5.
  addRocketTriangle(
    [ -0.1, -0.5,  -0.1,  0.5,   0.1,  0.5 ],
    bodyColor
  );
  addRocketTriangle(
    [ -0.1, -0.5,   0.1,  0.5,   0.1, -0.5 ],
    bodyColor
  );
  
  // --- Blue Stripe (2 triangles) ---
  // A central stripe decorating the body.
  addRocketTriangle(
    [ -0.05, -0.5,  -0.05,  0.5,   0.05, 0.5 ],
    stripeColor
  );
  addRocketTriangle(
    [ -0.05, -0.5,   0.05, 0.5,    0.05, -0.5 ],
    stripeColor
  );
  
  // --- Side Fins (2 triangles) ---
  // Left fin.
  addRocketTriangle(
    [ -0.1, -0.5,  -0.2, -0.5,  -0.1, -0.3 ],
    finColor
  );
  // Right fin.
  addRocketTriangle(
    [  0.1, -0.5,   0.2, -0.5,   0.1, -0.3 ],
    finColor
  );
  
  // --- Circular Window (8 triangles) ---
  // Approximate a circular window using a fan of triangles.
  let windowCenterX = 0.0;
  let windowCenterY = 0.1;
  let windowRadius  = 0.05;
  let numWindowTriangles = 8;
  let angleStep = (2 * Math.PI) / numWindowTriangles;
  for (let i = 0; i < numWindowTriangles; i++) {
    let angle1 = i * angleStep;
    let angle2 = (i + 1) * angleStep;
    let x1 = windowCenterX + windowRadius * Math.cos(angle1);
    let y1 = windowCenterY + windowRadius * Math.sin(angle1);
    let x2 = windowCenterX + windowRadius * Math.cos(angle2);
    let y2 = windowCenterY + windowRadius * Math.sin(angle2);
    addRocketTriangle(
      [ windowCenterX, windowCenterY,  x1, y1,  x2, y2 ],
      windowColor
    );
  }
  
  // --- Exhaust Flames (5 triangles) ---
  // These triangles simulate the fiery thruster.
  addRocketTriangle(
    [ -0.05, -0.5,  -0.05, -0.7,   0.0, -0.7 ],
    flameColor1
  );
  addRocketTriangle(
    [  0.05, -0.5,   0.05, -0.7,   0.0, -0.7 ],
    flameColor1
  );
  addRocketTriangle(
    [ -0.05, -0.5,   0.05, -0.5,   0.0, -0.7 ],
    flameColor2
  );
  addRocketTriangle(
    [ -0.07, -0.5,  -0.1, -0.6,   -0.05, -0.6 ],
    flameColor1
  );
  addRocketTriangle(
    [  0.07, -0.5,   0.1, -0.6,    0.05, -0.6 ],
    flameColor1
  );
  
  // Finally, render all shapes so that the background appears first and the rocket on top.
  renderAllShapes();
}

// Global variables for animation.
let animStars = [];
let animAsteroids = [];
let lastFrameTime = 0;
let animationRequestId = 0;
let animationRunning = false;

// --- Helper function (similar to addCarTriangle) ---
function addRocketTriangle(vertices, color) {
  let tri = new Triangle();
  tri.vertices = vertices;
  tri.color = color.slice();
  g_shapesList.push(tri);
}

// --- Helper function to add a star as a Point ---
function addStar(x, y, size, color) {
  let star = new Point();
  star.position = [x, y];
  star.color = color.slice();
  star.size = size;
  g_shapesList.push(star);
}

// --- Helper function to add a planet (or asteroid) ---
// This function draws a circle (approximated by triangles) for asteroids.
function addPlanet(cx, cy, r, segments, color) {
  let angleStep = (2 * Math.PI) / segments;
  for (let i = 0; i < segments; i++) {
    let angle1 = i * angleStep;
    let angle2 = (i + 1) * angleStep;
    let x1 = cx + r * Math.cos(angle1);
    let y1 = cy + r * Math.sin(angle1);
    let x2 = cx + r * Math.cos(angle2);
    let y2 = cy + r * Math.sin(angle2);
    addRocketTriangle([cx, cy, x1, y1, x2, y2], color);
  }
}

// --- New function: drawRocketFrame ---
// Draws the rocket using triangles; the exhaust flames are animated by applying flameOffset.
function drawRocketFrame(flameOffset) {
  // Define colors.
  let bodyColor   = [0.9, 0.9, 0.9, 1.0];   // Light gray for the body.
  let noseColor   = [1.0, 0.0, 0.0, 1.0];     // Red for the nose cone.
  let stripeColor = [0.0, 0.0, 1.0, 1.0];     // Blue stripe.
  let finColor    = [0.8, 0.2, 0.2, 1.0];     // Dark red fins.
  let windowColor = [0.0, 0.7, 1.0, 1.0];     // Light blue window.
  let flameColor1 = [1.0, 0.5, 0.0, 1.0];      // Orange flame.
  let flameColor2 = [1.0, 1.0, 0.0, 1.0];      // Yellow center flame.
  
  // --- Nose Cone ---
  addRocketTriangle(
    [ -0.1,  0.5,  0.1,  0.5,  0.0,  0.7 ],
    noseColor
  );
  
  // --- Rocket Body ---
  addRocketTriangle(
    [ -0.1, -0.5,  -0.1,  0.5,   0.1,  0.5 ],
    bodyColor
  );
  addRocketTriangle(
    [ -0.1, -0.5,   0.1,  0.5,   0.1, -0.5 ],
    bodyColor
  );
  
  // --- Blue Stripe ---
  addRocketTriangle(
    [ -0.05, -0.5,  -0.05,  0.5,   0.05, 0.5 ],
    stripeColor
  );
  addRocketTriangle(
    [ -0.05, -0.5,   0.05,  0.5,   0.05, -0.5 ],
    stripeColor
  );
  
  // --- Side Fins ---
  addRocketTriangle(
    [ -0.1, -0.5,  -0.2, -0.5,  -0.1, -0.3 ],
    finColor
  );
  addRocketTriangle(
    [  0.1, -0.5,   0.2, -0.5,   0.1, -0.3 ],
    finColor
  );
  
  // --- Circular Window (8 triangles) ---
  let windowCenterX = 0.0;
  let windowCenterY = 0.1;
  let windowRadius  = 0.05;
  let numWindowTriangles = 8;
  let angleStep = (2 * Math.PI) / numWindowTriangles;
  for (let i = 0; i < numWindowTriangles; i++) {
    let angle1 = i * angleStep;
    let angle2 = (i + 1) * angleStep;
    let x1 = windowCenterX + windowRadius * Math.cos(angle1);
    let y1 = windowCenterY + windowRadius * Math.sin(angle1);
    let x2 = windowCenterX + windowRadius * Math.cos(angle2);
    let y2 = windowCenterY + windowRadius * Math.sin(angle2);
    addRocketTriangle(
      [ windowCenterX, windowCenterY,  x1, y1,  x2, y2 ],
      windowColor
    );
  }
  
  // --- Animated Exhaust Flames ---
  // Here, we add flameOffset (based on time) to the y-coordinates to simulate flicker.
  addRocketTriangle(
    [ -0.05, -0.5,  -0.05, -0.7 + flameOffset,  0.0, -0.7 + flameOffset ],
    flameColor1
  );
  addRocketTriangle(
    [  0.05, -0.5,   0.05, -0.7 + flameOffset,  0.0, -0.7 + flameOffset ],
    flameColor1
  );
  addRocketTriangle(
    [ -0.05, -0.5,   0.05, -0.5,  0.0, -0.7 + flameOffset ],
    flameColor2
  );
  addRocketTriangle(
    [ -0.07, -0.5,  -0.1, -0.6 + flameOffset,  -0.05, -0.6 + flameOffset ],
    flameColor1
  );
  addRocketTriangle(
    [  0.07, -0.5,   0.1, -0.6 + flameOffset,   0.05, -0.6 + flameOffset ],
    flameColor1
  );
}

// --- Animation Loop ---
// This function updates the background and rocket for every frame.
function animationLoop(timestamp) {
  // Calculate the time elapsed between frames.
  let deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  // Calculate a small flame offset using a sine function.
  let flameOffset = 0.03 * Math.sin(timestamp / 100);

  // Clear the shapes list.
  g_shapesList = [];
  
  // --- Update and Draw Background Stars ---  
  // Now the stars move vertically from top (y = 1) to bottom (y = -1).
  for (let star of animStars) {
    star.y -= star.speed * deltaTime;
    if (star.y < -1) star.y = 1; // Wrap around to top.
    addStar(star.x, star.y, star.size, [1.0, 1.0, 1.0, 1.0]);
  }
  
  // --- Update and Draw Asteroids ---
  // Asteroids now also fall from the top.
  for (let asteroid of animAsteroids) {
    asteroid.y -= asteroid.speed * deltaTime;
    if (asteroid.y < -1) {
      asteroid.y = 1;
      // Reset the asteroid's x coordinate so they reappear at a random horizontal position.
      asteroid.x = Math.random() * 2 - 1;
    }
    // Draw the asteroid (using 6 segments for a slightly jagged look).
    addPlanet(asteroid.x, asteroid.y, asteroid.r, 6, [0.5, 0.5, 0.5, 1.0]);
  }
  
  addPlanet(0.7, 0.7, 0.15, 16, [0.9, 0.9, 0.9, 1.0]);

  // --- Draw the Rocket with Animated Exhaust ---
  drawRocketFrame(flameOffset);
  
  // Render all shapes to the canvas.
  renderAllShapes();
  
  // Continue the animation loop.
  if (animationRunning) {
    animationRequestId = requestAnimationFrame(animationLoop);
  }
}


// --- Start the Rocket Flight Animation ---
// This function initializes animated background objects and kicks off the animation loop.
function startRocketAnimation() {
  // Clear any previous animation.
  animStars = [];
  animAsteroids = [];
  
  // Initialize background stars.
  for (let i = 0; i < 30; i++) {
    animStars.push({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.0005 + 0.0005  // Small speed for a gentle drift.
    });
  }
  
  // Initialize asteroids.
  for (let i = 0; i < 5; i++) {
    animAsteroids.push({
      x: Math.random() * 2 + 1,  // Start offscreen to the right.
      y: Math.random() * 2 - 1,
      r: Math.random() * 0.05 + 0.02,
      speed: Math.random() * 0.003 + 0.002  // Faster than stars.
    });
  }
  
  animationRunning = true;
  lastFrameTime = performance.now();
  animationRequestId = requestAnimationFrame(animationLoop);
}
