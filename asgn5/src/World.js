// World.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  World as PhysWorld,
  Body,
  Box,
  Plane,
  Vec3,
  Quaternion,
  Sphere,
  Cylinder
} from 'cannon-es';

// ————————————————————————————————————————————————
// 1. Three.js scene, camera, renderer & skybox
// ————————————————————————————————————————————————
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// skybox
const cubeLoader = new THREE.CubeTextureLoader();
const skyboxUrls = [
  'textures/skybox/dark-s_px.jpg',
  'textures/skybox/dark-s_nx.jpg',
  'textures/skybox/dark-s_py.jpg',
  'textures/skybox/dark-s_ny.jpg',
  'textures/skybox/dark-s_pz.jpg',
  'textures/skybox/dark-s_nz.jpg'
];
scene.background = cubeLoader.load(skyboxUrls);

// ————————————————————————————————————————————————
// 2. Cannon-es physics world
// ————————————————————————————————————————————————
const physWorld = new PhysWorld();
physWorld.gravity.set(0, -9.82, 0);

// ————————————————————————————————————————————————
// 3. Lights (ambient, directional, point, hemisphere, spotlight)
// ————————————————————————————————————————————————
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xffaa00, 1.0, 30);
pointLight.position.set(-5, 5, -5);
scene.add(pointLight);

const hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x444422, 0.6);
scene.add(hemiLight);

const spot = new THREE.SpotLight(0xffffff, 1, 50, Math.PI/6, 0.2, 1);
spot.position.set(0, 10, 0);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
scene.add(spot);

// ————————————————————————————————————————————————
// 4. Floor (textured mesh + physics)
// ————————————————————————————————————————————————
const floorSize     = 50;
const floorHalfSize = floorSize / 2;
const floorY        = -2.5;

const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
const floorTex = new THREE.TextureLoader().load('textures/jade.jpg');
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(floorSize / 10, floorSize / 10);

const floorMat  = new THREE.MeshStandardMaterial({
  map: floorTex,
  side: THREE.DoubleSide
});
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x    = -Math.PI / 2;
floorMesh.position.y    = floorY;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const floorBody = new Body({
  mass: 0,
  shape: new Box(new Vec3(floorHalfSize, 0.05, floorHalfSize)),
  position: new Vec3(0, floorY - 0.05, 0)
});
physWorld.addBody(floorBody);

// ————————————————————————————————————————————————
// 5. Crate wall (mesh + physics)
// ————————————————————————————————————————————————
const crateTex = new THREE.TextureLoader().load('textures/crate.gif');
const crateMat = new THREE.MeshStandardMaterial({ map: crateTex });
const crateGeo = new THREE.BoxGeometry(1, 1, 1);

const crates = [];
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 3; j++) {
    const mesh = new THREE.Mesh(crateGeo, crateMat);
    mesh.castShadow = true;
    mesh.position.set((i - 2.5) * 1.1, floorY + 0.5 + j * 1.1, 0);
    scene.add(mesh);

    const body = new Body({
      mass: 1,
      position: new Vec3().copy(mesh.position),
      shape: new Box(new Vec3(0.5, 0.5, 0.5))
    });
    physWorld.addBody(body);

    crates.push({ mesh, body });
  }
}

// ————————————————————————————————————————————————
// 6. Extras: sphere & cylinder (mesh + physics)
// ————————————————————————————————————————————————
const extras = [];

// Textured Sphere
const sphereTex  = new THREE.TextureLoader().load('textures/golfball.jpg');
const sphereMat  = new THREE.MeshStandardMaterial({ map: sphereTex });
const sphereGeo  = new THREE.SphereGeometry(1, 32, 32);
const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
sphereMesh.castShadow = true;
sphereMesh.position.set(5, floorY + 1, 5);
scene.add(sphereMesh);

const sphereBody = new Body({
  mass: 1,
  shape: new Sphere(1),
  position: new Vec3(5, floorY + 1, 5)
});
physWorld.addBody(sphereBody);
sphereBody.angularVelocity.set(0, 2, 0);
sphereBody.angularDamping = 0;
extras.push({ mesh: sphereMesh, body: sphereBody });

// Textured Cylinder (in place of cone)
const cylRadius = 1;
const cylHeight = 2;
const cylRawTex = new THREE.TextureLoader().load('textures/Carbon.png');
cylRawTex.wrapS = cylRawTex.wrapT = THREE.RepeatWrapping;
cylRawTex.repeat.set(1, 1);

const cylMat  = new THREE.MeshStandardMaterial({ map: cylRawTex });
const cylGeo  = new THREE.CylinderGeometry(cylRadius, cylRadius, cylHeight, 32);
const cylMesh = new THREE.Mesh(cylGeo, cylMat);
cylMesh.castShadow = true;
cylMesh.position.set(-5, floorY + cylHeight/2, 5);
scene.add(cylMesh);

const cylBody = new Body({
  mass: 1,
  shape: new Cylinder(cylRadius, cylRadius, cylHeight, 32),
  position: new Vec3(-5, floorY + cylHeight/2, 5)
});
// rotate Cannon’s default X-axis cylinder to stand upright
cylBody.quaternion.copy(
  new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2)
);
physWorld.addBody(cylBody);
extras.push({ mesh: cylMesh, body: cylBody });

// ————————————————————————————————————————————————
// 7. Reload listener & legend overlay
// ————————————————————————————————————————————————
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r') location.reload();
});

const legend = document.createElement('div');
legend.id = 'legend';
legend.innerHTML = `
  <strong>Controls</strong><br>
  W/S: Accelerate / Brake<br>
  A/D: Steer<br>
  Space: Drift<br>
  R: Reload Scene<br>
  ←/→ (Arrow Keys): Pan Camera Left/Right<br>
  ↑/↓ (Arrow Keys): Move Camera Forward/Backward<br>
  Q/E: Move Camera Up/Down<br>
  Wow point: Added basic physics engine<br>
  Try crashing into the objects!<br>
`;

Object.assign(legend.style, {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'rgba(255,255,255,0.8)',
  padding: '8px',
  borderRadius: '4px',
  fontFamily: 'Arial, sans‑serif',
  fontSize: '12px',
  lineHeight: '1.4',
  pointerEvents: 'none'
});
document.body.appendChild(legend);

// ————————————————————————————————————————————————
// 8. Load Ferrari model + physics body
// ————————————————————————————————————————————————
let carMesh, carBody;
const loader = new GLTFLoader();
const draco  = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
loader.setDRACOLoader(draco);

loader.load('models/ferrari.glb', gltf => {
  carMesh = gltf.scene;
  carMesh.castShadow = true;
  carMesh.rotation.y = Math.PI;
  scene.add(carMesh);

  const bbox = new THREE.Box3().setFromObject(carMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  carBody = new Body({
    mass: 5,
    shape: new Box(new Vec3(size.x/2, size.y/2, size.z/2)),
    position: new Vec3(0, floorY + size.y/2 + 0.01, -10)
  });
  carBody.angularFactor.set(0,1,0);
  carBody.linearFactor.set(1,0,1);
  carBody.linearDamping  = 0.5;
  carBody.angularDamping = 0.5;
  carBody.allowSleep     = false;

  carBody.quaternion.copy(
    new Quaternion().setFromAxisAngle(new Vec3(0,1,0), Math.PI)
  );
  carBody.updateMassProperties();

  physWorld.addBody(carBody);
});

// ————————————————————————————————————————————————
// 9. Driving state & constants
// ————————————————————————————————————————————————
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

let speed   = 0;
let heading = Math.PI;
const maxForwardSpeed = 20;
const maxReverseSpeed = 10;
const accel           = 40;
const decel           = 20;
const steerSpeed      = Math.PI;
const driftFactor     = 0.5;

// ————————————————————————————————————————————————
// 10. Animate, OOB check & sync
// ————————————————————————————————————————————————
const timeStep = 1/60;
function animate() {
  requestAnimationFrame(animate);

  // Car controls & physics
  if (carBody) {
    const dt = timeStep;
    if      (keys['w']) speed = Math.min( speed + accel*dt,  maxForwardSpeed );
    else if (keys['s']) speed = Math.max( speed - accel*dt, -maxReverseSpeed );
    else {
      if      (speed >  0) speed = Math.max(speed - decel*dt, 0);
      else if (speed <  0) speed = Math.min(speed + decel*dt, 0);
    }
    if (speed !== 0) {
      const dir     = speed > 0 ? 1 : -1;
      const turnAmt = steerSpeed * dt * (Math.abs(speed)/maxForwardSpeed);
      if (keys['a']) heading += turnAmt * dir;
      if (keys['d']) heading -= turnAmt * dir;
    }
    const q = new Quaternion().setFromAxisAngle(new Vec3(0,1,0), heading);
    carBody.quaternion.copy(q);

    const forward = q.vmult(new Vec3(0,0,-1));
    const right   = q.vmult(new Vec3(1,0,0));
    let vel = forward.scale(speed);
    if (keys[' ']) {
      const turnDir = keys['a'] ?  1 : keys['d'] ? -1 : 0;
      vel = vel.vadd(right.scale(speed * driftFactor * turnDir));
    }
    carBody.velocity.set(vel.x, carBody.velocity.y, vel.z);
    carBody.wakeUp();

    const { x, z } = carBody.position;
    if (Math.abs(x) > floorHalfSize || Math.abs(z) > floorHalfSize) {
      carBody.linearFactor.set(1,1,1);
      carBody.collisionResponse = false;
    }
  }

  physWorld.step(timeStep);

  // Sync crates
  crates.forEach(({ mesh, body }) => {
    const { x, z } = body.position;
    if (Math.abs(x) > floorHalfSize || Math.abs(z) > floorHalfSize)
      body.collisionResponse = false;
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  // Sync extras (sphere & cylinder)
  extras.forEach(({ mesh, body }) => {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  // Sync car mesh
  if (carMesh && carBody) {
    carMesh.position.copy(carBody.position);
    carMesh.quaternion.copy(carBody.quaternion);
  }

  const camSpeed = 0.5;
  // Forward/Backward
  if (keys['arrowup']) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.add(dir.multiplyScalar(camSpeed));
  }
  if (keys['arrowdown']) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.add(dir.multiplyScalar(-camSpeed));
  }
  // Left/Right
  if (keys['arrowleft']) {
    const left = new THREE.Vector3();
    camera.getWorldDirection(left);
    left.cross(camera.up).normalize();
    camera.position.add(left.multiplyScalar(-camSpeed));
  }
  if (keys['arrowright']) {
    const right = new THREE.Vector3();
    camera.getWorldDirection(right);
    right.cross(camera.up).normalize();
    camera.position.add(right.multiplyScalar(camSpeed));
  }
  // Up/Down
  if (keys['q']) camera.position.y += camSpeed;
  if (keys['e']) camera.position.y -= camSpeed;

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ————————————————————————————————————————————————
// 11. Handle window resize
// ————————————————————————————————————————————————
window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});