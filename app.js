const canvasTop = document.getElementById('canvasTop');
const ctxTop = canvasTop.getContext('2d');
const canvasBottom = document.getElementById('canvasBottom');
const ctxBottom = canvasBottom.getContext('2d');
const canvasDipole = document.getElementById('canvasDipole');
const ctxDipole = canvasDipole.getContext('2d');

// DOM 获取
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

// 物理状态机
let activeTab = 'micro'; // micro, circuit, clinical
let isOpAmpActive = false;
let pathologyType = 'normal';
let time = 0;
let noiseAmplitude = 25;
let circuitGain = 1.2;

// 偶极子实时坐标矢量值
let dipoleX = 0;
let dipoleY = 0;

// 滑块阻尼监听
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
        bottomDot.style.background = "var(--neon-green)";
        bottomDot.style.boxShadow = "0 0 6px var(--neon-green)";
    } else {
        toggleOpAmp.textContent = "Turn On Differential Op-Amp";
        toggleOpAmp.className = "btn btn-danger";
        bottomTitle.textContent = "System Output Disabled / Suspended (0V Baseline)";
        bottomDot.style.background = "#55657e";
        bottomDot.style.boxShadow = "none";
    }
}

function setPathology(type) {
    pathologyType = type;
    document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

/**
 * 核心生物物理学建模：根据心动周期，实时计算空间中电偶极子矢量 p = (x, y) 的模长与方向。
 * 它是完全动态伸缩旋转的，代表窦房结到心室的真实电学扫掠轨迹。
 */
function updateDipolePhysics(t) {
    let period = (pathologyType === 'tachycardia') ? 0.45 : 1.0; 
    let phase = t % period;
    let mag = 0;
    let angle = 0;

    if (pathologyType === 'afib') {
        // 房颤：宏观相干偶极子瓦解，箭头变成极小的、随机乱抖的微小矢量
        mag = 3 + Math.random() * 8;
        angle = Math.random() * 2 * Math.PI;
        pathText.textContent = "Atrial Fibrillation: Coherent vector collapsed into randomized micro-dipoles.";
    } else {
        // 正常心动周期的经典心电矢量扫掠演变
        if (phase < 0.12) {
            // 1. P波阶段：心房电轴，偏向左下方
            mag = 12 * Math.sin((phase / 0.12) * Math.PI);
            angle = Math.PI / 6; // 30度
            pathText.textContent = "P-Wave: SA Node firing. Atrial depolarization vector spreading down-left.";
        } else if (phase >= 0.12 && phase < 0.18) {
            // 房室结延时：矢量几乎归零
            mag = 1; angle = 0;
            pathText.textContent = "PR Segment: AV Node delay mechanism in progress. Charging ventricles.";
        } else if (phase >= 0.18 && phase < 0.28) {
            // 2. QRS复合波阶段：强大的心室极化，电轴疯狂向下猛冲然后回弹
            let qrsPhase = (phase - 0.18) / 0.1;
            if (qrsPhase < 0.2) { mag = 8; angle = -Math.PI * 0.7; } // Q波
            else if (qrsPhase >= 0.2 && qrsPhase < 0.6) { mag = 72; angle = Math.PI / 3; } // R波核心（巨型大箭头指向左下）
            else { mag = 18; angle = -Math.PI * 0.4; } // S波
            pathText.textContent = "QRS Complex: Rapid ventricular depolarization. Huge macro-vector projection.";
        } else if (phase >= 0.28 && phase < 0.42) {
            // 3. ST段与心肌梗塞基线偏置
            if (pathologyType === 'mi') {
                mag = 24; angle = Math.PI / 4; // 心梗导致的持续损伤电流电轴偏移
                pathText.textContent = "ST Elevation: Localized tissue injury creating permanent current of injury.";
            } else {
                mag = 0; angle = 0;
                pathText.textContent = "ST Segment: Ventricles fully depolarized. Isoelectric balance.";
            }
        } else if (phase >= 0.42 && phase < 0.65) {
            // 4. T波阶段：心室复极化，中等大箭头缓慢扫过
            let tPhase = (phase - 0.42) / 0.23;
            mag = 18 * Math.sin(tPhase * Math.PI);
            angle = Math.PI / 4; // 45度
            pathText.textContent = "T-Wave: Ventricular repolarization vector restoring electro-chemical gradient.";
        } else {
            mag = 0; angle = 0;
            pathText.textContent = "Isoelectric Line: Resting diastolic state.";
        }
    }

    // 将极坐标转换为 2D 直角坐标物理坐标
    dipoleX = mag * Math.cos(angle);
    dipoleY = mag * Math.sin(angle);

    // 渲染动态仪表盘
    pMagText.textContent = `${mag.toFixed(2)} mV`;
    pAngleText.textContent = `${Math.round(angle * (180 / Math.PI))}°`;
}

// 在左侧画出动态跳动、旋转的生物心脏电轴箭头
function drawDipoleVectorSpace() {
    let w = canvasDipole.width;
    let h = canvasDipole.height;
    ctxDipole.fillStyle = '#030508'; ctxDipole.fillRect(0, 0, w, h);
    
    // 画坐标参考圆形系
    ctxDipole.strokeStyle = '#121a24'; ctxDipole.lineWidth = 1;
    ctxDipole.beginPath(); ctxDipole.arc(w/2, h/2, 80, 0, 2*Math.PI); ctxDipole.stroke();
    ctxDipole.beginPath(); ctxDipole.moveTo(w/2, 20); ctxDipole.lineTo(w/2, h-20); ctxDipole.stroke();
    ctxDipole.beginPath(); ctxDipole.moveTo(20, h/2); ctxDipole.lineTo(w-20, h/2); ctxDipole.stroke();

    // 实时画出指向心脏运动方向的电轴矢量（荧光青色，高度吸睛）
    ctxDipole.strokeStyle = 'var(--neon-blue)';
    ctxDipole.lineWidth = 3.5;
    ctxDipole.beginPath();
    ctxDipole.moveTo(w/2, h/2);
    
    let targetX = w/2 + dipoleX * 1.1; 
    let targetY = h/2 + dipoleY * 1.1; // 适当放大方便肉眼捕捉
    ctxDipole.lineTo(targetX, targetY);
    ctxDipole.stroke();

    // 画箭头尖端
    ctxDipole.fillStyle = 'var(--neon-blue)';
    ctxDipole.beginPath();
    ctxDipole.arc(targetX, targetY, 5, 0, 2*Math.PI);
    ctxDipole.fill();
}

function drawGrid(ctx, w, h) {
    ctx.fillStyle = '#020305'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1b1212'; ctx.lineWidth = 0.8; // 暗红色高纯度雷达网格
    for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, h); ctx.stroke(); }
}

// 仿真系统主循环
function loop() {
    const w = canvasTop.width;
    const h = canvasTop.height;

    // 1. 首先更新当前时刻的底层偶极子矢量物理坐标
    updateDipolePhysics(time);
    drawDipoleVectorSpace();

    // 2. 刷新示波器背景
    drawGrid(ctxTop, w, h);
    drawGrid(ctxBottom, w, h);

    // 3. 开始执行物理投影绘制（粗线高亮荧光色，绝不模糊）
    ctxTop.beginPath(); ctxTop.strokeStyle = 'var(--neon-red)'; ctxTop.lineWidth = 2.2;
    ctxBottom.beginPath(); ctxBottom.strokeStyle = isOpAmpActive ? 'var(--neon-green)' : '#25354c'; ctxBottom.lineWidth = 2.5;

    let noiseControl = (activeTab === 'circuit') ? noiseAmplitude : (activeTab === 'micro' ? 2 : 0);

    for (let x = 0; x < w; x++) {
        let t_offset = time + (x / w) * 2.0; // 屏幕宽度容纳2.0秒电学轨迹
        
        // 我们需要对屏幕上的每个时间步长进行一次隐式偶极子演变计算，以获得连贯的虚拟时间轴投影
        let period = (pathologyType === 'tachycardia') ? 0.45 : 1.0; 
        let phase = t_offset % period;
        let p_mag = 0, p_ang = 0;

        if (pathologyType === 'afib') {
            p_mag = 4 + Math.sin(2*Math.PI*40*t_offset)*3; p_ang = t_offset*10;
        } else {
            if (phase < 0.12) { p_mag = 12 * Math.sin((phase / 0.12) * Math.PI); p_ang = Math.PI / 6; }
            else if (phase >= 0.12 && phase < 0.18) { p_mag = 0; p_ang = 0; }
            else if (phase >= 0.18 && phase < 0.28) {
                let qrs = (phase - 0.18) / 0.1;
                if (qrs < 0.2) { p_mag = 8; p_ang = -Math.PI * 0.7; }
                else if (qrs >= 0.2 && qrs < 0.6) { p_mag = 72; p_ang = Math.PI / 3; }
                else { p_mag = 18; p_ang = -Math.PI * 0.4; }
            } else if (phase >= 0.28 && phase < 0.42) {
                p_mag = (pathologyType === 'mi') ? 24 : 0; p_ang = Math.PI / 4;
            } else if (phase >= 0.42 && phase < 0.65) {
                p_mag = 18 * Math.sin(((phase - 0.42) / 0.23) * Math.PI); p_ang = Math.PI / 4;
            }
        }

        let px = p_mag * Math.cos(p_ang);
        let py = p_mag * Math.sin(p_ang);

        // 麦克斯韦工频交流噪声干扰项
        let v_noise = noiseControl * Math.sin(2 * Math.PI * 50 * t_offset);

        // 【真正的物理投影】：输入通道 1 等于偶极子在 X 轴导联上的标量投影 + 共模噪声
        let v1 = px + v_noise;
        ctxTop.lineTo(x, h / 2 - v1);

        // 【差分消噪物理核】
        if (isOpAmpActive) {
            // 输入通道 2 拾取到反向的差模心电（体表镜像极性），以及一模一样的共模噪声
            let v2 = -px + v_noise;
            // 运放执行减法：(V2 - V1) -> (-px + v_noise) - (px + v_noise) = -2*px。噪声被完美剪灭！
            let v_out = (v2 - v1) * -0.5 * circuitGain;
            ctxBottom.lineTo(x, h / 2 - v_out);
        } else {
            ctxBottom.lineTo(x, h / 2);
        }
    }
    ctxTop.stroke();
    ctxBottom.stroke();

    time += 0.0035; // 控制整体波形刷新流速
    requestAnimationFrame(loop);
}

// 初始化状态并启动引擎
switchMode('micro');
loop();
