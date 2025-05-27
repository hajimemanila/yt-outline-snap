// XState状態マシン定義 - アプリケーション状態

import { createMachine } from 'xstate';
import { AppStatus } from '../lib/types';

export const appMachine = createMachine({
  id: 'app',
  initial: 'initializing',
  context: {
    error: null,
    outlineItems: [],
    currentSnapshot: null
  },
  states: {
    initializing: {
      on: {
        INITIALIZED: 'ready',
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    ready: {
      on: {
        GENERATE_SUMMARY: 'generating',
        CAPTURE_SNAPSHOT: 'capturing',
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    generating: {
      on: {
        SUMMARY_GENERATED: {
          target: 'ready',
          actions: 'setOutlineItems'
        },
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    capturing: {
      on: {
        SNAPSHOT_CAPTURED: {
          target: 'ready',
          actions: 'setCurrentSnapshot'
        },
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    error: {
      on: {
        RETRY: 'initializing',
        RESET: 'ready'
      }
    }
  }
});
