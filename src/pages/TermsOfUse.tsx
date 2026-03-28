import { PageContainer } from "../components/layout/PageContainer";

const UPDATED_AT = "March 28, 2026";

export function TermsOfUse() {
  return (
    <PageContainer
      title="Terms of Use"
      subtitle="Rules for using poneglyph.one, including the public site, API, and any future submission features."
    >
      <div className="space-y-8 text-sm text-text-secondary">
        <section>
          <p className="text-xs uppercase tracking-wider text-text-muted">Last Updated</p>
          <p className="mt-1 text-text-primary">{UPDATED_AT}</p>
        </section>

        <TermsSection title="Acceptance of These Terms">
          <p>
            By accessing or using poneglyph.one, you agree to these Terms of Use. If you do not agree, do not use the
            site, API, or any related services.
          </p>
        </TermsSection>

        <TermsSection title="About the Site">
          <p>
            poneglyph.one is an independent One Piece Card Game database, reference site, and public API. It is not
            produced by, endorsed by, supported by, or affiliated with Bandai.
          </p>
          <p>
            Card data, images, prices, legality information, and other materials may change, be incomplete, contain
            errors, or be removed at any time.
          </p>
          <p>
            Some outbound shopping links may be affiliate links, including TCGPlayer links. If you purchase through
            those links, poneglyph.one may earn a commission.
          </p>
        </TermsSection>

        <TermsSection title="Permitted Use">
          <p>You may use the site and API for lawful personal, editorial, research, community, and commercial purposes, subject to these Terms.</p>
          <p>You may not:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Use the site or API in violation of any law, regulation, or third-party right.</li>
            <li>Abuse, disrupt, scrape in a harmful way, overload, or interfere with the site, API, or infrastructure.</li>
            <li>Attempt to bypass rate limits, access controls, or protective measures.</li>
            <li>Misrepresent poneglyph.one as endorsing, certifying, or guaranteeing your product, content, or service.</li>
            <li>Use the site or API to facilitate fraud, spam, infringement, harassment, or other misuse.</li>
          </ul>
        </TermsSection>

        <TermsSection title="API Use">
          <p>
            The API is provided on an as-is and as-available basis. We may change endpoints, fields, rate limits,
            availability, or access rules at any time without notice.
          </p>
          <p>
            You are responsible for how you use the API and for any apps, websites, bots, datasets, workflows, or other
            outputs you build with it.
          </p>
          <p>
            To the maximum extent permitted by law, poneglyph.one is not responsible for third-party products, content,
            decisions, claims, or damages arising from or related to your use of the API or any downstream use of API
            data by you or anyone else.
          </p>
          <p>
            If you use API data in a public-facing product, you are responsible for your own disclosures, compliance,
            moderation, accuracy, and legal review.
          </p>
        </TermsSection>

        <TermsSection title="No Warranty">
          <p>
            The site, API, and all related content are provided without warranties of any kind, express or implied, to
            the fullest extent permitted by law. This includes implied warranties of merchantability, fitness for a
            particular purpose, title, non-infringement, accuracy, availability, and reliability.
          </p>
        </TermsSection>

        <TermsSection title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, poneglyph.one and its operators will not be liable for any indirect,
            incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue,
            data, goodwill, or business opportunity, arising out of or related to your use of the site, API, or related
            content.
          </p>
          <p>
            To the fullest extent permitted by law, poneglyph.one and its operators will also not be liable for claims
            based on the acts, omissions, outputs, products, content, or decisions of API users, downstream developers,
            data consumers, or other third parties.
          </p>
          <p>
            Nothing in these Terms excludes liability that cannot be excluded under applicable law.
          </p>
        </TermsSection>

        <TermsSection title="Intellectual Property and Source Data">
          <p>
            All third-party trademarks, card images, names, and related intellectual property remain the property of
            their respective owners. Your use of poneglyph.one does not grant you ownership of third-party intellectual
            property.
          </p>
          <p>
            You are responsible for evaluating your own rights to use any site or API content in your own projects,
            especially if you redistribute card images, pricing data, or other third-party materials.
          </p>
        </TermsSection>

        <TermsSection title="Future User Submissions">
          <p>
            If poneglyph.one later allows users to submit scans or other content, additional submission rules may apply.
            We may require a contact method and may refuse, moderate, remove, or restrict submissions at our discretion.
          </p>
          <p>
            By submitting content in the future, you may be required to grant poneglyph.one a license to host, display,
            review, moderate, and remove that content.
          </p>
        </TermsSection>

        <TermsSection title="Termination and Suspension">
          <p>
            We may suspend, restrict, or terminate access to the site or API at any time, with or without notice,
            including for abuse, excessive usage, legal risk, or violation of these Terms.
          </p>
        </TermsSection>

        <TermsSection title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. Continued use of the site or API after changes become effective
            means you accept the updated Terms.
          </p>
        </TermsSection>

        <TermsSection title="Contact">
          <p>
            For legal or policy questions, use the contact method published on poneglyph.one when one is made
            available. Until then, this page should be treated as a working public draft.
          </p>
        </TermsSection>
      </div>
    </PageContainer>
  );
}

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
      <div className="space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
