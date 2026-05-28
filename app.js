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
const toggleOpAmp = document.getElementById('toggleOpAmp');
const bottomTitle = document.getElementById('bottomTitle');
const bottomDot = document.querySelector('.id-bottom-dot');
const pathologyPanel = document.getElementById('pathology-panel');
const pathText = document.getElementById('pathology-text');
const pMagText = document.getElementById('p-mag');
const pAngleText = document.getElementById('p-angle');

// 仿真基础状态
let activeTab = 'micro';
let isOpAmpActive = false;
let pathologyType = 'normal';
let time = 0;
let noiseAmplitude = 25;
let circuitGain = 1.2;

// 丝滑阻尼物理核心变量
let targetMag = 0;
let targetAngle = 0;
let currentMag = 0;
let currentAngle = 0;

// 房颤行走参数
let afibWalkTime = 0;

noiseSlider.addEventListener('input', (e) => { noiseAmplitude = parseFloat(e.target.value); noiseVal.textContent = noiseAmplitude; });
gainSlider.addEventListener('input', (e) => { circuitGain = parseFloat(e.target.value); gainVal.textContent = circuitGain; });

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
        bottomDot.style.background = "#15803d"; // 舒适的深绿色点
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

// 生理物理核心：计算偶极子状态
function getTargetDipoleState(t_val) {
    let period = (pathologyType === 'tachycardia') ? 0.45 : 1.0; 
    let phase = t_val % period;
    let mag = 0;
    let angle = 0;
    let statusLabel = "";

    if (pathologyType === 'afib') {
        afibWalkTime += 0.005;
        mag = 6 + Math.sin(t_val * 15) * 2 + Math.cos(t_val * 35) * 1.5;
        angle = t_val * 5 + Math.sin(t_val * 8) * 2;
        statusLabel = "Atrial Fibrillation: Coherent single vector collapsed. Micro-dipoles creeping fluidly.";
    } else {
        if (phase < 0.12) {
            let pPhase = phase / 0.12;
            mag = 12 * Math.sin(pPhase * Math.PI);
            angle = Math.PI / 6; 
            statusLabel = "P-Wave: SA Node firing. Atrial depolarization sweeping down-left smoothly.";
        } else if (phase >= 0.12 && phase < 0.18) {
            mag = 0; angle = 0;
            statusLabel = "PR Segment: AV Node holding electrical directive. Syncing ventricle delay.";
        } else if (phase >= 0.18 && phase < 0.28) {
            let qrsPhase = (phase - 0.18) / 0.1;
            if (qrsPhase < 0.2) {
                let norm = qrsPhase / 0.2;
                mag = 8 * Math.sin(norm * Math.PI); angle = -Math.PI * 0.7;
            } else if (qrsPhase >= 0.2 && qrsPhase < 0.6) {
                let norm = (qrsPhase - 0.2) / 0.4;
                mag = 72 * Math.sin(norm * Math.PI); angle = Math.PI / 3; 
            } else {
                let norm = (qrsPhase - 0.6) / 0.4;
                mag = 15 * Math.sin(norm * Math.PI); angle = -Math.PI * 0.4;
            }
            statusLabel = "QRS Complex: Mass depolarization wave cascading down the Purkinje fibers.";
        } else if (phase >= 0.28 && phase < 0.42) {
            if (pathologyType === 'mi') {
                mag = 24; angle = Math.PI / 4;
                statusLabel = "ST Elevation: Localized tissue necrosis setting up continuous injury potential field.";
            } else {
                mag = 0; angle = 0;
                statusLabel = "ST Segment: Ventricles totally depolarized. Uniform electrical balance.";
            }
        } else if (phase >= 0.42 && phase < 0.65) {
            let tNorm = (phase - 0.42) / 0.23;
            mag = 18 * Math.sin(tNorm * Math.PI);
            angle = Math.PI / 4; 
            statusLabel = "T-Wave: Dynamic ventricular repolarization spreading across membrane surfaces.";
        } else {
            mag = 0; angle = 0;
            statusLabel = "Isoelectric Baseline: Diastolic recharge phase.";
        }
    }
    return { mag, angle, label: statusLabel };
}

// 绘制心脏矢量雷达图（彻底改为白色背景）
function drawDipoleVectorSpace() {
    let w = canvasDipole.width;
    let h = canvasDipole.height;
    
    // 【关键修复】彻底删除原先的黑色清屏，改用纯白色清屏
    ctxDipole.fillStyle = '#ffffff'; 
    ctxDipole.fillRect(0, 0, w, h);
    
    // 浅灰色圆圈和坐标轴
    ctxDipole.strokeStyle = '#e2e8f0'; 
    ctxDipole.lineWidth = 1;
    ctxDipole.beginPath(); ctxDipole.arc(w/2, h/2, 80, 0, 2*Math.PI); ctxDipole.stroke();
    ctxDipole.beginPath(); ctxDipole.moveTo(w/2, 20); ctxDipole.lineTo(w/2, h-20); ctxDipole.stroke();
    ctxDipole.beginPath(); ctxDipole.moveTo(20, h/2); ctxDipole.lineTo(w-20, h/2); ctxDipole.stroke();

    // 丝滑缓动
    currentMag = currentMag + (targetMag - currentMag) * 0.3;
    currentAngle = currentAngle + (targetAngle - currentAngle) * 0.3;

    let px = currentMag * Math.cos(currentAngle);
    let py = currentMag * Math.sin(currentAngle);

    // 优雅的深蓝色大箭头
    ctxDipole.strokeStyle = '#1d4ed8'; 
    ctxDipole.lineWidth = 3.5;
    ctxDipole.beginPath();
    ctxDipole.moveTo(w/2, h/2);
    
    let targetX = w/2 + px * 1.1; 
    let targetY = h/2 + py * 1.1; 
    ctxDipole.lineTo(targetX, targetY);
    ctxDipole.stroke();

    ctxDipole.fillStyle = '#1d4ed8';
    ctxDipole.beginPath(); ctxDipole.arc(targetX, targetY, 5, 0, 2*Math.PI); ctxDipole.fill();
}

// 绘制粉色标准心电图纸网格（彻底改为白色底+粉红格子）
function drawMedicalGrid(ctx, w, h) {
    // 【关键修复】强制把画布底色刷成纯白
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, w, h);
    
    // 1. 绘制大格（浅粉色线条）
    ctx.strokeStyle = '#ffcccc'; 
    ctx.lineWidth = 1.0;
    for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, h); ctx.stroke(); }

    // 2. 绘制细小格（极淡粉色线条）
    ctx.strokeStyle = '#fff0f0'; 
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, h); ctx.stroke(); }
}

// 仿真主渲染循环
function loop() {
    const w = canvasTop.width;
    const h = canvasTop.height;

    let state = getTargetDipoleState(time);
    targetMag = state.mag;
    targetAngle = state.angle;
    pathText.textContent = state.label;
    pMagText.textContent = `${currentMag.toFixed(2)} mV`;
    pAngleText.textContent = `${Math.round(currentAngle * (180 / Math.PI))}°`;

    drawDipoleVectorSpace();

    // 重新用白色和粉红线条画示波器底图
    drawMedicalGrid(ctxTop, w, h);
    drawMedicalGrid(ctxBottom, w, h);

    // 【颜色加深加粗】顶层用医用深红，底层用医用深绿，确保投影仪完美可见
    ctxTop.beginPath(); ctxTop.strokeStyle = '#dc2626'; ctxTop.lineWidth = 2.5;
    ctxBottom.beginPath(); ctxBottom.strokeStyle = isOpAmpActive ? '#15803d' : '#94a3b8'; ctxBottom.lineWidth = 2.5;

    let noiseControl = (activeTab === 'circuit') ? noiseAmplitude : (activeTab === 'micro' ? 1.5 : 0);

    for (let x = 0; x < w; x++) {
        let t_offset = time + (x / w) * 2.0; 
        let internalState = getTargetDipoleState(t_offset);
        
        let px = internalState.mag * Math.cos(internalState.angle);
        let v_noise = noiseControl * Math.sin(2 * Math.PI * 50 * t_offset);

        // 顶层波形物理投影
        let v1 = px + v_noise;
        ctxTop.lineTo(x, h / 2 - v1);

        // 底层差消消噪输出
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

    time += 0.0035; 
    requestAnimationFrame(loop);
}

switchMode('micro');
loop();
