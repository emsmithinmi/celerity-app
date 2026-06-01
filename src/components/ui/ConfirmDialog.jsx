import Modal from './Modal'
import Button from './Button'

/**
 * Reusable confirmation dialog.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     title="Delete task?"
 *     message="This cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"
 *   />
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working...' : confirmLabel}
          </Button>
        </>
      }
    >
      {message && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      )}
    </Modal>
  )
}
