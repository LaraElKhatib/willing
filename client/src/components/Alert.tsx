import type { HTMLAttributes, ReactNode } from 'react';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

function Alert({ children, className, ...props }: AlertProps) {
  const alertClassName = ['alert', className].filter(Boolean).join(' ');

  return (
    <div className={alertClassName} {...props}>
      {children}
    </div>
  );
}

export default Alert;
