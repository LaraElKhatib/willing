import { AlertCircle, Check, X } from 'lucide-react';

import Alert from '../Alert';

type ReportActionPanelProps = {
  actionError: string | null;
  isActionInProgress: boolean;
  onAccept: () => void;
  onReject: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
  warningMessage?: string;
};

function ReportActionPanel({
  actionError,
  isActionInProgress,
  onAccept,
  onReject,
  acceptLabel = 'Accept Report',
  rejectLabel = 'Reject Report',
  warningMessage = 'Accepting this report will disable the reported account.',
}: ReportActionPanelProps) {
  return (
    <div className="space-y-3">
      {actionError && (
        <Alert color="error">
          <p>{actionError}</p>
        </Alert>
      )}

      <button
        type="button"
        className="btn btn-success btn-block gap-2"
        onClick={onAccept}
        disabled={isActionInProgress}
      >
        {isActionInProgress
          ? (
              <>
                <div className="loading loading-spinner loading-sm" />
              </>
            )
          : (
              <>
                <Check size={18} />
                {acceptLabel}
              </>
            )}
      </button>

      <button
        type="button"
        className="btn btn-outline btn-block gap-2"
        onClick={onReject}
        disabled={isActionInProgress}
      >
        <X size={18} />
        {rejectLabel}
      </button>

      <div className="alert alert-warning gap-2">
        <AlertCircle size={18} />
        <span className="text-xs">{warningMessage}</span>
      </div>
    </div>
  );
}

export default ReportActionPanel;
