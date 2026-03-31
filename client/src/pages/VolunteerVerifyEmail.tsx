import { CheckCircle2, LoaderCircle, LogIn, RotateCcw } from 'lucide-react';
import { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AuthContext from '../auth/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Hero from '../components/layout/Hero';
import LinkButton from '../components/LinkButton';
import useNotifications from '../notifications/useNotifications';
import useAsync from '../utils/useAsync';

export default function VolunteerVerifyEmail() {
  const [searchParams] = useSearchParams();
  const verificationKey = (searchParams.get('key') ?? '').trim();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const notifications = useNotifications();
  const [hasStartedVerification, setHasStartedVerification] = useState(false);
  const hasAttemptedRef = useRef(false);

  const {
    loading,
    error,
    trigger,
  } = useAsync(async () => auth.verifyVolunteerEmail(verificationKey), {
    notifyOnError: false,
  });

  useEffect(() => {
    if (!verificationKey || hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;
    setHasStartedVerification(true);

    trigger()
      .then(() => {
        navigate('/volunteer', { replace: true });
      })
      .catch((err) => {
        notifications.push({
          type: 'error',
          message: err.message,
        });
      });
  }, [verificationKey]);

  if (!verificationKey) {
    return (
      <Hero>
        <Card>
          <h2 className="font-bold text-2xl text-center">Invalid verification link</h2>
          <p className="opacity-80">
            This email verification link is missing a token. Please use the latest link from your email.
          </p>
          <LinkButton color="primary" className="mx-auto" to="/login" Icon={LogIn} layout="wide">
            Back to login
          </LinkButton>
        </Card>
      </Hero>
    );
  }

  if (loading || !hasStartedVerification) {
    return (
      <Hero>
        <Card>
          <h2 className="font-bold text-2xl text-center">Verifying your email</h2>
          <p className="opacity-80 text-center">
            Please wait while we activate your volunteer account.
          </p>
          <div className="flex justify-center">
            <LoaderCircle className="animate-spin" size={28} />
          </div>
        </Card>
      </Hero>
    );
  }

  if (error) {
    return (
      <Hero>
        <Card>
          <h2 className="font-bold text-2xl text-center">Email verification failed</h2>
          <p className="opacity-80 text-center">{error.message}</p>
          <div className="flex gap-2 justify-center">
            <Button
              color="primary"
              type="button"
              onClick={() => {
                setHasStartedVerification(true);
                trigger()
                  .then(() => {
                    navigate('/volunteer', { replace: true });
                  })
                  .catch((err) => {
                    notifications.push({
                      type: 'error',
                      message: err.message,
                    });
                  });
              }}
              Icon={RotateCcw}
            >
              Try again
            </Button>
            <LinkButton color="ghost" to="/login" Icon={LogIn}>
              Back to login
            </LinkButton>
          </div>
        </Card>
      </Hero>
    );
  }

  return (
    <Hero>
      <Card>
        <h2 className="font-bold text-2xl text-center">Email verified</h2>
        <p className="opacity-80 text-center">Redirecting you to your volunteer dashboard...</p>
        <div className="flex justify-center">
          <CheckCircle2 size={28} />
        </div>
      </Card>
    </Hero>
  );
}
