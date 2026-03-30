import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, FileSearch, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/layout/Footer';
import UserNavbar from '../components/layout/navbars/UserNavbar';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import { executeAndShowError, FormField, FormRootError } from '../utils/formUtils';
import requestServer from '../utils/requestServer';

import type { PublicCertificateVerificationResponse } from '../../../server/src/api/types';

const verificationSchema = z.object({
  token: z.string().trim().min(1, 'Certificate token is required.'),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

function CertificateVerification() {
  const [result, setResult] = useState<PublicCertificateVerificationResponse | null>(null);

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    mode: 'onTouched',
    defaultValues: {
      token: '',
    },
  });

  const onVerify = form.handleSubmit(async (data) => {
    setResult(null);
    await executeAndShowError(form, async () => {
      const response = await requestServer<PublicCertificateVerificationResponse>(
        '/public/certificate/verify',
        {
          method: 'POST',
          body: {
            token: data.token.trim(),
          },
        },
      );
      setResult(response);
    });
  });

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <UserNavbar />
      <PageContainer>
        <PageHeader
          title="Verify Certificate"
          subtitle="Enter a certificate verification token to validate authenticity."
          icon={FileSearch}
          showBack
          defaultBackTo="/"
        />

        <Card>
          <form onSubmit={onVerify} className="space-y-4">
            <FormField
              form={form}
              name="token"
              label="Verification Token"
              placeholder="Paste certificate token"
            />
            <FormRootError form={form} />
            <Button type="submit" color="primary" Icon={FileSearch}>
              Verify Certificate
            </Button>
          </form>
        </Card>

        {result && (
          <Card
            title={result.valid ? 'Certificate is valid' : 'Certificate is invalid'}
            Icon={result.valid ? CheckCircle2 : ShieldAlert}
          >
            <p className={result.valid ? 'text-success' : 'text-error'}>
              {result.message}
            </p>
            {result.valid && result.issued_at && (
              <p className="mt-2 text-sm opacity-70">
                Issued at:
                {' '}
                {new Date(result.issued_at).toLocaleString()}
              </p>
            )}
          </Card>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
}

export default CertificateVerification;
