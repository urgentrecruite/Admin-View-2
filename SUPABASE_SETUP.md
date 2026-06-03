# Supabase Setup

Use `SUPABASE_SETUP.sql` in the Supabase SQL Editor first.

## Steps

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. Paste the full contents of `SUPABASE_SETUP.sql`.
4. Run it once.
5. Go to `Authentication` > `Users`.
6. Create an admin user for yourself.
7. Deploy the admin and landing page again.
8. Open the admin page and sign in with the admin user.

## Static Website Setup

This project is currently plain HTML/CSS/JavaScript, not Vite or Next.js.

The pages load Supabase in this order:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="app.js"></script>
```

Do not use `process.env.VITE_*` in this static version because the browser will not replace those values unless the project is converted to a build-tool setup.

## Safe Keys

The frontend uses only:

- Project URL
- Publishable key

Do not put the direct connection string, database password, or service-role key into the website code.

## Buckets

The SQL creates two private Storage buckets:

- `candidate-cvs`
- `job-documents`

Public visitors can upload files into those buckets, but only authenticated admin users can read or manage them.
