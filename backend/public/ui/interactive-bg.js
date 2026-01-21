/**
 * Neo-Tokyo 交互式背景特效
 * 赛博朋克风格的粒子网格，青色/粉色配色
 */
export class InteractiveBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.target = { x: this.width / 2, y: this.height / 2 };
        this.mouseDown = false;
        this.animate = this.animate.bind(this);

        // Neo-Tokyo color scheme
        this.config = {
            pointCount: 80,
            connectionDistance: 140,
            mouseDistance: 250,
            colors: {
                cyan: { r: 0, g: 240, b: 255 },
                pink: { r: 255, g: 45, b: 106 }
            }
        };

        this.init();
    }

    init() {
        this.canvas.id = 'interactive-bg';
        this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
      background: #0a0a0b;
    `;
        document.body.appendChild(this.canvas);

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.mouseMove(e));
        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);

        this.resize();
        this.createPoints();
        requestAnimationFrame(this.animate);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    mouseMove(e) {
        this.target.x = e.clientX;
        this.target.y = e.clientY;
    }

    createPoints() {
        this.points = [];
        for (let i = 0; i < this.config.pointCount; i++) {
            const useAccent = Math.random() > 0.7;
            const color = useAccent ? this.config.colors.pink : this.config.colors.cyan;

            this.points.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 2.5 + 1,
                color: color,
                baseAlpha: 0.4 + Math.random() * 0.4,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }

    animate(time) {
        // Subtle dark gradient background
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, 0, 0,
            this.width / 2, 0, this.height
        );
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.03)');
        gradient.addColorStop(1, '#0a0a0b');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Update and draw points
        this.points.forEach((point, i) => {
            // Movement
            point.x += point.vx;
            point.y += point.vy;

            // Boundary wrap
            if (point.x < -20) point.x = this.width + 20;
            if (point.x > this.width + 20) point.x = -20;
            if (point.y < -20) point.y = this.height + 20;
            if (point.y > this.height + 20) point.y = -20;

            // Mouse interaction
            const dx = this.target.x - point.x;
            const dy = this.target.y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.config.mouseDistance) {
                const angle = Math.atan2(dy, dx);
                const force = (this.config.mouseDistance - distance) / this.config.mouseDistance;

                // Attract on click, repel otherwise
                const direction = this.mouseDown ? 1 : -1;
                point.x += Math.cos(angle) * force * 3 * direction;
                point.y += Math.sin(angle) * force * 3 * direction;
            }

            // Pulsing alpha
            const pulse = Math.sin(time * 0.002 + point.pulseOffset) * 0.2 + 0.8;
            const alpha = point.baseAlpha * pulse;

            // Draw glow
            const glowGradient = this.ctx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, point.size * 6
            );
            glowGradient.addColorStop(0, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, ${alpha * 0.3})`);
            glowGradient.addColorStop(1, 'transparent');

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.size * 6, 0, Math.PI * 2);
            this.ctx.fillStyle = glowGradient;
            this.ctx.fill();

            // Draw core
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, ${alpha})`;
            this.ctx.fill();
        });

        // Draw connections
        this.ctx.lineWidth = 0.8;
        for (let i = 0; i < this.points.length; i++) {
            for (let j = i + 1; j < this.points.length; j++) {
                const p1 = this.points[i];
                const p2 = this.points[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.connectionDistance) {
                    const alpha = (1 - distance / this.config.connectionDistance) * 0.3;

                    // Gradient line between two colors
                    const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                    gradient.addColorStop(0, `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${alpha})`);
                    gradient.addColorStop(1, `rgba(${p2.color.r}, ${p2.color.g}, ${p2.color.b}, ${alpha})`);

                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = gradient;
                    this.ctx.stroke();
                }
            }
        }

        // Scanline overlay effect (subtle)
        this.drawScanlines();

        requestAnimationFrame(this.animate);
    }

    drawScanlines() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        for (let y = 0; y < this.height; y += 4) {
            this.ctx.fillRect(0, y, this.width, 2);
        }
    }
}
