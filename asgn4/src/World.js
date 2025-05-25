const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
  }`;

const FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_Sampler4;
  uniform int u_whichTexture;
  uniform vec3 u_lightPos;
  uniform vec3 u_cameraPos;
  uniform vec3 u_lightColor;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;

  uniform bool  u_spotOn;
  uniform vec3  u_spotPos;
  uniform vec3  u_spotDir;
  uniform float u_spotCutoff;

  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -3) {
      gl_FragColor = vec4((v_Normal + 1.0)/2.0, 1.0);
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) {
      gl_FragColor = texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == 3) {
      gl_FragColor = texture2D(u_Sampler3, v_UV);
    } else if (u_whichTexture == 4) {
      gl_FragColor = texture2D(u_Sampler4, v_UV);
    } else {
      gl_FragColor = vec4(1, .2, .2, 1);
    }

    vec3 lightVector = u_lightPos-vec3(v_VertPos);
    float r = length(lightVector);

    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    vec3 R = reflect(-L, N);
    vec3 E = normalize(u_cameraPos-vec3(v_VertPos));
    float specular = pow(max(dot(E,R), 0.0), 64.0) * 0.8;

    vec3 diffuse = u_lightColor * vec3(gl_FragColor) * nDotL * 0.7;
    vec3 ambient = vec3(gl_FragColor) * 0.2;

    vec3 spotContribution = vec3(0.0);
    if (u_spotOn) {
      vec3 Ls      = normalize(u_spotPos - vec3(v_VertPos));
      float nDotLs = max(dot(N, Ls), 0.0);
      vec3 fragDir = normalize(vec3(v_VertPos) - u_spotPos);
      float theta  = dot(fragDir, normalize(u_spotDir));
      if (theta > u_spotCutoff) {
        float intensity  = pow(theta, 10.0);
        spotContribution = u_lightColor * vec3(gl_FragColor) * nDotLs * 0.7 * intensity;
      }
    }

    if (u_lightOn) {
      if (u_whichTexture == 0 || u_whichTexture == 4) {
        gl_FragColor = vec4(specular + diffuse + ambient + spotContribution, 1.0);
      } else {
        gl_FragColor = vec4(diffuse + ambient + spotContribution, 1.0);
      }
    }
}`;

let canvas, gl;
let a_Position, a_UV;
let u_FragColor;
let u_ModelMatrix, u_GlobalRotateMatrix;
let u_ViewMatrix, u_ProjectionMatrix;
let u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4;
let g_normalOn = false;
let u_lightOn;
let u_lightColor;
let g_lightOn = true;
let u_lightPos;
let u_cameraPos;
let g_lightPos = [0, 1, -2];
let g_lightColor = [2.0, 2.0, 2.0];
let g_spotOn = false;
let g_spotPos = [0, 3, 6];
let g_spotDir = [0, -3, -6];
let g_spotCutoff = Math.cos((20 * Math.PI) / 180);
let u_spotOn;
let u_spotPos;
let u_spotDir;
let u_spotCutoff;
const TILE_SKY = 0,
  TILE_DIRT = 1,
  TILE_WOOD = 2,
  TILE_LEAVES = 3,
  TILE_GLASS = 4;
const MAP_SIZE = 32;
const state = {
  angles: { global: 30, x: 0, y: 0 },
  mouse: { dragging: false, lastX: -1, lastY: -1, sensitivity: 200 },
  keys: {},
  timers: { lastFrame: performance.now(), start: performance.now() / 1000 },
  verticalOffset: 0,
};

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.error("Failed to get WebGL context");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectShaders() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error("Shader initialization failed");
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotateMatrix");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_whichTexture = gl.getUniformLocation(gl.program, "u_whichTexture");
  u_lightOn = gl.getUniformLocation(gl.program, "u_lightOn");
  u_lightColor = gl.getUniformLocation(gl.program, "u_lightColor");
  u_lightPos = gl.getUniformLocation(gl.program, "u_lightPos");
  u_spotOn = gl.getUniformLocation(gl.program, "u_spotOn");
  u_spotPos = gl.getUniformLocation(gl.program, "u_spotPos");
  u_spotDir = gl.getUniformLocation(gl.program, "u_spotDir");
  u_spotCutoff = gl.getUniformLocation(gl.program, "u_spotCutoff");
  u_cameraPos = gl.getUniformLocation(gl.program, "u_cameraPos");
  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
  u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");
  u_Sampler3 = gl.getUniformLocation(gl.program, "u_Sampler3");
  u_Sampler4 = gl.getUniformLocation(gl.program, "u_Sampler4");
  identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function addUIControls() {
  document.getElementById("normalOn").onclick = function () {
    g_normalOn = true;
  };
  document.getElementById("normalOff").onclick = function () {
    g_normalOn = false;
  };
  document.getElementById("lightOn").onclick = function () {
    g_lightOn = true;
  };
  document.getElementById("lightOff").onclick = function () {
    g_lightOn = false;
  };
  document.getElementById("spotOn").onclick = function () {
    g_spotOn = true;
  };
  document.getElementById("spotOff").onclick = function () {
    g_spotOn = false;
  };
  let lastSlider = 0;
  document.getElementById("angleSlide").addEventListener("input", (e) => {
    const delta = e.target.value - lastSlider;
    camera.yaw(delta);
    lastSlider = e.target.value;
    renderScene();
  });
  document.getElementById("lightXSlide").addEventListener("input", (e) => {
    g_lightPos[0] = parseFloat(e.target.value) / 100;
    renderScene();
  });
  document.getElementById("lightYSlide").addEventListener("input", (e) => {
    g_lightPos[1] = parseFloat(e.target.value) / 100;
    renderScene();
  });
  document.getElementById("lightZSlide").addEventListener("input", (e) => {
    g_lightPos[2] = parseFloat(e.target.value) / 100;
    renderScene();
  });
  document.getElementById("lightRSlide").addEventListener("input", (e) => {
    g_lightColor[0] = parseFloat(e.target.value);
    renderScene();
  });
  document.getElementById("lightGSlide").addEventListener("input", (e) => {
    g_lightColor[1] = parseFloat(e.target.value);
    renderScene();
  });
  document.getElementById("lightBSlide").addEventListener("input", (e) => {
    g_lightColor[2] = parseFloat(e.target.value);
    renderScene();
  });
  ["keydown", "keyup"].forEach((evt) => {
    document.addEventListener(evt, (e) => {
      state.keys[e.code] = evt === "keydown";
    });
  });
  canvas.addEventListener("click", () => canvas.requestPointerLock());
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
      const lookSpeed = 0.1;
      camera.yaw(-e.movementX * lookSpeed);
      camera.pitch(-e.movementY * lookSpeed);
      renderScene();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyF" || e.code === "KeyG") {
      const target = getTargetColumn();
      if (!target) return;
      const column = g_worldGrid[target.z][target.x];
      if (e.code === "KeyF") {
        column.push(TILE_DIRT);
      } else if (e.code === "KeyG" && column.length) {
        column.pop();
      }
      renderScene();
    }
  });
}

function initTextures() {
  const sources = [
    "sky.jpg",
    "dirt.jpg",
    "wood.png",
    "leaves.png",
    "glass.png",
  ];
  sources.forEach((fileName, unit) => {
    const img = new Image();
    img.onload = () => {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      switch (unit) {
        case 0:
          gl.uniform1i(u_Sampler0, unit);
          break;
        case 1:
          gl.uniform1i(u_Sampler1, unit);
          break;
        case 2:
          gl.uniform1i(u_Sampler2, unit);
          break;
        case 3:
          gl.uniform1i(u_Sampler3, unit);
          break;
        case 4:
          gl.uniform1i(u_Sampler4, unit);
          break;
      }
    };
    img.src = `../images/${fileName}`;
  });
  return true;
}

function handleMouseDown(ev) {
  if (ev.button !== 0) return;
  const [x, y] = convertCoordinatesEventToGL(ev);
  state.mouse.dragging = true;
  state.mouse.lastX = x;
  state.mouse.lastY = y;
}
function handleMouseUp() {
  state.mouse.dragging = false;
}
function handleMouseMove(ev) {
  if (!state.mouse.dragging) return;
  const [x, y] = convertCoordinatesEventToGL(ev);
  state.angles.y += (x - state.mouse.lastX) * state.mouse.sensitivity;
  state.angles.x += (y - state.mouse.lastY) * state.mouse.sensitivity;
  state.mouse.lastX = x;
  state.mouse.lastY = y;
}
function handleMouseLeave() {
  state.mouse.dragging = false;
}

function convertCoordinatesEventToGL(ev) {
  const rect = canvas.getBoundingClientRect();
  return [
    (ev.clientX - rect.left - canvas.width / 2) / (canvas.width / 2),
    (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2),
  ];
}

function main() {
  console.log("main loaded");
  setupWebGL();
  connectShaders();
  addUIControls();
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
  camera.fov = Math.min(100, Math.max(20, camera.fov + ev.deltaY * 0.5));
  camera.updateProjectionMatrix();
  renderScene();
}

const startTime = performance.now();
state.timers.lastFrame = startTime;

function tick() {
  const now = performance.now();
  const elapsedSecs = (now - startTime) / 1000;
  const dt = (now - state.timers.lastFrame) / 1000;
  state.timers.lastFrame = now;
  const radius = 2;                // how far from the center
  const speed = 1;                // adjust to spin faster/slower
  g_lightPos[0] = radius * Math.cos(elapsedSecs * speed);
  g_lightPos[2] = radius * Math.sin(elapsedSecs * speed);

  if (state.keys.KeyW) camera.moveForward(dt);
  if (state.keys.KeyS) camera.moveBackward(dt);
  if (state.keys.KeyA) camera.moveLeft(dt);
  if (state.keys.KeyD) camera.moveRight(dt);
  if (state.keys.KeyQ) camera.yaw(dt * 70);
  if (state.keys.KeyE) camera.yaw(-dt * 70);
  renderScene();
  requestAnimationFrame(tick);
}

const g_worldGrid = Array.from({ length: MAP_SIZE }, () =>
  Array.from({ length: MAP_SIZE }, () => [TILE_DIRT])
);

function drawMap(blockSize = 1) {
  const halfWidth = (MAP_SIZE * blockSize) / 2;
  const halfDepth = (MAP_SIZE * blockSize) / 2;
  const target = getTargetColumn();
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const columnStack = g_worldGrid[z][x];
      columnStack.forEach((blockType, y) => {
        if (blockType === undefined) return;
        let texture = blockType;
        if (
          target &&
          target.x === x &&
          target.z === z &&
          y === columnStack.length - 1
        ) {
          texture = TILE_GLASS;
        }
        const cube = new Cube();
        cube.textureNum = texture;
        cube.matrix
          .setIdentity()
          .translate(
            x * blockSize - halfWidth + blockSize / 2,
            y * blockSize - blockSize / 2,
            z * blockSize - halfDepth + blockSize / 2,
          )
          .scale(blockSize, blockSize, blockSize);
        cube.render();
      });
    }
  }
}

function getTargetColumn() {
  const halfMap = MAP_SIZE / 2;
  const maxDist = 20;
  const step = 0.05;
  const [camX, camY, camZ] = camera.eye.elements;
  const { x: dx, y: dy, z: dz } = camera.getWorldDirection();
  let prevX = -1,
    prevZ = -1;

  for (let d = 0; d < maxDist; d += step) {
    const wx = camX + dx * d;
    const wy = camY + dy * d;
    const wz = camZ + dz * d;
    const colX = Math.floor(wx + halfMap);
    const colZ = Math.floor(wz + halfMap);

    if (
      colX < 0 || colX >= MAP_SIZE ||
      colZ < 0 || colZ >= MAP_SIZE ||
      (colX === prevX && colZ === prevZ)
    ) continue;

    prevX = colX;
    prevZ = colZ;

    const column = g_worldGrid[colZ][colX];
    if (wy >= 0 && wy <= column.length) {
      return { x: colX, z: colZ };
    }
  }

  return null;
}

function renderScene() {
  const frameStart = performance.now();

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);

  const worldMatrix = new Matrix4().translate(0, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, worldMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawMap(1.0);

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_cameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
  gl.uniform1i(u_lightOn, g_lightOn);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform1i(u_spotOn, g_spotOn);
  gl.uniform3f(u_spotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  gl.uniform3f(u_spotDir, g_spotDir[0], g_spotDir[1], g_spotDir[2]);
  gl.uniform1f(u_spotCutoff, g_spotCutoff);

  const light = new Cube();
  light.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
  light.matrix
    .setIdentity()
    .translate(g_lightPos[0], g_lightPos[1], g_lightPos[2])
    .scale(-0.1, -0.1, -0.1)
    .translate(-0.5, -0.5, -0.5);
  light.render();

  const sky = new Cube();
  sky.color = [1.0, 0.0, 0.0, 1.0];
  sky.textureNum = TILE_SKY;
  sky.matrix.setIdentity().scale(50, 50, 50);
  sky.render();

  const sp = new Sphere();
  sp.textureNum = g_normalOn ? -3 : 0;
  sp.matrix.setIdentity().translate(0.6, 1.3, 0);
  sp.render();

  const animalStart = new Matrix4()
    .setIdentity()
    .translate(-4, 0.4, -3)
    .scale(1, 1, 1);
  drawAnimal(animalStart);

  const wallHeight = 3;
  const wallRange = 6;
  const wallColor = [0.8, 0.8, 0.8, 1.0];

  for (let i = -wallRange; i <= wallRange; i++) {
    [[i, wallRange], [i, -wallRange], [wallRange, i], [-wallRange, i]].forEach(([x, z]) => {
      const wall = new Cube();
      wall.color = wallColor;
      if (g_normalOn) wall.textureNum = -3;
      wall.matrix
        .setIdentity()
        .translate(x, wallHeight / 2, z)
        .scale(1, wallHeight, 1);
      wall.render();
    });
  }

  const roofThickness = 0.1;
  const roofSize = wallRange * 2 + 1;
  const roof = new Cube();
  roof.color = [1, 1, 1, 1];
  if (g_normalOn) roof.textureNum = -3;
  roof.matrix
    .setIdentity()
    .translate(0, wallHeight + roofThickness / 2, 0)
    .scale(roofSize, roofThickness, roofSize);
  roof.render();

  const frameTime = performance.now() - frameStart;
  const fps = Math.floor(10000 / frameTime) / 10;
  sendTextToHTML(`${Math.floor(frameTime)} ms: ${fps} fps`, "numdot");
}

function sendTextToHTML(text, htmlID) {
  const elm = document.getElementById(htmlID);
  if (elm) elm.innerHTML = text;
}


function drawAnimal(baseMatrix) {
  const bodyCol = [1.0, 0.5, 0, 1],
    legCol = [0.4, 0.2, 0, 1],
    eyeCol = [1, 1, 1, 1],
    snoutCol = [1, 0.8, 0.6, 1],
    black = [0, 0, 0, 1];
  const body = new Cube();
  body.color = bodyCol;
  body.matrix = new Matrix4(baseMatrix)
    .scale(0.8, 0.4, 0.4)
    .translate(0, 0, 0);
  body.render();
  const head = new Cube();
  head.color = bodyCol;
  head.matrix = new Matrix4(baseMatrix)
    .translate(0.5, 0.3, 0)
    .scale(0.5, 0.5, 0.5);
  head.render();
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
  [
    [0.45, 0.2, 0.3],
    [0.45, 0.2, 0. - .3],
  ].forEach((off) => {
    const eye = new Cube();
    eye.color = eyeCol;
    eye.matrix = new Matrix4(head.matrix)
      .translate(...off)
      .scale(0.3, 0.3, 0.3);
    eye.render();
  });
  [
    [0.55, 0.2, 0.3],
    [0.55, 0.2, -.3],
  ].forEach((off) => {
    const p = new Cube();
    p.color = black;
    p.matrix = new Matrix4(head.matrix).translate(...off).scale(0.15, 0.2, 0.2);
    p.render();
  });
  const snoutSize = [0.8, 0.25, 0.4];
  const pivot = [
    0.5 * snoutSize[0],
    0,
    0.5 * snoutSize[2],
  ];
  const snoutPos = [0.5, -.2, 0];
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
    [0.3, -0.4, 0.15],
    [0.3, -0.4, -0.1],
    [-0.3, -0.4, 0.15],
    [-0.3, -0.4, -0.1],
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
    const leg = new Cube();
    leg.color = bodyCol;
    leg.matrix = new Matrix4(baseMatrix)
      .translate(ox, oy, oz)
      .scale(0.15, 0.5, 0.1);
    leg.render();
    const paw = new Cube();
    paw.color = legCol;
    paw.matrix = new Matrix4(baseMatrix)
      .translate(x, y, z)
      .translate(0, 0, 0)
      .scale(0.2, 0.1, 0.15);
    paw.render();
  }
  const tail = new Cube();
  tail.color = bodyCol;
  tail.matrix = new Matrix4(baseMatrix)
    .rotate(30, 0, 0, 1)
    .translate(-0.6, 0.15, 0)
    .scale(0.5, 0.15, 0.15);
  tail.render();
  const tailTip = new Cube();
  tailTip.color = eyeCol;
  tailTip.matrix = new Matrix4(tail.matrix)
    .translate(-0.4, 0, 0)
    .scale(0.3, 1.1, 1.1);
  tailTip.render();
}