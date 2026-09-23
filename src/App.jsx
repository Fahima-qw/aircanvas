import { useState } from 'react'
import './App.css'
import HandTracking from './HandTracking'
import Canvas from './Canvas'
import Controls from './Controls'

function App() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#a78bfa");
  const [brushSize, setBrushSize] = useState(6);
  const [glow, setGlow] = useState(15);
  const [brushMode, setBrushMode] = useState("neon");
  const [magicEffect, setMagicEffect] = useState("none");
  const [background, setBackground] = useState("dark");
  const [gravity, setGravity] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [camHidden, setCamHidden] = useState(false);

  return (
    <div className="app">
      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>

      <header className="top-bar">
        <div className="logo">
          <span className="logo-dot"></span>
          AirCanvas
        </div>
        <div className="status">
          <span className="status-dot"></span>
          Camera ready
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <p className="eyebrow">SPATIAL DRAWING</p>
          <h1>
            Draw in the <span>air.</span>
          </h1>
          <p className="subtitle">
            Turn your hand movements into glowing digital art.
            No mouse. No touch. Just your hands.
          </p>
          <button className="start-button" onClick={() => setIsDrawing(true)}>
            {isDrawing ? "Camera Active" : "Start Drawing"}
            <span>→</span>
          </button>
        </section>

        <section className="canvas-preview">
          <div className="preview-grid"></div>
          <div className="hand-placeholder">
            <div className="finger-line"></div>
            <div className="cursor-glow"></div>
          </div>
          <div className="preview-text">
            <span>✦</span>
            Your canvas awaits
          </div>
        </section>
      </main>

      <footer className="bottom-bar">
        <span>✦ Hand Tracking</span>
        <span>✦ Neon Canvas</span>
        <span>✦ Real-time Interaction</span>
      </footer>

      <div className={`canvas-backdrop bg-${background}`}></div>

      <Canvas
        color={color}
        brushSize={brushSize}
        glow={glow}
        brushMode={brushMode}
        magicEffect={magicEffect}
        gravity={gravity}
        soundEnabled={soundEnabled}
      />
      <Controls
        color={color} setColor={setColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        glow={glow} setGlow={setGlow}
        brushMode={brushMode} setBrushMode={setBrushMode}
        magicEffect={magicEffect} setMagicEffect={setMagicEffect}
        background={background} setBackground={setBackground}
        gravity={gravity} setGravity={setGravity}
        soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
        camHidden={camHidden} setCamHidden={setCamHidden}
      />

      {isDrawing && <HandTracking camHidden={camHidden} soundEnabled={soundEnabled} />}
    </div>
  )
}

export default App