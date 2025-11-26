import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { useState, FormEvent } from "react";
import { Settings as SettingsIcon, Shield, Bell, Volume2, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { userApi } from "@/services/api/userApi";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  
  // Privacy Settings
  const [publicProfile, setPublicProfile] = useState(true);
  const [showListeningActivity, setShowListeningActivity] = useState(true);
  const [socialSharing, setSocialSharing] = useState(false);
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  
  // Playback Settings
  const [autoplay, setAutoplay] = useState(true);
  const [crossfade, setCrossfade] = useState(false);
  const [normalizeVolume, setNormalizeVolume] = useState(true);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassError, setChangePassError] = useState("");
  const [changePassSuccess, setChangePassSuccess] = useState("");

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangePassError("");
    setChangePassSuccess("");

    if (newPassword !== confirmNewPassword) {
      setChangePassError("Mật khẩu mới và xác nhận không trùng khớp");
      return;
    }

    try {
      setChangePassLoading(true);
      await userApi.changePassword(oldPassword, newPassword);
      setChangePassSuccess("Đổi mật khẩu thành công!");
      toast({
        title: "Đổi mật khẩu thành công",
        description: "Bạn có thể đăng nhập lại bằng mật khẩu mới.",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setShowChangePassword(false), 1200);
    } catch (error) {
      setChangePassError(
        error instanceof Error ? error.message : "Đổi mật khẩu thất bại"
      );
    } finally {
      setChangePassLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and settings</p>
        </div>
      </div>

      {/* Theme Settings */}
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Theme Settings
          </CardTitle>
          <CardDescription>
            Choose how EchoVerse looks to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-select" className="text-sm font-medium">
              Appearance
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control how your information is shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Public Profile</Label>
              <p className="text-xs text-muted-foreground">
                Allow others to see your profile and playlists
              </p>
            </div>
            <Switch
              checked={publicProfile}
              onCheckedChange={setPublicProfile}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show Listening Activity</Label>
              <p className="text-xs text-muted-foreground">
                Let friends see what you're currently playing
              </p>
            </div>
            <Switch
              checked={showListeningActivity}
              onCheckedChange={setShowListeningActivity}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Social Sharing</Label>
              <p className="text-xs text-muted-foreground">
                Allow sharing to social media platforms
              </p>
            </div>
            <Switch
              checked={socialSharing}
              onCheckedChange={setSocialSharing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive updates about new releases and features
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get notified about friend activity and recommendations
              </p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Playback Settings */}
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Playback Settings
          </CardTitle>
          <CardDescription>
            Customize your music listening experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Autoplay</Label>
              <p className="text-xs text-muted-foreground">
                Automatically play similar songs when your music ends
              </p>
            </div>
            <Switch
              checked={autoplay}
              onCheckedChange={setAutoplay}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Crossfade</Label>
              <p className="text-xs text-muted-foreground">
                Smoothly transition between songs
              </p>
            </div>
            <Switch
              checked={crossfade}
              onCheckedChange={setCrossfade}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Normalize Volume</Label>
              <p className="text-xs text-muted-foreground">
                Set the same volume level for all tracks
              </p>
            </div>
            <Switch
              checked={normalizeVolume}
              onCheckedChange={setNormalizeVolume}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="bg-gradient-glass backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account Actions
          </CardTitle>
          <CardDescription>
            Manage your account data and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Export My Data</Label>
              <p className="text-xs text-muted-foreground">
                Download a copy of your data
              </p>
            </div>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Change Password</Label>
              <p className="text-xs text-muted-foreground">
                Update your account password
              </p>
            </div>
            <Button
              variant={showChangePassword ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setShowChangePassword((prev) => !prev);
                setChangePassError("");
                setChangePassSuccess("");
              }}
            >
              {showChangePassword ? "Close" : "Change"}
            </Button>
          </div>
          {showChangePassword && (
            <form
              onSubmit={handleChangePassword}
              className="mt-4 space-y-4 rounded-lg border border-white/10 bg-background/60 p-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="old-password">Current password</Label>
                <Input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              {changePassError && (
                <p className="text-sm text-destructive">{changePassError}</p>
              )}
              {changePassSuccess && (
                <p className="text-sm text-emerald-400">{changePassSuccess}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={changePassLoading}>
                  {changePassLoading ? "Updating..." : "Save password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowChangePassword(false);
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setChangePassError("");
                    setChangePassSuccess("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Deactivate Account</Label>
              <p className="text-xs text-muted-foreground">
                Temporarily disable your account
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;