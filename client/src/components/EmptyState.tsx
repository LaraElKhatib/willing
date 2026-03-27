import type { LucideIcon } from 'lucide-react';

type PostingEmptyStateProps = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

function EmptyState({ title, description, Icon }: PostingEmptyStateProps) {
  return (
    <div className="hero bg-base-200 rounded-box p-10">
      <div className="hero-content text-center">
        <div className="max-w-md flex flex-col items-center">
          <Icon
            size={64}
            className="opacity-20 mb-4"
          />
          <p className="py-2 font-bold opacity-80">{title}</p>
          <p className="pb-6 opacity-60">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default EmptyState;
