const canvasTop = document.getElementById('canvasTop');
const ctxTop = canvasTop.getContext('2d');
const canvasBottom = document.getElementById('canvasBottom');
const ctxBottom = canvasBottom.getContext('2d');
const canvasDipole = document.getElementById('canvasDipole');
const ctxDipole = canvasDipole.getContext('2d');

const noiseSlider = document.getElementById('noiseSlider');
const noiseVal = document.getElementById('noiseVal');
const gainSlider = document.getElementById('gainSlider');
const gainVal = document.getElementById('gainVal');
const speedSlider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
const toggleOpAmp = document.getElementById('toggleOpAmp');
const btnPause = document.getElementById('btnPause');
const bottomTitle = document.getElementById('bottomTitle');
const bottomDot = document.querySelector('.id-bottom-dot');
const pathologyPanel = document.getElementById('pathology-panel');
const pathText = document.getElementById('pathology-text');
const pMagText = document.getElementById('p-mag');
const pAngleText = document.getElementById('p-angle');
const pProjText = document.getElementById('p-proj');

// 物理与控制状态
let activeTab = 'micro';
let isOpAmpActive = false;
let pathologyType = 'normal';
let isPaused = false;
let time = 0;
let timeSpeedFactor = 1.0; // 播放倍速控制

let noiseAmplitude = 25;
let circuitGain = 1.2;

// 生理缓冲变量
let targetMag = 0;
let targetAngle = 0;
let currentMag = 0;
let currentAngle = 0;

noiseSlider.addEventListener('input', (e) => { noiseAmplitude = parseFloat(e.target.value); noiseVal.textContent = noiseAmplitude; });
gainSlider.addEventListener('input', (e) => { circuitGain = parseFloat(e.target.value); gainVal.textContent = circuitGain; });
speedSlider.addEventListener('input', (e) => { timeSpeedFactor = parseFloat(e.target.value); speedVal.textContent = timeSpeedFactor.toFixed(2); });

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        btnPause.textContent = "▶️ RESUME SIMULATION";
        btnPause.style.background = "#1d4ed8";
    } else {
        btnPause.textContent = "⏸️ PAUSE SIMULATION";
        btnPause.style.background = "#475569";
    }
}

function switchMode(mode) {
    activeTab = mode;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');

    if (mode === 'clinical') {
        pathologyPanel.style.display = 'block';
        isOpAmpActive = true; 
    } else {
        pathologyPanel.style.display = 'none';
        if (mode === 'micro') isOpAmpActive = false;
    }
    updateUIColors();
}

function toggleFilter() {
    isOpAmpActive = !isOpAmpActive;
    updateUIColors();
}

function updateUIColors() {
    if (isOpAmpActive) {
        toggleOpAmp.textContent = "Op-Amp Subtraction: ACTIVE";
        toggleOpAmp.className = "btn btn-success";
        bottomTitle.textContent = "Op-Amp Output (V_out = Clean Clarified ECG)";
        bottomDot.style.background = "#15803d";
    } else {
        toggleOpAmp.textContent = "Turn On Differential Op-Amp";
        toggleOpAmp.className = "btn btn-danger";
        bottomTitle.textContent = "System Output Suspended (0V Baseline)";
        bottomDot.style.background = "#94a3b8";
    }
}

function setPathology(type) {
    pathologyType = type;
    document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// 物理核心解析解
function getTargetDipoleState(t_val) {
    let period = (pathologyType === 'tachycardia') ? 0.45 : 1.0; 
    let phase = t_val % period;
    let mag = 0, angle = 0, statusLabel = "";

    if (pathologyType === 'afib') {
        mag = 7 + Math.sin(t_val * 12) * 2.5 + Math.cos(t_val * 28) * 1.5;
        angle = t_val * 3.5 + Math.sin(t_val * 6) * 1.8;
        statusLabel = "Atrial Fibrillation: Coherent macro-vector collapsed into tiny multi-centered waves.";
    } else {
        if (phase < 0.12) {
            mag = 12 * Math.sin((phase / 0.12) * Math.PI); angle = Math.PI / 6; 
            statusLabel = "P-Wave: Atrial depolarization vector sweeping downward.";
        } else if (phase >= 0.12 && phase < 0.18) {
            mag = 0; angle = 0;
            statusLabel = "PR Segment: AV Node delay mechanism holds signal charge.";
        } else if (phase >= 0.18 && phase < 0.28) {
            let qrsPhase = (phase - 0.18) / 0.1;
            if (qrsPhase < 0.2) { mag = 8; angle = -Math.PI * 0.7; } 
            else if (qrsPhase >= 0.2 && qrsPhase < 0.6) { mag = 72; angle = Math.PI / 3; } // R波顶点
            else { mag = 15; angle = -Math.PI * 0.4; }
            statusLabel = "QRS Complex: Powerful ventricular depolarization electrical sweep.";
        } else if (phase >= 0.28 && phase < 0.42) {
            if (pathologyType === 'mi') { mag = 24; angle = Math.PI / 4; statusLabel = "ST Elevation: Localized tissue death emitting injury current."; }
            else { mag = 0; angle = 0; statusLabel = "ST Segment: Isoelectric uniform electrical plateau."; }
        } else if (phase >= 0.42 && phase < 0.65) {
            mag = 18 * Math.sin(((phase - 0.42) / 0.23) * Math.PI); angle = Math.PI / 4; 
            statusLabel = "T-Wave: Ventricular repolarization vector restoring ions gradient.";
        } else {
            mag = 0; angle = 0; statusLabel = "Isoelectric Line: Heart at mechanical rest.";
        }
    }
    return { mag, angle, label: statusLabel };
}

// 渲染具有物理投影指示线的心脏空间
function drawDipoleVectorSpace() {
    let w = canvasDipole.width;
    let h = canvasDipole.height;
    ctxDipole.fillStyle = '#ffffff'; ctxDipole.fillRect(0, 0, w, h);
    
    let cx = w / 2;
    let cy = h / 2;

    // 1. 绘制标准的医学导联轴参考线
    // 横向 Lead I (红轴)：左臂到右臂
    ctxDipole.strokeStyle = 'rgba(185, 28, 28, 0.25)'; ctxDipole.lineWidth = 2;
    ctxDipole.setLineDash([2, 4]);
    ctxDipole.beginPath(); ctxDipole.moveTo(15, cy); ctxDipole.lineTo(w - 15, cy); ctxDipole.stroke();
    ctxDipole.setLineDash([]);
    ctxDipole.fillStyle = '#b91c1c'; ctxDipole.font = '10px sans-serif';
    ctxDipole.fillText("Lead I Axis (RA → LA)", w - 105, cy - 6);

    // 斜向 Lead II (绿轴，60度方向)
    ctxDipole.strokeStyle = 'rgba(21, 128, 61, 0.2)'; ctxDipole.lineWidth = 1.5;
    ctxDipole.beginPath();
    ctxDipole.moveTo(cx - 100 * Math.cos(Math.PI/3), cy - 100 * Math.sin(Math.PI/3));
    ctxDipole.lineTo(cx + 100 * Math.cos(Math.PI/3), cy + 100 * Math.sin(Math.PI/3));
    ctxDipole.stroke();

    // 2. 一阶惯性延迟渲染心脏电轴
    if (!isPaused) {
        currentMag = currentMag + (targetMag - currentMag) * 0.3;
        currentAngle = currentAngle + (targetAngle - currentAngle) * 0.3;
    }

    let px = currentMag * Math.cos(currentAngle);
    let py = currentMag * Math.sin(currentAngle);

    // 3. 【核心物理可视化】：画出蓝色矢量箭头投射到 Lead I 横轴上的投影虚线
    let projX = cx + px * 1.1; // 1.1是画布放大系数
    let arrowY = cy + py * 1.1;

    ctxDipole.strokeStyle = '#64748b'; ctxDipole.lineWidth = 1;
    ctxDipole.setLineDash([3, 3]);
    ctxDipole.beginPath();
    ctxDipole.moveTo(projX, arrowY); // 从大箭头顶点开始
    ctxDipole.lineTo(projX, cy);     // 垂直投射到横向 Lead I 轴上
    ctxDipole.stroke();
    ctxDipole.setLineDash([]);

    // 在横轴上画一个绿色亮眼的点，代表实时测到的电压数值
    ctxDipole.fillStyle = '#15803d';
    ctxDipole.beginPath(); ctxDipole.arc(projX, cy, 4, 0, 2*Math.PI); ctxDipole.fill();

    // 4. 最终画出代表心脏电场的深蓝色主要电偶极子矢量
    ctxDipole.strokeStyle = '#1d4ed8'; ctxDipole.lineWidth = 4;
    ctxDipole.beginPath(); ctxDipole.moveTo(cx, cy); ctxDipole.lineTo(projX, arrowY); ctxDipole.stroke();
    // 箭头帽
    ctxDipole.fillStyle = '#1d4ed8';
    ctxDipole.beginPath(); ctxDipole.arc(projX, arrowY, 5.5, 0, 2*Math.PI); ctxDipole.fill();
    
    // 更新左边栏显示的数据，px即为横轴物理投影长度
    pProjText.textContent = `${(px).toFixed(2)} mV`;
}

function drawMedicalGrid(ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffcccc'; ctx.lineWidth = 1.0;
    for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = '#fff5f5'; ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function loop() {
    const w = canvasTop.width;
    const h = canvasTop.height;

    // 获取当前时刻偶极子物理参数
    let state = getTargetDipoleState(time);
    targetMag = state.mag;
    targetAngle = state.angle;
    
    pathText.textContent = state.label;
    pMagText.textContent = `${currentMag.toFixed(2)} mV`;
    pAngleText.textContent = `${Math.round(currentAngle * (180 / Math.PI))}°`;

    drawDipoleVectorSpace();
    drawMedicalGrid(ctxTop, w, h);
    drawMedicalGrid(ctxBottom, w, h);

    ctxTop.beginPath(); ctxTop.strokeStyle = '#dc2626'; ctxTop.lineWidth = 2.5;
    ctxBottom.beginPath(); ctxBottom.strokeStyle = isOpAmpActive ? '#15803d' : '#94a3b8'; ctxBottom.lineWidth = 2.5;

    let noiseControl = (activeTab === 'circuit') ? noiseAmplitude : (activeTab === 'micro' ? 1.5 : 0);

    for (let x = 0; x < w; x++) {
        let t_offset = time + (x / w) * 2.0; 
        let internalState = getTargetDipoleState(t_offset);
        
        let px = internalState.mag * Math.cos(internalState.angle);
        let v_noise = noiseControl * Math.sin(2 * Math.PI * 50 * t_offset);

        let v1 = px + v_noise;
        ctxTop.lineTo(x, h / 2 - v1);

        if (isOpAmpActive) {
            let v2 = -px + v_noise; 
            let v_out = (v2 - v1) * -0.5 * circuitGain; 
            ctxBottom.lineTo(x, h / 2 - v_out);
        } else {
            ctxBottom.lineTo(x, h / 2);
        }
    }
    ctxTop.stroke();
    ctxBottom.stroke();

    // 如果没有按下暂停，时间才往前走（乘以速度滑块倍率系数）
    if (!isPaused) {
        time += 0.0035 * timeSpeedFactor;
    }
    requestAnimationFrame(loop);
}

switchMode('micro');
loop();
