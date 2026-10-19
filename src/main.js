import "./style.css";
import { createScene } from "./scene.js";
import { createGraph, disposeGraph } from "./graph.js";
import { openCamera } from "./camera.js";

const { scene } = createScene(document.querySelector("#scene"));
let graph = null;

function draw(expr) {
  if (graph) disposeGraph(graph);
  const type = /\by\b/.test(expr) ? "3d" : "2d";
  graph = createGraph({ type, expr, domain: { x: [-5, 5], y: [-5, 5] } });
  scene.add(graph);
}

//draw("sin(x) * cos(y)"):

const video = document.querySelector("#video");

const screens = ["photo", "confirmation", "graph"];

function showScreen(name) {
  for (const s of screens) {
    document.querySelector(`#screen-${s}`).hidden = s !== name;
  }
}

showScreen("photo");
openCamera(video).catch(() => console.log("Sem acesso à câmera"));
