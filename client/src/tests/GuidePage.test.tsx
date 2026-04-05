import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { test, expect, beforeEach, afterEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';
import AuthContext from '../auth/AuthContext';
import GuidePage from '../pages/GuidePage';

import type { VolunteerCreateResponse, VolunteerVerifyEmailResponse } from '../../../server/src/api/routes/volunteer/index.types';
import type { VolunteerAccountWithoutPassword } from '../../../server/src/db/tables/index.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildAuthContext(role?: 'volunteer' | 'organization' | 'admin') {
  return {
    user: role ? { role } : undefined,
    loaded: true,
    refreshUser: vi.fn(),
    loginAdmin: vi.fn(async () => {}),
    loginUser: vi.fn(async () => {}),
    createVolunteer: vi.fn(async () => ({ requires_email_verification: true } as VolunteerCreateResponse)),
    verifyVolunteerEmail: vi.fn(async () => ({ volunteer: {} as VolunteerAccountWithoutPassword, token: '' } as VolunteerVerifyEmailResponse)),
    resendVolunteerVerification: vi.fn(async () => {}),
    changePassword: vi.fn(async () => {}),
    logout: vi.fn(),
    restrictRoute: vi.fn(() => ({} as VolunteerAccountWithoutPassword)),
  };
}

function renderGuidePage(role?: 'volunteer' | 'organization' | 'admin') {
  return render(
    <MemoryRouter initialEntries={['/guide']}>
      <AuthContext.Provider value={buildAuthContext(role)}>
        <GuidePage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Reset scroll position mock if needed
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Hero / Page Header ──────────────────────────────────────────────────────

test('renders main page title', () => {
  renderGuidePage();
  expect(screen.getByText('Your Complete Guide to Willing')).toBeInTheDocument();
});

test('renders page subtitle', () => {
  renderGuidePage();
  expect(screen.getByText(/Learn how the platform works — from signing up to earning your first certificate/i)).toBeInTheDocument();
});

// ─── Navigation Sidebar ──────────────────────────────────────────────────────

test('renders all sidebar navigation sections', () => {
  renderGuidePage();
  const expectedLabels = ['Overview', 'For Volunteers', 'For Organizations', 'Postings Explained', 'Crises', 'Certificates', 'FAQ'];
  for (const label of expectedLabels) {
    const buttons = screen.getAllByRole('button', { name: label });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  }
});

test('renders Overview navigation button', () => {
  renderGuidePage();
  const overviewBtns = screen.getAllByRole('button', { name: 'Overview' });
  expect(overviewBtns.length).toBeGreaterThanOrEqual(1);
});

test('sidebar nav buttons are clickable', () => {
  renderGuidePage();
  const volunteersBtns = screen.getAllByRole('button', { name: 'For Volunteers' });
  const volunteersBtn = volunteersBtns[0];
  fireEvent.click(volunteersBtn);
  expect(Element.prototype.scrollTo).toHaveBeenCalled();
});

// ─── Mobile Navigation ───────────────────────────────────────────────────────

test('renders mobile navigation buttons', () => {
  renderGuidePage();
  // Mobile nav uses btn-xs class — there will be duplicates of each label
  const overviewBtns = screen.getAllByRole('button', { name: 'Overview' });
  expect(overviewBtns.length).toBeGreaterThanOrEqual(1);
});

// ─── Overview Section ────────────────────────────────────────────────────────

test('renders Overview section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Platform Overview — What Is Willing?')).toBeInTheDocument();
});

test('renders Volunteers card in overview', () => {
  renderGuidePage();
  expect(screen.getByText('Volunteers')).toBeInTheDocument();
  expect(screen.getByText(/People who want to make an impact and earn verified recognition/i)).toBeInTheDocument();
});

test('renders Organizations card in overview', () => {
  renderGuidePage();
  expect(screen.getByText('Organizations')).toBeInTheDocument();
  expect(screen.getByText(/Verified cause-driven organizations that publish opportunities/i)).toBeInTheDocument();
});

test('renders Opportunities card in overview', () => {
  renderGuidePage();
  expect(screen.getByText('Opportunities')).toBeInTheDocument();
  expect(screen.getByText(/Real-world volunteering projects sorted by urgency, skills, and location/i)).toBeInTheDocument();
});

// ─── Volunteer Journey Section ───────────────────────────────────────────────

test('renders Volunteer Journey section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Volunteer Journey')).toBeInTheDocument();
});

test('renders all volunteer timeline steps', () => {
  renderGuidePage();
  const steps = [
    'Create your account',
    'Build your profile & add skills',
    'Discover postings',
    'Apply to a posting',
    'Get accepted & attend',
    'Get marked as attended',
    'Generate your certificate',
  ];
  for (const step of steps) {
    expect(screen.getByText(step)).toBeInTheDocument();
  }
});

test('renders volunteer step descriptions', () => {
  renderGuidePage();
  expect(screen.getByText(/Sign up as a volunteer. Fill in your name, email, and age, and verify your email/i)).toBeInTheDocument();
  expect(screen.getByText(/Add the skills you bring to the table/i)).toBeInTheDocument();
  expect(screen.getByText(/Browse all opportunities. Filter by crisis/i)).toBeInTheDocument();
  expect(screen.getByText(/Hit apply and optionally include a message/i)).toBeInTheDocument();
  expect(screen.getByText(/For open postings you're enrolled immediately/i)).toBeInTheDocument();
  expect(screen.getByText(/After the event, the organization marks you as attended/i)).toBeInTheDocument();
  expect(screen.getByText(/Once eligible, generate a verified certificate/i)).toBeInTheDocument();
});

// ─── Organization Journey Section ────────────────────────────────────────────

test('renders Organization Journey section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Organization Journey')).toBeInTheDocument();
});

test('renders all organization timeline steps', () => {
  renderGuidePage();
  const steps = [
    'Request an account',
    'Wait for admin approval',
    'Set up your profile',
    'Set a minimum hours threshold',
    'Create postings',
    'Choose open or review-based enrollment',
    'Review applications',
    'Mark attendance',
  ];
  for (const step of steps) {
    expect(screen.getByText(step)).toBeInTheDocument();
  }
});

test('renders organization step descriptions', () => {
  renderGuidePage();
  expect(screen.getByText(/Submit your organization's details and contact info/i)).toBeInTheDocument();
  expect(screen.getByText(/The admin reviews your request and either approves or rejects it/i)).toBeInTheDocument();
  expect(screen.getByText(/Add your organization logo, a signatory name and position/i)).toBeInTheDocument();
  expect(screen.getByText(/Define the minimum number of volunteer hours required/i)).toBeInTheDocument();
  expect(screen.getByText(/Publish volunteer opportunities with a title, description/i)).toBeInTheDocument();
  expect(screen.getByText(/Decide whether applicants are accepted automatically/i)).toBeInTheDocument();
  expect(screen.getByText(/For review-based postings, see each applicant's profile/i)).toBeInTheDocument();
  expect(screen.getByText(/After the event, mark which enrolled volunteers actually showed up/i)).toBeInTheDocument();
});

// ─── Postings Explained Section ──────────────────────────────────────────────

test('renders Postings Explained section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Postings Explained — Deep Dive')).toBeInTheDocument();
});

test('renders Open vs Review-Based card', () => {
  renderGuidePage();
  expect(screen.getByText('Open vs Review-Based')).toBeInTheDocument();
  expect(screen.getByText(/Postings that are open allow volunteers to be automatically accepted/i)).toBeInTheDocument();
});

test('renders Partial vs Full card', () => {
  renderGuidePage();
  expect(screen.getByText('Partial vs Full')).toBeInTheDocument();
  expect(screen.getByText(/Partial commitment allows volunteers to select specific days/i)).toBeInTheDocument();
});

test('renders Closed Posting card', () => {
  renderGuidePage();
  expect(screen.getByText('Closed Posting')).toBeInTheDocument();
  expect(screen.getByText(/Closed postings mean that the opportunity is no longer accepting new applications/i)).toBeInTheDocument();
});

test('renders enrollment type badges', () => {
  renderGuidePage();
  expect(screen.getByText('Open / Review')).toBeInTheDocument();
  expect(screen.getByText('Flexible Engagement')).toBeInTheDocument();
  expect(screen.getByText('No Longer Accepting')).toBeInTheDocument();
});

test('renders Posting Fields section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Posting Fields — What\'s Inside a Posting?')).toBeInTheDocument();
});

test('renders all posting fields', () => {
  renderGuidePage();
  const fields = [
    'Title & Description',
    'Start & End Date/Time',
    'Location',
    'Required Skills',
    'Max Volunteers (optional)',
    'Minimum Age (optional)',
    'Linked Crisis (optional)',
    'Commitment (full / partial)',
    'Status (open / closed)',
  ];
  for (const field of fields) {
    expect(screen.getByText(field)).toBeInTheDocument();
  }
});

test('renders Enrollment vs Application heading', () => {
  renderGuidePage();
  expect(screen.getByText('Enrollment vs Application — What\'s the difference?')).toBeInTheDocument();
});

test('renders Application card', () => {
  renderGuidePage();
  expect(screen.getByText('Application')).toBeInTheDocument();
  expect(screen.getByText(/What a volunteer submits. Includes an optional message. Pending until approved/i)).toBeInTheDocument();
});

test('renders Enrollment card', () => {
  renderGuidePage();
  expect(screen.getByText('Enrollment')).toBeInTheDocument();
  expect(screen.getByText(/A confirmed spot. Automatic for open postings/i)).toBeInTheDocument();
});

// ─── Crises Section ──────────────────────────────────────────────────────────

test('renders Crises section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Crisis Events: Real situations, urgent action')).toBeInTheDocument();
});

test('renders "What is a crisis?" explanation', () => {
  renderGuidePage();
  expect(screen.getByText(/A crisis is a specific real-world event that requires immediate action/i)).toBeInTheDocument();
});

test('renders "Why it matters" heading', () => {
  renderGuidePage();
  expect(screen.getByText('Why it matters')).toBeInTheDocument();
});

test('renders Speed card in crises section', () => {
  renderGuidePage();
  expect(screen.getByText('Speed')).toBeInTheDocument();
  expect(screen.getByText(/Connecting organizations and volunteers for urgent situations/i)).toBeInTheDocument();
});

test('renders Context card in crises section', () => {
  renderGuidePage();
  expect(screen.getByText('Context')).toBeInTheDocument();
  expect(screen.getByText(/Organizations frame why help is needed/i)).toBeInTheDocument();
});

test('renders Impact card in crises section', () => {
  renderGuidePage();
  expect(screen.getByText('Impact')).toBeInTheDocument();
  expect(screen.getByText(/Crisis-linked postings track collective response/i)).toBeInTheDocument();
});

// ─── Certificates Section ────────────────────────────────────────────────────

test('renders Certificates section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Verified Certificates of Participation')).toBeInTheDocument();
});

test('renders "What is a certificate?" explanation', () => {
  renderGuidePage();
  expect(screen.getByText(/A certificate is generated by the volunteer and documents their total hours of service/i)).toBeInTheDocument();
});

test('renders certificate eligibility heading', () => {
  renderGuidePage();
  expect(screen.getByText('Eligibility — When can a volunteer generate one?')).toBeInTheDocument();
});

test('renders certificate eligibility requirements', () => {
  renderGuidePage();
  expect(screen.getByText(/The volunteer has been marked as attended in at least one enrollment/i)).toBeInTheDocument();
  expect(screen.getByText(/The volunteer meets the threshold/i)).toBeInTheDocument();
});

test('renders certificate eligibility note', () => {
  renderGuidePage();
  expect(screen.getByText(/Only eligible organizations appear on the generated certificate/i)).toBeInTheDocument();
});

test('renders Verification section', () => {
  renderGuidePage();
  expect(screen.getByText('Verification')).toBeInTheDocument();
  expect(screen.getByText(/Certificates have unique URLs and can be viewed read-only by anyone/i)).toBeInTheDocument();
});

// ─── FAQ Section ─────────────────────────────────────────────────────────────

test('renders FAQ section heading', () => {
  renderGuidePage();
  expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
});

test('renders all FAQ questions', () => {
  renderGuidePage();
  const questions = [
    'What\'s the difference between an open and review-based posting?',
    'Can I apply to multiple postings at the same time?',
    'What happens if I apply to a review-based posting and get rejected?',
    'How does the organization know I attended?',
    'What do I need before I can generate a certificate, and how do I generate it?',
    'Can my certificate be faked or tampered with?',
    'What happens if an organization hasn\'t set up their signature yet?',
    'Is Willing free to use?',
  ];
  for (const q of questions) {
    expect(screen.getByText(q)).toBeInTheDocument();
  }
});

test('renders FAQ answers', () => {
  renderGuidePage();
  expect(screen.getByText(/Open postings mean you are automatically accepted when you apply/i)).toBeInTheDocument();
  expect(screen.getByText(/Yes — apply for as many opportunities as you like/i)).toBeInTheDocument();
  expect(screen.getByText(/you get an email of rejection/i)).toBeInTheDocument();
  expect(screen.getByText(/Organizations mark attendance after an event/i)).toBeInTheDocument();
  expect(screen.getByText(/you must apply and attend at least one posting/i)).toBeInTheDocument();
  expect(screen.getByText(/every certificate is signed and verifiable via a unique token/i)).toBeInTheDocument();
  expect(screen.getByText(/That organization will be excluded from your certificate/i)).toBeInTheDocument();
  expect(screen.getByText(/Yes — Willing is free for volunteers and organizations/i)).toBeInTheDocument();
});

// ─── CTA Section — Guest ─────────────────────────────────────────────────────

test('(guest) renders "Start volunteering today" card', () => {
  renderGuidePage();
  expect(screen.getByText('Start volunteering today')).toBeInTheDocument();
  expect(screen.getByText(/Find your first opportunity, apply, and start earning certificate hours/i)).toBeInTheDocument();
});

test('(guest) renders "Register your organization" card', () => {
  renderGuidePage();
  expect(screen.getByText('Register your organization')).toBeInTheDocument();
  expect(screen.getByText(/Publish your first posting and start matching with local volunteers/i)).toBeInTheDocument();
});

test('(guest) "Get Started" links to /volunteer/create', () => {
  renderGuidePage();
  const link = screen.getByText('Get Started').closest('a');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/volunteer/create');
});

test('(guest) "Register" links to /organization/request', () => {
  renderGuidePage();
  const link = screen.getByText('Register').closest('a');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/organization/request');
});

test('(guest) does NOT show any "Go to Dashboard" button', () => {
  renderGuidePage();
  expect(screen.queryByText('Go to Dashboard')).toBeNull();
});

test('(guest) does NOT show disabled account-active buttons', () => {
  renderGuidePage();
  expect(screen.queryByText('Admin Account Active')).toBeNull();
  expect(screen.queryByText('Volunteer Account Active')).toBeNull();
  expect(screen.queryByText('Organization Account Active')).toBeNull();
});

// ─── CTA Section — Volunteer ─────────────────────────────────────────────────

test('(volunteer) "Go to Dashboard" links to /volunteer', () => {
  renderGuidePage('volunteer');
  const link = screen.getByText('Go to Dashboard').closest('a');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/volunteer');
});

test('(volunteer) shows disabled "Volunteer Account Active" in org card', () => {
  renderGuidePage('volunteer');
  const btn = screen.getByText('Volunteer Account Active');
  expect(btn).toBeInTheDocument();
  expect(btn.closest('button')).toBeDisabled();
});

test('(volunteer) does NOT show "Get Started" link', () => {
  renderGuidePage('volunteer');
  expect(screen.queryByText('Get Started')).toBeNull();
});

test('(volunteer) does NOT show "Register" link', () => {
  renderGuidePage('volunteer');
  expect(screen.queryByText('Register')).toBeNull();
});

test('(volunteer) does NOT show admin-specific button', () => {
  renderGuidePage('volunteer');
  expect(screen.queryByText('Admin Account Active')).toBeNull();
});

// ─── CTA Section — Organization ──────────────────────────────────────────────

test('(organization) "Go to Dashboard" links to /organization', () => {
  renderGuidePage('organization');
  const link = screen.getByText('Go to Dashboard').closest('a');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/organization');
});

test('(organization) shows disabled "Organization Account Active" in volunteer card', () => {
  renderGuidePage('organization');
  const btn = screen.getByText('Organization Account Active');
  expect(btn).toBeInTheDocument();
  expect(btn.closest('button')).toBeDisabled();
});

test('(organization) does NOT show "Get Started" link', () => {
  renderGuidePage('organization');
  expect(screen.queryByText('Get Started')).toBeNull();
});

test('(organization) does NOT show "Register" link', () => {
  renderGuidePage('organization');
  expect(screen.queryByText('Register')).toBeNull();
});

test('(organization) does NOT show admin-specific button', () => {
  renderGuidePage('organization');
  expect(screen.queryByText('Admin Account Active')).toBeNull();
});

// ─── CTA Section — Admin ──────────────────────────────────────────────────────

test('(admin) shows disabled "Admin Account Active" in volunteer card', () => {
  renderGuidePage('admin');
  const btns = screen.getAllByText('Admin Account Active');
  expect(btns.length).toBeGreaterThanOrEqual(1);
  for (const btn of btns) {
    expect(btn.closest('button')).toBeDisabled();
  }
});

test('(admin) does NOT show "Get Started" link', () => {
  renderGuidePage('admin');
  expect(screen.queryByText('Get Started')).toBeNull();
});

test('(admin) does NOT show "Register" link', () => {
  renderGuidePage('admin');
  expect(screen.queryByText('Register')).toBeNull();
});

test('(admin) does NOT show "Go to Dashboard" link', () => {
  renderGuidePage('admin');
  expect(screen.queryByText('Go to Dashboard')).toBeNull();
});

test('(admin) does NOT show "Volunteer Account Active"', () => {
  renderGuidePage('admin');
  expect(screen.queryByText('Volunteer Account Active')).toBeNull();
});

test('(admin) does NOT show "Organization Account Active"', () => {
  renderGuidePage('admin');
  expect(screen.queryByText('Organization Account Active')).toBeNull();
});

// ─── Section IDs (for anchor navigation) ────────────────────────────────────

test('overview section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('overview')).toBeInTheDocument();
});

test('volunteers section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('volunteers')).toBeInTheDocument();
});

test('organizations section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('organizations')).toBeInTheDocument();
});

test('postings section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('postings')).toBeInTheDocument();
});

test('crises section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('crises')).toBeInTheDocument();
});

test('certificates section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('certificates')).toBeInTheDocument();
});

test('faq section has correct id', () => {
  renderGuidePage();
  expect(document.getElementById('faq')).toBeInTheDocument();
});
