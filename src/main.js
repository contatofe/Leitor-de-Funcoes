import * as THREE from "three";
import { createScene } from "./scene.js";
import { createGraph2D, createGraph3D } from "./graph.js";

const graph = createGraph3D({
  expr: "sin(x) * cos(y)",
  domain: { x: [-5, 5], y: [-5, 5] },
});

const { scene } = createScene(document.querySelector("#scene"));
scene.add(graph);
