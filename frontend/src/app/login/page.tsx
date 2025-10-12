"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, isAuthenticated, clearError } =
    useAuthStore();

  const [credentials, setCredentials] = useState({
    badge_number: "",
    password: "",
    two_factor_code: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const loginData = {
      badge_number: credentials.badge_number,
      password: credentials.password,
      ...(credentials.two_factor_code && {
        two_factor_code: credentials.two_factor_code,
      }),
    };

    const success = await login(loginData);

    if (success) {
      router.push("/dashboard");
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur-sm shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-48 h-48 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
            <img
              src="gaurlogo.png"
              width={160}
              height={50}
              alt="logo"
              className="rounded-full"
            ></img>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            GAUR Police System
          </h1>
          <p className="text-gray-600">Goa Anti-fraud Unified Radar</p>
          {/* Tricolor accent */}
          <div className="mt-4 h-1 bg-gradient-to-r from-secondary via-white to-[#138808] rounded-full"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="badge_number"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Badge Number
            </label>
            <Input
              id="badge_number"
              type="text"
              value={credentials.badge_number}
              onChange={handleInputChange("badge_number")}
              placeholder="Enter your badge number"
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={handleInputChange("password")}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="two_factor_code"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              2FA Code <span className="text-gray-500">(if enabled)</span>
            </label>
            <Input
              id="two_factor_code"
              type="text"
              value={credentials.two_factor_code}
              onChange={handleInputChange("two_factor_code")}
              placeholder="Enter 2FA code"
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={
              isLoading || !credentials.badge_number || !credentials.password
            }
            className="w-full bg-primary hover:bg-primary/90 text-white py-3"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        {/* Test Credentials */}
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600 text-center">
            <strong>Test Credentials:</strong>
            <br />
            Badge: TEST001 | Password: testpass123
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Goa Police Department - Cyber Crime Division
          </p>
        </div>
      </Card>
    </div>
  );
}
