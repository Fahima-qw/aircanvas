function Controls({
    color, setColor,
    brushSize, setBrushSize,
    glow, setGlow,
    brushMode, setBrushMode,
    magicEffect, setMagicEffect,
    background, setBackground,
    gravity, setGravity,
    soundEnabled, setSoundEnabled,
    camHidden, setCamHidden,
}) {
    const colors = ["#00ffff", "#ff00ff", "#ffff00", "#00ff00", "#ff3030", "#ffffff", "#a78bfa"];

    return (
        <aside className="controls-panel">
            <div className="controls-title">
                <span>🎨</span>
                <h2>Brush</h2>
            </div>

            {/* COLOR */}
            <div className="control-section">
                <label>Color</label>
                <div className="color-palette">
                    {colors.map((item) => (
                        <button
                            key={item}
                            className={`color-button ${color === item ? "selected" : ""}`}
                            style={{ backgroundColor: item }}
                            onClick={() => setColor(item)}
                            aria-label={`Choose ${item}`}
                        />
                    ))}
                </div>
            </div>

            {/* BRUSH MODE */}
            <div className="control-section">
                <label>Brush Mode</label>
                <select
                    className="control-select"
                    value={brushMode}
                    onChange={(e) => setBrushMode(e.target.value)}
                >
                    <option value="neon">✨ Neon</option>
                    <option value="rainbow">🌈 Rainbow</option>
                    <option value="fire">🔥 Fire</option>
                    <option value="particle">💫 Particle Trail</option>
                </select>
            </div>

            {/* MAGIC EFFECT */}
            <div className="control-section">
                <label>Magic Effect</label>
                <select
                    className="control-select"
                    value={magicEffect}
                    onChange={(e) => setMagicEffect(e.target.value)}
                >
                    <option value="none">None</option>
                    <option value="wave">🪄 Wave</option>
                    <option value="pulse">🪄 Pulse</option>
                    <option value="shimmer">🪄 Shimmer</option>
                </select>
            </div>

            {/* BACKGROUND */}
            <div className="control-section">
                <label>Background</label>
                <select
                    className="control-select"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                >
                    <option value="dark">Dark</option>
                    <option value="grid">Grid</option>
                    <option value="space">Space</option>
                    <option value="sunset">Sunset</option>
                </select>
            </div>

            {/* BRUSH THICKNESS */}
            <div className="control-section">
                <div className="slider-header">
                    <label>Brush Thickness</label>
                    <span>{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="2"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                />
            </div>

            {/* GLOW */}
            <div className="control-section">
                <div className="slider-header">
                    <label>Glow Intensity</label>
                    <span>{glow}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="50"
                    value={glow}
                    onChange={(e) => setGlow(Number(e.target.value))}
                />
            </div>

            {/* TOGGLES */}
            <div className="control-section control-toggle-row">
                <label>🌀 Gravity Mode</label>
                <input type="checkbox" checked={gravity} onChange={(e) => setGravity(e.target.checked)} />
            </div>

            <div className="control-section control-toggle-row">
                <label>🔊 Gesture Sounds</label>
                <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                />
            </div>

            {/* PREVIEW */}
            <div className="brush-preview">
                <span>Preview</span>
                <div
                    className="preview-dot"
                    style={{
                        width: `${brushSize}px`,
                        height: `${brushSize}px`,
                        backgroundColor: color,
                        boxShadow: `0 0 ${glow}px ${color}`,
                    }}
                />
            </div>

            {/* ACTIONS */}
            <div className="control-actions">
                <button className="control-action" onClick={() => window.dispatchEvent(new Event("undoCanvas"))}>
                    ↶ Undo
                </button>
                <button className="control-action" onClick={() => window.dispatchEvent(new Event("redoCanvas"))}>
                    ↷ Redo
                </button>
                <button
                    className="control-action clear-button"
                    onClick={() => window.dispatchEvent(new Event("clearCanvas"))}
                >
                    Clear
                </button>
                <button
                    className="control-action save-button"
                    onClick={() => window.dispatchEvent(new Event("saveCanvas"))}
                >
                    📸 Save
                </button>
                <button
                    className="control-action"
                    onClick={() => window.dispatchEvent(new Event("replayCanvas"))}
                >
                    🎥 Replay
                </button>
                <button className="control-action" onClick={() => setCamHidden((prev) => !prev)}>
                    {camHidden ? "📷 Show Cam" : "🙈 Hide Cam"}
                </button>
            </div>
        </aside>
    );
}

export default Controls;