// Camera.js — Implements a controllable perspective camera for the Blocky World
// Dependencies: Vector3, Matrix4 (from cuon-matrix.js)

class Camera {
  /**
   * @param {HTMLCanvasElement} canvas — the rendering canvas (for aspect ratio)
   * @param {Object} [options] — optional overrides for initial parameters
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;

    // Perspective parameters
    this.fov = options.fov || 60.0;
    this.near = options.near || 0.1;
    this.far = options.far || 1000.0;

    // Camera coordinate frame
    this.eye = new Vector3(options.eye || [0, 3.5, 1]);
    this.at = new Vector3(options.at || [0, 3.5, 0]);
    this.up = new Vector3(options.up || [0, 1, 0]);

    // Movement parameters
    this.speed = options.speed || 0.1;
    this.sensitivity = options.sensitivity || 0.005;

    // Matrices
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    // Initialize
    this.updateViewMatrix();
    this.updateProjectionMatrix();
  }

  /** Recomputes the view matrix from current eye, at, up */
  updateViewMatrix() {
    const e = this.eye.elements,
      a = this.at.elements,
      u = this.up.elements;

    this.viewMatrix.setLookAt(
      e[0],
      e[1],
      e[2],
      a[0],
      a[1],
      a[2],
      u[0],
      u[1],
      u[2],
    );
  }

  /** Recomputes the projection matrix from current canvas size & fov */
  updateProjectionMatrix() {
    const aspect = this.canvas.width / this.canvas.height;
    this.projectionMatrix.setPerspective(this.fov, aspect, this.near, this.far);
  }

  getWorldDirection() {
    const e = this.eye.elements;
    const a = this.at.elements;
    const dx = a[0] - e[0],
          dy = a[1] - e[1],
          dz = a[2] - e[2];
    const len = Math.hypot(dx, dy, dz);
    return {
      x: dx / len,
      y: dy / len,
      z: dz / len
    };
  }


  /** Move forward along the viewing direction */
  moveForward() {
    const e = this.eye.elements,
      a = this.at.elements;
    let dx = a[0] - e[0],
      dy = a[1] - e[1],
      dz = a[2] - e[2];
    const len = Math.hypot(dx, dy, dz);
    if (len > 0) {
      const inv = this.speed / len;
      dx *= inv;
      dy *= inv;
      dz *= inv;
      e[0] += dx;
      e[1] += dy;
      e[2] += dz;
      a[0] += dx;
      a[1] += dy;
      a[2] += dz;
      this.updateViewMatrix();
    }
  }

  /** Move backward */
  moveBackward() {
    const e = this.eye.elements,
      a = this.at.elements;
    let dx = e[0] - a[0],
      dy = e[1] - a[1],
      dz = e[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len > 0) {
      const inv = this.speed / len;
      dx *= inv;
      dy *= inv;
      dz *= inv;
      e[0] += dx;
      e[1] += dy;
      e[2] += dz;
      a[0] += dx;
      a[1] += dy;
      a[2] += dz;
      this.updateViewMatrix();
    }
  }

  /** Strafe left (perpendicular to up × forward) */
  moveLeft() {
    const e = this.eye.elements,
      a = this.at.elements,
      u = this.up.elements;

    // forward vector
    const fx = a[0] - e[0],
      fy = a[1] - e[1],
      fz = a[2] - e[2];

    // side = up × forward
    let sx = u[1] * fz - u[2] * fy,
      sy = u[2] * fx - u[0] * fz,
      sz = u[0] * fy - u[1] * fx;

    const slen = Math.hypot(sx, sy, sz);
    if (slen > 0) {
      const inv = this.speed / slen;
      sx *= inv;
      sy *= inv;
      sz *= inv;
      e[0] += sx;
      e[1] += sy;
      e[2] += sz;
      a[0] += sx;
      a[1] += sy;
      a[2] += sz;
      this.updateViewMatrix();
    }
  }

  /** Strafe right (forward × up) */
  moveRight() {
    const e = this.eye.elements,
      a = this.at.elements,
      u = this.up.elements;

    // forward vector
    const fx = a[0] - e[0],
      fy = a[1] - e[1],
      fz = a[2] - e[2];

    // side = forward × up
    let sx = fy * u[2] - fz * u[1],
      sy = fz * u[0] - fx * u[2],
      sz = fx * u[1] - fy * u[0];

    const slen = Math.hypot(sx, sy, sz);
    if (slen > 0) {
      const inv = this.speed / slen;
      sx *= inv;
      sy *= inv;
      sz *= inv;
      e[0] += sx;
      e[1] += sy;
      e[2] += sz;
      a[0] += sx;
      a[1] += sy;
      a[2] += sz;
      this.updateViewMatrix();
    }
  }

  /** Rotate around the world up axis (yaw) */
  yaw(angleDeg) {
    const e = this.eye.elements,
      a = this.at.elements,
      u = this.up.elements;

    // forward vector
    const fx = a[0] - e[0],
      fy = a[1] - e[1],
      fz = a[2] - e[2];

    // build rotation
    const rot = new Matrix4().setRotate(angleDeg, u[0], u[1], u[2]);
    // rotate forward
    const fp = rot
      .multiplyVector3(new Vector3([fx, fy, fz]))
      .normalize().elements;

    // update look‑at
    a[0] = e[0] + fp[0];
    a[1] = e[1] + fp[1];
    a[2] = e[2] + fp[2];

    this.updateViewMatrix();
  }

  /** Rotate up/down around the side axis (pitch) */
  pitch(angleDeg) {
    const e = this.eye.elements,
      a = this.at.elements,
      u = this.up.elements;

    // forward vector
    const fx = a[0] - e[0],
      fy = a[1] - e[1],
      fz = a[2] - e[2];

    // side axis = forward × up
    let sx = fy * u[2] - fz * u[1],
      sy = fz * u[0] - fx * u[2],
      sz = fx * u[1] - fy * u[0];

    const slen = Math.hypot(sx, sy, sz);
    if (slen === 0) return;
    sx /= slen;
    sy /= slen;
    sz /= slen;

    // build rotation about side axis
    const rot = new Matrix4().setRotate(angleDeg, sx, sy, sz);
    // rotate forward
    const fp = rot
      .multiplyVector3(new Vector3([fx, fy, fz]))
      .normalize().elements;

    // update look‑at
    a[0] = e[0] + fp[0];
    a[1] = e[1] + fp[1];
    a[2] = e[2] + fp[2];

    // recompute up = side × forward
    let ux = sy * fp[2] - sz * fp[1],
      uy = sz * fp[0] - sx * fp[2],
      uz = sx * fp[1] - sy * fp[0];

    const ulen = Math.hypot(ux, uy, uz);
    if (ulen > 0) {
      u[0] = ux / ulen;
      u[1] = uy / ulen;
      u[2] = uz / ulen;
    }

    this.updateViewMatrix();
  }

  /**
   * Handle mouse movement: dx, dy in pixels
   */
  handleMouseMove(dx, dy) {
    this.yaw(dx * this.sensitivity);
    this.pitch(dy * this.sensitivity);
  }

  /** Should be called on canvas resize */
  onResize() {
    this.updateProjectionMatrix();
  }
}