import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    innerWidth / innerHeight,
    0.01,
    200,
  );
  camera.position.set(0.25, 0.22, 0.35);

  const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1.2);
  scene.add(light);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const tarefas = new Set(); // funções extras a cada frame (Fases 4 e 5)
  renderer.setAnimationLoop((tempo, frame) => {
    tarefas.forEach((tarefa) => tarefa(tempo, frame));
    if (!renderer.xr.isPresenting) controls.update();
    renderer.render(scene, camera);
  });

  return { renderer, scene, camera, controls, tarefas };
}
