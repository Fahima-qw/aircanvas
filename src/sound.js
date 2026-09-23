let audioCtx = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

export function playTone(type = "draw") {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const presets = {
            draw: { freq: 440, duration: 0.05, wave: "sine" },
            erase: { freq: 180, duration: 0.08, wave: "sawtooth" },
            undo: { freq: 300, duration: 0.1, wave: "triangle" },
            redo: { freq: 500, duration: 0.1, wave: "triangle" },
            clear: { freq: 150, duration: 0.2, wave: "square" },
            save: { freq: 660, duration: 0.15, wave: "sine" },
        };

        const preset = presets[type] || presets.draw;

        osc.type = preset.wave;
        osc.frequency.value = preset.freq;

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + preset.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + preset.duration);
    } catch (e) {
        // ignore autoplay-policy / audio errors
    }
}