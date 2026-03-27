import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, LockKeyhole, LogIn } from 'lucide-react';
import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import AuthContext from '../auth/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Hero from '../components/layout/Hero';
import { loginFormSchema, type LoginFormData } from '../schemas/auth';
import { executeAndShowError, FormField, FormRootError } from '../utils/formUtils';

function UserLoginPage() {
  const auth = useContext(AuthContext);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (data) => {
    await executeAndShowError(form, async () => {
      await auth.loginUser(data.email, data.password);
    });
  });

  return (
    <>
      <Hero
        title="Login"
        description="Welcome! Please log in to access your account."
      >
        <Card>
          <form
            onSubmit={submit}
          >
            <FormField
              form={form}
              label="Email"
              name="email"
              type="email"
              Icon={Mail}
            />

            <FormField
              form={form}
              label="Password"
              name="password"
              type="password"
              Icon={LockKeyhole}
            />

            <div className="text-right">
              <Link to="/forgot-password" className="link link-hover text-sm">
                Forgot password?
              </Link>
            </div>

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

            <div className="text-center mt-4">
              <span className="text-sm">
                Don&apos;t have an account?
                {' '}
                <Link to="/volunteer/create" className="link link-primary">
                  Sign up
                </Link>
              </span>
            </div>
          </form>
        </Card>
      </Hero>
    </>
  );
}

export default UserLoginPage;
