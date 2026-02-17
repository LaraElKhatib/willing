import { Router } from 'express';

import database from '../../../db/index.js';
import { newOrganizationRequestSchema } from '../../../db/tables.js';
import { sendAdminOrganizationRequestEmail } from '../../../SMTP/emails.js';

const organizationRouter = Router();

organizationRouter.post('/request', async (req, res) => {
  const body = newOrganizationRequestSchema.parse(req.body);

  const email = body.email.toLowerCase().trim();

  const checkAccountRequest = await database
    .selectFrom('organization_account')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();

  if (checkAccountRequest) {
    res.status(400);
    throw new Error('An organization with this email account already exists');
  }

  const checkPendingRequest = await database
    .selectFrom('organization_request')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();

  if (checkPendingRequest) {
    res.status(400);
    throw new Error('A request with this email is already pending');
  }

  const organization = await database
    .insertInto('organization_request')
    .values({
      name: body.name,
      email: email,
      phone_number: body.phone_number,
      url: body.url,
      location_name: body.location_name,
      latitude: body.latitude,
      longitude: body.longitude,
    })
    .returningAll().executeTakeFirst();

  if (!organization) {
    throw new Error('Failed to create organization request');
  } else {
    try {
      sendAdminOrganizationRequestEmail(organization);
    } catch (error) {
      console.error('Failed to send organization request email to admin', error);
    }
    res.json({});
  }
});

export default organizationRouter;
