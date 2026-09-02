import React, { useState } from 'react';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: string;
};

const DEFAULT_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='100%' height='100%' fill='%23f3f4f6'/><g fill='%239ca3af' font-family='Arial, Helvetica, sans-serif' font-size='20' text-anchor='middle'><text x='50%' y='50%' dy='-10'>Image</text><text x='50%' y='50%' dy='20'>Unavailable</text></g></svg>`;

export const FallbackImage: React.FC<Props> = ({ src, alt = '', fallback = DEFAULT_FALLBACK, onError, ...rest }) => {
  const [current, setCurrent] = useState<string | undefined>(typeof src === 'string' ? src : undefined);

  React.useEffect(() => {
    setCurrent(typeof src === 'string' ? src : undefined);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // call user onError if present
    if (onError) onError(e as any);
    setCurrent(fallback);
  };

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img src={current} alt={alt} onError={handleError} {...rest} />
  );
};

export default FallbackImage;
