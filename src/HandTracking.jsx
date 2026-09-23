import { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { playTone } from "./sound";

const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

// 2D-only check — MediaPipe ka z-axis noisy hota hai, especially fast movement me,
// isliye sirf x,y use kar rahe hain jo zyada stable hai
function isFingerExtended(landmarks) {
    const wrist = landmarks[0];
    const mcp = landmarks[5];
    const pip = landmarks[6];
    const tip = landmarks[8];

    const dist2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const tipToWrist = dist2D(tip, wrist);
    const pipToWrist = dist2D(pip, wrist);
    const mcpToWrist = dist2D(mcp, wrist);

    // Loose kiya — curl hone par bhi extended maana jayega
    return tipToWrist > pipToWrist * 1.05 && pipToWrist > mcpToWrist * 0.85;
}

function HandTracking({ camHidden, soundEnabled }) {
    const videoRef = useRef(null);
    const overlayRef = useRef(null);

    const drawingState = useRef(false);
    const extendedStreak = useRef(0);
    const retractedStreak = useRef(0);
    const lostStreak = useRef(0);

    const pinchState = useRef(false);
    const pinchStreak = useRef(0);
    const releaseStreak = useRef(0);

    const twoHandPrev = useRef(null); // { dist, angle, midX, midY }
    const soundRef = useRef(soundEnabled);

    useEffect(() => {
        soundRef.current = soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        const video = videoRef.current;
        const overlay = overlayRef.current;
        if (!video || !overlay) return;
        const ctx = overlay.getContext("2d");

        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
        });

        hands.onResults((results) => {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            ctx.clearRect(0, 0, overlay.width, overlay.height);

            const hasHand = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

            if (!hasHand) {
                lostStreak.current += 1;
                twoHandPrev.current = null;
                if (lostStreak.current >= 5) {
                    drawingState.current = false;
                    window.dispatchEvent(
                        new CustomEvent("fingerMove", { detail: { x: 0, y: 0, drawing: false } })
                    );
                }
                return;
            }
            lostStreak.current = 0;

            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const videoAspect = videoWidth / videoHeight;
            const viewAspect = viewWidth / viewHeight;

            let renderWidth, renderHeight, offsetX, offsetY;
            if (viewAspect > videoAspect) {
                renderWidth = viewWidth;
                renderHeight = viewWidth / videoAspect;
                offsetX = 0;
                offsetY = (viewHeight - renderHeight) / 2;
            } else {
                renderHeight = viewHeight;
                renderWidth = viewHeight * videoAspect;
                offsetX = (viewWidth - renderWidth) / 2;
                offsetY = 0;
            }

            const mapToScreen = (nx, ny) => ({
                x: (1 - nx) * renderWidth + offsetX,
                y: ny * renderHeight + offsetY,
            });

            results.multiHandLandmarks.forEach((lm) => {
                drawConnectors(ctx, lm, Hands.HAND_CONNECTIONS);
                drawLandmarks(ctx, lm);
            });

            // =====================================
            // TWO HANDS -> manipulate canvas view, no drawing
            // =====================================
            if (results.multiHandLandmarks.length === 2) {
                drawingState.current = false;
                pinchState.current = false;
                window.dispatchEvent(
                    new CustomEvent("fingerMove", { detail: { x: 0, y: 0, drawing: false } })
                );

                const c0 = results.multiHandLandmarks[0][9];
                const c1 = results.multiHandLandmarks[1][9];
                const p0 = mapToScreen(c0.x, c0.y);
                const p1 = mapToScreen(c1.x, c1.y);

                const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
                const midX = (p0.x + p1.x) / 2;
                const midY = (p0.y + p1.y) / 2;

                if (twoHandPrev.current) {
                    const prev = twoHandPrev.current;
                    window.dispatchEvent(
                        new CustomEvent("canvasTransform", {
                            detail: {
                                dScale: dist / prev.dist,
                                dRotate: angle - prev.angle,
                                dx: midX - prev.midX,
                                dy: midY - prev.midY,
                            },
                        })
                    );
                }
                twoHandPrev.current = { dist, angle, midX, midY };
                return;
            }
            twoHandPrev.current = null;

            // =====================================
            // ONE HAND -> pinch-to-erase or draw
            // =====================================
            const landmarks = results.multiHandLandmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const pinchDist = dist3(thumbTip, indexTip);

            const rawPinching = pinchDist < 0.04;
            if (rawPinching) {
                pinchStreak.current += 1;
                releaseStreak.current = 0;
            } else {
                releaseStreak.current += 1;
                pinchStreak.current = 0;
            }

            if (!pinchState.current && pinchStreak.current >= 4) {
                pinchState.current = true;
                if (soundRef.current) playTone("erase");
            } else if (pinchState.current && releaseStreak.current >= 3) {
                pinchState.current = false;
            }

            if (pinchState.current) {
                if (drawingState.current) {
                    drawingState.current = false;
                    window.dispatchEvent(
                        new CustomEvent("fingerMove", { detail: { x: 0, y: 0, drawing: false } })
                    );
                }
                const mid = mapToScreen(
                    (thumbTip.x + indexTip.x) / 2,
                    (thumbTip.y + indexTip.y) / 2
                );
                window.dispatchEvent(
                    new CustomEvent("pinchErase", { detail: { x: mid.x, y: mid.y, erasing: true } })
                );
                return;
            }

            const rawExtended = isFingerExtended(landmarks);
            if (rawExtended) {
                extendedStreak.current += 1;
                retractedStreak.current = 0;
            } else {
                retractedStreak.current += 1;
                extendedStreak.current = 0;
            }

            // Quick to start, MUCH slower to stop — writing me curl se turant cut na ho
            if (!drawingState.current && extendedStreak.current >= 1) {
                drawingState.current = true;
            } else if (drawingState.current && retractedStreak.current >= 8) {
                drawingState.current = false;
            }

            const { x, y } = mapToScreen(indexTip.x, indexTip.y);

            window.dispatchEvent(
                new CustomEvent("fingerMove", { detail: { x, y, drawing: drawingState.current } })
            );
        });

        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 1280,
            height: 720,
        });

        camera.start();

        return () => {
            camera.stop();
            hands.close();
        };
    }, []);

    return (
        <div className={`camera-stage ${camHidden ? "camera-hidden" : ""}`}>
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <canvas ref={overlayRef} className="hand-overlay" />
            <div className="gesture-status">
                <span className="gesture-dot"></span>
                {camHidden ? "Tracking active (cam hidden)" : "Hand tracking active"}
            </div>
        </div>
    );
}

export default HandTracking;