class Sphere {
  constructor(textureUnit = -2, angleStep = Math.PI / 20) {
    this.type = "sphere";
    this.color = [1, 1, 1, 1];
    this.textureNum = textureUnit;
    this.matrix = new Matrix4();

    const { sin, cos, PI } = Math;
    const d = angleStep;
    this.vertices = [];
    this.uvs = [];
    this.normals = [];

    for (let vAngle = 0; vAngle < PI; vAngle += d) {
      for (let hAngle = 0; hAngle < 2 * PI; hAngle += d) {
        const p1 = [
          sin(vAngle) * cos(hAngle),
          cos(vAngle),
          sin(vAngle) * sin(hAngle),
        ];
        const p2 = [
          sin(vAngle + d) * cos(hAngle),
          cos(vAngle + d),
          sin(vAngle + d) * sin(hAngle),
        ];
        const p3 = [
          sin(vAngle) * cos(hAngle + d),
          cos(vAngle),
          sin(vAngle) * sin(hAngle + d),
        ];
        const p4 = [
          sin(vAngle + d) * cos(hAngle + d),
          cos(vAngle + d),
          sin(vAngle + d) * sin(hAngle + d),
        ];

        const u1 = hAngle / (2 * PI), v1 = vAngle / PI;
        const u2 = hAngle / (2 * PI), v2 = (vAngle + d) / PI;
        const u3 = (hAngle + d) / (2 * PI), v3 = vAngle / PI;
        const u4 = (hAngle + d) / (2 * PI), v4 = (vAngle + d) / PI;

        this.vertices.push(...p1, ...p2, ...p3);
        this.uvs.push(u1, v1, u2, v2, u3, v3);
        this.normals.push(...p1, ...p2, ...p3);

        this.vertices.push(...p2, ...p4, ...p3);
        this.uvs.push(u2, v2, u4, v4, u3, v3);
        this.normals.push(...p2, ...p4, ...p3);
      }
    }
  }

  render() {
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    drawTriangle3DUVNormal(this.vertices, this.uvs, this.normals);
  }
}