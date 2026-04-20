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
        By using Bleepx (BleepxQuery &amp; BleepxLab), you agree to these terms.
        If you don&apos;t agree, please don&apos;t use the service. Short version:
        <strong> use it to learn, don&apos;t abuse it, and we make no warranties.</strong>
      </p>

      <h2>1. The service</h2>
      <p>
        Bleepx is a free, self-serve learning platform offering interactive SQL challenges (BleepxQuery)
        and data-science projects in Python/R (BleepxLab). All code execution happens <strong>in your browser</strong>
        via WebAssembly (sql.js, Pyodide) — we do not run your code on our servers.
      </p>

      <h2>2. Accounts &amp; sign-in</h2>
      <ul>
        <li>Sign-in is via GitHub OAuth. You must have a valid GitHub account and agree to GitHub&apos;s terms.</li>
        <li>You are responsible for activity under your account.</li>
        <li>Browsing the site is free and requires no account. Solving challenges, saving progress cross-device, and pushing to GitHub require sign-in.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to break, overload, or reverse-engineer the service.</li>
        <li>Use the service to distribute malware, illegal content, or to harm others.</li>
        <li>Scrape large portions of the content without permission.</li>
        <li>Resell, rebrand, or redistribute Bleepx&apos;s exercises without attribution.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        Code you write in Bleepx belongs to you. When you click &ldquo;Export to GitHub&rdquo;,
        we push that code to <strong>your own</strong> GitHub repository using the OAuth token you granted.
        We do not claim ownership, sell, or publish your code elsewhere.
      </p>

      <h2>5. Our content</h2>
      <p>
        Exercises, case studies, tutorials, and curriculum content are &copy; Bleepx and licensed
        for <strong>personal learning use only</strong>. You may reference them in your portfolio
        and mention Bleepx as the source; you may not repackage them into a competing product.
      </p>

      <h2>6. Third-party datasets</h2>
      <p>
        Many Lab projects reference Kaggle datasets. Those datasets are owned by their respective
        publishers and subject to each dataset&apos;s license. Bleepx does not host or redistribute them.
      </p>

      <h2>7. Availability</h2>
      <p>
        Bleepx is a free-tier hosted project. We may pause, restart, migrate, or discontinue the service
        at any time without notice. There is no uptime guarantee.
      </p>

      <h2>8. Warranty &amp; liability</h2>
      <p>
        Bleepx is provided &ldquo;as is&rdquo;, without any warranty, express or implied.
        To the maximum extent permitted by law, Bleepx is not liable for any indirect,
        incidental, or consequential damages arising from use of the service.
      </p>

      <h2>9. Termination</h2>
      <p>
        You can stop using Bleepx and delete your account at any time from the profile page.
        We may suspend accounts that violate these terms.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. Material changes will be announced on the home page.
        Continued use after changes means you accept the new terms.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of France, without regard to conflict-of-law principles.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions? Open an issue on <a href="https://github.com/Landrykb/sql-train" target="_blank" rel="noopener noreferrer">GitHub</a>
        {' '}or email <a href="mailto:hello@bleepx.dev">hello@bleepx.dev</a>.
      </p>

      <p className="mt-8 text-sm">
        <Link href="/">&larr; Back to Bleepx</Link>
      </p>
    </article>
  );
}
