// src/utils/arrayUtils.ts
export const safeArray = <T>(array: T[] | undefined | null): T[] => {
  return Array.isArray(array) ? array : [];
};

export const safeLength = <T>(array: T[] | undefined | null): number => {
  return Array.isArray(array) ? array.length : 0;
};
