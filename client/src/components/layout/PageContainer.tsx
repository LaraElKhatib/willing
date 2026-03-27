import type { ReactNode } from 'react';

function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto flex flex-col gap-6">
        { children }
      </div>
    </div>
  );
}

export default PageContainer;
