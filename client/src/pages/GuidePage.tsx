import LinkButton from '../components/LinkButton';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-base-content/10 bg-base-200 p-10 shadow-xl">
        <h1 className="text-4xl font-black mb-4">Guide</h1>
        <p className="mb-6 text-base-content/80">
          This guide page contains all the information for volunteers and organizations. It is currently a placeholder and can be extended with detailed instructions, walkthroughs, and FAQ content.
        </p>
        <ul className="list-disc pl-5 text-base-content/80 space-y-2">
          <li>How to set up your profile</li>
          <li>How to find and apply for opportunities</li>
          <li>How to use the crisis filtering features</li>
          <li>How to manage enrollments and attendance</li>
        </ul>
        <div className="mt-8">
          <LinkButton to="/" color="secondary" layout="wide">
            Back to Home
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
