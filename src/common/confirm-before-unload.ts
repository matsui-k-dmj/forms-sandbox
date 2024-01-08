import { useEffect } from 'react';

/** isDirtyなどの場合に閉じる前に警告 */
export function useConfirmBeforeUnload(shouldConfirm: boolean) {
  useEffect(() => {
    if (!shouldConfirm) return;

    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => {
      removeEventListener('beforeunload', f);
    };
  }, [shouldConfirm]);
}
