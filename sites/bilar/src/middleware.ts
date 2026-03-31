// Next.js kräver att middleware-filen heter exakt middleware.ts.
// All guard-logik finns i proxy.ts — denna fil re-exporterar den.
export { proxy as middleware, config } from './proxy'
