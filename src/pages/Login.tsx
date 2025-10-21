import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { API_ENDPOINTS } from "@/config/api";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/chat");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validations
    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = isLogin
        ? API_ENDPOINTS.LOGIN
        : API_ENDPOINTS.SIGNUP;

      const payload: Record<string, string> = {
        email,
        password,
      };

      if (!isLogin) {
        payload.username = username;
        payload.phone = phone;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      if (isLogin) {
        // Login flow
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
          localStorage.setItem("user_id", data.user_id || "");
          
          toast({
            title: "Welcome back!",
            description: "Logged in successfully.",
          });
          
          navigate("/chat");
        } else {
          throw new Error("No access token received");
        }
      } else {
        // Signup flow - automatically log in the user after successful signup
        toast({
          title: "Account created!",
          description: "Logging you in automatically...",
        });

        // Automatically log in the user after signup
        try {
          const loginRes = await fetch(API_ENDPOINTS.LOGIN, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const loginData = await loginRes.json();
          
          if (loginRes.ok && loginData.access_token) {
            localStorage.setItem("token", loginData.access_token);
            localStorage.setItem("user_id", loginData.user_id || "");
            
            toast({
              title: "Welcome to RAMA AI!",
              description: "Your account has been created and you're logged in.",
            });
            
            navigate("/chat");
          } else {
            // If auto-login fails, redirect to login page
            toast({
              title: "Account created!",
              description: "Please log in with your credentials.",
            });
            setIsLogin(true);
            // Clear password fields for security
            setPassword("");
            setConfirmPassword("");
          }
        } catch (loginErr) {
          // If auto-login fails, redirect to login page
          toast({
            title: "Account created!",
            description: "Please log in with your credentials.",
          });
          setIsLogin(true);
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md p-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">RAMA AI</h1>
            <p className="text-gray-300">Advanced AI Assistant Platform</p>
          </div>

          <Card className="bg-[#1e1e1e] border border-gray-700 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {isLogin
                  ? "Sign in to continue your AI conversations"
                  : "Join RAMA AI to get started"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-white">
                        Username
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={!isLogin}
                        className="bg-[#1e1e1e] border border-gray-700 text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required={!isLogin}
                        className="bg-[#1e1e1e] border border-gray-700 text-white placeholder-gray-400"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#1e1e1e] border border-gray-700 text-white placeholder-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1e1e1e] border border-gray-700 text-white placeholder-gray-400"
                  />
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-[#1e1e1e] border border-gray-700 text-white placeholder-gray-400"
                    />
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
