const PARTICLE_COUNT = 8000;
let currentTemplate = "sphere";
let handX = 0,
  handY = 0,
  isFist = false;
let lastSwitchTime = 0;

const modeText = document.getElementById("mode-text");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 20;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

  colors[i * 3] = Math.random();
  colors[i * 3 + 1] = Math.random();
  colors[i * 3 + 2] = 1.0;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 0.08,
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

function getTemplatePosition(index, type) {
  const i = index / PARTICLE_COUNT;
  const t = i * Math.PI * 2;
  const u = ((index % 100) / 100) * Math.PI * 2;
  const v = (Math.floor(index / 100) / (PARTICLE_COUNT / 100)) * Math.PI;

  switch (type) {
    case "heart":
      const xH = 16 * Math.pow(Math.sin(t * 10), 3);
      const yH =
        13 * Math.cos(t * 10) -
        5 * Math.cos(2 * t * 10) -
        2 * Math.cos(3 * t * 10) -
        Math.cos(4 * t * 10);
      return { x: xH * 0.4, y: yH * 0.4, z: (Math.random() - 0.5) * 2 };

    case "saturn":
      if (index < PARTICLE_COUNT * 0.6) {
        return {
          x: 5 * Math.sin(v) * Math.cos(u),
          y: 5 * Math.sin(v) * Math.sin(u),
          z: 5 * Math.cos(v),
        };
      } else {
        const ringR = 7 + Math.random() * 3;
        return {
          x: ringR * Math.cos(t * 50),
          y: ringR * Math.sin(t * 50) * 0.2,
          z: ringR * Math.sin(t * 50),
        };
      }

    case "fireworks":
      const speed = 5 + Math.random() * 5;
      return {
        x: Math.cos(t * 100) * speed,
        y: Math.sin(t * 100) * speed,
        z: Math.sin(u * 10) * speed,
      };

    default:
      return {
        x: 7 * Math.sin(v) * Math.cos(u),
        y: 7 * Math.sin(v) * Math.sin(u),
        z: 7 * Math.cos(v),
      };
  }
}

const videoElement = document.getElementById("input-video");
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

hands.onResults((results) => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    handX = (0.5 - landmarks[8].x) * 30;
    handY = (0.5 - landmarks[8].y) * 20;

    const dist = Math.sqrt(
      Math.pow(landmarks[8].x - landmarks[5].x, 2) +
        Math.pow(landmarks[8].y - landmarks[5].y, 2)
    );
    isFist = dist < 0.08;

    const pinchDist = Math.sqrt(
      Math.pow(landmarks[4].x - landmarks[8].x, 2) +
        Math.pow(landmarks[4].y - landmarks[8].y, 2)
    );
    if (pinchDist < 0.03 && Date.now() - lastSwitchTime > 1000) {
      const modes = ["sphere", "heart", "saturn", "fireworks"];
      const nextIdx = (modes.indexOf(currentTemplate) + 1) % modes.length;
      currentTemplate = modes[nextIdx];
      modeText.innerText = `Current Template: ${currentTemplate.toUpperCase()}`;
      lastSwitchTime = Date.now();
    }
  }
});

const cameraFeed = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
cameraFeed.start();

function animate() {
  requestAnimationFrame(animate);

  const posAttr = geometry.attributes.position;
  const colAttr = geometry.attributes.color;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const target = getTemplatePosition(i, currentTemplate);

    if (isFist) {
      posAttr.array[i3] += (handX - posAttr.array[i3]) * 0.08;
      posAttr.array[i3 + 1] += (handY - posAttr.array[i3 + 1]) * 0.08;
      colAttr.array[i3] = 1.0;
      colAttr.array[i3 + 1] = 0.3;
    } else {
      posAttr.array[i3] += (target.x - posAttr.array[i3]) * 0.04;
      posAttr.array[i3 + 1] += (target.y - posAttr.array[i3 + 1]) * 0.04;
      posAttr.array[i3 + 2] += (target.z - posAttr.array[i3 + 2]) * 0.04;
      colAttr.array[i3] = 0.2;
      colAttr.array[i3 + 1] = 0.6;
    }
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;

  points.rotation.y += 0.005;
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
