import { useUIStore } from '../store/uiStore';

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();
  
  return (
    <div id="toast-container" style={{ zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)} style={{ cursor: 'pointer' }}>
          {t.text}
        </div>
      ))}
    </div>
  );
};
