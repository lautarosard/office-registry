import { z } from 'zod';

// zod probes `new Function` to speed up validation. The Content-Security-Policy
// forbids eval and reports the attempt, so switch that off. Import this before
// any schema is used.
z.config({ jitless: true });
