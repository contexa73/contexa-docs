interface ApiMethodProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description?: string;
}

export default function ApiMethod({method, path, description}: ApiMethodProps) {
  return (
    <div className="api-method">
      <span className={`method-badge method-badge--${method.toLowerCase()}`}>
        {method}
      </span>
      <span className="method-path">{path}</span>
      {description && (
        <span style={{marginLeft: '0.75rem', color: 'var(--ifm-font-color-secondary)', fontSize: '0.875rem'}}>
          {description}
        </span>
      )}
    </div>
  );
}
