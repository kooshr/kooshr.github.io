class Cube {
  constructor() {
    this.type = "cube";

    this.color = [1.0, 1.0, 1.0, 1.0];

    this.matrix = new Matrix4();
  }

  render() {
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    gl.uniform4f(
      u_FragColor,
      rgba[0] * 0.9,
      rgba[1] * 0.9,
      rgba[2] * 0.9,
      rgba[3],
    );

    //Front of cube
    drawTriangle3D([0, 0, 0, 1, 1, 0, 1, 0, 0]);
    drawTriangle3D([0, 0, 0, 0, 1, 0, 1, 1, 0]);

    //Top of Cube
    drawTriangle3D([0, 1, 0, 0, 1, 1, 1, 1, 1]);
    drawTriangle3D([0, 1, 0, 1, 1, 1, 1, 1, 0]);

    // Back of cube (z = 1)
    drawTriangle3D([0, 0, 1, 1, 0, 1, 1, 1, 1]);
    drawTriangle3D([0, 0, 1, 1, 1, 1, 0, 1, 1]);

    // Bottom of cube (y = 0)
    drawTriangle3D([0, 0, 0, 1, 0, 0, 1, 0, 1]);
    drawTriangle3D([0, 0, 0, 1, 0, 1, 0, 0, 1]);

    // Left side of cube (x = 0)
    drawTriangle3D([0, 0, 0, 0, 1, 0, 0, 1, 1]);
    drawTriangle3D([0, 0, 0, 0, 1, 1, 0, 0, 1]);

    // Right side of cube (x = 1)
    drawTriangle3D([1, 0, 0, 1, 1, 0, 1, 1, 1]);
    drawTriangle3D([1, 0, 0, 1, 1, 1, 1, 0, 1]);
  }
}
