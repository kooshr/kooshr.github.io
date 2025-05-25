class Camera {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;

    // frustum settings
    this.fov = opts.fov ?? 80;
    this.near = opts.near ?? 0.1;
    this.far = opts.far ?? 1000;

    // position & orientation
    this.eye = new Vector3(opts.eye || [4, 2, -5]);
    this.at = new Vector3(opts.at || [-3, 2, 0]);
    this.up = new Vector3(opts.up || [0, 5, 0]);

    // movement & look sensitivity
    this.speed = opts.speed ?? 0.1;
    this.sensitivity = opts.sensitivity ?? 0.005;

    // internal matrices
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.updateViewMatrix();
    this.updateProjectionMatrix();
  }

  // Recalculate view based on eye, at, up
  updateViewMatrix() {
    const [ex, ey, ez] = this.eye.elements;
    const [ax, ay, az] = this.at.elements;
    const [ux, uy, uz] = this.up.elements;
    this.viewMatrix.setLookAt(ex, ey, ez, ax, ay, az, ux, uy, uz);
  }

  // Recalculate projection using canvas aspect ratio
  updateProjectionMatrix() {
    const aspect = this.canvas.width / this.canvas.height;
    this.projectionMatrix.setPerspective(this.fov, aspect, this.near, this.far);
  }

  // Unit vector from eye toward at
  getWorldDirection() {
    const e = this.eye.elements;
    const a = this.at.elements;
    const dx = a[0] - e[0],
      dy = a[1] - e[1],
      dz = a[2] - e[2];
    const invLen = 1 / Math.hypot(dx, dy, dz);
    return { x: dx * invLen, y: dy * invLen, z: dz * invLen };
  }

  // advance toward at
  moveForward() {
    this._moveAlong(this.getWorldDirection());
  }
  // retreat from at
  moveBackward() {
    const dir = this.getWorldDirection();
    this._moveAlong({ x: -dir.x, y: -dir.y, z: -dir.z });
  }

  // strafe: compute perpendicular direction via cross products
  moveLeft() {
    this._strafe(this.up, true);
  }
  moveRight() {
    this._strafe(this.up, false);
  }

  // yaw around global up axis
  yaw(angle) {
    this._rotateAxis(this.up.elements, angle);
  }

  // pitch around camera side axis
  pitch(angle) {
    const { x: fx, y: fy, z: fz } = this.getWorldDirection();
    // side axis = forward × up
    let sx = fy * this.up.elements[2] - fz * this.up.elements[1];
    let sy = fz * this.up.elements[0] - fx * this.up.elements[2];
    let sz = fx * this.up.elements[1] - fy * this.up.elements[0];
    const len = Math.hypot(sx, sy, sz);
    if (!len) return;
    [sx, sy, sz] = [sx / len, sy / len, sz / len];
    this._rotateAxis([sx, sy, sz], angle);
    // update up = side × forward
    const fp = this.getWorldDirection();
    [this.up.elements[0], this.up.elements[1], this.up.elements[2]] = [
      sy * fp.z - sz * fp.y,
      sz * fp.x - sx * fp.z,
      sx * fp.y - sy * fp.x,
    ].map(
      (v) =>
        v /
        Math.hypot(
          sy * fp.z - sz * fp.y,
          sz * fp.x - sx * fp.z,
          sx * fp.y - sy * fp.x,
        ),
    );
  }

  // adjust look by mouse delta
  handleMouseMove(dx, dy) {
    this.yaw(dx * this.sensitivity);
    this.pitch(dy * this.sensitivity);
  }

  // on canvas resize
  onResize() {
    this.updateProjectionMatrix();
  }

  // internal: move both eye & at by direction vector
  _moveAlong({ x, y, z }) {
    const inv = this.speed;
    ["eye", "at"].forEach((prop) => {
      const v = this[prop].elements;
      v[0] += x * inv;
      v[1] += y * inv;
      v[2] += z * inv;
    });
    this.updateViewMatrix();
  }

  // internal: strafe left/right via cross-product
  _strafe(upVec, left = true) {
    const { x: fx, y: fy, z: fz } = this.getWorldDirection();
    const [ux, uy, uz] = upVec.elements || upVec;
    let sx = left ? uy * fz - uz * fy : fy * uz - fz * uy;
    let sy = left ? uz * fx - ux * fz : fz * ux - fx * uz;
    let sz = left ? ux * fy - uy * fx : fx * uy - fy * ux;
    const len = Math.hypot(sx, sy, sz);
    if (!len) return;
    [sx, sy, sz] = [sx / len, sy / len, sz / len];
    this._moveAlong({ x: sx, y: sy, z: sz });
  }

  // internal: rotate direction around axis
  _rotateAxis(axis, angle) {
    const rot = new Matrix4().setRotate(angle, ...axis);
    const dir = this.getWorldDirection();
    const fp = rot
      .multiplyVector3(new Vector3([dir.x, dir.y, dir.z]))
      .normalize().elements;
    const e = this.eye.elements;
    this.at.elements = [e[0] + fp[0], e[1] + fp[1], e[2] + fp[2]];
    this.updateViewMatrix();
  }
}