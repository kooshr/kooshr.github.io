class Triangle {
  constructor() {
    this.type = "triangle";
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    // Pass the position of a point to a_Position variable
    //gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the size of a point to u_Size variable
    gl.uniform1f(u_Size, size);

    // Draw
    //gl.drawArrays(gl.POINTS, 0, 1);
    var d = this.size / 200.0;
    drawTriangle([xy[0], xy[1], xy[0] + d, xy[1], xy[0], xy[1] + d]);
  }
}

function drawTriangle(vertices) {
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log("Failed to create the buffer object");
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  //gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  /*
  var a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return -1;
    } */

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
  //return n;
}

var g_posBuffer = null;
var g_uvBuffer = null;

function initTriangle3D() {
  // 1) create & bind position buffer
  g_posBuffer = gl.createBuffer();
  if (!g_posBuffer) {
    console.log("Failed to create position buffer");
    return -1;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, g_posBuffer);
  // tell GLSL how to pull 3 floats per vertex from this buffer
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // 2) create & bind UV buffer
  g_uvBuffer = gl.createBuffer();
  if (!g_uvBuffer) {
    console.log("Failed to create UV buffer");
    return -1;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  // tell GLSL how to pull 2 floats per vertex from this buffer
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  // unbind for safety
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function drawTriangle3D(vertices) {
  var n = vertices.length / 3; // The number of vertices

  if (g_posBuffer == null) {
    initTriangle3D();
  }

  // --- Bind your position buffer before calling bufferData ---
  gl.bindBuffer(gl.ARRAY_BUFFER, g_posBuffer);

  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3DUV(vertices, uv) {
  // on first call, set up the two buffers + attributes
  if (g_posBuffer === null || g_uvBuffer === null) {
    initTriangle3D();
  }

  // 1) bind & upload position data
  gl.bindBuffer(gl.ARRAY_BUFFER, g_posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // 2) bind & upload UV data
  gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);

  // 3) draw the triangle (attributes already enabled & pointing at our buffers)
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // optional: unbind buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}