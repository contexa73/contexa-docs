import type {ReactNode} from 'react';

interface StepsProps {
  children: ReactNode;
}

export default function Steps({children}: StepsProps) {
  return <ol className="steps">{children}</ol>;
}
