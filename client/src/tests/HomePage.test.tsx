import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { test, expect, beforeEach, afterEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';
import AuthContext from '../auth/AuthContext';
import HomePage from '../pages/HomePage';

import type { VolunteerCreateResponse, VolunteerVerifyEmailResponse } from '../../../server/src/api/routes/volunteer/index.types';
import type { VolunteerAccountWithoutPassword } from '../../../server/src/db/tables/index.ts';

const requestServerMock = vi.fn();
vi.mock('../utils/requestServer', () => ({
  __esModule: true,
  default: requestServerMock,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockStats = {
  totalVolunteers: 120,
  totalOpportunities: 45,
  totalOrganizations: 18,
  newVolunteersThisWeek: 7,
  newOpportunitiesThisWeek: 3,
  newOrganizationsThisWeek: 1,
};

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

function renderHomePage(role?: 'volunteer' | 'organization' | 'admin', initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={buildAuthContext(role)}>
        <HomePage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  requestServerMock.mockResolvedValue(mockStats);
});

afterEach(() => {
  cleanup();
  requestServerMock.mockReset();
  vi.restoreAllMocks();
});

// ─── Hero / Headline Texts ───────────────────────────────────────────────────

test('renders main headline text', () => {
  const { getByText } = renderHomePage();
  expect(getByText(/Connecting volunteers to their/i)).toBeInTheDocument();
  expect(getByText(/vision of a better community/i)).toBeInTheDocument();
});

test('renders volunteer section headline', () => {
  const { getByText } = renderHomePage();
  expect(getByText(/Volunteer and make a difference today/i)).toBeInTheDocument();
});

test('renders volunteer section subtext', () => {
  const { getByText } = renderHomePage();
  expect(getByText(/Discover meaningful opportunities, apply quickly/i)).toBeInTheDocument();
});

test('renders organization section headline', () => {
  const { getByText, getByRole } = renderHomePage();
  expect(getByText(/Join and find/i)).toBeInTheDocument();
  expect(getByRole('heading', { name: /passionate volunteers/i })).toBeInTheDocument();
});

test('renders organization section subtext', () => {
  const { getByText } = renderHomePage();
  expect(getByText(/Publish volunteering opportunities, review applications/i)).toBeInTheDocument();
});

// ─── Card Labels ─────────────────────────────────────────────────────────────

test('renders "For Individuals" label', () => {
  const { getByText } = renderHomePage();
  expect(getByText('For Individuals')).toBeInTheDocument();
});

test('renders "I want to help" heading', () => {
  const { getByText } = renderHomePage();
  expect(getByText('I want to help')).toBeInTheDocument();
});

test('renders "For Organizations" label', () => {
  const { getByText } = renderHomePage();
  expect(getByText('For Organizations')).toBeInTheDocument();
});

test('renders "I want help" heading', () => {
  const { getByText } = renderHomePage();
  expect(getByText('I want help')).toBeInTheDocument();
});

// ─── Key Features Section ────────────────────────────────────────────────────

test('renders "Key features" section heading', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Key features')).toBeInTheDocument();
});

test('renders "Easy applications" feature card', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Easy applications')).toBeInTheDocument();
  expect(getByText(/A simple application flow that helps volunteers apply quickly/i)).toBeInTheDocument();
});

test('renders "Crises prioritization" feature card', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Crises prioritization')).toBeInTheDocument();
  expect(getByText(/Pinned crises help volunteers discover urgent opportunities/i)).toBeInTheDocument();
});

test('renders "Certificate generation" feature card', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Certificate generation')).toBeInTheDocument();
  expect(getByText(/Verified certificates that turn effort into proof/i)).toBeInTheDocument();
});

test('renders "Skill-based matching" feature card', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Skill-based matching')).toBeInTheDocument();
  expect(getByText(/Volunteers can discover opportunities that align more naturally/i)).toBeInTheDocument();
});

test('renders "Verified organizations" feature card', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Verified organizations')).toBeInTheDocument();
  expect(getByText(/Approval and review flows help volunteers connect with trusted/i)).toBeInTheDocument();
});

// ─── Guide CTA ───────────────────────────────────────────────────────────────

test('"Want to Learn More?" section renders', () => {
  const { getByText } = renderHomePage();
  expect(getByText('Want to Learn More?')).toBeInTheDocument();
  expect(getByText(/Check out our guide page for full details/i)).toBeInTheDocument();
});

test('"Read Our Guide" renders and links to /guide', () => {
  const { getByText } = renderHomePage();
  const link = getByText('Read Our Guide').closest('a');
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/guide');
});

// ─── Guest State ─────────────────────────────────────────────────────────────

test('(guest) shows two Log In links, both pointing to /login', () => {
  const { getAllByRole } = renderHomePage();
  const loginLinks = getAllByRole('link', { name: /log in/i });
  expect(loginLinks.length).toBeGreaterThanOrEqual(2);
  loginLinks.forEach(link => expect(link).toHaveAttribute('href', '/login'));
});

test('(guest) volunteer-side Log In button has correct testid, text, and href', () => {
  const { getByTestId } = renderHomePage();
  const loginBtn = getByTestId('volunteer-login-button');
  expect(loginBtn).toBeInTheDocument();
  expect(loginBtn).toHaveTextContent('Log In');
  expect(loginBtn).toHaveAttribute('href', '/login');
});

test('(guest) "Create Volunteer Account" renders and links to /volunteer/create', () => {
  const { getByText } = renderHomePage();
  const btn = getByText('Create Volunteer Account').closest('a');
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveAttribute('href', '/volunteer/create');
});

test('(guest) "Request Organization Account" renders and links to /organization/request', () => {
  const { getByText } = renderHomePage();
  const btn = getByText('Request Organization Account').closest('a');
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveAttribute('href', '/organization/request');
});

test('(guest) does NOT show any "Go to Dashboard" button', () => {
  const { queryByText } = renderHomePage();
  expect(queryByText('Go to Dashboard')).toBeNull();
});

test('(guest) does NOT show "Go to Admin Dashboard"', () => {
  const { queryByText } = renderHomePage();
  expect(queryByText(/Go to Admin Dashboard/i)).toBeNull();
});

test('(guest) does NOT show "Manage Volunteers" or "Manage Organizations"', () => {
  const { queryByText } = renderHomePage();
  expect(queryByText('Manage Volunteers')).toBeNull();
  expect(queryByText('Manage Organizations')).toBeNull();
});

// ─── Volunteer Role ───────────────────────────────────────────────────────────

test('(volunteer) "Go to Dashboard" renders as a link to /volunteer', () => {
  const { getByText } = renderHomePage('volunteer');
  const btn = getByText('Go to Dashboard').closest('a');
  expect(btn).not.toBeNull();
  expect(btn).toHaveAttribute('href', '/volunteer');
});

test('(volunteer) shows disabled "Volunteer Account Active" in org card', () => {
  const { getByText } = renderHomePage('volunteer');
  const disabledBtn = getByText('Volunteer Account Active');
  expect(disabledBtn).toBeInTheDocument();
  expect(disabledBtn.closest('button')).toBeDisabled();
});

test('(volunteer) does NOT show any Log In buttons', () => {
  const { queryByTestId, queryByRole } = renderHomePage('volunteer');
  expect(queryByTestId('volunteer-login-button')).toBeNull();
  expect(queryByRole('link', { name: /log in/i })).toBeNull();
});

test('(volunteer) does NOT show "Create Volunteer Account"', () => {
  const { queryByText } = renderHomePage('volunteer');
  expect(queryByText('Create Volunteer Account')).toBeNull();
});

test('(volunteer) does NOT show "Request Organization Account"', () => {
  const { queryByText } = renderHomePage('volunteer');
  expect(queryByText('Request Organization Account')).toBeNull();
});

test('(volunteer) does NOT show admin controls', () => {
  const { queryByText } = renderHomePage('volunteer');
  expect(queryByText(/Go to Admin Dashboard/i)).toBeNull();
  expect(queryByText('Manage Volunteers')).toBeNull();
  expect(queryByText('Manage Organizations')).toBeNull();
});

// ─── Organization Role ────────────────────────────────────────────────────────

test('(organization) "Go to Dashboard" renders as a link to /organization', () => {
  const { getByText } = renderHomePage('organization');
  const btn = getByText('Go to Dashboard').closest('a');
  expect(btn).not.toBeNull();
  expect(btn).toHaveAttribute('href', '/organization');
});

test('(organization) shows disabled "Organization Account Active" in volunteer card', () => {
  const { getByText } = renderHomePage('organization');
  const disabledBtn = getByText('Organization Account Active');
  expect(disabledBtn).toBeInTheDocument();
  expect(disabledBtn.closest('button')).toBeDisabled();
});

test('(organization) does NOT show any Log In buttons', () => {
  const { queryByTestId, queryByRole } = renderHomePage('organization');
  expect(queryByTestId('volunteer-login-button')).toBeNull();
  expect(queryByRole('link', { name: /log in/i })).toBeNull();
});

test('(organization) does NOT show "Create Volunteer Account"', () => {
  const { queryByText } = renderHomePage('organization');
  expect(queryByText('Create Volunteer Account')).toBeNull();
});

test('(organization) does NOT show "Request Organization Account"', () => {
  const { queryByText } = renderHomePage('organization');
  expect(queryByText('Request Organization Account')).toBeNull();
});

test('(organization) does NOT show admin controls', () => {
  const { queryByText } = renderHomePage('organization');
  expect(queryByText(/Go to Admin Dashboard/i)).toBeNull();
  expect(queryByText('Manage Volunteers')).toBeNull();
  expect(queryByText('Manage Organizations')).toBeNull();
});

// ─── Admin Role ───────────────────────────────────────────────────────────────

test('(admin) "Go to Admin Dashboard" renders and links to /admin', () => {
  const { getByText } = renderHomePage('admin');
  const btn = getByText(/Go to Admin Dashboard/i).closest('a');
  expect(btn).toBeInTheDocument();
  expect(btn).toHaveAttribute('href', '/admin');
});

test('(admin) does NOT show "Manage Volunteers" or "Manage Organizations" links', () => {
  const { queryByText } = renderHomePage('admin');
  expect(queryByText('Manage Volunteers')).toBeNull();
  expect(queryByText('Manage Organizations')).toBeNull();
});

test('(admin) does NOT show any Log In buttons', () => {
  const { queryByTestId, queryByRole } = renderHomePage('admin');
  expect(queryByTestId('volunteer-login-button')).toBeNull();
  expect(queryByRole('link', { name: /log in/i })).toBeNull();
});

test('(admin) does NOT show "Create Volunteer Account"', () => {
  const { queryByText } = renderHomePage('admin');
  expect(queryByText('Create Volunteer Account')).toBeNull();
});

test('(admin) does NOT show "Request Organization Account"', () => {
  const { queryByText } = renderHomePage('admin');
  expect(queryByText('Request Organization Account')).toBeNull();
});

// ─── Stats Loading States ─────────────────────────────────────────────────────

test('shows loading spinner while fetching stats', () => {
  requestServerMock.mockImplementation(() => new Promise(() => {}));
  const { container } = renderHomePage();
  expect(container.querySelector('.loading-spinner')).not.toBeNull();
});

test('carousel is present in DOM while stats are loading', () => {
  requestServerMock.mockImplementation(() => new Promise(() => {}));
  const { container } = renderHomePage();
  expect(container.querySelector('.loading-spinner')).not.toBeNull();
  expect(container.querySelector('[data-testid="stats-explore-link"]')).not.toBeNull();
});

test('carousel shows "..." placeholders while stats are loading', () => {
  requestServerMock.mockImplementation(() => new Promise(() => {}));
  const { getAllByText } = renderHomePage();
  expect(getAllByText('...').length).toBeGreaterThan(0);
});

test('shows error state when stats request fails', async () => {
  requestServerMock.mockRejectedValue(new Error('Network error'));
  const { getByText } = renderHomePage();
  await screen.findByText(/Failed to load stats/i);
  expect(getByText(/Failed to load stats/i)).toBeInTheDocument();
});

test('carousel is not rendered when stats fail to load', async () => {
  requestServerMock.mockRejectedValue(new Error('Network error'));
  const { container } = renderHomePage();
  await screen.findByText(/Failed to load stats/i);
  expect(container.querySelector('[data-testid="stats-explore-link"]')).toBeNull();
});

test('hides error text and spinner when stats load successfully', async () => {
  renderHomePage();
  const exploreLink = await screen.findByTestId('stats-explore-link');
  expect(exploreLink).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.queryByText('Failed to load stats')).toBeNull();
  });
});

// ─── Stats Carousel explore path by role ─────────────────────────────────────

test('(guest) StatsCarousel explore path points to /login', async () => {
  renderHomePage();
  const exploreLink = await screen.findByTestId('stats-explore-link');
  expect(exploreLink).toHaveAttribute('href', '/login');
});

test('(volunteer) StatsCarousel explore path points to /volunteer', async () => {
  renderHomePage('volunteer');
  const exploreLink = await screen.findByTestId('stats-explore-link');
  expect(exploreLink).toHaveAttribute('href', '/volunteer');
});

test('(organization) StatsCarousel explore path points to /organization', async () => {
  renderHomePage('organization');
  const exploreLink = await screen.findByTestId('stats-explore-link');
  expect(exploreLink).toHaveAttribute('href', '/organization');
});

test('(admin) StatsCarousel explore path points to /admin', async () => {
  renderHomePage('admin');
  const exploreLink = await screen.findByTestId('stats-explore-link');
  expect(exploreLink).toHaveAttribute('href', '/admin');
});
