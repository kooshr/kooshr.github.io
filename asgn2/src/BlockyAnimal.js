// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    void main() {
      gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
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

  gl.enable(gl.DEPTH_TEST);
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

  /*
  //Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, "u_Size");
  if (!u_Size) {
    console.log("Failed to get the storage location of u_Size");
    return;
  } */

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.log("Failed to get the storage location of u_ModelMatrix");
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(
    gl.program,
    "u_GlobalRotateMatrix",
  );
  if (!u_GlobalRotateMatrix) {
    console.log("Failed to get the storage location of u_GlobalRotateMatrix");
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

//Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_globalAngle = 120;
let g_walkAnimation = false;
let g_walkAngle = 0;
let g_headShake = 0;   // degrees to yaw the head
let g_snoutBob = 0;   // y-offset for the bottom snout
let g_yawnAnimation   = false;  // are we yawning now?
let g_yawnStartTime   = 0;      // when the yawn began
let isDragging = false;
let lastX = 0, lastY = 0;
let dragAngleY = 0;   // yaw around the y-axis
let dragAngleX = 0;   // pitch around the x-axis
let g_frontLegYawnAngle = 0;
let g_headPitch         = 0;
let g_yawnSnoutOpen     = 0;
let g_tailWagAngle      = 0;
let g_joint1Angle = 0;   // will drive head yaw
let g_joint2Angle = 0;   // will drive lower-snout pitch
let g_joint3Angle = 0;   // will drive nose roll
let g_headYawSlider       = 0;  // new: slider for head yaw
let g_headPitchSlider     = 0;  // new: slider for head pitch
let g_upperSnoutPitchSlider = 0; // new: slider for upper snout pitch




function addActionsForHtmlUI() {
  // Size Slider Events
  const slider = document.getElementById("angleSlide");
  slider.addEventListener("input", ev => {
    g_globalAngle = +ev.target.value;
  });

  document.getElementById("joint2")
          .addEventListener("input", ev => g_joint2Angle = +ev.target.value);
  document.getElementById("joint3")
          .addEventListener("input", ev => g_joint3Angle = +ev.target.value);
          document.getElementById("headYaw")
          .addEventListener("input", ev => g_headYawSlider = +ev.target.value);
  document.getElementById("headPitch")
          .addEventListener("input", ev => g_headPitchSlider = +ev.target.value);
  document.getElementById("upperSnoutPitch")
          .addEventListener("input", ev => g_upperSnoutPitchSlider = +ev.target.value);
  

  document.getElementById("walkOnButton").onclick = () => {
    g_walkAnimation = true;
  };
  document.getElementById("walkOffButton").onclick = () => {
    g_walkAnimation = false;
    g_walkAngle = 0;           // reset pose when you stop
  };

}

function main() {
  //Set up canvas and gl variables
  setupWebGL();

  canvas.onmousedown = function (ev) {
    isDragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
  };
  canvas.onmouseup = canvas.onmouseout = function (ev) {
    isDragging = false;
  };
  canvas.onmousemove = function (ev) {
    if (!isDragging) return;
    // how much the mouse moved
    let dx = ev.clientX - lastX;
    let dy = ev.clientY - lastY;
    // update our “orbit” angles (tweak the divisor to change sensitivity)
    dragAngleY += dx * 0.5;
    dragAngleX += dy * 0.5;
    lastX = ev.clientX;
    lastY = ev.clientY;
  };
  canvas.addEventListener("mousedown", ev => {
    if (ev.shiftKey) {
      // start yawning
      g_yawnAnimation = true;
      g_yawnStartTime = performance.now() / 1000;
    } else {
      // existing drag logic…
      isDragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
    }
  });
  
  //Set up actions for the HTML UI elements
  connectVariablestoGLSL();
  //Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  //renderAllShapes();
  requestAnimationFrame(tick);
}

var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 - g_startTime;

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  //console.log(g_seconds);

  // Update Animation Angles
  updateAnimationAngles();

  // Draw everything
  renderAllShapes();

  // Tell the browser to update again when it has time
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {

  const t = (performance.now() / 1000) - g_yawnStartTime;

  if (g_yawnAnimation) {
    // Make it last, say, 2 seconds total:
    const progress = Math.min(t / 2, 1);
    const wave     = Math.sin(progress * Math.PI);  // 0→1→0

    // 1) Front legs drop by up to 20°
    g_walkAngle = 0;  // disable walk
    g_frontLegYawnAngle = -20 * wave;

    // 2) Head pitches up by up to 30°
    g_headShake = 0;  // disable head‐shake
    g_headPitch = 10 * wave;   // we’ll use this in render

    // 3) Lower snout drops to open the mouth
    g_yawnSnoutOpen = 0.1 * wave;  // extra downward offset

    // 4) Tail wags ±15°
    g_tailWagAngle = 15 * Math.sin(progress * Math.PI * 2);

    if (progress >= 1) {
      // end the yawn
      g_yawnAnimation = false;
      // reset any state if you like
    }
  }

  if (g_walkAnimation) {
    // leg swing (unchanged)
    g_walkAngle = 15 * Math.sin(2 * Math.PI * g_seconds);

    // head shakes side-to-side ±10°
    g_headShake = 10 * Math.sin(2 * Math.PI * g_seconds);

    // bottom snout bobs up/down ±0.05 units at 2× leg speed
    g_snoutBob = 0.05 * Math.sin(4 * Math.PI * g_seconds);
  } else {
    // reset when you stop
    g_walkAngle = 0;
    g_headShake = 0;
    g_snoutBob = 0;
  }

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
  // clear once
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // build camera from slider + drag
  let M = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(dragAngleY, 0, 1, 0)
    .rotate(dragAngleX, 1, 0, 0);

  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, M.elements);

  // draw your fox
  new BlockyAnimal().render();
  var duration = performance.now() - startTime;
  sendTextToHTML(
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

class BlockyAnimal {
  constructor() {
    this.matrix = new Matrix4();             // base transform
    this.color = [1.0, 0.5, 0.0, 1.0];      // fox orange
    this.legColor = [0.4, 0.2, 0.0, 1.0];      // dark brown for feet
    this.eyeColor = [1.0, 1.0, 1.0, 1.0];      // white for eyes
    this.snoutColor = [1.0, 0.8, 0.6, 1.0];    // light brown for snout
    this.innerEarColor = [0.3, 0.2, 0, .5];    // color for inner ears
    this.black = [0.0, 0.0, 0.0, 1.0];         // black
  }

  render() {

    let rootM = new Matrix4(this.matrix);
    if (g_yawnAnimation) {
      // tilt body down by same amount legs dropped (or scale to taste)
      rootM.rotate(g_frontLegYawnAngle * 0.5, 0, 0, 1);
    }

    // 1) BODY (unchanged)
    const body = new Cube();
    body.color = this.color;
    body.matrix = new Matrix4(rootM)
      .scale(0.8, 0.4, 0.4)
      .translate(-0.4, -0.2, -0.3);
    body.render();

    // 2) HEAD (scaled to 0.5)
    const headSize = 0.5;
    let half     = headSize * 0.5;   // 0.25

    const head = new Cube();
    head.color = this.color;
    head.matrix = new Matrix4(rootM)
      .translate(0.3 + half, 0.15, -0.15 + half)
      .rotate(g_headShake + g_headYawSlider, 0, 1, 0)
      .rotate(g_headPitchSlider, 1, 0, 0)
      .translate(-half, 0, -half)
      .scale(headSize, headSize, headSize);

    head.render();

    // 3a) OUTER_EARS (size: 0.05×0.2×0.1, sitting on top of the 0.5 head)
    const outerEarOffsets = [
      [0.3, .8, 0.05],   // right
      [0.3, .8, 0.65],   // left
    ];
    for (let off of outerEarOffsets) {
      const outerEar = new Cube();
      outerEar.color = this.color;
      outerEar.matrix = new Matrix4(head.matrix)
        .translate(off[0], off[1], off[2])
        .scale(0.15, 0.6, 0.3);
      outerEar.render();
    }

    // 3b) INNER_EARS (size: 0.05×0.2×0.1, sitting on top of the 0.5 head)
    const innerEarOffsets = [
      [0.37, .8, 0.1],   // right
      [0.37, .8, 0.7],   // left
    ];
    for (let off of innerEarOffsets) {
      const innerEar = new Cube();
      innerEar.color = this.innerEarColor;
      innerEar.matrix = new Matrix4(head.matrix)
        .translate(off[0], off[1], off[2])
        .scale(0.1, 0.45, 0.2);
      innerEar.render();
    }

    // 4a) EYES (tiny cubes, scale 0.05, on front face of head)
    const eyeOffsets = [
      // front face of head is at x = 0.3 + 0.25 = 0.55
      // we add 0.025 so they sit just in front
      [0.75, 0.5, 0.6],  // right
      [0.75, 0.5, .1],  // left
    ];
    for (let off of eyeOffsets) {
      const eye = new Cube();
      eye.color = this.eyeColor;
      eye.matrix = new Matrix4(head.matrix)
        .translate(off[0], off[1], off[2])
        .scale(0.3, 0.3, 0.3);
      eye.render();
    }

    // 4b) PUPILS (tiny cubes, scale 0.05, on front face of head)
    const pupilOffsets = [
      // front face of head is at x = 0.3 + 0.25 = 0.55
      // we add 0.025 so they sit just in front
      [1.0, 0.5, 0.65],  // right
      [1.0, 0.5, .15],  // left
    ];
    for (let off of pupilOffsets) {
      const pupil = new Cylinder(100, 'z');
      pupil.color = this.black;
      pupil.matrix = new Matrix4(head.matrix)
        .translate(off[0], off[1], off[2])
        .scale(0.15, 0.2, 0.2);
      pupil.render();
    }

    // 5a) UPPER_SNOUT (a little box sticking out of the face)
    const snoutSize = [0.8, 0.25, 0.4];     // your scale for the snout
    const pivot = [                         // local pivot point after scale
      0.5 * snoutSize[0],  // x
      0,                   // y (pivot at bottom)
      0.5 * snoutSize[2],  // z
    ];
    const snoutPos = [0.5, 0.15, 0.3];       // your translate before scaling

    const upperSnout = new Cube();
    upperSnout.color = this.snoutColor;
    upperSnout.matrix = new Matrix4(head.matrix)
      .translate(snoutPos[0] + pivot[0],
                snoutPos[1] + pivot[1],
                snoutPos[2] + pivot[2])
      .rotate(g_upperSnoutPitchSlider, 0, 0, 1)
      .translate(-pivot[0], -pivot[1], -pivot[2])
      .translate(0, -g_yawnSnoutOpen, 0)
      .scale(...snoutSize);

    upperSnout.render();

    // 5b) LOWER_SNOUT (a little box sticking out of the face)
    const LOWER_SNOUT = new Cube();
    LOWER_SNOUT.color = [1.0, 0.8, 0.6, 1.0];
    LOWER_SNOUT.matrix = new Matrix4(head.matrix)
      .translate(0.5, 0.0 - g_yawnSnoutOpen, 0.4)
      .translate(0, g_snoutBob, 0)
      .rotate(g_joint2Angle, 0,0,1)
      .scale(0.80, 0.1, 0.20);
    LOWER_SNOUT.render();

    // 5c) NOSE (a little box sticking out of the face)
    const noseSize = 0.15;
    const nosePos  = [1.2, 0.22, 0.42];
    half     = 0.5 * noseSize;

    const nose = new Cube();
    nose.color = this.black;

    nose.matrix = new Matrix4(head.matrix)
      .translate(nosePos[0] + half,
                nosePos[1] + half,
                nosePos[2] + half)
      .rotate(g_joint3Angle, 1, 0, 0)
      .translate(-half, -half, -half)
      .scale(noseSize, noseSize, noseSize);

    nose.render();

    // 6) LEGS & PAWS (4 legs, each a cube)
    const legOffsets = [
      [0.3, -0.4, 0.15],  // front-right
      [0.3, -0.4, -0.1],  // front-left
      [-0.3, -0.4, 0.15],  // back-right
      [-0.3, -0.4, -0.1],  // back-left
    ];
    const pawOffsets = [
      [0.28, -0.42, 0.13],
      [0.28, -0.42, -0.12],
      [-0.32, -0.42, 0.13],
      [-0.32, -0.42, -0.12],
    ];
    for (let i = 0; i < legOffsets.length; i++) {
      let [ox, oy, oz] = legOffsets[i];
      let [x, y, z] = pawOffsets[i];
      let phase = (i % 2 == 0 ? 1 : -1);
      let angle = (i < 2 && g_yawnAnimation)
              ? -g_frontLegYawnAngle
              : phase * g_walkAngle;
      let yawnOffset = (i < 2 && g_yawnAnimation) ? .05 : 0;

      // LEG
      const leg = new Cube();
      leg.color = this.color;
      leg.matrix = new Matrix4(this.matrix)
        .rotate(angle, 0, 0, 1)      // ← rotate AROUND X-axis, not Y or Z
        .translate(ox, oy-yawnOffset, oz)      // move to the hip
        .scale(0.15, 0.5, 0.1);
      leg.render();

      // PAW
      const paw = new Cube();
      paw.color = this.legColor;
      paw.matrix = new Matrix4(this.matrix)
        .rotate(angle, 0, 0, 1)      // same X-axis pivot
        .translate(x, y-yawnOffset, z)
        .translate(0, 0, 0)       // drop it down to the foot
        .scale(0.2, 0.1, 0.15);
      paw.render();
    }

    // 7a) TAIL
    const tail = new Cube();
    tail.color = this.color;
    // pivot at front of tail:
    const tailPivotOffset = 0.25;  // half of tail’s length (scaleX * .5)
    tail.matrix = new Matrix4(rootM)
      // move pivot forward to join body
      .translate(-0.6 + tailPivotOffset, 0, 0)
      // apply wag
      .rotate(g_yawnAnimation ? g_tailWagAngle : 30, 0, 0, 1)
      // move back so the cube’s center ends up in correct place
      .translate(-tailPivotOffset, 0, 0)
      .scale(0.5, 0.15, 0.15);
    tail.render();

    // 7b) TAIL TIP
    const tailTip = new Cube();
    tailTip.color = this.eyeColor;
    tailTip.matrix = new Matrix4(tail.matrix)
      .translate(-0.1, -0.05, -0.05)
      .scale(.3, 1.1, 1.1);
    tailTip.render();
  }
}

window.BlockyAnimal = BlockyAnimal;
