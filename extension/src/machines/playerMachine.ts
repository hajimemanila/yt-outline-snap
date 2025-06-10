// XState状態マシン定義 - プレイヤー状態

import { createMachine } from 'xstate';

export const playerMachine = createMachine({
  id: 'player',
  initial: 'initializing',
  context: {
    isDRM: false,
    isAd: false
  },
  states: {
    initializing: {
      on: {
        PLAYER_READY: 'normal'
      }
    },
    normal: {
      on: {
        DRM_DETECTED: {
          target: 'drm',
          actions: 'setDRM'
        },
        AD_STARTED: {
          target: 'ad',
          actions: 'setAd'
        }
      }
    },
    drm: {
      on: {
        DRM_CLEARED: {
          target: 'normal',
          actions: 'clearDRM'
        }
      }
    },
    ad: {
      on: {
        AD_ENDED: {
          target: 'normal',
          actions: 'clearAd'
        }
      }
    }
  }
});
