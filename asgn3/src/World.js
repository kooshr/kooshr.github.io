// World.js

// Vertex shader program
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

// Fragment shader program
const FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_Sampler4; 
  uniform int u_whichTexture;
  void main() {

    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor; // Use color
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0); // Use UV debug
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV); // Use texture0
    } else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV); // Use texture1
    } else if (u_whichTexture == 2) {
      gl_FragColor = texture2D(u_Sampler2, v_UV); // Use texture2
    } else if (u_whichTexture == 3) {
      gl_FragColor = texture2D(u_Sampler3, v_UV); // Use texture3
    } else if (u_whichTexture == 4) {
      gl_FragColor = texture2D(u_Sampler4, v_UV); // Use texture4
    } else {
      gl_FragColor = vec4(1, .2, .2, 1); // Error, put Redish
    }

  }`;

// WebGL context and shader variable locations
let canvas, gl;
let a_Position;
let a_UV;
let camera;
let u_FragColor, u_ModelMatrix, u_GlobalRotateMatrix;

// Animation and interaction state
let g_globalAngle = 30;
let g_globalAngleX = 0,
  g_globalAngleY = 0;
let g_isDragging = false;
let g_lastMouseX = -1,
  g_lastMouseY = -1;
const g_mouseSensitivity = 200;

const TILE_SKY = 0; // sampler0 → sky.jpg
const TILE_DIRT = 1; // sampler1 → dirt.jpg
const TILE_WOOD = 2; // sampler2 → wood.png
const TILE_LEAVES = 3; // sampler3 → leaves.png
const TILE_GLASS = 4; // sampler4 → glass.png
const MAP_SIZE = 32;
const pressedKeys = {};

// physics & projectiles
const BALL_SPEED   = 10.0;    // units/sec initial speed
const GRAVITY      = 9.8;     // units/sec²
const BALL_SIZE    = 0.2;     // cube edge length

// hold active balls
const g_balls = [];

let lastFrameTime = performance.now();

let g_verticalOffset = 0;

let g_walkingAnimation = false;
let g_startTime = performance.now() / 1000;
let g_seconds = 0;

// Initialize WebGL context
function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get WebGL context");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

// Compile shaders and get locations
function connectVariablestoGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  u_whichTexture = gl.getUniformLocation(gl.program, "u_whichTexture");
  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");
  u_Sampler3 = gl.getUniformLocation(gl.program, "u_Sampler3");
  u_Sampler4 = gl.getUniformLocation(gl.program, "u_Sampler4");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotateMatrix = gl.getUniformLocation(
    gl.program,
    "u_GlobalRotateMatrix"
  );
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
}

// Bind UI controls
function addActionsForHtmlUI() {
  // If you still want an angle slider, feed it into the camera:
  let lastSlider = 0;
  document.getElementById("angleSlide").addEventListener("input", (e) => {
    // compute how much the slider moved since last event
    const delta = e.target.value - lastSlider;
    camera.yaw(delta);
    lastSlider = e.target.value;
    renderScene();
  });

  document.addEventListener("keydown", (e) => {
    pressedKeys[e.code] = true;
  });
  document.addEventListener("keyup",   (e) => {
    pressedKeys[e.code] = false;
  });

  // pointer‑lock mouse look:
  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("mousemove", (ev) => {
    if (document.pointerLockElement === canvas) {
      // convert raw mouse movement into camera yaw & pitch
      const lookSpeed = 0.1; // degrees per pixel, adjust to taste
      camera.yaw(-ev.movementX * lookSpeed);
      camera.pitch(-ev.movementY * lookSpeed);
      renderScene();
    }
  });

  document.addEventListener("keydown", (e) => {
    // Find the column you're pointing at
    const target = getTargetColumn();
    if (!target) return;
  
    const { x, z } = target;
    const stack    = g_blockGrid[z][x];
  
    if (e.code === "KeyQ") {
      // Q: add a dirt block on top
      stack.push(TILE_DIRT);
    }
    else if (e.code === "KeyE") {
      // E: remove the top block (if any)
      if (stack.length > 0) stack.pop();
    } 
    else if (e.code === "KeyR") {
      spawnBall();
    }
  });
}

function spawnBall() {
  // grab camera origin + forward dir
  const e   = camera.eye.elements;
  const dir = camera.getWorldDirection();

  // new ball state
  g_balls.push({
    pos: { x: e[0],       y: e[1],       z: e[2]       },
    vel: { x: dir.x*BALL_SPEED,
           y: dir.y*BALL_SPEED,
           z: dir.z*BALL_SPEED }
  });
}


function initTextures() {
  const textures = [
    { unit: 0, uni: u_Sampler0, src: "../images/sky.jpg" },
    { unit: 1, uni: u_Sampler1, src: "../images/dirt.jpg" },
    { unit: 2, uni: u_Sampler2, src: "../images/wood.png" },
    { unit: 3, uni: u_Sampler3, src: "../images/leaves.png" },
    { unit: 4, uni: u_Sampler4, src: "../images/glass.png" },
  ];
  textures.forEach(({ unit, uni, src }) => {
    const img = new Image();
    img.onload = () => sendImageToTEXTURE(img, unit, uni);
    img.src = src;
  });
  return true;
}

function sendImageToTEXTURE(image, unit, samplerUniform) {
  const tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(samplerUniform, unit);
}

// Mouse event handlers
function handleMouseDown(ev) {
  if (ev.button !== 0) return;
  const [x, y] = convertCoordinatesEventToGL(ev);
  g_lastMouseX = x;
  g_lastMouseY = y;
  g_isDragging = true;
}
function handleMouseUp() {
  g_isDragging = false;
}
function handleMouseMove(ev) {
  if (!g_isDragging) return;
  const [x, y] = convertCoordinatesEventToGL(ev);
  g_globalAngleY += (x - g_lastMouseX) * g_mouseSensitivity;
  g_globalAngleX += (y - g_lastMouseY) * g_mouseSensitivity;
  g_lastMouseX = x;
  g_lastMouseY = y;
}
function handleMouseLeave() {
  g_isDragging = false;
}

// Coordinate conversion
function convertCoordinatesEventToGL(ev) {
  const rect = ev.target.getBoundingClientRect();
  const x = (ev.clientX - rect.left - canvas.width / 2) / (canvas.width / 2);
  const y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
  return [x, y];
}

// Main entry point
function main() {
  console.log("main loaded");

  setupWebGL();
  connectVariablestoGLSL();
  addActionsForHtmlUI();

  // Instantiate camera after canvas ready
  camera = new Camera(canvas, { speed: 0.3 });

  canvas.onmousedown = handleMouseDown;
  canvas.onmousemove = handleMouseMove;
  canvas.onmouseup = handleMouseUp;
  canvas.onmouseleave = handleMouseLeave;
  canvas.addEventListener("wheel", handleMouseWheel, { passive: false });

  initTextures();
  gl.clearColor(0, 0, 0, 1);
  requestAnimationFrame(tick);
}

function handleMouseWheel(ev) {
  ev.preventDefault();
  // ev.deltaY > 0 means “scroll down” → zoom out (increase FOV)
  // ev.deltaY < 0 means “scroll up”   → zoom in  (decrease FOV)
  camera.fov = Math.min(100, Math.max(20, camera.fov + ev.deltaY * 0.5));
  camera.updateProjectionMatrix();
  renderScene();
}

// Animation loop

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;

  const now = performance.now();
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  // continuous movement based on pressedKeys
  if (pressedKeys["KeyW"]) camera.moveForward(dt);
  if (pressedKeys["KeyS"]) camera.moveBackward(dt);
  if (pressedKeys["KeyA"]) camera.moveLeft(dt);
  if (pressedKeys["KeyD"]) camera.moveRight(dt);
  if (pressedKeys["Space"]) camera.moveUp(dt);
  if (pressedKeys["ShiftLeft"]) camera.moveDown(dt);


  for (let i = g_balls.length - 1; i >= 0; i--) {
    const b = g_balls[i];
    // apply gravity
    b.vel.y -= GRAVITY * dt;
    // integrate
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    b.pos.z += b.vel.z * dt;
    // remove if under floor or too far
    if (b.pos.y < 0 || b.pos.x < -MAP_SIZE || b.pos.x > MAP_SIZE ||
        b.pos.z < -MAP_SIZE || b.pos.z > MAP_SIZE) {
      g_balls.splice(i,1);
    }
  }
  const rotSpeed = 120;
  if (pressedKeys["ArrowLeft"])  camera.yaw(  rotSpeed * dt);
  if (pressedKeys["ArrowRight"]) camera.yaw( -rotSpeed * dt);
  if (pressedKeys["ArrowUp"])    camera.pitch( (rotSpeed/2) * dt);
  if (pressedKeys["ArrowDown"])  camera.pitch(-(rotSpeed/2) * dt);
  renderScene();
  requestAnimationFrame(tick);
}

// build a 32×32 grid: glass border, dirt everywhere else
// after you’ve declared TILE_GLASS, TILE_DIRT, MAP_SIZE…
// build a 32×32 grid from heightMap (all dirt)

const heightMap = [
  [
    4, 4, 4, 4, 4, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4,
    4, 5, 5, 5, 5, 5, 5,
  ], //  0
  [
    4, 4, 4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3,
    4, 4, 5, 5, 5, 5, 5,
  ], //  1
  [
    4, 4, 4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 4, 5, 5, 5, 5, 5,
  ], //  2
  [
    4, 4, 4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 4, 4, 5, 5, 5, 5,
  ], //  3
  [
    4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2,
    3, 4, 4, 4, 4, 5, 5,
  ], //  4
  [
    3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2,
    3, 3, 4, 4, 4, 5, 5,
  ], //  5
  [
    3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2,
    2, 3, 3, 4, 4, 4, 5,
  ], //  6
  [
    3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2,
    2, 2, 3, 3, 4, 4, 5,
  ], //  7
  [
    2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2,
    2, 2, 3, 3, 3, 4, 4,
  ], //  8
  [
    2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2,
    2, 2, 2, 2, 3, 3, 3,
  ], //  9
  [
    2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 3, 3,
  ], // 10
  [
    2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 11
  [
    2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 12
  [
    2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 13
  [
    2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 14
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 15
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 16
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 17
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 18
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 4, 4, 4, 4, 3, 2, 2, 2, 3, 3, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 19
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 4, 4, 4, 4, 3, 3, 2, 2, 3, 3, 3, 3, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 20
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 4, 4, 4, 4, 3, 3, 2, 2, 2, 3, 3, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 21
  [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 3, 3, 3, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 22
  [
    2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2,
  ], // 23
  [
    2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 3, 3, 3, 3, 3, 3,
  ], // 24
  [
    3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 3, 3, 3,
  ], // 25
  [
    3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4,
  ], // 26
  [
    3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 3, 4, 4, 4, 4, 4,
  ], // 27
  [
    3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 3, 3, 4, 4, 4, 4,
  ], // 28
  [
    3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 3, 4, 4, 4, 4, 4,
  ], // 29
  [
    3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 4, 4, 4, 4, 4, 4,
  ], // 30
  [
    3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 4, 4, 4, 4, 4, 4,
  ], // 31
];

const g_blockGrid = [];
for (let z = 0; z < MAP_SIZE; z++) {
  g_blockGrid[z] = [];
  for (let x = 0; x < MAP_SIZE; x++) {
    const h = heightMap[z][x]; // how tall this column is
    const stack = new Array(h).fill(TILE_DIRT);
    g_blockGrid[z][x] = stack;
  }
}

function addTree(z0, x0, trunkH = 4) {
  // 1) wood trunk rising straight up
  for (let y = 0; y < trunkH; y++) {
    g_blockGrid[z0][x0].push(TILE_WOOD);
  }

  // 2) bottom canopy: a 3×3 square of leaves
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const z = z0 + dz,
        x = x0 + dx;
      if (z < 0 || z >= MAP_SIZE || x < 0 || x >= MAP_SIZE) continue;
      g_blockGrid[z][x][trunkH+2] = TILE_LEAVES;
    }
  }

  // 3) top canopy: a single leaf block centered above the trunk
  g_blockGrid[z0][x0].push(TILE_LEAVES);
}

addTree(2, 9);
addTree(5, 25);
addTree(15, 12);
addTree(22, 25);

console.log("g_map", g_blockGrid);

function drawMap(blockSize = 1) {
  const halfW = (MAP_SIZE * blockSize) / 2;
  const halfD = (MAP_SIZE * blockSize) / 2;

  const target = getTargetColumn();

  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const stack = g_blockGrid[z][x];
      for (let y = 0; y < stack.length; y++) {
        if (stack[y] === undefined) continue;
        let tex = stack[y];
        if (
          target &&
          target.x === x &&
          target.z === z &&
          y === stack.length - 1
        ) {
          tex = TILE_GLASS;
        }
        const b = new Cube();
        b.textureNum = tex;
        b.matrix
         .setIdentity()
         .translate(
           x * blockSize - halfW + blockSize/2,
           y * blockSize - blockSize/2,
           z * blockSize - halfD + blockSize/2
         )
         .scale(blockSize, blockSize, blockSize);
        b.render();
      }
    }
  }
}



function getTargetColumn() {
  const half   = MAP_SIZE / 2;
  const maxDist= 20;    // how far out to march
  const step   = 0.05;  // smaller step = more precision

  const e   = camera.eye.elements;        // [ex, ey, ez]
  const dir = camera.getWorldDirection(); // {x,y,z}

  let lastXi = -1, lastZi = -1;
  for (let t = 0; t < maxDist; t += step) {
    const px = e[0] + dir.x * t;
    const py = e[1] + dir.y * t;
    const pz = e[2] + dir.z * t;

    const xi = Math.floor(px + half);
    const zi = Math.floor(pz + half);

    // out of bounds?
    if (xi < 0 || xi >= MAP_SIZE || zi < 0 || zi >= MAP_SIZE) continue;
    // only test each column once
    if (xi === lastXi && zi === lastZi) continue;
    lastXi = xi;  
    lastZi = zi;

    // does the ray’s height pierce the block‑stack here?
    const stackHeight = g_blockGrid[zi][xi].length;
    // the column occupies from y=0 up to y=stackHeight (blocks of size 1)
    if (py <= stackHeight && py >= 0) {
      return { x: xi, z: zi };
    }
  }
  return null;
}

// Render the scene
function renderScene() {
  const startTime = performance.now();
  // 1) camera‐driven projection & view
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix,     false, camera.viewMatrix.elements);

  // 2) no world rotation—just handle any global offset
  const worldMat = new Matrix4().translate(0, g_verticalOffset, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, worldMat.elements);

  // 3) clear & draw
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawMap(1.0);

  // Draw the sky
  var sky = new Cube();
  sky.color = [1.0, 0.0, 0.0, 1.0];
  sky.textureNum = 0;
  sky.matrix.scale(50, 50, 50);
  sky.matrix.translate(0, 0, 0);
  sky.render();

  const animalBase = new Matrix4()
    .translate(-2, 4, 4) // position the animal in world
    .scale(1, 1, 1);

  drawAnimal(animalBase);

  g_balls.forEach(b => {
    const cube = new Cube();
    cube.textureNum = -2;               // turn off texturing
    cube.color      = [0.2, 0.4, 1, 1]; // blue
    cube.matrix
        .setIdentity()
        .translate(b.pos.x, b.pos.y, b.pos.z)
        .scale(BALL_SIZE, BALL_SIZE, BALL_SIZE);
    cube.render();
  });

  const target = getTargetColumn();
  if (target) {
    const { x, z } = target;
    const y = g_blockGrid[z][x].length - 1;
    const half = MAP_SIZE / 2;

    const highlight = new Cube();
    highlight.textureNum = -2; // use color
    highlight.color = [1, 1, 0, 0.4]; // yellow, 40% alpha
    highlight.matrix
      .setIdentity()
      .translate(x - half + 0.5, y - 0.5, z - half + 0.5)
      .scale(1.05, 1.05, 1.05);

    // render the highlight on top
    gl.disable(gl.DEPTH_TEST); // <-- turn off depth testing
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    highlight.render();
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); // <-- restore depth testing
  }

  var duration = performance.now() - startTime;
  sendTextToHTML(
    " ms: " +
      Math.floor(duration) +
      " fps: " +
      Math.floor(10000 / duration) / 10,
    "numdot"
  );
}

// Utility function to update FPS counter
function sendTextToHTML(text, htmlID) {
  const elm = document.getElementById(htmlID);
  if (elm) elm.innerHTML = text;
}

// --- new helper function ---
function drawAnimal(baseMatrix) {
  // COLORS
  const bodyCol = [1.0, 0.5, 0, 1],
    legCol = [0.4, 0.2, 0, 1],
    eyeCol = [1, 1, 1, 1],
    snoutCol = [1, 0.8, 0.6, 1],
    black = [0, 0, 0, 1];

  // 1) BODY
  const body = new Cube();
  body.color = bodyCol;
  body.matrix = new Matrix4(baseMatrix)
    .scale(0.8, 0.4, 0.4)
    .translate(0, 0, 0);
  body.render();

  // 2) HEAD
  const head = new Cube();
  head.color = bodyCol;
  head.matrix = new Matrix4(baseMatrix)
    .translate(0.5, 0.3, 0)
    .scale(0.5, 0.5, 0.5);
  head.render();

  // 3) EARS
  [
    [0.2, 0.8, -0.3],
    [0.2, 0.8, 0.3],
  ].forEach((off) => {
    const ear = new Cube();
    ear.color = bodyCol;
    ear.matrix = new Matrix4(head.matrix)
      .translate(...off)
      .scale(0.15, 0.6, 0.3);
    ear.render();
  });

  // 4) INNER EARS
  [
    [0.27, 0.8, -.3],
    [0.27, 0.8, 0.3],
  ].forEach((off) => {
    const ie = new Cube();
    ie.color = snoutCol;
    ie.matrix = new Matrix4(head.matrix)
      .translate(...off)
      .scale(0.1, 0.45, 0.2);
    ie.render();
  });

  // 5) EYES
  [
    [0.45, 0.2, 0.3],
    [0.45, 0.2, 0.-.3],
  ].forEach((off) => {
    const eye = new Cube();
    eye.color = eyeCol;
    eye.matrix = new Matrix4(head.matrix)
      .translate(...off)
      .scale(0.3, 0.3, 0.3);
    eye.render();
  });

  // 6) PUPILS
  [
    [0.55, 0.2, 0.3],
    [0.55, 0.2, -.3],
  ].forEach((off) => {
    const p = new Cube();
    p.color = black;
    p.matrix = new Matrix4(head.matrix).translate(...off).scale(0.15, 0.2, 0.2);
    p.render();
  });

  // 5a) UPPER_SNOUT (a little box sticking out of the face)
  const snoutSize = [0.8, 0.25, 0.4]; // your scale for the snout
  const pivot = [
    // local pivot point after scale
    0.5 * snoutSize[0], // x
    0, // y (pivot at bottom)
    0.5 * snoutSize[2], // z
  ];
  const snoutPos = [0.5, -.2, 0]; // your translate before scaling

  const upperSnout = new Cube();
  upperSnout.color = snoutCol;
  upperSnout.matrix = new Matrix4(head.matrix)
    .translate(
      snoutPos[0] + pivot[0],
      snoutPos[1] + pivot[1],
      snoutPos[2] + pivot[2]
    )
    .translate(-pivot[0], -pivot[1], -pivot[2])
    .scale(...snoutSize);

  upperSnout.render();

  // 5c) NOSE (a little box sticking out of the face)
  const noseSize = 0.15;
  const nosePos = [.9, -.22, 0];
  half = 0.5 * noseSize;

  const nose = new Cube();
  nose.color = black;

  nose.matrix = new Matrix4(head.matrix)
    .translate(nosePos[0] + half, nosePos[1] + half, nosePos[2] + half)
    .translate(-half, -half, -half)
    .scale(noseSize, noseSize, noseSize);

  nose.render();

  const legOffsets = [
    [0.3, -0.4, 0.15], // front-right
    [0.3, -0.4, -0.1], // front-left
    [-0.3, -0.4, 0.15], // back-right
    [-0.3, -0.4, -0.1], // back-left
  ];
  const pawOffsets = [
    [0.34, -0.68, 0.13],
    [0.34, -0.68, -0.12],
    [-0.26, -0.68, 0.13],
    [-0.26, -0.68, -0.12],
  ];
  for (let i = 0; i < legOffsets.length; i++) {
    let [ox, oy, oz] = legOffsets[i];
    let [x, y, z] = pawOffsets[i];

    // LEG
    const leg = new Cube();
    leg.color = bodyCol;
    leg.matrix = new Matrix4(baseMatrix)
      .translate(ox, oy, oz)
      .scale(0.15, 0.5, 0.1);
    leg.render();

    // PAW
    const paw = new Cube();
    paw.color = legCol;
    paw.matrix = new Matrix4(baseMatrix)
      .translate(x, y, z)
      .translate(0, 0, 0) // drop it down to the foot
      .scale(0.2, 0.1, 0.15);
    paw.render();
  }

  // 7a) TAIL
  const tail = new Cube();
  tail.color = bodyCol;
  tail.matrix = new Matrix4(baseMatrix)
    .rotate(30, 0, 0, 1)
    .translate(-0.6, 0.15, 0)
    .scale(0.5, 0.15, 0.15);
  tail.render();

  // 7b) TAIL TIP
  const tailTip = new Cube();
  tailTip.color = eyeCol;
  tailTip.matrix = new Matrix4(tail.matrix)
    .translate(-0.4, 0, 0)
    .scale(0.3, 1.1, 1.1);
  tailTip.render();
}
