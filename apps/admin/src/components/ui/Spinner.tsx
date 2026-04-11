export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full border-t-transparent border-current text-primary-600 ${sizes[size]} ${className}`}
      role="status"
    >
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
