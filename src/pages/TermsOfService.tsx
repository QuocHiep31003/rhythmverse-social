import { Music } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Music className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoVerse
            </h1>
          </Link>
          <h2 className="text-4xl font-bold mb-4">Terms of Service</h2>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-gradient-glass backdrop-blur-sm border border-white/10 rounded-xl p-8 space-y-8">
          <section>
            <h3 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using EchoVerse ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">2. Use License</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Permission is granted to temporarily access the materials on EchoVerse's website for personal, non-commercial transitory viewing only. 
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on EchoVerse's website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">3. User Accounts</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
              You are responsible for safeguarding the password and for all activities that occur under your account.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You may not use as a username the name of another person or entity or that is not lawfully available for use, 
              a name or trademark that is subject to any rights of another person or entity, or a name that is otherwise offensive, vulgar, or obscene.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">4. Content and Intellectual Property</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All content available on EchoVerse, including but not limited to music, text, graphics, logos, icons, images, audio clips, 
              digital downloads, and software, is the property of EchoVerse or its content suppliers and is protected by international copyright laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, 
              store, or transmit any of the material on our website without prior written consent.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">5. Premium Subscriptions</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              EchoVerse offers premium subscription plans that provide enhanced features and benefits. By subscribing to a premium plan, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Pay the subscription fee as specified at the time of purchase</li>
              <li>Automatic renewal of your subscription unless cancelled</li>
              <li>Subscription fees are non-refundable except as required by law</li>
              <li>You may cancel your subscription at any time through your account settings</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">6. Prohibited Uses</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may not use EchoVerse:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>In any way that violates any applicable national or international law or regulation</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
              <li>To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity</li>
              <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">7. Termination</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, 
              under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">8. Disclaimer</h3>
            <p className="text-muted-foreground leading-relaxed">
              The materials on EchoVerse's website are provided on an 'as is' basis. EchoVerse makes no warranties, expressed or implied, 
              and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, 
              fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h3>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall EchoVerse or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
              or due to business interruption) arising out of the use or inability to use the materials on EchoVerse's website, even if EchoVerse 
              or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">10. Changes to Terms</h3>
            <p className="text-muted-foreground leading-relaxed">
              EchoVerse reserves the right, at its sole discretion, to modify or replace these Terms at any time. 
              If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">11. Contact Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: support@echoverse.com<br />
              Address: EchoVerse Support Team
            </p>
          </section>
        </div>

        <div className="text-center mt-8">
          <Link to="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;

