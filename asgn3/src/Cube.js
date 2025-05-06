class Cube {
  constructor() {
    this.type       = "cube";
    this.color      = [1, 1, 1, 1];      // RGBA for solid‑color cubes
    this.textureNum = -2;                // –2 = pure color, ≥0 = texture unit
    this.matrix     = new Matrix4();     // model transform

    // build the shared interleaved position+UV data once
    if (!Cube.vertexData) {
      // 36 verts × (3 pos + 2 uv)
      const P = [
        //FRONT
      -0.5,0.5,0.5, -0.5,-0.5,0.5, 0.5,-0.5,0.5,
      -0.5,0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5,
      //LEFT
      -0.5,0.5,-0.5, -0.5,-0.5,-0.5, -0.5,-0.5,0.5,
      -0.5,0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5,
      //RIGHT
      0.5,0.5,0.5, 0.5,-0.5,0.5, 0.5,-0.5,-0.5,
      0.5,0.5,0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5,
      //TOP
      -0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5,
      -0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5,
      //BACK
      0.5,0.5,-0.5, 0.5,-0.5,-0.5, -0.5,0.5,-0.5,
      -0.5,0.5,-0.5, 0.5,-0.5,-0.5, -0.5,-0.5,-0.5,
      //BOTTOM
      -0.5,-0.5,0.5, -0.5,-0.5,-0.5, 0.5,-0.5,-0.5,
      -0.5,-0.5,0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5
      ];
      const UV = [
        // FRONT
      0,1, 0,0, 1,0, 0,1, 1,0, 1,1,
      // LEFT
      0,1, 0,0, 1,0, 0,1, 1,0, 1,1,
      // RIGHT
      0,1, 0,0, 1,0, 0,1, 1,0, 1,1,
      // TOP
      1,0, 1,1, 0,1, 1,0, 0,1, 0,0,
      // BACK
      0,1, 0,0, 1,1, 1,1, 0,0, 1,0,
      // BOTTOM
      0,1, 0,0, 1,0, 0,1, 1,0, 1,1,
      ];

      const buf = new Float32Array(36 * 5);
      for (let i = 0; i < 36; i++) {
        buf[i*5 + 0] = P[i*3 + 0];
        buf[i*5 + 1] = P[i*3 + 1];
        buf[i*5 + 2] = P[i*3 + 2];
        buf[i*5 + 3] = UV[i*2 + 0];
        buf[i*5 + 4] = UV[i*2 + 1];
      }
      Cube.vertexData = buf;
    }
  }

  render() {
    // 1) set common uniforms
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // 2) on first draw, create/share the VBO & set up attrib pointers
    if (!Cube._vbo) {
      Cube._vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);
      gl.bufferData(gl.ARRAY_BUFFER, Cube.vertexData, gl.STATIC_DRAW);

      const FS = Float32Array.BYTES_PER_ELEMENT;
      // a_Position = first 3 floats, stride = 5*FS, offset=0
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FS*5, 0);
      gl.enableVertexAttribArray(a_Position);
      // a_UV = next 2 floats, stride=5*FS, offset=3*FS
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FS*5, FS*3);
      gl.enableVertexAttribArray(a_UV);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);
    }

    // 3) single draw call for the whole cube
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
