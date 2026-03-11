interface ModuleBadgeProps {
  module: 'core' | 'identity' | 'iam' | 'soar';
}

const labels: Record<string, string> = {
  core: 'Core',
  identity: 'Identity',
  iam: 'IAM',
  soar: 'SOAR',
};

export default function ModuleBadge({module}: ModuleBadgeProps) {
  return (
    <span className={`module-badge module-badge--${module}`}>
      {labels[module] || module}
    </span>
  );
}
