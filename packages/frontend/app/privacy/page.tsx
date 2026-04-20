import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Bleepx',
  description: 'How Bleepx handles your data. Short, plain-language privacy policy.',
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm sm:prose-base max-w-3xl mx-auto prose-headings:text-bleepx-text prose-p:text-bleepx-text-secondary prose-li:text-bleepx-text-secondary prose-a:text-teal-600">
      <h1>Privacy Policy</h1>
      <p className="text-xs text-bleepx-text-secondary">Last updated: April 2026</p>

      <p>
        Bleepx (BleepxQuery &amp; BleepxLab) is a free learning platform for SQL and data science.
        This page explains — in plain language — what data we collect and what we do with it.
        Short version: <strong>we collect the bare minimum, never sell anything, and you can opt out of analytics.</strong>
      </p>

      <h2>1. What we store</h2>
      <ul>
        <li><strong>Local progress (your device):</strong> completed challenges, points, quiz scores, settings — all in <code>localStorage</code>. Never leaves your browser unless you sign in.</li>
        <li><strong>If you sign in with GitHub:</strong> your GitHub username, display name, avatar URL, and email (provided by GitHub). We store an encrypted OAuth token to push to <em>your own</em> repos when you click &ldquo;Export to GitHub&rdquo;.</li>
        <li><strong>Synced progress (Supabase):</strong> if signed in, we sync your progress to our database so you can switch devices.</li>
        <li><strong>Anonymous analytics (PostHog, optional):</strong> page views and event names (e.g. <code>case_viewed</code>, <code>lab_solved</code>). No IP, no full URLs, no recording.</li>
      </ul>

      <h2>2. What we do NOT do</h2>
      <ul>
        <li>We do <strong>not</strong> sell, rent, or share your data with third parties.</li>
        <li>We do <strong>not</strong> run ad trackers or fingerprinting.</li>
        <li>We do <strong>not</strong> record your session (no video replays).</li>
        <li>We do <strong>not</strong> read your private GitHub repos — the OAuth scope is limited to creating/updating your portfolio repos.</li>
      </ul>

      <h2>3. Cookies &amp; local storage</h2>
      <p>
        We use <code>localStorage</code> for progress and settings, and one analytics cookie (anonymous ID) if you accept the banner.
        You can clear both anytime from your browser. Analytics can be disabled via the consent banner or browser settings.
      </p>

      <h2>4. Third-party services</h2>
      <ul>
        <li><strong>GitHub</strong> — OAuth sign-in &amp; portfolio export. <Link href="https://docs.github.com/en/site-policy/privacy-policies" target="_blank" rel="noopener noreferrer">GitHub Privacy</Link>.</li>
        <li><strong>Supabase</strong> — auth + progress sync database (hosted in the EU/US). <Link href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy</Link>.</li>
        <li><strong>PostHog</strong> — anonymous product analytics. <Link href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">PostHog Privacy</Link>.</li>
        <li><strong>Netlify</strong> — hosting. <Link href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer">Netlify Privacy</Link>.</li>
      </ul>

      <h2>5. Your rights</h2>
      <p>
        You can:
      </p>
      <ul>
        <li>Sign out and delete all cloud data from the profile page at any time.</li>
        <li>Clear local progress via your browser&apos;s storage settings.</li>
        <li>Opt out of analytics via the cookie banner or the profile page.</li>
        <li>Email us at <a href="mailto:privacy@bleepx.dev">privacy@bleepx.dev</a> to request data export or deletion.</li>
      </ul>

      <h2>6. Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the &ldquo;last updated&rdquo; date. Material changes will be announced on the home page.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions? Open an issue on <a href="https://github.com/Landrykb/sql-train" target="_blank" rel="noopener noreferrer">GitHub</a> or email <a href="mailto:privacy@bleepx.dev">privacy@bleepx.dev</a>.
      </p>

      <p className="mt-8 text-sm">
        <Link href="/">&larr; Back to Bleepx</Link>
      </p>
    </article>
  );
}
