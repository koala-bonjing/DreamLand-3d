export interface MenuOptions {
  currentSeedName: string;
  currentSkin: string;
  currentFpsCap?: number;
  onSeedChange: (newSeedName: string) => void;
  onSkinChange: (skinId: string) => void;
  onFpsCapChange?: (fps: number) => void;
}

export const SKINS = [
  { id: 'dove', name: 'White Dove', icon: '🕊️' },
  { id: 'flamingo', name: 'Pink Flamingo', icon: '🦩' },
  { id: 'finch', name: 'Lilac Finch', icon: '🐦' },
  { id: 'butterfly', name: 'Sky Butterfly', icon: '🦋' }
];

export class GameMenu {
  private overlay: HTMLElement;
  private isOpen = false;

  public onToggle?: (open: boolean) => void;

  constructor(container: HTMLElement, options: MenuOptions) {
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.background = 'rgba(255, 220, 235, 0.75)';
    this.overlay.style.backdropFilter = 'blur(8px)';
    this.overlay.style.display = 'none';
    this.overlay.style.alignItems = 'center';
    this.overlay.style.justifyContent = 'center';
    this.overlay.style.zIndex = '40';
    this.overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const modal = document.createElement('div');
    modal.style.background = 'rgba(255, 255, 255, 0.95)';
    modal.style.padding = '24px';
    modal.style.borderRadius = '20px';
    modal.style.maxWidth = '360px';
    modal.style.width = '90%';
    modal.style.boxShadow = '0 10px 30px rgba(255, 77, 148, 0.25)';
    modal.style.textAlign = 'center';

    modal.innerHTML = `
      <h2 style="color:#ff3d97; margin-bottom:14px; font-size:22px;">Dreamland 3D 🌸</h2>
      
      <div style="margin-bottom:14px; text-align:left;">
        <label style="font-size:12px; font-weight:bold; color:#7a5062; text-transform:uppercase;">Character Skin</label>
        <div id="skin-picker" style="display:flex; gap:8px; margin-top:6px;"></div>
      </div>

      <div style="margin-bottom:14px; text-align:left;">
        <label style="font-size:12px; font-weight:bold; color:#7a5062; text-transform:uppercase;">Performance Mode</label>
        <div style="display:flex; gap:8px; margin-top:6px;">
          <button id="btn-fps-30" style="flex:1; padding:8px; border-radius:10px; border:2px solid #ff3d97; background:#ffe6f2; font-weight:bold; font-size:13px; cursor:pointer;">🔋 30 FPS</button>
          <button id="btn-fps-60" style="flex:1; padding:8px; border-radius:10px; border:1px solid #ecccdb; background:white; font-weight:bold; font-size:13px; cursor:pointer;">⚡ 60 FPS</button>
        </div>
      </div>

      <div style="margin-bottom:16px; text-align:left;">
        <label style="font-size:12px; font-weight:bold; color:#7a5062; text-transform:uppercase;">World Seed</label>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <input id="input-seed" type="text" value="${options.currentSeedName}" style="flex:1; padding:10px 12px; border-radius:10px; border:1px solid #ecccdb; font-size:14px;" />
          <button id="btn-rand-seed" style="padding:10px 14px; border-radius:10px; border:none; background:#ffe4ef; font-size:16px; cursor:pointer;">🎲</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button id="btn-share-link" style="padding:12px; border-radius:12px; border:none; background:#ff4d94; color:white; font-weight:bold; font-size:15px; cursor:pointer;">🔗 Copy World Share Link</button>
        <button id="btn-close-menu" style="padding:10px; border-radius:12px; border:1px solid #d9b8c7; background:white; color:#555; font-weight:bold; font-size:14px; cursor:pointer;">Resume Flight</button>
      </div>
    `;

    this.overlay.appendChild(modal);
    container.appendChild(this.overlay);

    // Setup skin picker buttons
    const skinContainer = modal.querySelector('#skin-picker') as HTMLElement;
    SKINS.forEach((skin) => {
      const btn = document.createElement('button');
      btn.textContent = `${skin.icon}`;
      btn.title = skin.name;
      btn.style.flex = '1';
      btn.style.padding = '10px';
      btn.style.borderRadius = '12px';
      btn.style.border = skin.id === options.currentSkin ? '2px solid #ff3d97' : '1px solid #ecccdb';
      btn.style.background = skin.id === options.currentSkin ? '#ffe6f2' : 'white';
      btn.style.fontSize = '22px';
      btn.style.cursor = 'pointer';

      btn.addEventListener('click', () => {
        options.onSkinChange(skin.id);
        Array.from(skinContainer.children).forEach((c) => {
          (c as HTMLElement).style.border = '1px solid #ecccdb';
          (c as HTMLElement).style.background = 'white';
        });
        btn.style.border = '2px solid #ff3d97';
        btn.style.background = '#ffe6f2';
      });

      skinContainer.appendChild(btn);
    });

    const btnFps30 = modal.querySelector('#btn-fps-30') as HTMLButtonElement;
    const btnFps60 = modal.querySelector('#btn-fps-60') as HTMLButtonElement;

    btnFps30.addEventListener('click', () => {
      options.onFpsCapChange?.(30);
      btnFps30.style.border = '2px solid #ff3d97';
      btnFps30.style.background = '#ffe6f2';
      btnFps60.style.border = '1px solid #ecccdb';
      btnFps60.style.background = 'white';
    });

    btnFps60.addEventListener('click', () => {
      options.onFpsCapChange?.(0); // 0 = uncapped 60+
      btnFps60.style.border = '2px solid #ff3d97';
      btnFps60.style.background = '#ffe6f2';
      btnFps30.style.border = '1px solid #ecccdb';
      btnFps30.style.background = 'white';
    });

    const seedInput = modal.querySelector('#input-seed') as HTMLInputElement;
    const btnRand = modal.querySelector('#btn-rand-seed') as HTMLButtonElement;
    const btnShare = modal.querySelector('#btn-share-link') as HTMLButtonElement;
    const btnClose = modal.querySelector('#btn-close-menu') as HTMLButtonElement;

    btnRand.addEventListener('click', () => {
      const adjectives = ['pink', 'sweet', 'cozy', 'pastel', 'dreamy', 'starry', 'cloud'];
      const nouns = ['valley', 'meadow', 'island', 'haven', 'grove', 'garden', 'breeze'];
      const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const newSeed = `${randAdj}-${randNoun}-${Math.floor(Math.random() * 999)}`;
      seedInput.value = newSeed;
      options.onSeedChange(newSeed);
    });

    seedInput.addEventListener('change', () => {
      if (seedInput.value.trim()) {
        options.onSeedChange(seedInput.value.trim());
      }
    });

    btnShare.addEventListener('click', async () => {
      const url = `${window.location.origin}${window.location.pathname}#seed=${encodeURIComponent(seedInput.value.trim())}`;
      try {
        await navigator.clipboard.writeText(url);
        btnShare.textContent = '✓ Link Copied!';
        setTimeout(() => {
          btnShare.textContent = '🔗 Copy World Share Link';
        }, 2000);
      } catch {
        btnShare.textContent = 'Manual copy needed';
      }
    });

    btnClose.addEventListener('click', () => this.toggle(false));
  }

  public toggle(open?: boolean): void {
    this.isOpen = open !== undefined ? open : !this.isOpen;
    this.overlay.style.display = this.isOpen ? 'flex' : 'none';
    this.onToggle?.(this.isOpen);
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public dispose(): void {
    this.overlay.remove();
  }
}
