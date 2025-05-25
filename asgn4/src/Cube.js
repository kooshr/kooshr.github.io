class Cube {
  constructor() {
    this.type = "cube";
    this.color = [1, 1, 1, 1];
    this.textureNum = -2;
    this.matrix = new Matrix4();

    if (!Cube.vertexData) {
      const positions = [
        -0.5,0.5,0.5,  -0.5,-0.5,0.5,  0.5,-0.5,0.5,  0.5,-0.5,0.5,  0.5,0.5,0.5,  -0.5,0.5,0.5,
        -0.5,0.5,-0.5, -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5,
         0.5,0.5,0.5,   0.5,-0.5,0.5,  0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5,  0.5,0.5,0.5,
        -0.5,0.5,-0.5, -0.5,0.5,0.5,   0.5,0.5,0.5,   0.5,0.5,0.5,   0.5,0.5,-0.5, -0.5,0.5,-0.5,
         0.5,0.5,-0.5,  0.5,-0.5,-0.5, -0.5,-0.5,-0.5,-0.5,-0.5,-0.5, -0.5,0.5,-0.5,  0.5,0.5,-0.5,
        -0.5,-0.5,0.5, -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,-0.5,  0.5,-0.5,0.5, -0.5,-0.5,0.5
      ];

      const uvs = [
        0,1, 0,0, 1,0, 1,0, 1,1, 0,1,
        0,1, 0,0, 1,0, 1,0, 1,1, 0,1,
        0,1, 0,0, 1,0, 1,0, 1,1, 0,1,
        0,1, 0,0, 1,0, 1,0, 1,1, 0,1,
        0,1, 0,0, 1,0, 1,0, 1,1, 0,1,
        0,1, 0,0, 1,0, 1,0, 1,1, 0,1
      ];

      const faceNormals = [
        [0, 0, 1], 
        [-1, 0, 0],
        [1, 0, 0], 
        [0, 1, 0], 
        [0, 0, -1],
        [0, -1, 0],
      ];
      const normals = [];
      faceNormals.forEach(([nx, ny, nz]) => {
        for (let i = 0; i < 6; i++) {
          normals.push(nx, ny, nz);
        }
      });

      const interleaved = new Float32Array(36 * 8);
      for (let i = 0; i < 36; i++) {
        interleaved.set(positions.slice(i * 3, i * 3 + 3), i * 8);
        interleaved.set(uvs.slice(i * 2, i * 2 + 2), i * 8 + 3);
        interleaved.set(normals.slice(i * 3, i * 3 + 3), i * 8 + 5);
      }
      Cube.vertexData = interleaved;
    }
  }

  render() {
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4fv(u_FragColor, this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const stride = Float32Array.BYTES_PER_ELEMENT * 8;

    if (!Cube._vbo) {
      Cube._vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);
      gl.bufferData(gl.ARRAY_BUFFER, Cube.vertexData, gl.STATIC_DRAW);

      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(a_Position);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, Float32Array.BYTES_PER_ELEMENT * 3);
      gl.enableVertexAttribArray(a_UV);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, stride, Float32Array.BYTES_PER_ELEMENT * 5);
      gl.enableVertexAttribArray(a_Normal);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._vbo);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 12);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, stride, 20);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
