import { Lock, Trash2, X } from 'lucide-react';
import { useContext, useState } from 'react';

import AuthContext from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import PasswordResetCard from '../../components/PasswordResetCard';
import useNotifications from '../../notifications/useNotifications';

function VolunteerSettings() {
  const notifications = useNotifications();
  const { deleteAccount } = useContext(AuthContext);
  const [accountDeletionBusy, setAccountDeletionBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password.');
      return;
    }
    setDeleteError(null);

    try {
      setAccountDeletionBusy(true);
      await deleteAccount(deletePassword);
      notifications.push({ type: 'success', message: 'Your account was deleted.' });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setAccountDeletionBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Manage your account security and preferences."
        icon={Lock}
      />
      <div className="space-y-6">
        <PasswordResetCard />

        <Card
          title="Delete Account"
          description="Permanently delete your volunteer account."
          Icon={Trash2}
        >
          {!showDeleteConfirm
            ? (
                <div>
                  <Button
                    type="button"
                    color="error"
                    style="outline"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setDeleteError(null);
                      setDeletePassword('');
                    }}
                    Icon={Trash2}
                  >
                    I want to delete my account
                  </Button>
                </div>
              )
            : (
                <div className="space-y-3">
                  <Alert color="error">
                    <strong>This cannot be undone.</strong>
                    {' '}
                    Your upcoming applications will be withdrawn. You will not be able to sign in or recover this account. Your profile will be hidden from the platform, and you will be signed out immediately.
                  </Alert>
                  <p className="text-sm font-medium">Enter your password to confirm:</p>
                  <input
                    type="password"
                    className="input input-bordered w-full max-w-sm"
                    placeholder="Your password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    disabled={accountDeletionBusy}
                    onKeyDown={e => e.key === 'Enter' && void onDeleteAccount()}
                  />
                  {deleteError && <p className="text-sm text-error">{deleteError}</p>}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      color="error"
                      onClick={() => void onDeleteAccount()}
                      loading={accountDeletionBusy}
                      Icon={Trash2}
                    >
                      Permanently Delete My Account
                    </Button>
                    <Button
                      type="button"
                      style="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteError(null);
                        setDeletePassword('');
                      }}
                      disabled={accountDeletionBusy}
                      Icon={X}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
        </Card>
      </div>
    </PageContainer>
  );
}

export default VolunteerSettings;
