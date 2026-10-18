app-ar-funcoes/
├── index.html
├── style.css
├── package.json
├── vite.config.js # proxy /api para localhost:8000 no dev
├── vercel.json # rewrite de /api/\* para api/index.py
├── src/
│ ├── main.js # telas e fluxo
│ ├── cena.js # renderer, câmera 3D, luzes, loop
│ ├── camera.js # câmera do celular e captura
│ ├── api.js # chamada a /api/recognize
│ ├── graph.js # mathjs + geometria three.js
│ └── ar.js # sessão WebXR, hit-test, âncora
├── api/
│ └── index.py # FastAPI, prompt, schema e rota /api/recognize
├── requirements.txt # dependências Python, lidas pela Vercel
└── .env # GEMINI_API_KEY, fora do git
