import { PageContainer } from "../components/layout/PageContainer";

const UPDATED_AT = "March 25, 2026";

export function PrivacyPolicy() {
  return (
    <PageContainer
      title="Privacy Policy"
      subtitle="How poneglyph.one collects, uses, and handles information."
    >
      <div className="space-y-8 text-sm text-text-secondary">
        <section>
          <p className="text-xs uppercase tracking-wider text-text-muted">Last Updated</p>
          <p className="mt-1 text-text-primary">{UPDATED_AT}</p>
        </section>

        <PolicySection title="Overview">
          <p>
            poneglyph.one is a public One Piece Card Game database, reference site, and public API. We do not offer
            user accounts, and we do not intentionally collect more personal information than is reasonably necessary to
            operate, secure, and improve the site.
          </p>
          <p>
            This Privacy Policy explains what information we collect, how we use it, when we may share it, and how
            submitter-related requests are handled.
          </p>
        </PolicySection>

        <PolicySection title="Information We Collect">
          <ul className="space-y-2 list-disc pl-5">
            <li>Basic request and device information commonly sent when you use a website, such as IP address, browser, operating system, and request timing.</li>
            <li>Usage information such as page requests, API requests, and search queries.</li>
            <li>Security, abuse-prevention, and rate-limit information used to protect the site and API.</li>
            <li>Information you choose to send directly if you contact us.</li>
            <li>If scan submissions are enabled, uploaded files, submission metadata, required contact information, optional public credit name, and related moderation records.</li>
          </ul>
        </PolicySection>

        <PolicySection title="Scan Submissions and Contact Information">
          <p>
            If poneglyph.one accepts user-submitted scans, submitters may be required to provide a contact email or
            other contact method at the time of submission. That contact method may be used to verify later requests
            related to the submission, including removal, correction, or attribution changes.
          </p>
          <p>
            Submitters may also be allowed to provide a separate public credit name. Public credit names may be
            displayed publicly with submitted scans. Contact information used for verification is not intended to be
            displayed publicly.
          </p>
        </PolicySection>

        <PolicySection title="How We Use Information">
          <ul className="space-y-2 list-disc pl-5">
            <li>To operate the site, search tools, public API, and database features.</li>
            <li>To secure the site, detect abuse, enforce rate limits, and prevent fraud or misuse.</li>
            <li>To monitor reliability, performance, and overall usage patterns.</li>
            <li>To respond to support, privacy, legal, moderation, or takedown requests.</li>
            <li>To review, moderate, host, display, credit, edit, or remove submitted scans or other user-provided content.</li>
          </ul>
        </PolicySection>

        <PolicySection title="Cookies and Analytics">
          <p>
            poneglyph.one does not use cookies for accounts, advertising, or behavioral tracking.
          </p>
          <p>
            We do use Cloudflare Analytics and related infrastructure-level measurement and security tools to understand
            aggregate site traffic, monitor performance, and protect the site from abuse.
          </p>
        </PolicySection>

        <PolicySection title="When We Share Information">
          <p>We do not sell personal information.</p>
          <p>We may share information only when reasonably necessary, including:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>With service providers and infrastructure vendors that help host, analyze, secure, or operate the site.</li>
            <li>To comply with legal obligations, lawful requests, or to protect the rights, safety, and security of the site, its users, or others.</li>
            <li>As part of a business transfer, sale, or reorganization involving the site or related assets.</li>
          </ul>
        </PolicySection>

        <PolicySection title="Retention">
          <p>
            We retain information only for as long as reasonably necessary for the purposes described in this Privacy
            Policy, including operations, security, moderation, legal compliance, and recordkeeping.
          </p>
          <p>
            If submitted scans are removed, we may still retain limited internal records where reasonably necessary for
            safety, abuse prevention, legal compliance, dispute resolution, or internal recordkeeping.
          </p>
        </PolicySection>

        <PolicySection title="Removal, Correction, and Attribution Requests">
          <p>
            If a submission is tied to a required contact method, we may use that contact method to verify whether a
            later request to remove a scan, correct submission details, or change public credit is being made by the
            original submitter.
          </p>
          <p>
            If a required contact method was not provided, or if control of the contact method provided with the
            submission cannot later be verified, we may be unable to process submitter-specific requests relating to
            that submission.
          </p>
          <p>
            We may also review other valid takedown, deletion, privacy, ownership, or copyright-related requests when
            appropriate. We may decline or limit a request where we need to keep certain information for legal reasons,
            security, abuse prevention, dispute resolution, or internal recordkeeping.
          </p>
        </PolicySection>

        <PolicySection title="Your Privacy Rights">
          <p>
            Depending on where you live, you may have rights relating to personal information, such as rights to
            request access, correction, or deletion, subject to legal exceptions and applicability requirements.
          </p>
        </PolicySection>

        <PolicySection title="Children">
          <p>
            poneglyph.one is not directed to children under 13, and we do not knowingly collect personal information
            from children under 13. If you believe a child has provided personal information to the site, contact us so
            we can review and address the issue.
          </p>
        </PolicySection>

        <PolicySection title="International Visitors">
          <p>
            If you access the site from outside the United States, you understand that information may be processed in
            the United States or other jurisdictions where our service providers operate.
          </p>
        </PolicySection>

        <PolicySection title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will update the date
            at the top of this page and revise the text here.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            For privacy, deletion, or submission-related requests, use the contact method published on poneglyph.one.
          </p>
        </PolicySection>
      </div>
    </PageContainer>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
      <div className="space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
