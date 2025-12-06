import { Music } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const DataDeletion = () => {
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
          <h2 className="text-4xl font-bold mb-4">Data Deletion Instructions</h2>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Content */}
        <div className="bg-gradient-glass backdrop-blur-sm border border-white/10 rounded-xl p-8 space-y-8">
          <section>
            <h3 className="text-2xl font-semibold mb-4">How to Request Data Deletion</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              At EchoVerse, we respect your privacy and provide you with the ability to delete your account and all associated data. 
              You can request deletion of your personal data at any time through the following methods:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Through the App:</strong> Go to Settings → Account → Delete Account</li>
              <li><strong>Via Email:</strong> Send a deletion request to support@echoverse.com with the subject "Data Deletion Request"</li>
              <li><strong>Through Facebook:</strong> If you signed up using Facebook, you can request data deletion through Facebook's data deletion callback URL</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">What Data Will Be Deleted</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you request account deletion, the following data will be permanently removed from our systems:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Your account information (name, email, password)</li>
              <li>Your profile data (avatar, bio, preferences)</li>
              <li>Your listening history and playlists</li>
              <li>Your favorite songs and albums</li>
              <li>Your social connections and friend lists</li>
              <li>Your chat messages and conversations</li>
              <li>Your subscription and payment history</li>
              <li>Your uploaded content (if any)</li>
              <li>All other personal data associated with your account</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">Data Retention</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Please note that some data may be retained for a limited period for legal or business purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Legal Requirements:</strong> We may retain certain information as required by law, such as transaction records for tax purposes</li>
              <li><strong>Backup Systems:</strong> Data in backup systems may take up to 90 days to be fully deleted</li>
              <li><strong>Anonymized Data:</strong> We may retain anonymized, aggregated data that cannot be linked to you personally</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">Processing Time</h3>
            <p className="text-muted-foreground leading-relaxed">
              Once you submit a deletion request:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
              <li>We will process your request within 30 days</li>
              <li>You will receive a confirmation email once the deletion is complete</li>
              <li>Your account will be immediately deactivated upon request</li>
              <li>All data will be permanently deleted within 90 days</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">Third-Party Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you signed up using a third-party service (Google, Facebook), you may also need to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Revoke access to EchoVerse in your third-party account settings</li>
              <li>Request data deletion from the third-party service if needed</li>
              <li>Note that we cannot delete data stored by third-party services</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">Reactivation</h3>
            <p className="text-muted-foreground leading-relaxed">
              Once your account is deleted, it cannot be reactivated. You will need to create a new account if you wish to use EchoVerse again. 
              All your previous data, including playlists, favorites, and listening history, will be permanently lost and cannot be recovered.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-semibold mb-4">Contact Us</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have any questions about data deletion or need assistance with the process, please contact us:
            </p>
            <p className="text-muted-foreground">
              Email: support@echoverse.com<br />
              Subject: Data Deletion Request<br />
              Response Time: Within 48 hours
            </p>
          </section>

          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2 text-yellow-400">⚠️ Important Notice</h3>
            <p className="text-muted-foreground leading-relaxed">
              Account deletion is permanent and irreversible. Please ensure you have exported any data you wish to keep before requesting deletion. 
              We recommend downloading your playlists and favorite songs before proceeding.
            </p>
          </section>
        </div>

        <div className="text-center mt-8 space-y-4">
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
          </div>
          <div>
            <Link to="/" className="text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DataDeletion;

