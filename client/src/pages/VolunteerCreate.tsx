import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Mail,
  LockKeyhole,
  UserCircle,
  UserPlus,
  CheckCircle2,
  LogIn,
} from 'lucide-react';
import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import AuthContext from '../auth/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Hero from '../components/layout/Hero';
import LinkButton from '../components/LinkButton';
import useNotifications from '../notifications/useNotifications';
import { volunteerSignupSchema, type VolunteerSignupFormData } from '../schemas/volunteer';
import { executeAndShowError, FormField, FormRootError } from '../utils/formUtils';

export default function VolunteerCreate() {
  const auth = useContext(AuthContext);
  const { push } = useNotifications();
  const [emailSent, setEmailSent] = useState(false);
  const form = useForm<VolunteerSignupFormData>({
    resolver: zodResolver(volunteerSignupSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      date_of_birth: '',
      gender: 'male',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await executeAndShowError(form, async () => {
      const { confirmPassword: _, ...volunteerData } = data;
      const response = await auth.createVolunteer(volunteerData);

      if (response.requires_email_verification) {
        setEmailSent(true);
        push({
          type: 'success',
          message: 'Verification email sent. Please check your inbox before logging in.',
        });
      }
    });
  });

  if (emailSent) {
    return (
      <Hero>
        <Card>
          <h2 className="font-bold text-2xl text-center">Check your email</h2>
          <p className="opacity-80">
            We sent you a verification link. Please confirm your email to activate your volunteer account.
          </p>
          <LinkButton
            color="primary"
            className="mx-auto"
            to="/login"
            Icon={LogIn}
            layout="wide"
          >
            Go to login
          </LinkButton>
        </Card>
      </Hero>
    );
  }

  return (
    <Hero
      title="Volunteer Registration"
      description="Fill out the form to register as a volunteer."
    >
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <div className="flex-1">
              <FormField
                form={form}
                label="First Name"
                name="first_name"
                type="text"
                Icon={User}
              />
            </div>
            <div className="flex-1">
              <FormField
                form={form}
                label="Last Name"
                name="last_name"
                type="text"
                Icon={User}
              />
            </div>
          </div>

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

          <FormField
            form={form}
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            Icon={CheckCircle2}
          />

          <div className="flex gap-4">
            <div className="flex-1">
              <FormField
                form={form}
                label="Date of Birth"
                name="date_of_birth"
                type="date"
              />
            </div>
            <div className="flex-1">
              <div className="flex-1">
                <FormField
                  form={form}
                  label="Gender"
                  name="gender"
                  Icon={UserCircle}
                  selectOptions={[
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              </div>
            </div>
          </div>

          <FormRootError form={form} />

          <Button
            type="submit"
            color="primary"
            layout="block"
            loading={form.formState.isSubmitting}
            Icon={UserPlus}
            className="mt-4"
          >
            Register
          </Button>

          <div className="text-center mt-4">
            <span className="text-sm">
              Already have an account?
              {' '}
              <Link to="/login" className="link link-primary">
                Log in
              </Link>
            </span>
          </div>
        </form>
      </Card>
    </Hero>
  );
}
