import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Bleepx',
  description: 'How Bleepx handles your data.',
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm sm:prose-base max-w-3xl mx-auto prose-headings:text-bleepx-text prose-p:text-bleepx-text-secondary prose-li:text-bleepx-text-secondary prose-a:text-teal-600">
      <h1>Privacy Policy</h1>
      <p className="text-xs text-bleepx-text-secondary">Last updated: April 2026</p>

      <p>
        Bleepx (BleepxQuery &amp; BleepxLab) is a learning platform that helps people train their SQL and data-science
        skills and build a public portfolio. Our main purpose is education, not data collection. This page explains
        what little data we do handle and why.
      </p>

      <h2>1. What we store</h2>
      <ul>
        <li><strong>Local progress (on your device):</strong> completed challenges, points, quiz scores, and preferences — stored in your browser&apos;s <code>localStorage</code>. It never leaves your device unless you sign in.</li>
        <li><strong>If you sign in with GitHub:</strong> your GitHub username, display name, avatar URL, and email (as provided by GitHub). We store an OAuth token only so you can push your own solved work to your own GitHub repositories when you click &ldquo;Export to GitHub&rdquo;.</li>
        <li><strong>Synced progress (Supabase):</strong> if you are signed in, your progress is saved to our database so you can switch devices.</li>
        <li><strong>Anonymous product analytics (PostHog, optional):</strong> page views and generic event names such as <code>case_viewed</code> or <code>lab_solved</code>. No IP logging, no session recording, no content of your code.</li>
      </ul>

      <h2>2. What we do NOT do</h2>
      <ul>
        <li>We do not sell, rent, or share your data with third parties.</li>
        <li>We do not run advertising trackers or fingerprinting.</li>
        <li>We do not record your session.</li>
        <li>We do not read your private GitHub repositories. The OAuth scope is limited to creating or updating the portfolio repositories you choose to export to.</li>
      </ul>

      <h2>3. Cookies &amp; local storage</h2>
      <p>
        We use <code>localStorage</code> for progress and preferences, and at most one analytics cookie (anonymous identifier)
        if you accept analytics. You can clear both at any time from your browser. Analytics can also be disabled via
        the consent banner on first visit or from your browser settings.
      </p>

      <h2>4. Third-party services we rely on</h2>
      <ul>
        <li><strong>GitHub</strong> — OAuth sign-in and portfolio export. See <Link href="https://docs.github.com/en/site-policy/privacy-policies" target="_blank" rel="noopener noreferrer">GitHub Privacy</Link>.</li>
        <li><strong>Supabase</strong> — authentication and progress sync database. See <Link href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy</Link>.</li>
        <li><strong>PostHog</strong> — anonymous product analytics. See <Link href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">PostHog Privacy</Link>.</li>
        <li><strong>Vercel</strong> — hosting and content delivery. See <Link href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Privacy</Link>.</li>
      </ul>

      <h2>5. Your rights</h2>
      <p>
        You can:
      </p>
      <ul>
        <li>Sign out and delete your synced data from the profile page at any time.</li>
        <li>Clear local progress via your browser&apos;s storage settings.</li>
        <li>Opt out of analytics via the cookie banner or your browser.</li>
        <li>Request data export or deletion by contacting us on <a href="https://www.linkedin.com/in/landrykb" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</li>
      </ul>

      <h2>6. International users</h2>
      <p>
        Bleepx is available worldwide. Your data may be processed in the regions where Supabase, Vercel, and PostHog
        operate (typically the United States and the European Union). We respect the applicable data-protection rules
        of your country of residence, including, where relevant, the EU GDPR, the UK GDPR, the California CCPA, and
        the Japanese APPI.
      </p>

      <h2>7. Changes</h2>
      <p>
        If we change this policy, we will update the &ldquo;last updated&rdquo; date at the top. Material changes will be
        announced on the home page.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions, requests, or concerns? The primary contact is{' '}
        <a href="https://www.linkedin.com/in/landrykb" target="_blank" rel="noopener noreferrer">LinkedIn</a>.
        You can also reach the maintainer on{' '}
        <a href="https://github.com/Landrykb" target="_blank" rel="noopener noreferrer">GitHub</a>{' '}
        (note: the source repository is private).
      </p>

      <p className="mt-8 text-sm">
        <Link href="/">&larr; Back to Bleepx</Link>
      </p>
    </article>
  );
}
