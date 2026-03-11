import type {ReactNode} from 'react';

interface ApiSignatureProps {
  method: string;
  returnType?: string;
  params?: string;
  children?: ReactNode;
}

export default function ApiSignature({method, returnType, params, children}: ApiSignatureProps) {
  return (
    <div className="api-signature">
      {returnType && <span className="return-type">{returnType} </span>}
      <span className="method-name">{method}</span>
      {params && <span className="params">({params})</span>}
      {children && <div style={{marginTop: '0.5rem', fontSize: '0.8125rem'}}>{children}</div>}
    </div>
  );
}
