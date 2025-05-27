// XState状態マシン定義 - スナップショット状態

import { createMachine } from 'xstate';
import { SnapshotStatus } from '../lib/types';

export const snapshotMachine = createMachine({
  id: 'snapshot',
  initial: 'idle',
  context: {
    error: null,
    currentBlob: null,
    capturedBlobs: [],
    progress: 0,
    total: 0
  },
  states: {
    idle: {
      on: {
        CAPTURE_SINGLE: 'processing',
        CAPTURE_MULTIPLE: {
          target: 'processing',
          actions: 'setTotal'
        }
      }
    },
    processing: {
      on: {
        PROGRESS: {
          actions: 'updateProgress'
        },
        COMPLETE: {
          target: 'complete',
          actions: 'setResult'
        },
        ERROR: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    complete: {
      on: {
        RESET: 'idle',
        CAPTURE_SINGLE: 'processing',
        CAPTURE_MULTIPLE: {
          target: 'processing',
          actions: 'setTotal'
        }
      }
    },
    error: {
      on: {
        RETRY: 'processing',
        RESET: 'idle'
      }
    }
  }
});
