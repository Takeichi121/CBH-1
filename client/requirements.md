## Packages
framer-motion | For beautiful page transitions and micro-interactions
date-fns | For robust date formatting and manipulation
clsx | For conditional class names
tailwind-merge | For merging tailwind classes safely

## Notes
- Backend uses custom token-based auth where token is sent in request body, NOT cookies/headers.
- Frontend must manually store token in localStorage and include it in API calls.
- API returns { ok: boolean, message?: string } structure, need to handle errors manually based on 'ok' field.
- Mobile-first design required with bottom navigation for mobile, top for desktop.
