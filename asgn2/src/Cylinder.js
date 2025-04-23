// Cylinder.js
class Cylinder {
  /**
   * @param {number} segments  how many slices around the radius
   * @param {'x'|'y'|'z'} axis which axis to treat as the height direction
   */
  constructor(segments = 30, axis = 'y') {
    this.color    = [1, 1, 1, 1];
    this.matrix   = new Matrix4();
    this.segments = segments;
    this.axis     = axis.toLowerCase();
  }

  render() {
    const rgba = this.color;
    // bind color + model
    gl.uniform4f(u_FragColor, ...rgba);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    // darken slightly for “shading”
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);

    const n  = this.segments;
    const r  = 0.5;   // radius
    const h  = 1.0;   // height
    // centers for each axis
    const cx = 0.5, cy = 0.5, cz = 0.5;

    for (let i = 0; i < n; i++) {
      const a1 = (2*Math.PI*i   )/n;
      const a2 = (2*Math.PI*(i+1))/n;
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      const c2 = Math.cos(a2), s2 = Math.sin(a2);

      let x1,y1,z1, x2,y2,z2;

      switch (this.axis) {
        case 'x':
          // height along X, circle in Y-Z
          x1 = 0;                 y1 = cy + r*c1; z1 = cz + r*s1;
          x2 = 0;                 y2 = cy + r*c2; z2 = cz + r*s2;
          // SIDE
          drawTriangle3D([ x1,y1,z1,  x2,y2,z2,  h,y2,z2 ]);
          drawTriangle3D([ x1,y1,z1,  h,y2,z2,  h,y1,z1 ]);
          // CAPS
          drawTriangle3D([ 0,cy,cz,  x2,y2,z2,  x1,y1,z1 ]); // bottom
          drawTriangle3D([ h,cy,cz,  x1,y1,z1,  x2,y2,z2 ]); // top
          break;

        case 'z':
          // height along Z, circle in X-Y
          z1 = 0;                 x1 = cx + r*c1; y1 = cy + r*s1;
          z2 = 0;                 x2 = cx + r*c2; y2 = cy + r*s2;
          // SIDE
          drawTriangle3D([ x1,y1,z1,  x2,y2,z2,  x2,y2,h ]);
          drawTriangle3D([ x1,y1,z1,  x2,y2,h,   x1,y1,h ]);
          // CAPS
          drawTriangle3D([ cx,cy,0,  x1,y1,0,    x2,y2,0 ]);
          drawTriangle3D([ cx,cy,h,  x2,y2,h,    x1,y1,h ]);
          break;

        case 'y':  // default: height on Y, circle in X-Z
        default:
          y1 = 0;                 x1 = cx + r*c1; z1 = cz + r*s1;
          y2 = 0;                 x2 = cx + r*c2; z2 = cz + r*s2;
          // SIDE
          drawTriangle3D([ x1,y1,z1,  x2,y2,z2,  x2,h, z2 ]);
          drawTriangle3D([ x1,y1,z1,  x2,h, z2,  x1,h, z1 ]);
          // CAPS
          drawTriangle3D([ cx,0,cz,  x2,0,z2,    x1,0,z1 ]);
          drawTriangle3D([ cx,h,cz,  x1,h,z1,    x2,h,z2 ]);
          break;
      }
    }
  }
}

window.Cylinder = Cylinder;
