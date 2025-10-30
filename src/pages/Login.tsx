import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Music, Mail, Lock, User, Eye, EyeOff, Github, Chrome } from "lucide-react";
import { authApi } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);


  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log('ðŸ” Attempting login...');
      const response = await authApi.login({
        email: loginData.email,
        password: loginData.password,
        rememberMe,
      });

      console.log('âœ… Login response:', response);

      if (!response.token) {
        throw new Error('No token received from server');
      }

      // Persist token in both storages to avoid losing auth across tabs/windows
      try {
        localStorage.setItem("token", response.token);
      } catch {}
      try {
        sessionStorage.setItem("token", response.token);
      } catch {}

      // Fetch current user and persist userId for flows that rely on it
      try {
        const me = await authApi.me();
        const uid = (me && (me.id || me.userId)) ? String(me.id || me.userId) : undefined;
        if (uid) {
          try { localStorage.setItem('userId', uid); } catch {}
          try { sessionStorage.setItem('userId', uid); } catch {}
        }
      } catch { /* ignore */ }

      console.log('âœ… User authenticated, redirecting...');

      // Navigate to home page immediately after successful login
      navigate('/');
    } catch (err) {
      console.error('âŒ Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // const handleLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   setError("");
  //   setSuccess("");

  //   try {
  //     const response = await authApi.login({
  //       email: loginData.email,
  //       password: loginData.password
  //     });

  //     setSuccess("Login successful!");
  //     // Store token or user data if needed
  //     if (response.token) {
  //       localStorage.setItem('token', response.token);
  //     }

  //     // Navigate to home page after successful login
  //     setTimeout(() => {
  //       navigate('/');
  //     }, 1000);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Login failed');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password
      });

      setSuccess("OTP sent! Please check your email.");
      setPendingEmail(registerData.email);
      setShowOtpModal(true); 

      // Clear the form
      setRegisterData({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });

      // Switch to login tab after successful registration
      setTimeout(() => {
        setActiveTab("login");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyOtp = async (otp: string) => {
    try {
      const response = await authApi.verifyOtp({
        email: pendingEmail,
        otp
      });
  
      setSuccess("Registration successful! Please log in.");
      setShowOtpModal(false);
      setTimeout(() => setActiveTab("login"), 1000);
    } catch (err: any) {
      throw new Error(err.message || "Invalid OTP");
    }
  };
  

  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    // Mock social login
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1000);
  };

  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetResetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Logic gửi OTP
  const handleSendOtpReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    setResetLoading(true);
    try {
      await authApi.sendResetPasswordOtp(resetEmail);
      setResetSuccess("OTP đã gửi thành công! Kiểm tra email của bạn.");
      setResetStep(2);
    } catch (err: any) {
      setResetError(err.message || "Gửi OTP thất bại.");
    } finally {
      setResetLoading(false);
    }
  };
  // Logic nhập OTP + password mới
  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    setResetLoading(true);
    try {
      await authApi.resetPasswordWithOtp(resetEmail, resetOtp, resetNewPassword);
      setResetSuccess("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập.");
      setTimeout(() => { setActiveTab("login"); }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Đặt lại mật khẩu lỗi");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-3 mb-4 cursor-pointer select-none"
            onClick={() => navigate('/')}
            role="button"
            aria-label="Go to Home"
          >
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Music className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoVerse
            </h1>
          </div>
          <p className="text-muted-foreground">
            Your gateway to the music universe
          </p>
        </div>

        <Card className="bg-gradient-glass backdrop-blur-sm border-white/10 shadow-2xl">
          <CardContent className="p-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                setShowResetPassword(false); // khi đổi tab thì ẩn form lấy lại mật khẩu
              }}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="register">Đăng ký</TabsTrigger>
              </TabsList>

              {/* Fixed-height container to keep layout stable and center content */}
              <div className="min-h-[520px] flex flex-col justify-center">
                {showResetPassword && (
                  <div className="mt-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Quên mật khẩu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {resetStep === 1 && (
                          <form onSubmit={handleSendOtpReset} className="space-y-4">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={resetEmail}
                              onChange={e => setResetEmail(e.target.value)}
                              placeholder="Nhập email đăng ký"
                              required
                            />
                            {resetError && <div className="text-red-600 text-sm">{resetError}</div>}
                            {resetSuccess && <div className="text-green-600 text-sm">{resetSuccess}</div>}
                            <Button type="submit" disabled={resetResetLoading} className="w-full">Gửi mã OTP</Button>
                          </form>
                        )}
                        {resetStep === 2 && (
                          <form onSubmit={handleResetWithOtp} className="space-y-4">
                            <Label>Mã OTP đã gửi về email</Label>
                            <Input
                              type="text"
                              value={resetOtp}
                              onChange={e => setResetOtp(e.target.value)}
                              placeholder="Nhập mã OTP"
                              required
                            />
                            <Label>Mật khẩu mới</Label>
                            <Input
                              type="password"
                              value={resetNewPassword}
                              onChange={e => setResetNewPassword(e.target.value)}
                              placeholder="Nhập mật khẩu mới (>=6 ký tự)"
                              required
                            />
                            {resetError && <div className="text-red-600 text-sm">{resetError}</div>}
                            {resetSuccess && <div className="text-green-600 text-sm">{resetSuccess}</div>}
                            <Button type="submit" disabled={resetResetLoading} className="w-full">Đặt lại mật khẩu</Button>
                            <Button variant="ghost" type="button" className="w-full" onClick={() => { setResetStep(1); setResetOtp(""); setResetNewPassword(""); }}>Nhập lại email</Button>
                          </form>
                        )}
                        <Button variant="outline" className="w-full mt-4" type="button" onClick={() => { setShowResetPassword(false); setResetError(""); setResetSuccess(""); setResetEmail(""); setResetOtp(""); setResetNewPassword(""); setResetStep(1); }}>Quay lại đăng nhập</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <TabsContent value="login">
                  {!showResetPassword && (
                    <>
                      <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-center">Welcome Back!</CardTitle>
                        <p className="text-center text-muted-foreground text-sm">
                          Sign in to continue your musical journey
                        </p>
                      </CardHeader>

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                          {error}
                        </div>
                      )}

                      {/* Success message intentionally omitted for login success to avoid extra notification */}

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10"
                              value={loginData.email}
                              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10"
                              value={loginData.password}
                              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="remember" 
                              className="rounded border-gray-300"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)} />
                            <Label htmlFor="remember" className="text-sm">Remember me</Label>
                          </div>
                          <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setShowResetPassword(true)}>
                            Forgot password?
                          </Button>
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          variant="hero"
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing In..." : "Sign In"}
                        </Button>
                      </form>
                    </>
                  )}
                </TabsContent>
                <TabsContent value="register">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-center">Create an Account</CardTitle>
                    <p className="text-center text-muted-foreground text-sm">
                      Join EchoVerse and start your musical journey
                    </p>
                  </CardHeader>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-lg text-sm">
                      {success}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        className="pl-10"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          className="pl-10 pr-10"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      variant="hero"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing Up..." : "Sign Up"}
                    </Button>
                  </form>
                </TabsContent>
              </div>
            </Tabs>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("google")}
                  disabled={isLoading}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin("github")}
                  disabled={isLoading}
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
              </div>
            </div>

            <div className="text-center mt-6 text-sm text-muted-foreground">
              <p>
                By signing in, you agree to our{" "}
                <Button variant="link" className="p-0 h-auto text-sm">
                  Terms of Service
                </Button>{" "}
                and{" "}
                <Button variant="link" className="p-0 h-auto text-sm">
                  Privacy Policy
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
        <OtpModal
          open={showOtpModal}
          email={pendingEmail}
          onClose={() => setShowOtpModal(false)}
          onVerify={handleVerifyOtp}
        />
      </div>
    </div>
  );
};
interface OTPDialogProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
}
const OtpModal = ({ open, email, onClose, onVerify }: OTPDialogProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await onVerify(otp);
      setSuccess("âœ… Verification successful!");
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || "âŒ Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Verification</DialogTitle>
          <DialogDescription>
            We've sent a 6-digit verification code to <b>{email}</b>.
            Please enter it below to verify your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          <Input
            type="text"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="text-center text-lg tracking-widest font-mono"
            required
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-2">
            Didnâ€™t receive the code? <Button variant="link" className="p-0 text-xs">Resend</Button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Login;
