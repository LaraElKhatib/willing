import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, Phone, Globe, MapPin, Send, Home } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import Button from '../components/Button';
import Card from '../components/Card';
import Hero from '../components/layout/Hero';
import LinkButton from '../components/LinkButton';
import LocationPicker from '../components/LocationPicker';
import { organizationRequestFormSchema, type OrganizationRequestFormData } from '../schemas/organization';
import { executeAndShowError, FormField, FormRootError } from '../utils/formUtils';
import requestServer from '../utils/requestServer';

export default function OrganizationRequestPage() {
  const form = useForm<OrganizationRequestFormData>({
    resolver: zodResolver(organizationRequestFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      url: '',
      location_name: '',
    },
  });
  const [position, setPosition] = useState<[number, number]>([33.90192863620578, 35.477959277880416]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = form.handleSubmit(async (data) => {
    await executeAndShowError(form, async () => {
      const payload = {
        ...data,
        latitude: position[0],
        longitude: position[1],
      };

      await requestServer('/organization/request', {
        method: 'POST',
        body: payload,
      });

      setSubmitted(true);
    });
  });

  const onFormSetPosition = useCallback((position: [number, number], name?: string) => {
    setPosition(position);
    if (name && !form.getFieldState('location_name').isDirty) {
      form.setValue('location_name', name);
    }
  }, [form]);

  if (submitted) {
    return (
      <Hero>
        <Card>
          <div className="flex flex-col gap-4 items-center">
            <h2 className="card-title text-2xl">Request submitted</h2>
            <p className="opacity-80">
              Your organization request was sent successfully. Our team will review it and contact you.
            </p>
            <LinkButton
              color="primary"
              className="mt-3"
              layout="wide"
              to="/"
              Icon={Home}
            >
              Go back home
            </LinkButton>
          </div>
        </Card>
      </Hero>
    );
  }

  return (
    <Hero
      title="Organization Request"
      description="Submit your organization details to join Willing. Our team will review your request and get back to you."
    >
      <Card>
        <form onSubmit={handleSubmit}>
          <FormField
            form={form}
            label="Organization name"
            name="name"
            type="text"
            Icon={Building2}
          />

          <FormField
            form={form}
            label="Email"
            name="email"
            type="email"
            Icon={Mail}
          />

          <FormField
            form={form}
            label="Phone number"
            name="phone_number"
            type="tel"
            Icon={Phone}
          />

          <FormField
            form={form}
            label="Website"
            name="url"
            type="url"
            Icon={Globe}
          />

          <FormField
            form={form}
            label="Location"
            name="location_name"
            type="text"
            Icon={MapPin}
          />

          <div className="mt-2">
            <LocationPicker
              position={position}
              setPosition={onFormSetPosition}
            />
          </div>

          <FormRootError form={form} />

          <Button
            color="primary"
            className="mt-4"
            layout="block"
            type="submit"
            loading={form.formState.isSubmitting}
            Icon={Send}
          >
            Request Account
          </Button>
        </form>
      </Card>
    </Hero>
  );
}
