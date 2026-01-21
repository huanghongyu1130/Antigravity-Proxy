/**
 * 現代化互動效果工具集
 * 提供按鈕波紋、數字計數動畫、3D 傾斜等效果
 */

/**
 * 按鈕波紋效果
 * 點擊按鈕時創建水波紋擴散動畫
 */
export function initRippleEffect() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;

        // 創建波紋元素
        const ripple = document.createElement('span');
        ripple.className = 'ripple';

        // 計算波紋位置
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        btn.appendChild(ripple);

        // 動畫結束後移除
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    });
}

/**
 * 數字計數動畫
 * @param {HTMLElement} element - 目標元素
 * @param {number} target - 目標數字
 * @param {number} duration - 動畫持續時間 (ms)
 * @param {string} suffix - 數字後綴 (如 '%', 'ms')
 */
export function animateCountUp(element, target, duration = 1000, suffix = '') {
    if (!element || typeof target !== 'number') return;

    const start = 0;
    const startTime = performance.now();
    const isFloat = !Number.isInteger(target);

    element.classList.add('counting');

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 easeOutExpo 緩動函數
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = start + (target - start) * easeProgress;

        // 格式化數字
        if (isFloat) {
            element.textContent = current.toFixed(2) + suffix;
        } else {
            element.textContent = Math.floor(current).toLocaleString('zh-CN') + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.classList.remove('counting');
            // 確保最終值精確
            if (isFloat) {
                element.textContent = target.toFixed(2) + suffix;
            } else {
                element.textContent = target.toLocaleString('zh-CN') + suffix;
            }
        }
    }

    requestAnimationFrame(update);
}

/**
 * 3D 卡片傾斜效果
 * @param {HTMLElement} card - 卡片元素
 */
export function init3DTiltEffect(card) {
    if (!card) return;

    const maxTilt = 5; // 最大傾斜角度

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        card.style.transition = 'transform 0.5s ease';
    });

    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.1s ease';
    });
}

/**
 * 初始化所有統計卡片的 3D 效果
 */
export function initStatsCards3D() {
    const cards = document.querySelectorAll('.stats-grid .card');
    cards.forEach(card => init3DTiltEffect(card));
}

/**
 * 交錯進場動畫
 * @param {string} selector - 元素選擇器
 * @param {number} stagger - 延遲間隔 (ms)
 */
export function staggerFadeIn(selector, stagger = 100) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';

        setTimeout(() => {
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * stagger);
    });
}

/**
 * 打字機效果
 * @param {HTMLElement} element - 目標元素
 * @param {string} text - 要顯示的文字
 * @param {number} speed - 打字速度 (ms per char)
 */
export function typeWriter(element, text, speed = 50) {
    if (!element) return;

    let index = 0;
    element.textContent = '';

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }

    type();
}

/**
 * 磁性按鈕效果
 * 滑鼠靠近時按鈕微微靠近滑鼠
 * @param {HTMLElement} btn - 按鈕元素
 */
export function initMagneticButton(btn) {
    if (!btn) return;

    const strength = 0.3;

    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
        btn.style.transition = 'transform 0.3s ease';
    });

    btn.addEventListener('mouseenter', () => {
        btn.style.transition = 'transform 0.1s ease';
    });
}

/**
 * 初始化粒子系統 (Canvas) - 3D Galaxy Starfield
 */
export function initParticleSystem() {
    console.log('INIT PARTICLE SYSTEM START');
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const ctx = canvas.getContext('2d');
    let width, height;

    // Star properties
    const starCount = 400;
    const stars = [];
    let mouse = { x: 0, y: 0 };
    let targetRotationX = 0;
    let targetRotationY = 0;
    let rotationX = 0;
    let rotationY = 0;

    // Configuration
    const fov = 300; // Field of view
    const starBaseSize = 1.5;

    // Resize handling
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse tracking for rotation
    document.addEventListener('mousemove', (e) => {
        // Normalize mouse -1 to 1
        const nx = (e.clientX / width) * 2 - 1;
        const ny = (e.clientY / height) * 2 - 1;

        targetRotationY = nx * 0.5; // Rotate around Y axis based on X position
        targetRotationX = -ny * 0.5; // Rotate around X axis based on Y position
    });

    // Star Class
    class Star {
        constructor() {
            this.reset();
        }

        reset() {
            // Random position in a sphere/cloud
            this.x = (Math.random() - 0.5) * width * 2;
            this.y = (Math.random() - 0.5) * height * 2;
            this.z = (Math.random() - 0.5) * width * 2;

            // Random colors (Cyan, Purple, White)
            const roll = Math.random();
            if (roll < 0.6) this.color = `rgba(0, 243, 255, ${Math.random() * 0.8 + 0.2})`; // Cyan
            else if (roll < 0.9) this.color = `rgba(112, 0, 255, ${Math.random() * 0.8 + 0.2})`; // Purple
            else this.color = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`; // White

            this.baseSize = Math.random() * starBaseSize;
        }

        draw() {
            // Apply Rotation
            // Rotate around Y
            let x1 = this.x * Math.cos(rotationY) - this.z * Math.sin(rotationY);
            let z1 = this.z * Math.cos(rotationY) + this.x * Math.sin(rotationY);

            // Rotate around X
            let y1 = this.y * Math.cos(rotationX) - z1 * Math.sin(rotationX);
            let z2 = z1 * Math.cos(rotationX) + this.y * Math.sin(rotationX);

            // Perspective Projection
            let scale = fov / (fov + z2);

            // Skip if behind camera or too far
            if (scale < 0 || z2 < -fov) return;

            let x2d = x1 * scale + width / 2;
            let y2d = y1 * scale + height / 2;
            let size = this.baseSize * scale;

            // Draw Glow
            ctx.beginPath();
            ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Draw line to nearby stars (Constellations) - only for close stars
            // Optimization: Only check a subset or nearby indices to avoid O(N^2)
            // But for 400 stars, N^2 is 160,000 checks, okay for modern JS engine
        }
    }

    // Initialize stars
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }

    function animate() {
        // Smooth rotation easing
        rotationX += (targetRotationX - rotationX) * 0.05;
        rotationY += (targetRotationY - rotationY) * 0.05;

        // Clear with fade trail effect
        ctx.fillStyle = 'rgba(5, 5, 16, 0.4)'; // Semitransparent black for trails
        ctx.fillRect(0, 0, width, height);

        // Use additive blending for glowing nebula effect
        ctx.globalCompositeOperation = 'lighter';

        stars.forEach(star => star.draw());

        // Reset composite
        ctx.globalCompositeOperation = 'source-over';

        requestAnimationFrame(animate);
    }
    animate();
}

/**
 * 系統啟動動畫
 */
export function initSystemBoot() {
    const app = document.getElementById('app');
    if (!app) return;

    app.style.opacity = '0';
    app.style.transform = 'scale(0.95)';
    app.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)'; // Ease out expo

    setTimeout(() => {
        app.style.opacity = '1';
        app.style.transform = 'scale(1)';
    }, 500);
}

/**
 * 初始化自定義鼠標
 */
export function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('cursor-follower');

    if (!cursor || !follower) return;

    let posX = 0, posY = 0;
    let mouseX = 0, mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Cursor matches mouse exactly
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;

        // Add hovering class to body if hovering interactables
        const target = e.target;
        if (target.matches('a, button, .card, input, .tab')) {
            document.body.classList.add('hovering');
        } else {
            document.body.classList.remove('hovering');
        }
    });

    // Smooth follower animation loop
    function animate() {
        posX += (mouseX - posX) * 0.1; // Smooth factor
        posY += (mouseY - posY) * 0.1;

        follower.style.left = `${posX}px`;
        follower.style.top = `${posY}px`;

        requestAnimationFrame(animate);
    }
    animate();
}

/* Legacy background and spotlight effects removed. Canvas system is now the primary background. */

/**
 * 初始化所有互動效果
 */
export function initAllEffects() {
    initCustomCursor();
    initParticleSystem();
    initSystemBoot();
}

export default {
    initRippleEffect,
    animateCountUp,
    init3DTiltEffect,
    initStatsCards3D,
    initSystemBoot,
    initCustomCursor,
    initParticleSystem,
    initAllEffects
};
