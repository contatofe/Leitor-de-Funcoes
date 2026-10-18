import "./style.css";
import { createScene } from "./scene.js";
import { createGraph, disposeGraph } from "./graph.js";

const { scene } = createScene(document.querySelector("#scene"));
let graph = null;

function draw(expr) {
  if (graph) disposeGraph(graph);
  const type = /\by\b/.test(expr) ? "3d" : "2d";
  graph = createGraph({ type, expr, domain: { x: [-5, 5], y: [-5, 5] } });
  scene.add(graph);
}

document.querySelector("#test").addEventListener("submit", (e) => {
  e.preventDefault();
  draw(document.querySelector("#expr-test").value);
});

draw("sin(x) * cos(y)");
