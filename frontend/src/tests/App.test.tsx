import { App } from '../App';

// TypeScript verification script checking router layout loading
export const runSmokeCheck = () => {
  if (typeof App === 'undefined') {
    throw new Error('App layout undefined');
  }
};
