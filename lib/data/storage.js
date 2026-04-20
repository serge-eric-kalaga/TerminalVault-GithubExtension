import { STORAGE_KEYS } from '../utils/constants';

export const read = (key, fallback = []) => {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export const write = (key, value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const getCollection = (name) => read(STORAGE_KEYS[name]);
export const setCollection = (name, data) => write(STORAGE_KEYS[name], data);
