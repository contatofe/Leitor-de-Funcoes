import "./style.css";
import { openCamera, capture, closeCamera } from "./camera.js";
import { createScene } from "./scene.js";
import { createGraph, disposeGraph, validateExpr } from "./graph.js";
import { recognize } from "./api.js";

import katex from "katex";
import "katex/dist/katex.min.css";
import * as math from "mathjs";

const { renderer, scene, tarefas } = createScene(
  document.querySelector("#scene"),
);
const video = document.querySelector("#video");
const screens = ["photo", "confirmation", "graph"];
const status = document.querySelector("#status");
const exprInput = document.querySelector("#expr");
const formula = document.querySelector("#formula");

let stream = null;
let graph = null;
let atual = null;

// function draw(expr) {
//   if (graph) disposeGraph(graph);
//   const type = /\by\b/.test(expr) ? "3d" : "2d";
//   graph = createGraph({ type, expr, domain: { x: [-5, 5], y: [-5, 5] } });
//   scene.add(graph);
// }

function showScreen(name) {
  for (const s of screens) {
    document.querySelector(`#screen-${s}`).hidden = s !== name;
  }
}

function showFormula(el, expr) {
  try {
    katex.render(math.parse(expr).toTex(), el, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    el.textContent = expr;
  }
}

function setStatus(text = "", type = "info") {
  status.textContent = text;
  status.dataset.type = type;
}

async function initiatePhoto() {
  closeCamera(stream);
  showScreen("photo");
  try {
    stream = await openCamera(video);
  } catch {
    setStatus(
      "Sem acesso à câmera. Libere a permissão nas configurações do Chrome.",
      "erro",
    );
  }
}

document.querySelector("#capture").addEventListener("click", async (e) => {
  const button = e.currentTarget;
  button.disabled = true;
  try {
    const photo = await capture(video);
    showScreen("confirmation");
    setStatus("Lendo a função…");
    atual = await recognize(photo);
    if (atual.type === "erro") {
      throw new Error(
        "Não achei uma função. Enquadre só a fórmula e tente de novo.",
      );
    }
    exprInput.value = atual.expr;
    showFormula(formula, atual.expr);
    setStatus("");
  } catch (erro) {
    setStatus(erro.message, "erro");
  } finally {
    button.disabled = false;
  }
});

exprInput.addEventListener("input", () =>
  showFormula(formula, exprInput.value),
);

document.querySelector("#show-3d").addEventListener("click", () => {
  const expr = exprInput.value;
  const type = atual?.type === "2d" ? "2d" : "3d";
  const v = validateExpr(expr, type);
  if (!v.ok) return setStatus(v.error, "erro");

  closeCamera(stream);
  if (graph) disposeGraph(graph);
  graph = createGraph({
    type,
    expr,
    domain: { x: atual?.domain?.x ?? [-5, 5], y: atual?.domain?.y ?? [-5, 5] },
  });
  scene.add(graph);
  showScreen("graph");
});

document.querySelector("#again").addEventListener("click", initiatePhoto);

initiatePhoto();
