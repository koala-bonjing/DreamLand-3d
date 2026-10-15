export class PhotoMode {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private uiContainer: HTMLElement;
  private snapButton: HTMLElement;
  private exitButton: HTMLElement;
  private isActive = false;

  public onToggle?: (active: boolean) => void;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;

    this.uiContainer = document.createElement('div');
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.bottom = '30px';
    this.uiContainer.style.left = '50%';
    this.uiContainer.style.transform = 'translateX(-50%)';
    this.uiContainer.style.display = 'none';
    this.uiContainer.style.gap = '16px';
    this.uiContainer.style.zIndex = '30';

    this.snapButton = document.createElement('button');
    this.snapButton.textContent = '📸 Snap Photo';
    this.snapButton.style.padding = '12px 24px';
    this.snapButton.style.borderRadius = '24px';
    this.snapButton.style.border = 'none';
    this.snapButton.style.background = '#ff4d94';
    this.snapButton.style.color = 'white';
    this.snapButton.style.fontWeight = 'bold';
    this.snapButton.style.fontSize = '16px';
    this.snapButton.style.cursor = 'pointer';
    this.snapButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';

    this.exitButton = document.createElement('button');
    this.exitButton.textContent = '✕ Exit';
    this.exitButton.style.padding = '12px 18px';
    this.exitButton.style.borderRadius = '24px';
    this.exitButton.style.border = 'none';
    this.exitButton.style.background = 'rgba(255, 255, 255, 0.85)';
    this.exitButton.style.color = '#333';
    this.exitButton.style.fontWeight = 'bold';
    this.exitButton.style.cursor = 'pointer';

    this.snapButton.addEventListener('click', () => this.capture());
    this.exitButton.addEventListener('click', () => this.toggle(false));

    this.uiContainer.appendChild(this.snapButton);
    this.uiContainer.appendChild(this.exitButton);
    this.container.appendChild(this.uiContainer);
  }

  public toggle(active?: boolean): void {
    this.isActive = active !== undefined ? active : !this.isActive;
    this.uiContainer.style.display = this.isActive ? 'flex' : 'none';
    this.onToggle?.(this.isActive);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public capture(): void {
    try {
      this.canvas.toBlob((blob) => {
        if (!blob) return;

        const file = new File([blob], `dreamland-${Date.now()}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            title: 'Dreamland 3D Photo',
            text: 'Flying over Dreamland 3D 💖',
            files: [file]
          }).catch(() => {});
        } else {
          // Download fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dreamland-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) {
      console.warn('Photo capture error:', e);
    }
  }

  public dispose(): void {
    this.uiContainer.remove();
  }
}
