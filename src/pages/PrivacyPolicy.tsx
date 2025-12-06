import { Music } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
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
          <h2 className="text-4xl font-bold mb-4">Privacy Policy</h2>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-gradient-glass backdrop-blur-sm border border-white/10 rounded-xl p-8 space-y-8">
          <section>
            <h3 className="text-2xl font-semibold mb-4">1. Introduction</h3>
            <p className="text-muted-foreground leading-relaxed">
              EchoVerse ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our music streaming service and website.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">2. Information We Collect</h3>
            <h4 className="text-xl font-medium mb-3 mt-4">Personal Information</h4>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Register for an account (name, email address, password)</li>
              <li>Subscribe to our premium service (payment information)</li>
              <li>Contact us for support</li>
              <li>Participate in surveys or promotional activities</li>
            </ul>

            <h4 className="text-xl font-medium mb-3 mt-6">Usage Data</h4>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We automatically collect certain information when you use our service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Listening history and preferences</li>
              <li>Device information (type, operating system, browser)</li>
              <li>IP address and location data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and manage your account</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Personalize your experience and provide music recommendations</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues and fraudulent activity</li>
              <li>Send you marketing communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">5. Data Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet 
              or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent at any time</li>
              <li>Opt-out of marketing communications</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              For detailed information about how to request data deletion, please visit our{" "}
              <Link 
                to="/data-deletion"
                className="text-primary hover:underline"
              >
                Data Deletion Policy
              </Link>.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">7. Cookies and Tracking Technologies</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. 
              Cookies are files with a small amount of data which may include an anonymous unique identifier.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, 
              if you do not accept cookies, you may not be able to use some portions of our service.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">8. Children's Privacy</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for children under the age of 13. We do not knowingly collect personal information 
              from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, 
              please contact us so we can delete such information.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">9. International Data Transfers</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province, 
              country, or other governmental jurisdiction where data protection laws may differ from those in your jurisdiction.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy 
              periodically for any changes.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">11. Contact Us</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: privacy@echoverse.com<br />
              Address: EchoVerse Privacy Team
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

export default PrivacyPolicy;

