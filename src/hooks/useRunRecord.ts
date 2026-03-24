import { useRef } from 'react';
import { apiClient } from '../lib/apiClient';

/**
 * Manages a serial save queue for run records.
 * Each save is chained so they never run concurrently, preventing race conditions.
 */
export function useRunRecord() {
  const saveQueueRef = useRef(Promise.resolve());

  const queueSave = (
    runId: string,
    keepRecord: boolean,
    record: object,
  ): Promise<void> => {
    if (!runId) return Promise.resolve();

    const payload = { run_id: runId, keep_record: keepRecord, record };

    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        try {
          await apiClient.post('/save_run_record', payload);
        } catch (error) {
          console.warn('Run record save error:', error);
        }
      });

    return saveQueueRef.current;
  };

  return { queueSave };
}
