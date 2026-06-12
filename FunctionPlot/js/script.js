(function() {
            // ---------- DOM 元素 ----------
            const canvas = document.getElementById('graphCanvas');
            const ctx = canvas.getContext('2d');
            const container = document.getElementById('canvasContainer');
            const coordsDisplay = document.getElementById('coordsDisplay');

            // 模式切换
            const modeOptions = document.querySelectorAll('.mode-option');
            const inputExplicit = document.getElementById('input-explicit');
            const inputParametric = document.getElementById('input-parametric');
            const inputImplicit = document.getElementById('input-implicit');
            const exprExplicit = document.getElementById('exprExplicit');
            const exprX = document.getElementById('exprX');
            const exprY = document.getElementById('exprY');
            const tMinInput = document.getElementById('tMin');
            const tMaxInput = document.getElementById('tMax');
            const exprImplicit = document.getElementById('exprImplicit');

            // 颜色线宽
            const lineColorInput = document.getElementById('lineColor');
            const lineWidthInput = document.getElementById('lineWidth');
            const lineWidthVal = document.getElementById('lineWidthVal');

            // 视窗范围
            const xMinInput = document.getElementById('xMin');
            const xMaxInput = document.getElementById('xMax');
            const yMinInput = document.getElementById('yMin');
            const yMaxInput = document.getElementById('yMax');

            // 选项
            const showGridCheck = document.getElementById('showGrid');
            const showAxesCheck = document.getElementById('showAxes');

            // 按钮
            const resetViewBtn = document.getElementById('resetView');
            const exportBtn = document.getElementById('exportBtn');
            const errorMsg = document.getElementById('errorMsg');

            // ---------- 状态 ----------
            let mode = 'explicit'; // 'explicit' | 'parametric' | 'implicit'
            let view = {
                xMin: -10,
                xMax: 10,
                yMin: -6,
                yMax: 6
            };

            // 交互状态
            let mouseX = 0,
                mouseY = 0;
            let isDragging = false;
            let dragStartX = 0,
                dragStartY = 0;
            let dragStartView = null;

            // 跟踪点状态
            let trackPoint = null; // { wx, wy, screenX, screenY }

            // 防抖定时器
            let redrawTimer = null;

            // ---------- 辅助函数：坐标转换 ----------
            function getCanvasSize() {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                return {
                    width: rect.width,
                    height: rect.height,
                    dpr: dpr,
                    logicalWidth: rect.width,
                    logicalHeight: rect.height
                };
            }

            function resizeCanvas() {
                const { width, height, dpr } = getCanvasSize();
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }

            function worldToScreen(wx, wy) {
                const { logicalWidth, logicalHeight } = getCanvasSize();
                const sx = (wx - view.xMin) / (view.xMax - view.xMin) * logicalWidth;
                const sy = logicalHeight - (wy - view.yMin) / (view.yMax - view.yMin) * logicalHeight;
                return { x: sx, y: sy };
            }

            function screenToWorld(sx, sy) {
                const { logicalWidth, logicalHeight } = getCanvasSize();
                const wx = view.xMin + (sx / logicalWidth) * (view.xMax - view.xMin);
                const wy = view.yMin + (logicalHeight - sy) / logicalHeight * (view.yMax - view.yMin);
                return { x: wx, y: wy };
            }

            // ---------- 更新视窗输入框 ----------
            function updateViewInputs() {
                xMinInput.value = +view.xMin.toFixed(6);
                xMaxInput.value = +view.xMax.toFixed(6);
                yMinInput.value = +view.yMin.toFixed(6);
                yMaxInput.value = +view.yMax.toFixed(6);
            }

            // ---------- 编译表达式 ----------
            function compileExpression(exprStr, vars = ['x']) {
                try {
                    const node = math.parse(exprStr);
                    const code = node.compile();
                    return {
                        node,
                        evaluate: (scope) => code.evaluate(scope),
                        error: null
                    };
                } catch (e) {
                    return { node: null, evaluate: null, error: e.message };
                }
            }

            // ---------- 查找最近曲线点 ----------
            function findClosestPoint(worldX, worldY) {
                const threshold = 20; // 像素阈值
                const { logicalWidth, logicalHeight } = getCanvasSize();
                const mouseScreen = worldToScreen(worldX, worldY);

                if (mode === 'explicit') {
                    const exprStr = exprExplicit.value.trim();
                    if (!exprStr) return null;
                    const compiled = compileExpression(exprStr, ['x']);
                    if (compiled.error) return null;

                    try {
                        const wy = compiled.evaluate({ x: worldX });
                        if (typeof wy === 'number' && isFinite(wy)) {
                            const curveScreen = worldToScreen(worldX, wy);
                            const dist = Math.abs(curveScreen.y - mouseScreen.y);
                            if (dist < threshold) {
                                return { wx: worldX, wy: wy, screenX: curveScreen.x, screenY: curveScreen.y };
                            }
                        }
                    } catch (e) {}
                    return null;
                }
                else if (mode === 'parametric') {
                    const xStr = exprX.value.trim();
                    const yStr = exprY.value.trim();
                    if (!xStr || !yStr) return null;
                    const compX = compileExpression(xStr, ['t']);
                    const compY = compileExpression(yStr, ['t']);
                    if (compX.error || compY.error) return null;

                    const tMin = parseFloat(tMinInput.value);
                    const tMax = parseFloat(tMaxInput.value);
                    if (isNaN(tMin) || isNaN(tMax) || tMin >= tMax) return null;

                    // 采样寻找最近点（步数足够）
                    const steps = Math.max(2000, Math.ceil((tMax - tMin) * 500));
                    const dt = (tMax - tMin) / steps;
                    let bestDist = Infinity;
                    let best = null;

                    for (let i = 0; i <= steps; i++) {
                        const t = tMin + i * dt;
                        try {
                            const wx = compX.evaluate({ t });
                            const wy = compY.evaluate({ t });
                            if (typeof wx !== 'number' || !isFinite(wx) || typeof wy !== 'number' || !isFinite(wy)) continue;
                            const screen = worldToScreen(wx, wy);
                            const dist = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
                            if (dist < bestDist) {
                                bestDist = dist;
                                best = { wx, wy, screenX: screen.x, screenY: screen.y };
                            }
                        } catch (e) {}
                    }
                    if (best && bestDist < threshold) return best;
                    return null;
                }
                // 隐函数模式暂不追踪
                return null;
            }

            // ---------- 绘制追踪点、虚线和标注 ----------
            function drawTrackPoint() {
                if (!trackPoint || !showAxesCheck.checked) return;
                const { logicalWidth, logicalHeight } = getCanvasSize();
                const origin = worldToScreen(0, 0);
                const xAxisY = Math.max(0, Math.min(logicalHeight, origin.y));
                const yAxisX = Math.max(0, Math.min(logicalWidth, origin.x));

                const { screenX, screenY, wx, wy } = trackPoint;

                ctx.save();
                // 红色虚线到坐标轴
                ctx.strokeStyle = '#d32f2f';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                // 到 X 轴
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX, xAxisY);
                // 到 Y 轴
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(yAxisX, screenY);
                ctx.stroke();

                // 实心圆点
                ctx.setLineDash([]);
                ctx.fillStyle = '#d32f2f';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 轴旁标注
                ctx.fillStyle = '#d32f2f';
                ctx.font = 'bold 12px "Segoe UI", sans-serif';
                // X 轴标注（在虚线下方）
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(wx.toFixed(4), screenX, xAxisY + 6);
                // Y 轴标注（在虚线左侧）
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(wy.toFixed(4), yAxisX - 8, screenY);

                ctx.restore();
            }

            // ---------- 绘制网格 ----------
            function drawGrid() {
                const { logicalWidth, logicalHeight } = getCanvasSize();
                if (!showGridCheck.checked) return;

                const xRange = view.xMax - view.xMin;
                const yRange = view.yMax - view.yMin;
                const roughStepX = xRange / 10;
                const roughStepY = yRange / 10;

                function niceStep(range) {
                    const exp = Math.floor(Math.log10(range));
                    const frac = range / Math.pow(10, exp);
                    let step;
                    if (frac <= 1.5) step = 0.2;
                    else if (frac <= 3) step = 0.5;
                    else if (frac <= 7) step = 1;
                    else step = 2;
                    return step * Math.pow(10, exp);
                }
                const stepX = niceStep(xRange);
                const stepY = niceStep(yRange);

                ctx.save();
                ctx.strokeStyle = '#e8e8e8';
                ctx.lineWidth = 0.5;

                const startX = Math.floor(view.xMin / stepX) * stepX;
                for (let wx = startX; wx <= view.xMax; wx += stepX) {
                    if (Math.abs(wx) < stepX * 0.001) continue;
                    const sx = worldToScreen(wx, 0).x;
                    ctx.beginPath();
                    ctx.moveTo(sx, 0);
                    ctx.lineTo(sx, logicalHeight);
                    ctx.stroke();
                }
                const startY = Math.floor(view.yMin / stepY) * stepY;
                for (let wy = startY; wy <= view.yMax; wy += stepY) {
                    if (Math.abs(wy) < stepY * 0.001) continue;
                    const sy = worldToScreen(0, wy).y;
                    ctx.beginPath();
                    ctx.moveTo(0, sy);
                    ctx.lineTo(logicalWidth, sy);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // ---------- 绘制坐标轴 ----------
            function drawAxes() {
                if (!showAxesCheck.checked) return;
                const { logicalWidth, logicalHeight } = getCanvasSize();
                const origin = worldToScreen(0, 0);
                const xAxisY = Math.max(0, Math.min(logicalHeight, origin.y));
                const yAxisX = Math.max(0, Math.min(logicalWidth, origin.x));

                ctx.save();
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(0, xAxisY);
                ctx.lineTo(logicalWidth, xAxisY);
                ctx.moveTo(yAxisX, 0);
                ctx.lineTo(yAxisX, logicalHeight);
                ctx.stroke();

                ctx.fillStyle = '#444';
                ctx.font = '11px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                const xRange = view.xMax - view.xMin;
                const stepX = (() => {
                    const exp = Math.floor(Math.log10(xRange));
                    const frac = xRange / Math.pow(10, exp);
                    let step = frac <= 1.5 ? 0.2 : frac <= 3 ? 0.5 : frac <= 7 ? 1 : 2;
                    return step * Math.pow(10, exp);
                })();
                const startTickX = Math.ceil(view.xMin / stepX) * stepX;
                for (let wx = startTickX; wx <= view.xMax; wx += stepX) {
                    if (Math.abs(wx) < stepX * 0.001) continue;
                    const sx = worldToScreen(wx, 0).x;
                    ctx.beginPath();
                    ctx.moveTo(sx, xAxisY - 4);
                    ctx.lineTo(sx, xAxisY + 4);
                    ctx.stroke();
                    const label = (Math.abs(wx) < 1e-10 ? 0 : +wx.toFixed(6)).toString();
                    ctx.fillText(label, sx, xAxisY + 6);
                }

                const yRange = view.yMax - view.yMin;
                const stepY = (() => {
                    const exp = Math.floor(Math.log10(yRange));
                    const frac = yRange / Math.pow(10, exp);
                    let step = frac <= 1.5 ? 0.2 : frac <= 3 ? 0.5 : frac <= 7 ? 1 : 2;
                    return step * Math.pow(10, exp);
                })();
                const startTickY = Math.ceil(view.yMin / stepY) * stepY;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                for (let wy = startTickY; wy <= view.yMax; wy += stepY) {
                    if (Math.abs(wy) < stepY * 0.001) continue;
                    const sy = worldToScreen(0, wy).y;
                    ctx.beginPath();
                    ctx.moveTo(yAxisX - 4, sy);
                    ctx.lineTo(yAxisX + 4, sy);
                    ctx.stroke();
                    const label = (Math.abs(wy) < 1e-10 ? 0 : +wy.toFixed(6)).toString();
                    ctx.fillText(label, yAxisX - 6, sy);
                }

                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText('0', yAxisX - 6, xAxisY + 6);
                ctx.restore();
            }

            // ---------- 绘制曲线函数（保持不变，只是之后绘制追踪点） ----------
            function drawExplicit() {
                const exprStr = exprExplicit.value.trim();
                if (!exprStr) return;

                const compiled = compileExpression(exprStr, ['x']);
                if (compiled.error) {
                    errorMsg.textContent = '表达式错误: ' + compiled.error;
                    return;
                }
                errorMsg.textContent = '';

                const { logicalWidth, logicalHeight } = getCanvasSize();
                const step = 1;
                const color = lineColorInput.value;
                const lw = parseFloat(lineWidthInput.value);

                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = lw;
                ctx.lineJoin = 'round';
                ctx.beginPath();

                let prevY = null;
                let prevInView = false;
                let firstPoint = true;

                for (let sx = 0; sx <= logicalWidth; sx += step) {
                    const wx = view.xMin + (sx / logicalWidth) * (view.xMax - view.xMin);
                    let wy;
                    try {
                        wy = compiled.evaluate({ x: wx });
                    } catch (e) {
                        prevY = null;
                        continue;
                    }
                    if (typeof wy !== 'number' || !isFinite(wy)) {
                        prevY = null;
                        continue;
                    }
                    const screenY = worldToScreen(0, wy).y;
                    const inView = wy >= view.yMin && wy <= view.yMax;

                    if (prevY !== null && (inView || prevInView)) {
                        if (firstPoint) {
                            ctx.moveTo(sx - step, worldToScreen(0, prevY).y);
                            firstPoint = false;
                        }
                        ctx.lineTo(sx, screenY);
                    } else {
                        if (!firstPoint) {
                            ctx.stroke();
                            ctx.beginPath();
                            firstPoint = true;
                        }
                    }
                    prevY = wy;
                    prevInView = inView;
                }
                ctx.stroke();
                ctx.restore();
            }

            function drawParametric() {
                const xStr = exprX.value.trim();
                const yStr = exprY.value.trim();
                if (!xStr || !yStr) return;

                const compX = compileExpression(xStr, ['t']);
                const compY = compileExpression(yStr, ['t']);
                if (compX.error) {
                    errorMsg.textContent = 'x(t) 错误: ' + compX.error;
                    return;
                }
                if (compY.error) {
                    errorMsg.textContent = 'y(t) 错误: ' + compY.error;
                    return;
                }
                errorMsg.textContent = '';

                const tMin = parseFloat(tMinInput.value);
                const tMax = parseFloat(tMaxInput.value);
                if (isNaN(tMin) || isNaN(tMax) || tMin >= tMax) {
                    errorMsg.textContent = 't 范围无效';
                    return;
                }

                const { logicalWidth, logicalHeight } = getCanvasSize();
                const steps = Math.max(2000, Math.ceil((tMax - tMin) * 500));
                const dt = (tMax - tMin) / steps;
                const color = lineColorInput.value;
                const lw = parseFloat(lineWidthInput.value);

                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = lw;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                let first = true;

                for (let i = 0; i <= steps; i++) {
                    const t = tMin + i * dt;
                    let wx, wy;
                    try {
                        wx = compX.evaluate({ t });
                        wy = compY.evaluate({ t });
                    } catch (e) {
                        if (!first) { ctx.stroke(); ctx.beginPath(); first = true; }
                        continue;
                    }
                    if (typeof wx !== 'number' || !isFinite(wx) || typeof wy !== 'number' || !isFinite(wy)) {
                        if (!first) { ctx.stroke(); ctx.beginPath(); first = true; }
                        continue;
                    }
                    const screen = worldToScreen(wx, wy);
                    const inView = wx >= view.xMin && wx <= view.xMax && wy >= view.yMin && wy <= view.yMax;
                    if (first && inView) {
                        ctx.moveTo(screen.x, screen.y);
                        first = false;
                    } else if (!first && inView) {
                        ctx.lineTo(screen.x, screen.y);
                    } else if (!first && !inView) {
                        ctx.lineTo(screen.x, screen.y);
                        ctx.stroke();
                        ctx.beginPath();
                        first = true;
                    }
                }
                ctx.stroke();
                ctx.restore();
            }

            function drawImplicit() {
                const exprStr = exprImplicit.value.trim();
                if (!exprStr) return;

                const compiled = compileExpression(exprStr, ['x', 'y']);
                if (compiled.error) {
                    errorMsg.textContent = '隐函数错误: ' + compiled.error;
                    return;
                }
                errorMsg.textContent = '';

                const { logicalWidth, logicalHeight } = getCanvasSize();
                const color = lineColorInput.value;
                const lw = parseFloat(lineWidthInput.value);

                const dx = (view.xMax - view.xMin) / logicalWidth;
                const dy = (view.yMax - view.yMin) / logicalHeight;

                const cols = Math.floor(logicalWidth);
                const rows = Math.floor(logicalHeight);
                const maxCols = 800;
                const maxRows = 600;
                const stepX = Math.max(1, Math.ceil(cols / maxCols));
                const stepY = Math.max(1, Math.ceil(rows / maxRows));
                const sampledCols = Math.floor(cols / stepX);
                const sampledRows = Math.floor(rows / stepY);

                const values = new Array(sampledRows + 1);
                for (let j = 0; j <= sampledRows; j++) {
                    values[j] = new Array(sampledCols + 1);
                    const wy = view.yMin + j * stepY * dy;
                    for (let i = 0; i <= sampledCols; i++) {
                        const wx = view.xMin + i * stepX * dx;
                        try {
                            const val = compiled.evaluate({ x: wx, y: wy });
                            values[j][i] = (typeof val === 'number' && isFinite(val)) ? val : NaN;
                        } catch (e) {
                            values[j][i] = NaN;
                        }
                    }
                }

                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = lw;
                ctx.beginPath();

                const edgeTable = [
                    0, 1, 2, 2, 3, 1, 2, 2,
                    4, 4, 3, 3, 4, 4, 3, 1
                ];
                const edgePairs = [
                    [0, 1], [1, 2], [2, 3], [3, 0]
                ];

                function interpolate(p1, p2, v1, v2) {
                    if (Math.abs(v1 - v2) < 1e-12) return p1;
                    const t = -v1 / (v2 - v1);
                    return {
                        x: p1.x + t * (p2.x - p1.x),
                        y: p1.y + t * (p2.y - p1.y)
                    };
                }

                for (let j = 0; j < sampledRows; j++) {
                    for (let i = 0; i < sampledCols; i++) {
                        const v00 = values[j][i];
                        const v10 = values[j][i + 1];
                        const v11 = values[j + 1][i + 1];
                        const v01 = values[j + 1][i];
                        if ([v00, v10, v11, v01].some(v => isNaN(v))) continue;

                        const idx = (v00 >= 0 ? 1 : 0) |
                            (v10 >= 0 ? 2 : 0) |
                            (v11 >= 0 ? 4 : 0) |
                            (v01 >= 0 ? 8 : 0);
                        if (idx === 0 || idx === 15) continue;

                        const worldX0 = view.xMin + i * stepX * dx;
                        const worldX1 = view.xMin + (i + 1) * stepX * dx;
                        const worldY0 = view.yMin + j * stepY * dy;
                        const worldY1 = view.yMin + (j + 1) * stepY * dy;
                        const corners = [
                            { x: worldX0, y: worldY0 },
                            { x: worldX1, y: worldY0 },
                            { x: worldX1, y: worldY1 },
                            { x: worldX0, y: worldY1 }
                        ];
                        const vals = [v00, v10, v11, v01];

                        const edges = edgeTable[idx];
                        const edgeList = [];
                        if (edges & 1) edgeList.push(0);
                        if (edges & 2) edgeList.push(1);
                        if (edges & 4) edgeList.push(2);
                        if (edges & 8) edgeList.push(3);

                        for (let k = 0; k < edgeList.length; k += 2) {
                            const e1 = edgeList[k];
                            const e2 = edgeList[k + 1];
                            const p1 = interpolate(corners[edgePairs[e1][0]], corners[edgePairs[e1][1]], vals[edgePairs[e1][0]], vals[edgePairs[e1][1]]);
                            const p2 = interpolate(corners[edgePairs[e2][0]], corners[edgePairs[e2][1]], vals[edgePairs[e2][0]], vals[edgePairs[e2][1]]);
                            const s1 = worldToScreen(p1.x, p1.y);
                            const s2 = worldToScreen(p2.x, p2.y);
                            ctx.moveTo(s1.x, s1.y);
                            ctx.lineTo(s2.x, s2.y);
                        }
                    }
                }
                ctx.stroke();
                ctx.restore();
            }

            // ---------- 总绘制调度 ----------
            function draw() {
                resizeCanvas();
                const { logicalWidth, logicalHeight } = getCanvasSize();
                ctx.clearRect(0, 0, logicalWidth, logicalHeight);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, logicalWidth, logicalHeight);

                drawGrid();
                drawAxes();

                // 绘制曲线
                if (mode === 'explicit') {
                    drawExplicit();
                } else if (mode === 'parametric') {
                    drawParametric();
                } else if (mode === 'implicit') {
                    drawImplicit();
                }

                // 绘制追踪点（在曲线之上）
                drawTrackPoint();
            }

            function requestRedraw(immediate = false) {
                if (immediate) {
                    clearTimeout(redrawTimer);
                    draw();
                } else {
                    clearTimeout(redrawTimer);
                    redrawTimer = setTimeout(draw, 120);
                }
            }

            // ---------- 交互：平移与缩放 ----------
            function getCanvasMousePos(e) {
                const rect = canvas.getBoundingClientRect();
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }

            container.addEventListener('mousedown', (e) => {
                if (e.target === canvas || e.target === container) {
                    isDragging = true;
                    const pos = getCanvasMousePos(e);
                    dragStartX = pos.x;
                    dragStartY = pos.y;
                    dragStartView = { ...view };
                    container.classList.add('grabbing');
                    e.preventDefault();
                }
            });

            window.addEventListener('mousemove', (e) => {
                const pos = getCanvasMousePos(e);
                mouseX = pos.x;
                mouseY = pos.y;
                const world = screenToWorld(pos.x, pos.y);
                coordsDisplay.textContent = `x: ${world.x.toFixed(4)} , y: ${world.y.toFixed(4)}`;

                // 计算跟踪点（非拖拽时）
                if (!isDragging) {
                    trackPoint = findClosestPoint(world.x, world.y);
                } else {
                    trackPoint = null;
                }

                if (isDragging) {
                    const dx = pos.x - dragStartX;
                    const dy = pos.y - dragStartY;
                    const { logicalWidth, logicalHeight } = getCanvasSize();
                    const worldDx = (dx / logicalWidth) * (dragStartView.xMax - dragStartView.xMin);
                    const worldDy = (dy / logicalHeight) * (dragStartView.yMax - dragStartView.yMin);

                    view.xMin = dragStartView.xMin - worldDx;
                    view.xMax = dragStartView.xMax - worldDx;
                    view.yMin = dragStartView.yMin + worldDy;
                    view.yMax = dragStartView.yMax + worldDy;
                    updateViewInputs();
                    requestRedraw(true);
                } else {
                    requestRedraw(true);
                }
            });

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    container.classList.remove('grabbing');
                    requestRedraw(true);
                }
            });

            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                const pos = getCanvasMousePos(e);
                const world = screenToWorld(pos.x, pos.y);
                const factor = e.deltaY < 0 ? 0.9 : 1.1;
                const newXMin = world.x - (world.x - view.xMin) * factor;
                const newXMax = world.x + (view.xMax - world.x) * factor;
                const newYMin = world.y - (world.y - view.yMin) * factor;
                const newYMax = world.y + (view.yMax - world.y) * factor;

                if (newXMax - newXMin > 1e-6 && newYMax - newYMin > 1e-6) {
                    view.xMin = newXMin;
                    view.xMax = newXMax;
                    view.yMin = newYMin;
                    view.yMax = newYMax;
                    updateViewInputs();
                    trackPoint = null; // 缩放时清除跟踪点
                    requestRedraw(true);
                }
            }, { passive: false });

            container.addEventListener('mouseleave', () => {
                coordsDisplay.textContent = 'x: — , y: —';
                trackPoint = null;
                requestRedraw(true);
            });

            // ---------- UI 事件绑定 ----------
            modeOptions.forEach(opt => {
                opt.addEventListener('click', () => {
                    modeOptions.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    mode = opt.dataset.mode;
                    inputExplicit.classList.remove('active');
                    inputParametric.classList.remove('active');
                    inputImplicit.classList.remove('active');
                    if (mode === 'explicit') inputExplicit.classList.add('active');
                    else if (mode === 'parametric') inputParametric.classList.add('active');
                    else if (mode === 'implicit') inputImplicit.classList.add('active');
                    errorMsg.textContent = '';
                    trackPoint = null;
                    requestRedraw(true);
                });
            });

            [exprExplicit, exprX, exprY, exprImplicit].forEach(input => {
                input.addEventListener('input', () => {
                    trackPoint = null;
                    requestRedraw();
                });
            });
            tMinInput.addEventListener('input', () => { trackPoint = null; requestRedraw(); });
            tMaxInput.addEventListener('input', () => { trackPoint = null; requestRedraw(); });
            lineColorInput.addEventListener('input', () => requestRedraw(true));
            lineWidthInput.addEventListener('input', () => {
                lineWidthVal.textContent = lineWidthInput.value;
                requestRedraw(true);
            });
            showGridCheck.addEventListener('change', () => requestRedraw(true));
            showAxesCheck.addEventListener('change', () => requestRedraw(true));

            function applyViewFromInputs() {
                const nxMin = parseFloat(xMinInput.value);
                const nxMax = parseFloat(xMaxInput.value);
                const nyMin = parseFloat(yMinInput.value);
                const nyMax = parseFloat(yMaxInput.value);
                if (!isNaN(nxMin) && !isNaN(nxMax) && nxMin < nxMax &&
                    !isNaN(nyMin) && !isNaN(nyMax) && nyMin < nyMax) {
                    view.xMin = nxMin;
                    view.xMax = nxMax;
                    view.yMin = nyMin;
                    view.yMax = nyMax;
                    trackPoint = null;
                    requestRedraw(true);
                }
            }
            [xMinInput, xMaxInput, yMinInput, yMaxInput].forEach(inp => {
                inp.addEventListener('change', applyViewFromInputs);
                inp.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') applyViewFromInputs();
                });
            });

            resetViewBtn.addEventListener('click', () => {
                view = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
                updateViewInputs();
                trackPoint = null;
                requestRedraw(true);
            });

            exportBtn.addEventListener('click', () => {
                const { logicalWidth, logicalHeight, dpr } = getCanvasSize();
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = logicalWidth * dpr;
                exportCanvas.height = logicalHeight * dpr;
                const exportCtx = exportCanvas.getContext('2d');
                exportCtx.scale(dpr, dpr);
                exportCtx.drawImage(canvas, 0, 0);
                exportCanvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'function-graph.png';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            });

            window.addEventListener('resize', () => {
                resizeCanvas();
                requestRedraw(true);
            });

            // ---------- README 弹窗 ----------
            const readmeBtn = document.getElementById('readmeBtn');
            const readmeModal = document.getElementById('readmeModal');
            const closeReadmeBtn = document.getElementById('closeReadmeBtn');
            const readmeContent = document.getElementById('readmeContent');

            // 关闭函数（保证最优先定义）
            function closeReadme() {
                readmeModal.classList.remove('show');
            }

            // 点击关闭按钮
            if (closeReadmeBtn) {
                closeReadmeBtn.addEventListener('click', closeReadme);
            }
            // 点击背景关闭
            readmeModal.addEventListener('click', (e) => {
                if (e.target === readmeModal) closeReadme();
            });

            // 打开弹窗时动态加载 Markdown
            readmeBtn.addEventListener('click', async () => {
                readmeContent.innerHTML = '<p>⏳ 加载中…</p>';
                readmeModal.classList.add('show');

                try {
                    const response = await fetch('./md/readme.md');
                    if (!response.ok) throw new Error('文件未找到');
                    const markdown = await response.text();
                    
                    // 简单内置的 Markdown 转 HTML（防止 marked 未定义时也能工作）
                    if (typeof marked !== 'undefined' && marked.parse) {
                        readmeContent.innerHTML = marked.parse(markdown);
                    } else {
                        // 极简 fallback：保留换行和代码块（避免脚本中断）
                        readmeContent.innerHTML = '<pre>' + markdown.replace(/</g, '&lt;') + '</pre>';
                    }
                } catch (err) {
                    readmeContent.innerHTML = `<p style="color:#c0392b;">❌ 无法加载 readme.md ：${err.message}</p>
                    <p>提示：本地直接打开 HTML 文件时，请使用 Live Server 或本地服务器环境。</p>`;
                }
            });

            // 初始化
            updateViewInputs();
            lineWidthVal.textContent = lineWidthInput.value;
            resizeCanvas();
            draw();
        })();