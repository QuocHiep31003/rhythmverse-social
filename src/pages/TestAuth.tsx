import { useState } from "react";
import { authApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TestAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testGetCurrentUser = async () => {
    setLoading(true);
    setError("");
    setUser(null);

    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      console.log("✅ getCurrentUser Success:", userData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get user";
      setError(errorMsg);
      console.error("❌ getCurrentUser Error:", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const checkToken = () => {
    const token = localStorage.getItem('token');
    console.log("Token in localStorage:", token);
    if (!token) {
      alert("No token found! Please login first.");
    } else {
      alert(`Token found: ${token.substring(0, 20)}...`);
    }
  };

  // const clearToken = () => {
  //   localStorage.removeItem('token');
  //   setUser(null);
  //   alert("Token cleared!");
  // };

  return (
    <div className="min-h-screen bg-gradient-dark p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Test Auth API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Check Token Button */}
          <div>
            <Button onClick={checkToken} variant="outline" className="w-full">
              Check Token in localStorage
            </Button>
          </div>

          {/* Test getCurrentUser Button */}
          <div>
            <Button 
              onClick={testGetCurrentUser} 
              className="w-full"
              disabled={loading}
            >
              {loading ? "Loading..." : "Test getCurrentUser()"}
            </Button>
          </div>

          {/* Clear Token Button */}
          {/* <div>
            <Button onClick={clearToken} variant="destructive" className="w-full">
              Clear Token
            </Button>
          </div> */}

          {/* Display Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Display User Data */}
          {user && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-lg">
              <strong>✅ User Data:</strong>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-3 rounded-lg text-sm">
            <strong>Instructions:</strong>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>Login first to get a token</li>
              <li>Click "Check Token" to verify token exists</li>
              <li>Click "Test getCurrentUser()" to fetch user data</li>
              <li>Check console (F12) for detailed logs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAuth;