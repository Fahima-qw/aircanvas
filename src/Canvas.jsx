import { useEffect, useRef } from "react";
import { playTone } from "./sound";

const REPLAY_SPEED = 4; // replay plays back 4x faster than real time

function drawStroke(ctx, stroke, now, effect, idx) {
    const seed = idx * 13.37;
    let pts = stroke.points;
    if (pts.length < 2) return;

    if (effect === "wave") {
        pts = pts.map((p, i) => ({
            x: p.x + Math.sin(now / 300 + i * 0.5 + seed) * 4,
            y: p.y + Math.cos(now / 300 + i * 0.5 + seed) * 4,
        }));
    }

    let widthMult = 1;
    if (effect === "pulse") widthMult = 1 + 0.35 * Math.sin(now / 200 + seed);

    const mode = stroke.mode || "neon";

    if (mode === "rainbow" || effect === "shimmer") {
        for (let i = 1; i < pts.length; i++) {
            const hue =
                mode === "rainbow"
                    ? (i * 6 + now / 15 + seed * 10) % 360
                    : (now / 10 + seed * 40) % 360;

            ctx.beginPath();
            ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.lineWidth = stroke.brushSize * widthMult;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = stroke.glow;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
        }
        return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);

    const baseColor = mode === "fire" ? "#ff6a00" : stroke.color;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = stroke.brushSize * widthMult;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = stroke.glow;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
}

function Canvas({ color, brushSize, glow, brushMode, magicEffect, gravity, soundEnabled }) {
    const canvasRef = useRef(null);
    const lastPoint = useRef(null);
    const smoothPoint = useRef(null);

    const strokesRef = useRef([]);
    const redoRef = useRef([]);
    const currentStrokeRef = useRef([]);
    const particlesRef = useRef([]);

    const recordStartRef = useRef(performance.now());
    const isReplayingRef = useRef(false);
    const replayStartRef = useRef(0);
    const replaySnapshotRef = useRef([]);
    const replayDurationRef = useRef(0);

    const rafRef = useRef(null);

    const settingsRef = useRef({ color, brushSize, glow, brushMode, magicEffect, gravity, soundEnabled });
    useEffect(() => {
        settingsRef.current = { color, brushSize, glow, brushMode, magicEffect, gravity, soundEnabled };
    }, [color, brushSize, glow, brushMode, magicEffect, gravity, soundEnabled]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // =====================================
        // STROKE FINALIZE
        // =====================================
        const finalizeCurrentStroke = () => {
            if (currentStrokeRef.current.length > 1) {
                const settings = settingsRef.current;
                strokesRef.current.push({
                    points: [...currentStrokeRef.current],
                    color: settings.color,
                    brushSize: settings.brushSize,
                    glow: settings.glow,
                    mode: settings.brushMode,
                });
                redoRef.current = [];
            }
            currentStrokeRef.current = [];
            lastPoint.current = null;
            smoothPoint.current = null;
        };

        // =====================================
        // PARTICLES (fire / particle brush)
        // =====================================
        const spawnParticles = (x, y, mode, color) => {
            const isFire = mode === "fire";
            const count = isFire ? 3 : mode === "particle" ? 2 : 0;

            for (let i = 0; i < count; i++) {
                particlesRef.current.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * (isFire ? 1.5 : 1),
                    vy: isFire ? -Math.random() * 2 - 0.5 : (Math.random() - 0.5) * 1,
                    life: 0,
                    maxLife: isFire ? 40 + Math.random() * 20 : 30 + Math.random() * 20,
                    size: isFire ? 3 + Math.random() * 3 : 2 + Math.random() * 2,
                    color: isFire
                        ? `hsl(${20 + Math.random() * 30}, 100%, 55%)`
                        : color,
                });
            }
        };

        const updateAndDrawParticles = () => {
            const wantsGravity = settingsRef.current.gravity;
            particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
            particlesRef.current.forEach((p) => {
                p.life += 1;
                if (wantsGravity) p.vy += 0.05;
                p.x += p.vx;
                p.y += p.vy;

                const alpha = Math.max(0, 1 - p.life / p.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.size * alpha), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.globalAlpha = 1;
            });
        };

        // =====================================
        // MAIN RENDER LOOP
        // =====================================
        const renderLoop = () => {
            const now = performance.now();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const effect = settingsRef.current.magicEffect;
            const replaying = isReplayingRef.current;
            const strokesToRender = replaying ? replaySnapshotRef.current : strokesRef.current;

            strokesToRender.forEach((stroke, idx) => {
                if (replaying) {
                    const elapsed = (now - replayStartRef.current) * REPLAY_SPEED;
                    const visible = stroke.points.filter((p) => p.t <= elapsed);
                    if (visible.length >= 2) {
                        drawStroke(ctx, { ...stroke, points: visible }, now, effect, idx);
                    }
                } else {
                    drawStroke(ctx, stroke, now, effect, idx);
                }
            });

            if (!replaying && currentStrokeRef.current.length >= 2) {
                const settings = settingsRef.current;
                drawStroke(
                    ctx,
                    {
                        points: currentStrokeRef.current,
                        color: settings.color,
                        brushSize: settings.brushSize,
                        glow: settings.glow,
                        mode: settings.brushMode,
                    },
                    now,
                    effect,
                    9999
                );
            }

            updateAndDrawParticles();

            if (replaying) {
                const elapsed = (now - replayStartRef.current) * REPLAY_SPEED;
                if (elapsed > replayDurationRef.current + 500) {
                    isReplayingRef.current = false;
                }
            }

            rafRef.current = requestAnimationFrame(renderLoop);
        };
        rafRef.current = requestAnimationFrame(renderLoop);

        // =====================================
        // DRAWING (from hand tracking)
        // =====================================
        const draw = (event) => {
            const { x, y, drawing } = event.detail;

            if (!drawing) {
                finalizeCurrentStroke();
                return;
            }

            const wasFirstPoint = !lastPoint.current;

            if (!smoothPoint.current) {
                smoothPoint.current = { x, y };
            } else {
                const smoothing = 0.5;
                smoothPoint.current = {
                    x: smoothPoint.current.x + (x - smoothPoint.current.x) * smoothing,
                    y: smoothPoint.current.y + (y - smoothPoint.current.y) * smoothing,
                };
            }

            const currentPoint = smoothPoint.current;
            const settings = settingsRef.current;
            const t = performance.now() - recordStartRef.current;

            currentStrokeRef.current.push({ x: currentPoint.x, y: currentPoint.y, t });

            if (settings.brushMode === "fire" || settings.brushMode === "particle") {
                spawnParticles(currentPoint.x, currentPoint.y, settings.brushMode, settings.color);
            }

            if (wasFirstPoint && settings.soundEnabled) {
                playTone("draw");
            }

            lastPoint.current = { x: currentPoint.x, y: currentPoint.y };
        };

        // =====================================
        // PINCH-TO-ERASE (vector erase: trims stroke points)
        // =====================================
        const eraseAt = (x, y, radius) => {
            const newStrokes = [];
            strokesRef.current.forEach((stroke) => {
                let run = [];
                stroke.points.forEach((p) => {
                    const d = Math.hypot(p.x - x, p.y - y);
                    if (d > radius) {
                        run.push(p);
                    } else {
                        if (run.length > 1) newStrokes.push({ ...stroke, points: run });
                        run = [];
                    }
                });
                if (run.length > 1) newStrokes.push({ ...stroke, points: run });
            });
            strokesRef.current = newStrokes;
        };

        const pinchErase = (event) => {
            const { x, y, erasing } = event.detail;
            if (!erasing) return;
            eraseAt(x, y, settingsRef.current.brushSize * 4);
        };

        // =====================================
        // TWO-HAND MANIPULATION (view transform)
        // =====================================
        const canvasTransform = (event) => {
            const { dScale, dRotate, dx, dy } = event.detail;
            const current = canvas._transform || { scale: 1, rotate: 0, x: 0, y: 0 };
            const next = {
                scale: Math.min(3, Math.max(0.4, current.scale * dScale)),
                rotate: current.rotate + dRotate,
                x: current.x + dx,
                y: current.y + dy,
            };
            canvas._transform = next;
            canvas.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale}) rotate(${next.rotate}deg)`;
        };

        // =====================================
        // CLEAR / SAVE / UNDO / REDO / REPLAY
        // =====================================
        const clearCanvas = () => {
            strokesRef.current = [];
            redoRef.current = [];
            currentStrokeRef.current = [];
            particlesRef.current = [];
            lastPoint.current = null;
            smoothPoint.current = null;
            canvas._transform = { scale: 1, rotate: 0, x: 0, y: 0 };
            canvas.style.transform = "none";
            if (settingsRef.current.soundEnabled) playTone("clear");
        };

        const saveCanvas = () => {
            const link = document.createElement("a");
            link.download = `aircanvas-${Date.now()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            if (settingsRef.current.soundEnabled) playTone("save");
        };

        const undo = () => {
            finalizeCurrentStroke();
            if (strokesRef.current.length === 0) return;
            const removed = strokesRef.current.pop();
            redoRef.current.push(removed);
            if (settingsRef.current.soundEnabled) playTone("undo");
        };

        const redo = () => {
            if (redoRef.current.length === 0) return;
            const restored = redoRef.current.pop();
            strokesRef.current.push(restored);
            if (settingsRef.current.soundEnabled) playTone("redo");
        };

        const replayCanvas = () => {
            if (strokesRef.current.length === 0) return;
            replaySnapshotRef.current = strokesRef.current.map((s) => ({
                ...s,
                points: [...s.points],
            }));
            let maxT = 0;
            replaySnapshotRef.current.forEach((s) =>
                s.points.forEach((p) => {
                    if (p.t > maxT) maxT = p.t;
                })
            );
            replayDurationRef.current = maxT;
            replayStartRef.current = performance.now();
            isReplayingRef.current = true;
        };

        window.addEventListener("fingerMove", draw);
        window.addEventListener("pinchErase", pinchErase);
        window.addEventListener("canvasTransform", canvasTransform);
        window.addEventListener("clearCanvas", clearCanvas);
        window.addEventListener("saveCanvas", saveCanvas);
        window.addEventListener("undoCanvas", undo);
        window.addEventListener("redoCanvas", redo);
        window.addEventListener("replayCanvas", replayCanvas);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("fingerMove", draw);
            window.removeEventListener("pinchErase", pinchErase);
            window.removeEventListener("canvasTransform", canvasTransform);
            window.removeEventListener("clearCanvas", clearCanvas);
            window.removeEventListener("saveCanvas", saveCanvas);
            window.removeEventListener("undoCanvas", undo);
            window.removeEventListener("redoCanvas", redo);
            window.removeEventListener("replayCanvas", replayCanvas);
        };
    }, []);

    return <canvas ref={canvasRef} className="drawing-canvas" />;
}

export default Canvas;