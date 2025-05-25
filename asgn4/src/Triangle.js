const Buffers = {
  vertex: null,
  pos: null,
  uv: null,
  norm: null,
};

function _initBuffers() {
  if (Buffers.vertex) return;
  Buffers.vertex = gl.createBuffer();
  Buffers.pos = gl.createBuffer();
  Buffers.uv = gl.createBuffer();
  Buffers.norm = gl.createBuffer();
}

class Triangle {
  constructor() {
    this.type = "triangle";
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }

  render() {
    const [x, y] = this.position;
    const [r, g, b, a] = this.color;
    const size = this.size;

    gl.uniform4f(u_FragColor, r, g, b, a);
    gl.uniform1f(u_Size, size);

    const d = size / 200.0;
    drawTriangle([x, y, x + d, y, x, y + d]);
  }
}

function drawTriangle(vertices) {
  _initBuffers();
  const n = 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.vertex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttrib2f(a_UV, 0.0, 0.0);
  gl.vertexAttrib3f(a_Normal, 0.0, 0.0, 1.0);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3DUVNormal(vertices, uv, normals) {
  _initBuffers();
  const n = vertices.length / 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.pos);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.uv);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.norm);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  if (uv.length / 2 !== n || normals.length / 3 !== n) {
    console.error(
      "Attribute count mismatch:",
      "posFloats=",
      vertices.length,
      "uvFloats=",
      uv.length,
      "normFloats=",
      normals.length,
      "=> n=",
      n,
    );
    return;
  }

  gl.drawArrays(gl.TRIANGLES, 0, n);
}