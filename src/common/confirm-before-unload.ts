import { useEffect } from 'react';

/** isDirtyなどの場合に閉じる前に警告 */
export function useConfirmBeforeUnload(toConfirm: boolean) {
  useEffect(() => {
    if (!toConfirm) return;

    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => {
      removeEventListener('beforeunload', f);
    };
  }, [toConfirm]);
}
