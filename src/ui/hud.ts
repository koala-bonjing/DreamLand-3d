export interface HudOptions {
  onPhotoClick: () => void;
  onMenuClick: () => void;
}

export class GameHud {
  private container: HTMLElement;
  private heartBadge: HTMLElement;
  private compassBadge: HTMLElement;
  private toastElement: HTMLElement;
  private photoBtn: HTMLElement;
  private menuBtn: HTMLElement;

  constructor(parent: HTMLElement, options: HudOptions) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '12px';
    this.container.style.left = '12px';
    this.container.style.right = '12px';
    this.container.style.display = 'flex';
    this.container.style.justifyContent = 'space-between';
    this.container.style.alignItems = 'center';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '25';
    this.container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Left cluster: Hearts + Compass
    const leftCluster = document.createElement('div');
    leftCluster.style.display = 'flex';
    leftCluster.style.gap = '8px';

    this.heartBadge = document.createElement('div');
    this.heartBadge.style.background = 'rgba(255, 255, 255, 0.88)';
    this.heartBadge.style.padding = '8px 14px';
    this.heartBadge.style.borderRadius = '18px';
    this.heartBadge.style.fontWeight = 'bold';
    this.heartBadge.style.fontSize = '14px';
    this.heartBadge.style.color = '#ff1a75';
    this.heartBadge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    this.heartBadge.textContent = '💖 0';
    leftCluster.appendChild(this.heartBadge);

    this.compassBadge = document.createElement('div');
    this.compassBadge.style.background = 'rgba(255, 255, 255, 0.88)';
    this.compassBadge.style.padding = '8px 12px';
    this.compassBadge.style.borderRadius = '18px';
    this.compassBadge.style.fontWeight = 'bold';
    this.compassBadge.style.fontSize = '14px';
    this.compassBadge.style.color = '#555';
    this.compassBadge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    this.compassBadge.textContent = '🧭 N';
    leftCluster.appendChild(this.compassBadge);

    this.container.appendChild(leftCluster);

    // Right cluster: Photo + Menu buttons
    const rightCluster = document.createElement('div');
    rightCluster.style.display = 'flex';
    rightCluster.style.gap = '8px';
    rightCluster.style.pointerEvents = 'auto';

    this.photoBtn = document.createElement('button');
    this.photoBtn.textContent = '📷';
    this.photoBtn.style.width = '42px';
    this.photoBtn.style.height = '42px';
    this.photoBtn.style.borderRadius = '50%';
    this.photoBtn.style.border = 'none';
    this.photoBtn.style.background = 'rgba(255, 255, 255, 0.9)';
    this.photoBtn.style.fontSize = '18px';
    this.photoBtn.style.cursor = 'pointer';
    this.photoBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    this.photoBtn.addEventListener('click', options.onPhotoClick);
    rightCluster.appendChild(this.photoBtn);

    this.menuBtn = document.createElement('button');
    this.menuBtn.textContent = '⚙️';
    this.menuBtn.style.width = '42px';
    this.menuBtn.style.height = '42px';
    this.menuBtn.style.borderRadius = '50%';
    this.menuBtn.style.border = 'none';
    this.menuBtn.style.background = 'rgba(255, 255, 255, 0.9)';
    this.menuBtn.style.fontSize = '18px';
    this.menuBtn.style.cursor = 'pointer';
    this.menuBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    this.menuBtn.addEventListener('click', options.onMenuClick);
    rightCluster.appendChild(this.menuBtn);

    this.container.appendChild(rightCluster);

    // Toast notification
    this.toastElement = document.createElement('div');
    this.toastElement.style.position = 'absolute';
    this.toastElement.style.top = '70px';
    this.toastElement.style.left = '50%';
    this.toastElement.style.transform = 'translateX(-50%)';
    this.toastElement.style.background = 'rgba(255, 77, 148, 0.95)';
    this.toastElement.style.color = 'white';
    this.toastElement.style.padding = '10px 20px';
    this.toastElement.style.borderRadius = '20px';
    this.toastElement.style.fontWeight = 'bold';
    this.toastElement.style.fontSize = '15px';
    this.toastElement.style.boxShadow = '0 6px 16px rgba(255, 77, 148, 0.4)';
    this.toastElement.style.display = 'none';
    this.toastElement.style.transition = 'opacity 0.3s';
    parent.appendChild(this.toastElement);

    parent.appendChild(this.container);
  }

  public setHearts(count: number): void {
    this.heartBadge.textContent = `💖 ${count}`;
  }

  public setCompass(yawRadians: number): void {
    const deg = (((-yawRadians * 180) / Math.PI % 360) + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    this.compassBadge.textContent = `🧭 ${directions[idx]}`;
  }

  public showToast(message: string): void {
    this.toastElement.textContent = message;
    this.toastElement.style.display = 'block';
    setTimeout(() => {
      this.toastElement.style.display = 'none';
    }, 3200);
  }

  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'flex' : 'none';
  }

  public dispose(): void {
    this.container.remove();
    this.toastElement.remove();
  }
}
