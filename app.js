// 画布与控制逻辑初始化
const canvasTop = document.getElementById('canvasTop');
const ctxTop = canvasTop.getContext('2d');
const canvasBottom = document.getElementById('canvasBottom');
const ctxBottom = canvasBottom.getContext('2d');

const noiseSlider = document.getElementById('noiseSlider');
const noiseVal = document.getElementById('noiseVal');
const gainSlider = document.getElementById('gainSlider');
const gainVal = document.getElementById('gainVal');
const toggleOpAmp = document.getElementById('toggleOpAmp');
const bottomTag = document.getElementById('bottomTag');
const pathDesc = document.getElementById('pathology-desc');

let activeMode = 'micro'; // micro, circuit, clinical
let isFilterActive = false;
let currentPathology = 'normal';
let time = 0;
let noiseAmp = 25;
let opAmpGain = 1.2;

// 监听控制元件
noiseSlider.addEventListener('input', (e) => { noiseAmp = parseFloat(e.target.value); noiseVal.textContent = noiseAmp; });
gainSlider.addEventListener('input', (e) => { gain = parseFloat(e.target.value); gainVal.textContent = gain; });

// 切换标签页联动
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
    
    if(tabId === 'tab-micro') { activeMode = 'micro'; isFilterActive = false; }
    if(tabId === 'tab-circuit') activeMode = 'circuit';
    if(tabId === 'tab-clinical') { activeMode = 'clinical'; isFilterActive = true; }
    updateUIForMode();
}

function updateUIForMode() {
    if (activeMode === 'circuit') {
        bottomTag.textContent = isFilterActive ? "Op-Amp Output (V_out = Amplified Clean ECG)" : "System Status: Op-Amp Disabled (Output 0V)";
        bottomTag.style.color = isFilterActive ? "var(--neon-green)" : "var(--text-secondary)";
    } else if (activeMode === 'clinical') {
        bottomTag.textContent = `Live Clinical Diagnostics Focus: ${currentPathology.toUpperCase()}`;
        bottomTag.style.color = "var(--neon-green)";
    } else {
        bottomTag.textContent = "System Status: Resting Transmembrane Baseline";
        bottomTag.style.color = "var(--text-secondary)";
    }
}

function toggleFilter() {
    isFilterActive = !isFilterActive;
    if(isFilterActive) {
        toggleOpAmp.textContent = "Op-Amp Subtraction: ACTIVE";
        toggleOpAmp.className = "circuit-toggle btn-green";
    } else {
        toggleOpAmp.textContent = "Turn On Differential Op-Amp";
        toggleOpAmp.className = "circuit-toggle btn-red";
    }
    updateUIForMode();
}

// 模拟第3页：心肌细胞离子通道开放微观表现
function triggerDepolarization() {
    const na = document.getElementById('ion-na');
    const ca = document.getElementById('ion-ca');
    na.style.transform = "translateY(45px)";
    ca.style.transform = "translateY(45px)";
    setTimeout(() => {
        na.style.transform = "translateY(0px)";
        ca.style.transform = "translateY(0px)";
    }, 1500);
}

// 切换临床病例物理波形特征
function setPathology(type) {
    currentPathology = type;
    document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    const descriptions = {
        normal: "<strong>Normal Mechanism:</strong> Sequential activation of SA Node &rarr; AV Node (delay mechanism) &rarr; Purkinje Fibers yields standard P-QRS-T geometry.",
        tachycardia: "<strong>Tachycardia (心动过速):</strong> Frequency (f) increases drastically. Spatial R-R interval compresses significantly due to accelerated electrical cycling.",
        afib: "<strong>Atrial Fibrillation (房颤):</strong> Coherent atrial dipole moment vector collapses into chaotic randomized micro-vectors. P-wave entirely disappears, replaced by baseline high-frequency noise.",
        mi: "<strong>Myocardial Infarction (心肌梗塞):</strong> Localized necrosis alters volume conductor boundary conditions. Creates a steady 'current of injury', significantly elevating the ST-segment."
    };
    pathDesc.innerHTML = descriptions[type];
    updateUIForMode();
}

// 生理学基础：高保真非线性数学函数构建ECG基础波形 (P, Q, R, S, T)
function generateBiophysicalECG(t, type) {
    let period = 1.0; 
    if (type === 'tachycardia') period = 0.45; // 心动过速：频率升高，周期减半

    let phase = t % period;
    
    if (type === 'afib') {
        // 房颤：P波完全消失，代之以无序的高频细小颤动随机噪声
        let f_wave = 3 * Math.sin(2 * Math.PI * 35 * t) + 2 * Math.cos(2 * Math.PI * 65 * t);
        let qrs = 0;
        // R波保留但间距绝对不规则（这里简化模拟一个随机突起的QRS）
        if (phase >= 0.2 && phase < 0.25) qrs = 60 * Math.sin((phase - 0.2) * Math.PI / 0.05);
        return f_wave + qrs;
    }

    let p_wave = 0, q_wave = 0, r_wave = 0, s_wave = 0, t_wave = 0, st_elevation = 0;

    // 1. P波（心房去极化）
    if (phase > 0.08 && phase < 0.18) p_wave = 10 * Math.sin((phase - 0.08) * Math.PI / 0.1);
    
    // 2. QRS复合波（心室极速去极化，最强宏观电场矢量）
    if (phase >= 0.20 && phase < 0.22) q_wave = -6 * Math.sin((phase - 0.20) * Math.PI / 0.02);
    if (phase >= 0.22 && phase < 0.26) r_wave = 68 * Math.sin((phase - 0.22) * Math.PI / 0.04);
    if (phase >= 0.26 && phase < 0.30) s_wave = -15 * Math.sin((phase - 0.26) * Math.PI / 0.04);
    
    // 3. T波（心室复极化舒张）
    if (phase >= 0.45 && phase < 0.62) t_wave = 16 * Math.sin((phase - 0.45) * Math.PI / 0.17);

    // 4. 心肌梗塞导致的 ST段特征性抬高异常
    if (type === 'mi' && phase >= 0.30 && phase < 0.48) {
        st_elevation = 22 * Math.sin((phase - 0.30) * Math.PI / 0.18);
    }

    return p_wave + q_wave + r_wave + s_wave + t_wave + st_elevation;
}

function drawBackgroundGrid(ctx, w, h) {
    ctx.fillStyle = '#070a0f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#151e2b'; ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, h); ctx.stroke(); }
}

// 仿真主渲染循环
function runSimulation() {
    const w = canvasTop.width;
    const h = canvasTop.height;

    drawBackgroundGrid(ctxTop, w, h);
    drawBackgroundGrid(ctxBottom, w, h);

    ctxTop.beginPath(); ctxTop.strokeStyle = 'var(--neon-red)'; ctxTop.lineWidth = 1.2;
    ctxBottom.beginPath(); ctxBottom.strokeStyle = isFilterActive ? 'var(--neon-green)' : '#334155'; ctxBottom.lineWidth = 1.8;

    let targetPathology = (activeMode === 'clinical') ? currentPathology : 'normal';
    let currentNoiseAmp = (activeMode === 'circuit') ? noiseAmp : 0;
    
    if(activeMode === 'micro') currentNoiseAmp = 4; // 微观模式下加入极小物理基线杂讯

    for (let x = 0; x < w; x++) {
        let t_offset = time + (x / w) * 2.2; // 2.2秒时间跨度观测窗口
        
        let rawEcg = generateBiophysicalECG(t_offset, targetPathology);
        let commonModeNoise = currentNoiseAmp * Math.sin(2 * Math.PI * 50 * t_offset); // 50Hz麦克斯韦感应噪声

        // 顶层示波器：体表混合电压输入测得值
        let v1 = rawEcg + commonModeNoise;
        ctxTop.lineTo(x, h / 2 - v1);

        // 底层示波器：硬件电路运算层
        if (activeMode === 'micro') {
            // 微观模式下展示静息到动作电位的映射
            ctxBottom.lineTo(x, h / 2 - rawEcg * 0.4);
        } else {
            // 差分与临床模式
            if (isFilterActive) {
                let v2 = -generateBiophysicalECG(t_offset, targetPathology) + commonModeNoise; // 镜像差模输入
                let v_out = (v2 - v1) * -0.5 * opAmpGain; // 运算放大器减法核：(V2 - V1) 噪声在此处完全相减抵消
                ctxBottom.lineTo(x, h / 2 - v_out);
            } else {
                ctxBottom.lineTo(x, h / 2); // 运放不开启则输出恒定低电势
            }
        }
    }
    ctxTop.stroke();
    ctxBottom.stroke();

    time += 0.0035; // 轴向时间步长移动
    requestAnimationFrame(runSimulation);
}

// 引擎启动
runSimulation();
