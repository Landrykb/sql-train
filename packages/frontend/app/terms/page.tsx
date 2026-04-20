import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Bleepx',
  description: 'Terms of Service for Bleepx — BleepxQuery & BleepxLab learning platforms.',
};

export default function TermsPage() {
  return (
    <article className="prose prose-sm sm:prose-base max-w-3xl mx-auto prose-headings:text-bleepx-text prose-p:text-bleepx-text-secondary prose-li:text-bleepx-text-secondary prose-a:text-teal-600">
      <h1>Terms of Service</h1>
      <p className="text-xs text-bleepx-text-secondary">Last updated: April 2026</p>

      <p>
        By using Bleepx (BleepxQuery &amp; BleepxLab), you agree to these terms. If you do not agree, please do not use
        the service.
      </p>

      <h2>1. The service</h2>
      <p>
        Bleepx is a learning platform that helps people train their SQL and data-science skills and build a public
        portfolio. It offers interactive SQL challenges (BleepxQuery) and data-science projects in Python and R
        (BleepxLab). All code execution happens in your browser via WebAssembly (sql.js, Pyodide). We do not execute
        your code on our servers. We maintain internal systems and code necessary to operate the service.
      </p>

      <h2>2. Accounts &amp; sign-in</h2>
      <ul>
        <li>Sign-in is handled through GitHub OAuth. You must have a valid GitHub account and comply with GitHub&apos;s terms.</li>
        <li>You are responsible for activity performed under your account.</li>
        <li>Browsing the site is free and requires no account. Running code, submitting quiz answers, saving progress across devices, and pushing work to GitHub all require sign-in.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to break, overload, or reverse-engineer the service.</li>
        <li>Use the service to distribute malware, illegal content, or content that harms others.</li>
        <li>Scrape large portions of the content without permission.</li>
        <li>Resell, rebrand, or redistribute Bleepx exercises without attribution.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        Code you write in Bleepx belongs to you. When you click &ldquo;Export to GitHub&rdquo;, we push that code to your
        own GitHub repository using the OAuth token you granted. We do not claim ownership of your code, do not sell
        it, and do not publish it elsewhere.
      </p>

      <h2>5. Our content</h2>
      <p>
        Exercises, case studies, tutorials, and curriculum content are &copy; Bleepx and are licensed for personal
        learning use only. You may reference them in your own portfolio and mention Bleepx as the source; you may not
        repackage them into a competing product.
      </p>

      <h2>6. Third-party datasets</h2>
      <p>
        Many Lab projects reference Kaggle datasets. Those datasets belong to their respective publishers and are
        subject to each dataset&apos;s license. Bleepx does not host or redistribute them.
      </p>

      <h2>7. Availability</h2>
      <p>
        Bleepx is currently offered on a best-effort basis on free infrastructure tiers. We may pause, restart,
        migrate, or discontinue the service at any time without notice. We do not provide an uptime guarantee.
      </p>

      <h2>8. Pricing &amp; future paid features</h2>
      <p>
        Bleepx is currently free. We may introduce paid plans or premium features in the future. If we do, we will:
      </p>
      <ul>
        <li>Announce pricing clearly in advance on the home page.</li>
        <li>Keep a meaningful free tier so people can continue to train and build a portfolio at no cost.</li>
        <li>Only charge for new, clearly marked premium features — we will not retroactively paywall content that
          was previously free for a given user account.</li>
        <li>Update these terms with the specific pricing terms, refund policy, and billing provider before charging anyone.</li>
      </ul>

      <h2>9. Warranty &amp; liability</h2>
      <p>
        Bleepx is provided &ldquo;as is&rdquo;, without warranty of any kind, express or implied. To the maximum extent
        permitted by applicable law, Bleepx is not liable for any indirect, incidental, or consequential damages
        arising from use of the service. Nothing in these terms limits rights that cannot be limited under your
        local mandatory consumer-protection law.
      </p>

      <h2>10. Termination</h2>
      <p>
        You can stop using Bleepx and delete your account at any time from the profile page. We may suspend accounts
        that violate these terms.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these terms. Material changes will be announced on the home page. Continued use after a change
        means you accept the new terms.
      </p>

      <h2>12. Governing law &amp; international users</h2>
      <p>
        Bleepx is available worldwide, including the European Union, the United Kingdom, the United States, Japan,
        and other countries. These terms are intended to comply with the applicable consumer-protection and
        data-protection laws of your country of residence — including, where relevant, the EU GDPR, the UK GDPR,
        the California CCPA, and the Japanese APPI (Act on the Protection of Personal Information).
      </p>
      <p>
        Nothing in these terms removes or limits the mandatory rights granted to you by the laws of your country of
        residence. Where a local mandatory rule conflicts with these terms, that local rule prevails to the extent of
        the conflict.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions or concerns? The primary contact is{' '}
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
