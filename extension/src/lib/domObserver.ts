// DOM監視とレイアウト調整機能

/**
 * YouTubeプレイヤーを監視し、オーバーレイの位置を調整する
 */
export class DOMObserver {
  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private player: HTMLElement | null = null;
  private onLayoutChange: (rect: DOMRect | null) => void;

  constructor(onLayoutChange: (rect: DOMRect | null) => void) {
    this.onLayoutChange = onLayoutChange;
  }

  /**
   * 監視を開始する
   */
  public start(): void {
    this.setupMutationObserver();
    this.setupResizeObserver();
    this.setupPageNavigationListener();
    
    // 初期位置調整
    this.adjustOverlayPosition();
  }

  /**
   * 監視を停止する
   */
  public stop(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    window.removeEventListener('yt-page-data-updated', this.handlePageUpdate);
    window.removeEventListener('resize', this.handleWindowResize);
  }

  /**
   * MutationObserverを設定する
   */
  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      // 関連するDOM変更のみフィルタリング
      const relevantChanges = mutations.filter(mutation => {
        // プレイヤー関連の変更をチェック
        if (mutation.target instanceof HTMLElement) {
          const target = mutation.target;
          return (
            target.id === 'movie_player' ||
            target.id === 'player' ||
            target.id === 'player-container' ||
            target.classList.contains('html5-video-player')
          );
        }
        return false;
      });

      if (relevantChanges.length > 0) {
        this.adjustOverlayPosition();
      }
    });

    // 監視設定
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  /**
   * ResizeObserverを設定する
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.adjustOverlayPosition();
    });

    this.findAndObservePlayer();
    
    // ウィンドウリサイズ時にも位置調整
    window.addEventListener('resize', this.handleWindowResize);
  }

  /**
   * プレイヤー要素を見つけて監視対象に追加
   */
  private findAndObservePlayer(): void {
    const player = document.querySelector('#movie_player') as HTMLElement;
    if (player && player !== this.player) {
      this.player = player;
      if (this.resizeObserver) {
        this.resizeObserver.observe(player);
      }
    }
  }

  /**
   * YouTubeページナビゲーションリスナーを設定
   */
  private setupPageNavigationListener(): void {
    window.addEventListener('yt-page-data-updated', this.handlePageUpdate);
  }

  /**
   * ページ更新時の処理
   */
  private handlePageUpdate = (): void => {
    // プレイヤーを再取得して監視
    setTimeout(() => {
      this.findAndObservePlayer();
      this.adjustOverlayPosition();
    }, 500); // ページ更新後少し待ってから実行
  };

  /**
   * ウィンドウリサイズ時の処理
   */
  private handleWindowResize = (): void => {
    this.adjustOverlayPosition();
  };

  /**
   * オーバーレイの位置を調整
   */
  private adjustOverlayPosition(): void {
    const player = document.querySelector('#movie_player') as HTMLElement;
    if (player) {
      const rect = player.getBoundingClientRect();
      this.onLayoutChange(rect);
    } else {
      this.onLayoutChange(null);
    }
  }
}

/**
 * YouTubeプレイヤーの状態を監視する
 */
export class PlayerStateMonitor {
  private checkInterval: number | null = null;
  private onStateChange: (state: { isDRM: boolean; isAd: boolean }) => void;

  constructor(onStateChange: (state: { isDRM: boolean; isAd: boolean }) => void) {
    this.onStateChange = onStateChange;
  }

  /**
   * 監視を開始する
   */
  public start(): void {
    this.checkInterval = window.setInterval(() => {
      this.checkPlayerState();
    }, 1000) as unknown as number;
  }

  /**
   * 監視を停止する
   */
  public stop(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * プレイヤーの状態をチェック
   */
  private checkPlayerState(): void {
    const video = document.querySelector('video');
    if (!video) return;

    const isDRM = this.checkForDRM(video);
    const isAd = this.checkForAd();

    this.onStateChange({ isDRM, isAd });
  }

  /**
   * DRMコンテンツかどうかをチェック
   */
  private checkForDRM(video: HTMLVideoElement): boolean {
    // webkitDecodedFrameCountが常に0ならDRMとみなす
    return video.webkitDecodedFrameCount === 0 && video.currentTime > 3;
  }

  /**
   * 広告表示中かどうかをチェック
   */
  private checkForAd(): boolean {
    return document.querySelector('.ad-showing') !== null;
  }
}
