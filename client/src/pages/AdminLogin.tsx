import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Mail, LockKeyhole, LogIn } from 'lucide-react';
import { useContext } from 'react';
import { useForm } from 'react-hook-form';

import AuthContext from '../auth/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Hero from '../components/layout/Hero';
import { loginFormSchema, type LoginFormData } from '../schemas/auth';
import { executeAndShowError, FormField, FormRootError } from '../utils/formUtils';

function AdminLogin() {
  const auth = useContext(AuthContext);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await executeAndShowError(form, async () => {
      await auth.loginAdmin(data.email, data.password);
    });
  });

  return (
    <Hero
      title="Admin Login"
      description="Authorized access only. This portal is restricted to system administrators for platform oversight and maintenance. Please log in to proceed to your secure dashboard."
      Icon={ShieldCheck}
    >

      <Card>
        <form
          onSubmit={handleSubmit}
        >
          <FormField
            form={form}
            name="email"
            label="Email"
            type="email"
            Icon={Mail}
          />

          <FormField
            form={form}
            name="password"
            label="Password"
            type="password"
            Icon={LockKeyhole}
          />

          <FormRootError form={form} />

          <Button
            color="primary"
            className="mt-4"
            layout="block"
            type="submit"
            loading={form.formState.isSubmitting}
            Icon={LogIn}
          >
            Login
          </Button>
        </form>
      </Card>
    </Hero>
  );
}

export default AdminLogin;
